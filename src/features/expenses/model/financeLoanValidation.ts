import { z } from "zod";

export const financeLoanDirectionSchema = z.enum(["BORROWED", "LENT"]);
export const financeLoanStatusSchema = z.enum(["ACTIVE", "CLOSED"]);

const positiveMoney = z.coerce.number().positive("Số tiền phải lớn hơn 0");
const nonNegativeMoney = z.coerce.number().min(0, "Số tiền không hợp lệ");

const ymdSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Ngày không hợp lệ");

const optionalYmdSchema = z
  .union([z.literal(""), ymdSchema])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const financeLoanCreateSchema = z.object({
  name: z.string().trim().min(1, "Tên khoản nợ không được để trống").max(200),
  icon: z.string().trim().max(16).optional().or(z.literal("")),

  loanDirection: financeLoanDirectionSchema.default("BORROWED"),
  principalAmount: positiveMoney,
  currency: z.string().trim().min(1).max(10).default("VND"),

  startDate: ymdSchema,
  dueDate: optionalYmdSchema,

  interestRateApr: z
    .union([z.literal(""), z.coerce.number().min(0)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),

  status: financeLoanStatusSchema.default("ACTIVE"),
  note: z.string().trim().max(2000).optional().or(z.literal("")),

  // Options for initial principal transaction synchronization
  createEntry: z.boolean().default(true),
  walletId: z.number().int().positive("Vui lòng chọn ví").optional(),
  categoryId: z.number().int().positive("Vui lòng chọn danh mục").optional(),
});

export const financeLoanUpdateSchema = financeLoanCreateSchema.partial().extend({
  // Cho phép giữ giá trị status
  status: financeLoanStatusSchema.optional(),
});

export const financeLoanRepaySchema = z
  .object({
    loanId: z.number().int().positive(),

    amount: positiveMoney,
    principalPaid: nonNegativeMoney.optional(),
    interestPaid: nonNegativeMoney.optional(),

    paidAt: ymdSchema,
    walletId: z.number().int().positive("Vui lòng chọn ví"),
    // Danh mục phải đúng loại (INCOME cho LENT, EXPENSE cho BORROWED)
    categoryId: z.number().int().positive("Vui lòng chọn danh mục"),

    note: z.string().trim().max(2000).optional().or(z.literal("")),

    // Nếu muốn hiện trong sổ chi tiêu / giao dịch: mặc định bật
    createEntry: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const hasBreakdown = data.principalPaid !== undefined || data.interestPaid !== undefined;
    if (!hasBreakdown) return;

    if (data.principalPaid === undefined || data.interestPaid === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập đủ cả gốc và lãi (hoặc bỏ trống cả hai)",
        path: ["principalPaid"],
      });
      return;
    }

    const sum = Number((data.principalPaid + data.interestPaid).toFixed(2));
    const amt = Number(data.amount.toFixed(2));
    if (sum !== amt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gốc + lãi phải đúng bằng tổng số tiền",
        path: ["interestPaid"],
      });
    }
  });

export type FinanceLoanCreateInput = z.infer<typeof financeLoanCreateSchema>;
export type FinanceLoanUpdateInput = z.infer<typeof financeLoanUpdateSchema>;
export type FinanceLoanRepayInput = z.infer<typeof financeLoanRepaySchema>;

