# Workflow: Nhận tiền VietQR/SePay (Webhook -> Ghi DB) cho `Quan_ly_viec_lam`

Tài liệu này mô tả luồng “SePay gửi webhook bao nhiêu lần” và hệ thống `Quan_ly_viec_lam` nhận webhook như thế nào để:
- Match giao dịch theo nội dung QR (`content`)
- Tránh ghi trùng khi SePay retry (`gatewayTransId` + `@unique`)
- Tự động ghi vào DB (`Transaction`) và cập nhật trạng thái `Job`

Nguồn tham chiếu ý tưởng retry/match concept: `audio-ai-web` (appendix ngắn ở cuối).

---

## 1) Các điểm chính trong code `Quan_ly_viec_lam`

### 1.1 Webhook handler

- Endpoint: `src/app/api/webhooks/sepay/route.ts`
- Hàm nghiệp vụ chính: `jobPaymentService.processSePayWebhook()` trong:
  - `src/features/jobs/services/jobPaymentService.ts`

### 1.2 Cách tạo nội dung trong VietQR

Webhook của dự án này match `content` theo regex:

```ts
/JOB(\d+)(COC|FULL)/i
```

Trong đó:
- `JOB{jobId}COC` -> cộng tiền “tiền cọc” (deposit)
- `JOB{jobId}FULL` -> cộng tiền “thanh toán phần còn lại / full”

Các nơi sinh `content` (để nhúng vào VietQR):
- VietQR tổng quát (cho tạo QR có `addInfo=content`):
  - `src/features/payments/ui/VietQRGenerator.tsx`
- VietQR cho Job (tạo `content` đúng format `JOB{jobId}{COC|FULL}`):
  - `src/features/jobs/ui/JobPaymentQRModal.tsx`
- Thanh toán thủ công cũng dùng cùng pattern content:
  - `src/features/jobs/ui/JobManualPaymentModal.tsx`

---

## 2) Quy trình đầu-cuối (step-by-step)

## Bước A: Người dùng tạo QR

### 2A. VietQRGenerator (Napass247) – QR có `addInfo=content`

Trong `src/features/payments/ui/VietQRGenerator.tsx`, URL VietQR được sinh theo dạng:

- Base ảnh QR (img.vietqr.io)
- Query:
  - `amount=${amount}`
  - `addInfo=${encodeURIComponent(content)}`
  - `accountName=${encodeURIComponent(selectedAccount.accountName)}`

**Lưu ý:** để webhook “gắn vào Job” được, `content` phải chứa chuỗi match được regex `JOB{jobId}{COC|FULL}`.

### 2B. JobPaymentQRModal – QR có `content` đúng pattern

Trong `src/features/jobs/ui/JobPaymentQRModal.tsx`:
- Nếu tab là `DEPOSIT` -> `content = JOB${jobId}COC`
- Nếu tab là `FULL` -> `content = JOB${jobId}FULL`

QR sau đó được nhúng với `addInfo=${baseContent}` để khi khách chuyển khoản thì SePay gửi lại đúng `content` đó trong webhook.

---

## Bước B: SePay POST webhook -> server nhận

### 2B.1 Webhook handler đọc request

File: `src/app/api/webhooks/sepay/route.ts`

Luồng chính:
1) Đọc body thô dưới dạng text: `await req.text()`
2) Parse JSON sang `SePayPayload`
3) Lấy secret từ DB:
   - `prisma.appSetting.findFirst({ where: { key: "SEPAY_WEBHOOK_SECRET" } })`
4) Xác minh chữ ký HMAC:
   - header: `x-sepay-signature`
   - thuật toán: `sha256(secret)`

### 2B.2 Payload tối thiểu mà code dự án này đang dùng

Trong `route.ts`, `SePayPayload` được khai báo tối thiểu gồm:
- `id: string` -> dùng làm `gatewayTransId`
- `accountNo: string` -> dùng để tìm `BankAccount` theo `accountNo`
- `transferAmount: number` -> số tiền cộng vào `Job.totalPaid`
- `content: string` -> parse ra `JOB{jobId}{COC|FULL}`

Các field còn lại (nếu SePay gửi) hiện không được dùng trực tiếp trong dự án này.

---

## Bước C: Match nội dung chuyển khoản -> xác định job & loại thanh toán

File: `src/features/jobs/services/jobPaymentService.ts`

Trong `processSePayWebhook()`:
1) Match `input.content`:
   - `const match = input.content.match(/JOB(\d+)(COC|FULL)/i)`
2) Nếu không match:
   - trả `{ ok: false, error: "NO_JOB_PATTERN" }`
   - trong webhook route: trường hợp này được trả về HTTP `200` với `{ ok: true, skipped: true }` để không gây retry vô ích
3) Parse `jobId` từ capture group
4) Xác định loại payment:
   - `COC` -> `type = "DEPOSIT"`
   - `FULL` -> `type = "FULL"`

---

## Bước D: Idempotency (SePay retry bao nhiêu lần vẫn không ghi trùng)

Trong `processSePayWebhook()` có 2 cơ chế chống trùng:

1) Prisma check trước khi tạo:
   - `tx.transaction.findFirst({ where: { gatewayTransId: input.gatewayTransId } })`
   - nếu tồn tại -> return `{ ok: true, dedup: true }`
2) DB constraint:
   - Prisma schema: `Transaction.gatewayTransId String? @unique`

Kết quả:
- Nếu SePay gửi lại webhook nhiều lần với cùng `payload.id` (=> cùng `gatewayTransId`) thì hệ thống chỉ tạo 1 bản ghi `Transaction`.

---

## Bước E: Ghi DB tự động (Transaction + cập nhật Job)

Toàn bộ phần ghi được bọc trong `prisma.$transaction(async (tx) => { ... })`.

### 2E.1 Tìm Job và BankAccount

Trong transaction:
1) Lấy `job`:
   - `tx.job.findFirst({ where: { id: jobId, deletedAt: null }, select: { id, amount, totalPaid, paymentStatus, status } })`
2) Lấy `bank` (tài khoản nhận):
   - `tx.bankAccount.findFirst({ where: { accountNo: input.accountNo, deletedAt: null }, select: { id } })`

Nếu thiếu 1 trong 2:
- trả `{ ok: false, error: "JOB_OR_BANK_NOT_FOUND" }`

### 2E.2 Cập nhật tổng tiền và trạng thái thanh toán

Tính:
- `newTotalPaid = job.totalPaid.plus(input.amount)`
- `newPaymentStatus = nextPaymentStatus(job.paymentStatus, type, newTotalPaid, job.amount)`

Quy tắc `nextPaymentStatus`:
- Nếu `type === "DEPOSIT"` và `current === "UNPAID"` -> `DEPOSIT_PAID`
- Nếu `newTotalPaid >= amount` -> `COMPLETED`
- Ngược lại giữ nguyên `current`

Cập nhật:
- `isPaid = newStatus === "COMPLETED"`
- `newJobStatus = nextJobStatus(job.status, newStatus)`
  - Nếu `newPaymentStatus === "COMPLETED"` và `job.status !== "CANCELLED"` -> `COMPLETED`
  - Ngược lại giữ nguyên

### 2E.3 Insert Transaction

Tạo `Transaction`:
- `transactionDate: new Date()`
- `amount: input.amount`
- `content: input.content` (lưu nguyên văn để debug/audit + phục vụ đối soát nội dung)
- `gatewayTransId: input.gatewayTransId` (dùng cho dedup)
- `direction: TransactionDirection.INCOMING`
- `status: TransactionStatus.COMPLETED`
- `bankAccountId: bank.id`
- `jobId: job.id`
- `rawPayload: input.rawPayload` (lưu payload thô)

### 2E.4 Update Job

Update `Job`:
- `totalPaid: newTotalPaid`
- `paymentStatus: newStatus`
- `isPaid`
- `status: newJobStatus`

---

## 3) Mapping “Webhook fields -> Prisma fields” (auto điền vào DB)

Dựa trên code hiện tại:

### 3.1 `payload.id` -> `Transaction.gatewayTransId`
- Source: `SePayPayload.id`
- Target:
  - `Transaction.gatewayTransId` (`@unique`)

### 3.2 `payload.accountNo` -> `Transaction.bankAccountId`
- Source: `SePayPayload.accountNo`
- Target:
  1) tìm `BankAccount` theo `BankAccount.accountNo` (soft delete: `deletedAt: null`)
  2) set `Transaction.bankAccountId = bank.id`

### 3.3 `payload.transferAmount` -> `Transaction.amount` và `Job.totalPaid`
- Source: `SePayPayload.transferAmount`
- Target:
  - `Transaction.amount`
  - `Job.totalPaid = job.totalPaid.plus(amount)`

### 3.4 `payload.content` -> match `jobId/type` và lưu `Transaction.content`
- Source: `SePayPayload.content`
- Target:
  1) regex match để suy ra `jobId` + `DEPOSIT`/`FULL`
  2) lưu nguyên văn vào `Transaction.content` để audit

### 3.5 `rawBody` -> `Transaction.rawPayload`
- Source: `const rawBody = await req.text()`
- Target: `Transaction.rawPayload` (dạng `String? @db.Text`)

---

## 4) “Sepay gửi thông tin về mấy lần như nào?” (retry behavior)

Trong phần code của `Quan_ly_viec_lam`, **số lần webhook gửi** phụ thuộc chủ yếu vào:
- SePay retry theo HTTP response (2xx vs không phải 2xx)
- Nhờ idempotency nên dù gửi nhiều lần vẫn không ghi trùng DB

### 4A. Retry concept (tham chiếu từ `audio-ai-web`)

Trong `audio-ai-web`, tài liệu workflow `src/workflow/workflow-sepay-qr-payment.md` mô tả:
- Nếu webhook handler trả status không phải 2xx -> SePay sẽ retry theo dãy Fibonacci
- Ví dụ: `1, 1, 2, 3, 5, 8, 13 phút`
- Tối đa 7 lần trong khoảng vài giờ (tài liệu ghi tối đa 7 lần trong 5 giờ)

Bạn có thể dùng concept này để suy ra:
- Server trả **HTTP không 2xx** -> SePay có xu hướng gửi lại nhiều lần
- Server trả **HTTP 200** với body thành công -> hạn chế retry

### 4B. Hành vi HTTP thực tế trong `Quan_ly_viec_lam` (để đối chiếu)

`src/app/api/webhooks/sepay/route.ts` hiện trả khác nhau theo tình huống:
- JSON parse lỗi -> `400 { ok: false }` (có thể gây retry theo policy của SePay)
- Signature mismatch -> `401 { ok: false }` (có thể gây retry)
- Không đủ field bắt buộc -> `200 { ok: false }` (thường sẽ không retry nếu SePay chỉ dựa vào status)
- Không tìm thấy pattern `JOB...` -> `200 { ok: true, skipped: true }` (được thiết kế để “không làm gì thêm” và tránh retry vô ích)

Khuyến nghị khi cấu hình SePay (về mặt vận hành; tài liệu này chỉ mô tả code hiện tại):
- Ưu tiên để các lỗi nghiệp vụ/không match được trả `200` để giảm retry không cần thiết

---

## 5) Checklist cấu hình để webhook đối soát chạy đúng

1) Cấu hình secret webhook trong DB:
   - `AppSetting.key = "SEPAY_WEBHOOK_SECRET"`
2) Đảm bảo payload SePay gửi đúng các field mà code đang map:
   - `id`
   - `accountNo`
   - `transferAmount`
   - `content`
3) Đảm bảo `content` nhúng trong QR phải match regex:
   - `JOB{jobId}COC` hoặc `JOB{jobId}FULL`
4) Đảm bảo `BankAccount.accountNo` đúng với `accountNo` SePay gửi:
   - `tx.bankAccount.findFirst({ where: { accountNo: input.accountNo, deletedAt: null } })`
5) Vì SePay có thể retry:
   - dự án đã chống trùng bằng `Transaction.gatewayTransId @unique` và check tồn tại trước khi insert

---

## 6) Ví dụ payload webhook tối giản (theo kiểu map hiện tại)

Ví dụ với deposit:

```json
{
  "id": "SEPAY_TX_123",
  "accountNo": "1016625868",
  "transferAmount": 1500000,
  "content": "JOB42COC"
}
```

Ví dụ với full:

```json
{
  "id": "SEPAY_TX_124",
  "accountNo": "1016625868",
  "transferAmount": 4000000,
  "content": "JOB42FULL"
}
```

---

## 7) Appendix tham khảo: `audio-ai-web` (ngắn)

Trong `audio-ai-web`, webhook được mô tả trong:
- `src/app/api/payments/sepay/webhook/route.ts`
- `src/workflow/workflow-sepay-qr-payment.md`

Điểm dùng để đối chiếu “SePay gửi mấy lần” và cách match:
- Payload có `id`, `transferType` (`in`/`out`), `transferAmount`, `accountNumber`
- Có field `code` (có thể null) và `content` (fallback dùng regex)
- Logic match theo mã nội dung (khái niệm tương tự providerRef/DUA…)
- SePay retry theo Fibonacci khi server trả HTTP không 2xx

Trong dự án `Quan_ly_viec_lam`, thay vì match `DUA...` theo `providerRef`, hệ thống đang match trực tiếp theo `content` dạng `JOB{jobId}{COC|FULL}` và dedup theo `gatewayTransId`.

