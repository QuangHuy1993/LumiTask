export type TransactionDirection = "INCOMING" | "OUTGOING";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "CANCELLED";
export type TransactionSource = "SEPAY" | "MANUAL";

export type TransactionMock = {
  id: number;
  dateText: string;
  timeText: string;
  amountText: string; // already formatted VND without currency suffix
  direction: TransactionDirection;
  contentText: string;
  gatewayTransId?: string | null;
  bankAccountText: string; // "VCB - 1022938"
  jobId?: number | null;
  jobName: string;
  clientName: string;
  source: TransactionSource;
  status: TransactionStatus;
  createdByName?: string | null; // only meaningful for MANUAL
  rawPayloadText?: string | null;
};

export const TRANSACTIONS_MOCK: TransactionMock[] = [
  {
    id: 101,
    dateText: "24/10/2023",
    timeText: "14:22:15",
    amountText: "12,500,000",
    direction: "INCOMING",
    contentText: "PAY_LUMI_9821_OCT",
    gatewayTransId: "GATEWAY_SEPAY_ABC123",
    bankAccountText: "VCB - 1022938",
    jobId: 2,
    jobName: "Cải tạo sân vườn #02",
    clientName: "Hoàng Anh Dũng",
    source: "SEPAY",
    status: "COMPLETED",
    rawPayloadText: `{
  "id": "GATEWAY_SEPAY_ABC123",
  "transferAmount": 12500000,
  "content": "PAY_LUMI_9821_OCT",
  "accountNo": "1022938"
}`,
  },
  {
    id: 102,
    dateText: "24/10/2023",
    timeText: "11:05:42",
    amountText: "4,200,000",
    direction: "OUTGOING",
    contentText: "REF_CANC_5521",
    gatewayTransId: null,
    bankAccountText: "TCB - 1903442",
    jobId: 3,
    jobName: "Bổ sung chất dinh dưỡng",
    clientName: "Lê Minh Tuấn",
    source: "MANUAL",
    status: "PENDING",
    createdByName: "Hệ thống",
  },
  {
    id: 103,
    dateText: "23/10/2023",
    timeText: "18:30:00",
    amountText: "25,000,000",
    direction: "INCOMING",
    contentText: "LUMITASK_FULL_SETTLE",
    gatewayTransId: "GATEWAY_SEPAY_DEF456",
    bankAccountText: "VCB - 1022938",
    jobId: 4,
    jobName: "Nhà kính Terrace",
    clientName: "Phạm Thu Hà",
    source: "SEPAY",
    status: "FAILED",
    rawPayloadText: `{
  "id": "GATEWAY_SEPAY_DEF456",
  "transferAmount": 25000000,
  "content": "LUMITASK_FULL_SETTLE",
  "accountNo": "1022938",
  "status": "FAILED"
}`,
  },
  {
    id: 104,
    dateText: "23/10/2023",
    timeText: "09:12:33",
    amountText: "1,200,000",
    direction: "OUTGOING",
    contentText: "MNT_FIX_TOOL_KIT",
    gatewayTransId: null,
    bankAccountText: "Ví tiền mặt",
    jobId: null,
    jobName: "Gói bảo trì chung",
    clientName: "Hệ thống",
    source: "MANUAL",
    status: "CANCELLED",
    createdByName: "Hệ thống",
  },
];

