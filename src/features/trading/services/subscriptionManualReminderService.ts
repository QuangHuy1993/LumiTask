import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { appSettingService } from "@/features/settings/services/appSettingService";
import type {
  ManualReminderJobStatusDTO,
  ReminderPreviewItemDTO,
  ReminderPreviewResponseDTO,
  ReminderRecipientAudience,
} from "@/features/trading/model/subscriptionReminderManualTypes";
import type { SubscriptionReminderStage } from "@/features/trading/model/subscriptionTypes";
import { addDaysLocal, decimalToDigitsString } from "@/features/trading/model/tradingParse";
import {
  buildReminderHtml,
  buildReminderSubject,
  formatMoney,
  ymdToViDate,
} from "@/features/trading/services/subscriptionReminderEmail";
import { sendEmailViaResend } from "@/lib/email/resendClient";

function toYMDLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getStageFromNextReminderAt(input: {
  renewalOrExpiryAt: Date;
  remindDaysBefore: number;
  remindAfterExpiryDays: number;
  nextReminderAt: Date;
}): SubscriptionReminderStage | null {
  const leadAt = addDaysLocal(input.renewalOrExpiryAt, -input.remindDaysBefore);
  const afterAt = addDaysLocal(input.renewalOrExpiryAt, input.remindAfterExpiryDays);
  const ms = input.nextReminderAt.getTime();
  if (ms === leadAt.getTime()) return "LEAD";
  if (ms === afterAt.getTime()) return "AFTER";
  return null;
}

type TradingAdminContact = {
  name: string;
  zalo: string;
  facebookUrl: string;
  email: string;
};

function readTradingAdminContact(settingsMap: Map<string, string>): TradingAdminContact {
  return {
    name: settingsMap.get("trading_admin_name")?.trim() || "ADMIN",
    zalo: settingsMap.get("trading_admin_zalo")?.trim() || "",
    facebookUrl: settingsMap.get("trading_admin_facebook_url")?.trim() || "",
    email: settingsMap.get("trading_admin_email")?.trim() || "",
  };
}

function calculateProfitText(input: {
  salePrice: Prisma.Decimal | null;
  purchasePrice: Prisma.Decimal | null;
  currency: string;
}): string {
  const sale = input.salePrice ?? new Prisma.Decimal(0);
  const purchase = input.purchasePrice ?? new Prisma.Decimal(0);
  const profit = sale.sub(purchase);
  return formatMoney(profit.toFixed(2), input.currency);
}

type ManualJobMetadata = {
  ownerId: number;
  selectedIds: number[];
  selected: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  recentErrors: Array<{
    subscriptionId: number;
    audience?: ReminderRecipientAudience;
    code: string;
    message: string;
  }>;
};

type TradingReminderJobRunRepo = {
  create(args: {
    data: {
      triggerSource: string;
      timezone: string;
      startedAt: Date;
      ownerCount: number;
      status: string;
      metadata: Prisma.JsonObject;
    };
    select: { id: true };
  }): Promise<{ id: number }>;
  findUnique(args: {
    where: { id: number };
    select: { id: true; status: true; startedAt: true; finishedAt: true; metadata: true };
  }): Promise<{
    id: number;
    status: string;
    startedAt: Date;
    finishedAt: Date | null;
    metadata: Prisma.JsonValue | null;
  } | null>;
  update(args: {
    where: { id: number };
    data: {
      status?: string;
      finishedAt?: Date;
      errorSummary?: string;
      processed?: number;
      markedLead?: number;
      markedAfter?: number;
      skippedDedup?: number;
      failedDueToMissingRecipients?: number;
      metadata?: Prisma.JsonObject;
    };
  }): Promise<unknown>;
};

const tradingReminderJobRunRepo = prisma as unknown as {
  tradingReminderJobRun: TradingReminderJobRunRepo;
};

function normalizeMetadata(value: Prisma.JsonValue | null | undefined): ManualJobMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.ownerId !== "number") return null;
  return {
    ownerId: obj.ownerId,
    selectedIds: Array.isArray(obj.selectedIds) ? obj.selectedIds.filter((v): v is number => typeof v === "number") : [],
    selected: typeof obj.selected === "number" ? obj.selected : 0,
    processed: typeof obj.processed === "number" ? obj.processed : 0,
    succeeded: typeof obj.succeeded === "number" ? obj.succeeded : 0,
    failed: typeof obj.failed === "number" ? obj.failed : 0,
    skipped: typeof obj.skipped === "number" ? obj.skipped : 0,
    recentErrors: Array.isArray(obj.recentErrors)
      ? obj.recentErrors.reduce<ManualJobMetadata["recentErrors"]>((acc, item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return acc;
          const cast = item as Record<string, unknown>;
          const subscriptionId = typeof cast.subscriptionId === "number" ? cast.subscriptionId : null;
          const code = typeof cast.code === "string" ? cast.code : null;
          const message = typeof cast.message === "string" ? cast.message : null;
          if (!subscriptionId || !code || !message) return acc;
          const audience: ReminderRecipientAudience | undefined =
            cast.audience === "ADMIN" || cast.audience === "BUYER" ? cast.audience : undefined;
          acc.push({ subscriptionId, audience, code, message });
          return acc;
        }, [])
      : [],
  };
}

function toJobStatusResponse(input: {
  jobRunId: number;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  metadata: ManualJobMetadata;
}): ManualReminderJobStatusDTO {
  const percent = input.metadata.selected > 0 ? Math.round((input.metadata.processed / input.metadata.selected) * 100) : 0;
  return {
    ok: true,
    jobRunId: input.jobRunId,
    status: (input.status as ManualReminderJobStatusDTO["status"]) || "RUNNING",
    progressPercent: Math.min(100, Math.max(0, percent)),
    totals: {
      selected: input.metadata.selected,
      processed: input.metadata.processed,
      succeeded: input.metadata.succeeded,
      failed: input.metadata.failed,
      skipped: input.metadata.skipped,
    },
    recentErrors: input.metadata.recentErrors,
    startedAtISO: input.startedAt.toISOString(),
    finishedAtISO: input.finishedAt?.toISOString(),
  };
}

export const subscriptionManualReminderService = {
  async getDueReminderPreview(input: {
    ownerId: number;
    now: Date;
    page: number;
    limit: number;
    stage: "LEAD" | "AFTER" | "ALL";
    q?: string;
    categoryId?: number;
  }): Promise<ReminderPreviewResponseDTO> {
    const page = Math.max(1, input.page);
    const limit = Math.min(Math.max(1, input.limit), 500);
    const skip = (page - 1) * limit;
    const term = input.q?.trim();

    const appSettings = await appSettingService.getAllAppSettings();
    const settingsMap = new Map(appSettings.map((s) => [s.key, s.value]));
    const adminContact = readTradingAdminContact(settingsMap);

    const where: Prisma.SubscriptionWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      isActive: true,
      nextReminderAt: { not: null, lte: input.now },
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { category: { is: { name: { contains: term, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [rows, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ nextReminderAt: "asc" }, { id: "desc" }],
        select: {
          id: true,
          title: true,
          usageMode: true,
          renewalOrExpiryAt: true,
          remindDaysBefore: true,
          remindAfterExpiryDays: true,
          nextReminderAt: true,
          lastLeadReminderForRenewalAt: true,
          lastAfterReminderForRenewalAt: true,
          category: { select: { name: true } },
          contact: { select: { email: true, deletedAt: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const items: ReminderPreviewItemDTO[] = rows
      .map<ReminderPreviewItemDTO | null>((row) => {
        if (!row.nextReminderAt) return null;
        const stage = getStageFromNextReminderAt({
          renewalOrExpiryAt: row.renewalOrExpiryAt,
          remindDaysBefore: row.remindDaysBefore,
          remindAfterExpiryDays: row.remindAfterExpiryDays,
          nextReminderAt: row.nextReminderAt,
        });
        if (!stage) {
          return {
            subscriptionId: row.id,
            title: row.title,
            categoryName: row.category.name,
            renewalOrExpiryAtISO: toYMDLocal(row.renewalOrExpiryAt),
            nextReminderAtISO: toYMDLocal(row.nextReminderAt),
            stage: "LEAD" as const,
            recipients: [],
            canSend: false,
            skipReason: "INVALID_STAGE" as const,
          };
        }

        if (input.stage !== "ALL" && input.stage !== stage) return null;

        const renewalMs = row.renewalOrExpiryAt.getTime();
        const dedupHit =
          (stage === "LEAD" && row.lastLeadReminderForRenewalAt?.getTime() === renewalMs) ||
          (stage === "AFTER" && row.lastAfterReminderForRenewalAt?.getTime() === renewalMs);
        if (dedupHit) {
          return {
            subscriptionId: row.id,
            title: row.title,
            categoryName: row.category.name,
            renewalOrExpiryAtISO: toYMDLocal(row.renewalOrExpiryAt),
            nextReminderAtISO: toYMDLocal(row.nextReminderAt),
            stage,
            recipients: [],
            canSend: false,
            skipReason: "ALREADY_SENT" as const,
          };
        }

        const recipients: Array<{ email: string; audience: ReminderRecipientAudience }> = [];
        if (adminContact.email) {
          recipients.push({ email: adminContact.email, audience: "ADMIN" });
        }
        const buyerEmail =
          row.usageMode === "RESELL" && row.contact?.deletedAt === null ? row.contact.email?.trim() ?? "" : "";
        if (buyerEmail) {
          recipients.push({ email: buyerEmail, audience: "BUYER" });
        }

        return {
          subscriptionId: row.id,
          title: row.title,
          categoryName: row.category.name,
          renewalOrExpiryAtISO: toYMDLocal(row.renewalOrExpiryAt),
          nextReminderAtISO: toYMDLocal(row.nextReminderAt),
          stage,
          recipients,
          canSend: recipients.length > 0,
          ...(recipients.length === 0 ? { skipReason: "MISSING_RECIPIENTS" as const } : {}),
        };
      })
      .filter((item): item is ReminderPreviewItemDTO => item !== null);

    return {
      items,
      totalCount,
      page,
      pageSize: limit,
    };
  },

  async startManualReminderSend(input: {
    ownerId: number;
    selectedSubscriptionIds: number[];
    now: Date;
    windowMinutes?: number;
  }): Promise<{ jobRunId: number; selectedCount: number; status: "QUEUED" | "RUNNING" }> {
    const uniqueIds = Array.from(new Set(input.selectedSubscriptionIds));
    const metadata: ManualJobMetadata = {
      ownerId: input.ownerId,
      selectedIds: uniqueIds,
      selected: uniqueIds.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      recentErrors: [],
    };

    const job = await tradingReminderJobRunRepo.tradingReminderJobRun.create({
      data: {
        triggerSource: "MANUAL_APPROVAL_UI",
        timezone: "Asia/Ho_Chi_Minh",
        startedAt: input.now,
        ownerCount: 1,
        status: "QUEUED",
        metadata: metadata as unknown as Prisma.JsonObject,
      },
      select: { id: true },
    });

    void this.runManualReminderSendJob({
      ownerId: input.ownerId,
      jobRunId: job.id,
      selectedSubscriptionIds: uniqueIds,
      now: input.now,
      windowMinutes: input.windowMinutes,
    });

    return { jobRunId: job.id, selectedCount: uniqueIds.length, status: "QUEUED" };
  },

  async getManualReminderJobStatus(input: { ownerId: number; jobRunId: number }): Promise<ManualReminderJobStatusDTO | null> {
    const row = await tradingReminderJobRunRepo.tradingReminderJobRun.findUnique({
      where: { id: input.jobRunId },
      select: { id: true, status: true, startedAt: true, finishedAt: true, metadata: true },
    });
    if (!row) return null;
    const metadata = normalizeMetadata(row.metadata);
    if (!metadata || metadata.ownerId !== input.ownerId) return null;
    return toJobStatusResponse({
      jobRunId: row.id,
      status: row.status,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      metadata,
    });
  },

  async runManualReminderSendJob(input: {
    ownerId: number;
    jobRunId: number;
    selectedSubscriptionIds: number[];
    now: Date;
    windowMinutes?: number;
  }): Promise<void> {
    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, deletedAt: null },
      select: { fullName: true, username: true },
    });
    const ownerDisplayName = owner?.fullName ?? owner?.username ?? "ADMIN";
    const appSettings = await appSettingService.getAllAppSettings();
    const settingsMap = new Map(appSettings.map((s) => [s.key, s.value]));
    const adminContact = readTradingAdminContact(settingsMap);

    const progress: ManualJobMetadata = {
      ownerId: input.ownerId,
      selectedIds: input.selectedSubscriptionIds,
      selected: input.selectedSubscriptionIds.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      recentErrors: [],
    };

    const pushError = (error: ManualJobMetadata["recentErrors"][number]) => {
      progress.recentErrors = [error, ...progress.recentErrors].slice(0, 10);
    };

    await tradingReminderJobRunRepo.tradingReminderJobRun.update({
      where: { id: input.jobRunId },
      data: { status: "RUNNING", metadata: progress as unknown as Prisma.JsonObject },
    });

    try {
      const rows = await prisma.subscription.findMany({
        where: {
          id: { in: input.selectedSubscriptionIds },
          ownerId: input.ownerId,
          deletedAt: null,
          isActive: true,
        },
        orderBy: [{ nextReminderAt: "asc" }, { id: "desc" }],
        select: {
          id: true,
          usageMode: true,
          renewalOrExpiryAt: true,
          remindDaysBefore: true,
          remindAfterExpiryDays: true,
          nextReminderAt: true,
          lastLeadReminderForRenewalAt: true,
          lastAfterReminderForRenewalAt: true,
          contact: { select: { email: true, deletedAt: true, name: true } },
          title: true,
          category: { select: { name: true } },
          purchaseStartAt: true,
          purchasePrice: true,
          salePrice: true,
          currency: true,
        },
      });

      for (const c of rows) {
        progress.processed += 1;
        let wasFailed = false;
        let wasSkipped = false;

        const markProgress = async () => {
          await tradingReminderJobRunRepo.tradingReminderJobRun.update({
            where: { id: input.jobRunId },
            data: {
              processed: progress.processed,
              markedLead: progress.succeeded,
              markedAfter: progress.failed,
              skippedDedup: progress.skipped,
              failedDueToMissingRecipients: progress.failed,
              metadata: progress as unknown as Prisma.JsonObject,
            },
          });
        };

        try {
          if (!c.nextReminderAt) {
            wasSkipped = true;
            pushError({
              subscriptionId: c.id,
              code: "NOT_DUE",
              message: "Dịch vụ chưa có nextReminderAt hợp lệ.",
            });
            continue;
          }

          const stage = getStageFromNextReminderAt({
            renewalOrExpiryAt: c.renewalOrExpiryAt,
            remindDaysBefore: c.remindDaysBefore,
            remindAfterExpiryDays: c.remindAfterExpiryDays,
            nextReminderAt: c.nextReminderAt,
          });
          if (!stage) {
            wasSkipped = true;
            pushError({
              subscriptionId: c.id,
              code: "INVALID_STAGE",
              message: "Không xác định được stage từ nextReminderAt.",
            });
            continue;
          }

          const renewalMs = c.renewalOrExpiryAt.getTime();
          if (stage === "LEAD" && c.lastLeadReminderForRenewalAt?.getTime() === renewalMs) {
            wasSkipped = true;
            continue;
          }
          if (stage === "AFTER" && c.lastAfterReminderForRenewalAt?.getTime() === renewalMs) {
            wasSkipped = true;
            continue;
          }

          const recipients: Array<{ email: string; audience: ReminderRecipientAudience }> = [];
          if (adminContact.email) recipients.push({ email: adminContact.email, audience: "ADMIN" });
          if (c.usageMode === "RESELL" && c.contact?.deletedAt === null && c.contact?.email) {
            recipients.push({ email: c.contact.email, audience: "BUYER" });
          }
          if (recipients.length === 0) {
            wasFailed = true;
            pushError({
              subscriptionId: c.id,
              code: "MISSING_RECIPIENTS",
              message: "Không có người nhận hợp lệ.",
            });
            await prisma.subscriptionReminderLog.upsert({
              where: {
                subscriptionId_targetRenewalAt_stage: {
                  subscriptionId: c.id,
                  targetRenewalAt: c.renewalOrExpiryAt,
                  stage,
                },
              },
              create: {
                subscriptionId: c.id,
                stage,
                targetRenewalAt: c.renewalOrExpiryAt,
                channel: "EMAIL",
                status: "FAILED",
                errorSummary: "MISSING_RECIPIENTS",
              },
              update: {
                status: "FAILED",
                errorSummary: "MISSING_RECIPIENTS",
                sentAt: null,
              },
            });
            continue;
          }

          const existingLog = await prisma.subscriptionReminderLog.findUnique({
            where: {
              subscriptionId_targetRenewalAt_stage: {
                subscriptionId: c.id,
                targetRenewalAt: c.renewalOrExpiryAt,
                stage,
              },
            },
            select: { id: true, status: true },
          });
          if (existingLog?.status === "SENT") {
            wasSkipped = true;
            continue;
          }

          const reminderLog =
            existingLog?.id
              ? await prisma.subscriptionReminderLog.update({
                  where: {
                    subscriptionId_targetRenewalAt_stage: {
                      subscriptionId: c.id,
                      targetRenewalAt: c.renewalOrExpiryAt,
                      stage,
                    },
                  },
                  data: { status: "READY_TO_SEND", errorSummary: null, sentAt: null },
                  select: { id: true },
                })
              : await prisma.subscriptionReminderLog.create({
                  data: {
                    subscriptionId: c.id,
                    stage,
                    targetRenewalAt: c.renewalOrExpiryAt,
                    channel: "EMAIL",
                    status: "READY_TO_SEND",
                    sentAt: null,
                    errorSummary: null,
                  },
                  select: { id: true },
                });

          const payload = {
            subscriptionId: c.id,
            serviceTitle: c.title,
            categoryName: c.category.name,
            purchaseDateText: ymdToViDate(c.purchaseStartAt ? toYMDLocal(c.purchaseStartAt) : null),
            expiryDateText: ymdToViDate(toYMDLocal(c.renewalOrExpiryAt)),
            remindDaysBefore: c.remindDaysBefore,
            remindAfterDays: c.remindAfterExpiryDays,
            purchasePriceText: formatMoney(decimalToDigitsString(c.purchasePrice), c.currency),
            salePriceText: formatMoney(decimalToDigitsString(c.salePrice), c.currency),
            profitText: calculateProfitText({
              salePrice: c.salePrice,
              purchasePrice: c.purchasePrice,
              currency: c.currency,
            }),
            ownerName: ownerDisplayName,
            buyerName: c.contact?.name ?? "Khách hàng",
            usageMode: c.usageMode,
            stage,
            adminContact,
          } as const;

          const targetYmd = toYMDLocal(c.renewalOrExpiryAt);
          const sendErrors: string[] = [];
          for (const recipient of recipients) {
            const audienceForTemplate = recipient.audience === "ADMIN" ? "OWNER" : "BUYER";
            const subject = buildReminderSubject({
              stage,
              audience: audienceForTemplate,
              serviceTitle: payload.serviceTitle,
              expiryDateText: payload.expiryDateText,
            });
            const html = buildReminderHtml({
              payload,
              audience: audienceForTemplate,
            });
            const idempotencyKey = `trading-reminder/${c.id}/${stage}/${targetYmd}/${recipient.audience}/${recipient.email.toLowerCase()}`;
            const sendRes = await sendEmailViaResend({
              to: recipient.email,
              subject,
              html,
              idempotencyKey,
            });
            await prisma.subscriptionReminderAttemptLog.create({
              data: sendRes.ok
                ? {
                    reminderLogId: reminderLog.id,
                    recipientEmail: recipient.email,
                    audience: recipient.audience,
                    provider: "RESEND",
                    providerMessageId: sendRes.providerId ?? null,
                    idempotencyKey,
                    subjectSnapshot: subject,
                    bodyHtmlSnapshot: html,
                    status: "SENT",
                    attemptedAt: input.now,
                    sentAt: input.now,
                  }
                : {
                    reminderLogId: reminderLog.id,
                    recipientEmail: recipient.email,
                    audience: recipient.audience,
                    provider: "RESEND",
                    providerMessageId: null,
                    idempotencyKey,
                    subjectSnapshot: subject,
                    bodyHtmlSnapshot: html,
                    status: "FAILED",
                    httpStatus: sendRes.status,
                    errorCode: sendRes.code,
                    errorMessage: sendRes.message,
                    retryable: sendRes.shouldRetry,
                    attemptedAt: input.now,
                    failedAt: input.now,
                  },
            });
            if (!sendRes.ok) {
              sendErrors.push(`${recipient.audience}:${sendRes.status}:${sendRes.code}`);
              pushError({
                subscriptionId: c.id,
                audience: recipient.audience,
                code: sendRes.code,
                message: sendRes.message,
              });
            }
          }

          if (sendErrors.length > 0) {
            wasFailed = true;
            await prisma.subscriptionReminderLog.update({
              where: {
                subscriptionId_targetRenewalAt_stage: {
                  subscriptionId: c.id,
                  targetRenewalAt: c.renewalOrExpiryAt,
                  stage,
                },
              },
              data: {
                status: "FAILED",
                errorSummary: sendErrors.join(" | "),
                sentAt: null,
              },
            });
            continue;
          }

          await prisma.$transaction(async (tx) => {
            await tx.subscriptionReminderLog.update({
              where: {
                subscriptionId_targetRenewalAt_stage: {
                  subscriptionId: c.id,
                  targetRenewalAt: c.renewalOrExpiryAt,
                  stage,
                },
              },
              data: { status: "SENT", sentAt: input.now, errorSummary: null },
            });
            if (stage === "LEAD") {
              const afterAt = c.remindAfterExpiryDays > 0 ? addDaysLocal(c.renewalOrExpiryAt, c.remindAfterExpiryDays) : null;
              await tx.subscription.update({
                where: { id: c.id },
                data: { lastLeadReminderForRenewalAt: c.renewalOrExpiryAt, nextReminderAt: afterAt },
              });
            } else {
              await tx.subscription.update({
                where: { id: c.id },
                data: { lastAfterReminderForRenewalAt: c.renewalOrExpiryAt, nextReminderAt: null },
              });
            }
          });
        } catch (error) {
          wasFailed = true;
          pushError({
            subscriptionId: c.id,
            code: "UNEXPECTED_ERROR",
            message: error instanceof Error ? error.message : "UNKNOWN_ERROR",
          });
        } finally {
          if (wasFailed) progress.failed += 1;
          else if (wasSkipped) progress.skipped += 1;
          else progress.succeeded += 1;
          await markProgress();
        }
      }

      const finalStatus =
        progress.failed > 0
          ? progress.succeeded > 0 || progress.skipped > 0
            ? "PARTIAL_SUCCESS"
            : "FAILED"
          : "SUCCESS";

      await tradingReminderJobRunRepo.tradingReminderJobRun.update({
        where: { id: input.jobRunId },
        data: {
          finishedAt: new Date(),
          status: finalStatus,
          processed: progress.processed,
          markedLead: progress.succeeded,
          markedAfter: progress.failed,
          skippedDedup: progress.skipped,
          failedDueToMissingRecipients: progress.failed,
          metadata: progress as unknown as Prisma.JsonObject,
        },
      });
    } catch (error) {
      progress.recentErrors = [
        {
          subscriptionId: 0,
          code: "JOB_FAILED",
          message: error instanceof Error ? error.message : "UNKNOWN_JOB_ERROR",
        },
        ...progress.recentErrors,
      ].slice(0, 10);

      await tradingReminderJobRunRepo.tradingReminderJobRun.update({
        where: { id: input.jobRunId },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          errorSummary: error instanceof Error ? error.message : "UNKNOWN_JOB_ERROR",
          processed: progress.processed,
          markedLead: progress.succeeded,
          markedAfter: progress.failed,
          skippedDedup: progress.skipped,
          failedDueToMissingRecipients: progress.failed,
          metadata: progress as unknown as Prisma.JsonObject,
        },
      });
    }
  },
};

