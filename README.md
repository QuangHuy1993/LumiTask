# LumiTask — Quản lý việc làm cá nhân

Ứng dụng web nội bộ để theo dõi **công việc (Job)**, **khách hàng**, **môn học**, **đợt làm (Work batch)**, **giao dịch** và **báo cáo**; tích hợp **VietQR / SePay (webhook)** để ghi nhận thanh toán tự động. Giao diện admin dựa trên **Flowbite**, tối ưu cho một người vận hành (single-owner) với khả năng mở rộng multi-user trong schema.

---

## Tính năng chính

| Nhóm | Mô tả |
|------|--------|
| **Xác thực & bảo mật** | Đăng nhập, session cookie, đổi mật khẩu, **2FA (TOTP)** qua `otplib`, recovery codes |
| **Job** | Danh sách / chi tiết, trạng thái công việc & thanh toán, tiền cọc / tổng thu, gắn batch / client / subject |
| **Khách hàng & môn học** | CRUD danh mục, thống kê nhanh |
| **Đợt làm (Work batch)** | Quản lý đợt, gom job, đóng đợt, kiểm tra chưa thanh toán |
| **Giao dịch** | Lịch sử giao dịch, chi tiết, nguồn thủ công / webhook |
| **Thanh toán tự động** | Webhook **SePay** (`/api/webhooks/sepay`), match nội dung `JOB{id}COC\|FULL`, idempotency — xem [`nhan_tien_sepay.md`](./nhan_tien_sepay.md) |
| **Tạo QR thanh toán** | Trang tạo VietQR theo job / tài khoản ngân hàng |
| **Báo cáo** | Dashboard job / doanh thu / hoa hồng (Recharts) |
| **Cài đặt** | Tài khoản ngân hàng, cấu hình app, AI profile (schema), bảo mật |
| **Trading / Subscription** | Module nhắc hạn gói dịch vụ, cron, API manual reminder / preview |
| **UX** | Toast (Sonner), chuyển trang (Framer Motion), SSE payments (nếu bật) |

---

## Công nghệ

Chi tiết cập nhật tại [`Workflow/tech-stack.md`](./Workflow/tech-stack.md).

- **Framework:** Next.js 15 (App Router) + **Turbopack**
- **Ngôn ngữ:** TypeScript (strict)
- **UI:** React 19, Tailwind CSS, Flowbite / Flowbite React, Lucide React
- **Dữ liệu:** PostgreSQL (khuyến nghị **Neon**) + **Prisma 7**
- **Form / validation:** React Hook Form, Zod
- **Khác:** bcryptjs, qrcode, recharts, framer-motion, sonner, pg + `@prisma/adapter-pg` (nơi cần)

---

## Cấu trúc thư mục (tóm tắt)

```
src/
  app/                 # Route segments, layouts, API routes (App Router)
  features/            # Module theo domain: jobs, transactions, settings, trading, …
  components/          # UI dùng chung
  lib/                 # Prisma singleton, auth/session, env, …
prisma/
  schema.prisma        # Schema PostgreSQL + Prisma
scripts/
  create-user.cjs      # Script tạo user ban đầu (Node + Prisma)
```

Quy ước phụ thuộc: `app` → `features` → `components` / `lib` (xem `.cursor/rules/`).

---

## Yêu cầu môi trường

- **Node.js** 20.x (khuyến nghị)
- **PostgreSQL** (hoặc branch Neon)
- Tài khoản **Resend** (nếu dùng gửi email nhắc hạn / thông báo — biến môi trường trong `.env.example`)

---

## Cài đặt nhanh

```bash
git clone <repo-url>
cd Quan_ly_viec_lam
npm install
```

1. Sao chép biến môi trường:

   ```bash
   cp .env.example .env
   ```

   Điền `DATABASE_URL` (và các secret khác). Với Neon, nếu bạn thấy warning về `sslmode=require`, hãy giữ `sslmode=require` và thêm `uselibpqcompat=true` trong query string. **Không commit** file `.env`.

2. Đồng bộ schema xuống database (dự án dùng `prisma/schema.prisma`; nếu chưa có thư mục `prisma/migrations`, dùng push cho môi trường dev):

   ```bash
   npx prisma generate
   npx prisma db push
   ```

   Trên production, khuyến nghị dùng **migrate** khi đã có migration history (`npx prisma migrate deploy`).

3. Chạy dev:

   ```bash
   npm run dev
   ```

   Mở [http://localhost:3000](http://localhost:3000) — root redirect theo cookie session (`/dashboard` hoặc `/login`).

4. (Tuỳ chọn) Tạo user admin đầu tiên — chỉnh email/mật khẩu trong `scripts/create-user.cjs` rồi:

   ```bash
   node scripts/create-user.cjs
   ```

   Nếu gặp lỗi **bảng `User` không tồn tại**, chạy lại bước `prisma db push` (hoặc migrate) với đúng `DATABASE_URL`.

---

## Scripts npm

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

---

## API routes (tiêu biểu)

| Path | Ghi chú |
|------|---------|
| `POST /api/webhooks/sepay` | Webhook SePay → ghi `Transaction`, cập nhật `Job` |
| `GET /api/sse/payments` | SSE (theo dõi thanh toán, nếu dùng) |
| `GET/POST …/api/cron/trading-reminders` | Cron nhắc hạn trading (cần `CRON_SECRET`) |
| `…/api/trading/subscriptions/reminders/*` | Manual send / preview reminder |

---

## Triển khai (Vercel + Neon)

- Thiết lập biến môi trường trên Vercel giống `.env.example` (đặc biệt `DATABASE_URL`, secret session/JWT, `CRON_SECRET`, …).
- **Region:** Nếu Neon ở **Singapore**, nên đặt Vercel Function region **`sin1`** để giảm độ trễ tới database.
- Build: `npm run build` (đảm bảo `prisma generate` chạy trong quy trình CI nếu bạn tách bước — Vercel thường cần `postinstall` hoặc build command có `prisma generate` tùy cấu hình repo).

---

## Tài liệu thêm

- [`Workflow/tech-stack.md`](./Workflow/tech-stack.md) — danh mục công nghệ
- [`nhan_tien_sepay.md`](./nhan_tien_sepay.md) — luồng VietQR / SePay, idempotency, mapping DB

---

## License

Private project — không public license trừ khi chủ repo chỉ định khác.
