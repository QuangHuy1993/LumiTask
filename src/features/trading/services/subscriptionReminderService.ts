import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { SubscriptionReminderStage } from "@/features/trading/model/subscriptionTypes";
import { addDaysLocal, decimalToDigitsString } from "@/features/trading/model/tradingParse";
import { sendEmailViaResend } from "@/lib/email/resendClient";
import { appSettingService } from "@/features/settings/services/appSettingService";
import {
  buildReminderHtml,
  buildReminderSubject,
  formatMoney,
  ymdToViDate,
} from "@/features/trading/services/subscriptionReminderEmail";

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

function readTradingAdminContact(settingsMap: Map<string, string>) {
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

type MarkDueRemindersResult = {
  processed: number;
  markedLead: number;
  markedAfter: number;
  skippedDedup: number;
  failedDueToMissingRecipients: number;
};

type TradingReminderJobRunRepo = {
  create(args: {
    data: {
      triggerSource: string;
      timezone: string;
      startedAt: Date;
      ownerCount: number;
      status: string;
      metadata: {
        windowMinutes: number;
        maxCandidatesPerOwner: number;
        maxOwnerConcurrency: number;
      };
    };
    select: { id: true };
  }): Promise<{ id: number }>;
  update(args: {
    where: { id: number };
    data: {
      finishedAt: Date;
      processed: number;
      markedLead: number;
      markedAfter: number;
      skippedDedup: number;
      failedDueToMissingRecipients: number;
      status: string;
      errorSummary?: string;
    };
  }): Promise<unknown>;
};

const tradingReminderJobRunRepo = prisma as unknown as {
  tradingReminderJobRun: TradingReminderJobRunRepo;
};

export const subscriptionReminderService = {
  async markDueReminders(input: {
    ownerId: number;
    now: Date;
    windowMinutes: number;
    maxCandidates?: number;
  }): Promise<MarkDueRemindersResult> {
    const windowMinutes = Math.max(1, input.windowMinutes);
    const safetyWindowStart = new Date(input.now.getTime() - windowMinutes * 60 * 1000);
    const maxCandidates = input.maxCandidates ?? 500;

    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, deletedAt: null },
      select: { fullName: true, username: true },
    });
    const ownerDisplayName = owner?.fullName ?? owner?.username ?? "ADMIN";
    const appSettings = await appSettingService.getAllAppSettings();
    const settingsMap = new Map(appSettings.map((s) => [s.key, s.value]));
    const adminContact = readTradingAdminContact(settingsMap);
    const adminEmail = adminContact.email;

    const candidates = await prisma.subscription.findMany({
      where: {
        ownerId: input.ownerId,
        deletedAt: null,
        isActive: true,
        nextReminderAt: { lte: input.now, gte: safetyWindowStart },
      },
      take: maxCandidates,
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
        contactId: true,
        contact: { select: { email: true, deletedAt: true, name: true } },
        title: true,
        category: { select: { name: true } },
        purchaseStartAt: true,
        purchasePrice: true,
        salePrice: true,
        currency: true,
      },
    });

    let processed = 0;
    let markedLead = 0;
    let markedAfter = 0;
    let skippedDedup = 0;
    let failedDueToMissingRecipients = 0;

    for (const c of candidates) {
      processed += 1;
      if (!c.nextReminderAt) continue;

      const stage = getStageFromNextReminderAt({
        renewalOrExpiryAt: c.renewalOrExpiryAt,
        remindDaysBefore: c.remindDaysBefore,
        remindAfterExpiryDays: c.remindAfterExpiryDays,
        nextReminderAt: c.nextReminderAt,
      });

      if (!stage) continue;

      const renewalMs = c.renewalOrExpiryAt.getTime();
      const lastLeadMs = c.lastLeadReminderForRenewalAt?.getTime() ?? null;
      const lastAfterMs = c.lastAfterReminderForRenewalAt?.getTime() ?? null;

      if (stage === "LEAD" && lastLeadMs !== null && lastLeadMs === renewalMs) {
        skippedDedup += 1;
        continue;
      }
      if (stage === "AFTER" && lastAfterMs !== null && lastAfterMs === renewalMs) {
        skippedDedup += 1;
        continue;
      }

      const hasBuyerRecipient = c.usageMode === "RESELL" && !!c.contact && c.contact.deletedAt === null && !!c.contact.email;
      const hasAdminRecipient = !!adminEmail;

      const recipients: Array<{ email: string; audience: "OWNER" | "BUYER" | "ADMIN" }> = [];

      if (c.usageMode === "PERSONAL_FAMILY") {
        if (hasAdminRecipient) {
          recipients.push({ email: adminEmail, audience: "ADMIN" });
        }
      } else {
        if (hasAdminRecipient) recipients.push({ email: adminEmail, audience: "ADMIN" });
        if (hasBuyerRecipient && c.contact?.email) recipients.push({ email: c.contact.email, audience: "BUYER" });
      }

      const hasAnyRecipient = recipients.length > 0;
      const targetRenewalAt = c.renewalOrExpiryAt;

      if (!hasAnyRecipient) {
        try {
          await prisma.subscriptionReminderLog.create({
            data: {
              subscriptionId: c.id,
              stage,
              targetRenewalAt,
              channel: "EMAIL",
              status: "FAILED",
              errorSummary: "MISSING_RECIPIENTS",
            },
          });
          failedDueToMissingRecipients += 1;
        } catch (err) {
          if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
            throw err;
          }
        }
        continue;
      }

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

      try {
        const existingLog = await prisma.subscriptionReminderLog.findUnique({
          where: {
            subscriptionId_targetRenewalAt_stage: {
              subscriptionId: c.id,
              targetRenewalAt,
              stage,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (existingLog?.status === "SENT") {
          skippedDedup += 1;
          continue;
        }

        let reminderLogId: number;
        if (!existingLog?.id) {
          const createdLog = await prisma.subscriptionReminderLog.create({
            data: {
              subscriptionId: c.id,
              stage,
              targetRenewalAt,
              channel: "EMAIL",
              status: "READY_TO_SEND",
              sentAt: null,
              errorSummary: null,
            },
            select: { id: true },
          });
          reminderLogId = createdLog.id;
        } else {
          reminderLogId = existingLog.id;
          await prisma.subscriptionReminderLog.update({
            where: {
              subscriptionId_targetRenewalAt_stage: {
                subscriptionId: c.id,
                targetRenewalAt,
                stage,
              },
            },
            data: {
              status: "READY_TO_SEND",
              sentAt: null,
              errorSummary: null,
            },
          });
        }

        const sendErrors: string[] = [];
        const targetYmd = toYMDLocal(targetRenewalAt);
        for (const recipient of recipients) {
          const subject = buildReminderSubject({
            stage,
            audience: recipient.audience === "ADMIN" ? "OWNER" : recipient.audience,
            serviceTitle: payload.serviceTitle,
            expiryDateText: payload.expiryDateText,
          });
          const html = buildReminderHtml({
            payload,
            audience: recipient.audience === "ADMIN" ? "OWNER" : recipient.audience,
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
                  reminderLogId,
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
                  reminderLogId,
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
            const retryTag = sendRes.shouldRetry ? "retryable" : "fatal";
            sendErrors.push(`${recipient.audience}:${sendRes.status}:${sendRes.code}:${retryTag}`);
          }
        }

        if (sendErrors.length > 0) {
          await prisma.subscriptionReminderLog.update({
            where: {
              subscriptionId_targetRenewalAt_stage: {
                subscriptionId: c.id,
                targetRenewalAt,
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
                targetRenewalAt,
                stage,
              },
            },
            data: {
              status: "SENT",
              sentAt: input.now,
              errorSummary: null,
            },
          });

          if (stage === "LEAD") {
            const afterAt = c.remindAfterExpiryDays > 0 ? addDaysLocal(c.renewalOrExpiryAt, c.remindAfterExpiryDays) : null;
            await tx.subscription.update({
              where: { id: c.id },
              data: {
                lastLeadReminderForRenewalAt: c.renewalOrExpiryAt,
                nextReminderAt: afterAt,
              },
            });
            markedLead += 1;
          } else {
            await tx.subscription.update({
              where: { id: c.id },
              data: {
                lastAfterReminderForRenewalAt: c.renewalOrExpiryAt,
                nextReminderAt: null,
              },
            });
            markedAfter += 1;
          }
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          skippedDedup += 1;
          continue;
        }
        throw err;
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "TRADING_REMINDER_MARKED",
        userId: input.ownerId,
        metadata: {
          nowISO: input.now.toISOString(),
          processed,
          markedLead,
          markedAfter,
          skippedDedup,
          failedDueToMissingRecipients,
        },
      },
    });

    return { processed, markedLead, markedAfter, skippedDedup, failedDueToMissingRecipients };
  },

  async runDailyRemindersForAllOwners(input: {
    now: Date;
    windowMinutes: number;
    maxCandidatesPerOwner?: number;
    maxOwnerConcurrency?: number;
    timezone?: string;
    triggerSource?: string;
  }): Promise<{
    ownerCount: number;
    totals: MarkDueRemindersResult;
    jobRunId: number;
  }> {
    const timezone = input.timezone ?? "Asia/Ho_Chi_Minh";
    const triggerSource = input.triggerSource ?? "CRON";
    const windowMinutes = Math.max(1, input.windowMinutes);
    const maxCandidatesPerOwner = input.maxCandidatesPerOwner ?? 500;
    const maxOwnerConcurrency = Math.min(Math.max(input.maxOwnerConcurrency ?? 3, 1), 10);
    const windowStart = new Date(input.now.getTime() - windowMinutes * 60 * 1000);

    const ownerRows = await prisma.subscription.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        nextReminderAt: {
          lte: input.now,
          gte: windowStart,
        },
        ownerId: { not: null },
      },
      select: { ownerId: true },
      distinct: ["ownerId"],
    });
    const ownerIds = ownerRows.map((r) => r.ownerId).filter((id): id is number => typeof id === "number");

    const jobRun = await tradingReminderJobRunRepo.tradingReminderJobRun.create({
      data: {
        triggerSource,
        timezone,
        startedAt: input.now,
        ownerCount: ownerIds.length,
        status: "RUNNING",
        metadata: {
          windowMinutes,
          maxCandidatesPerOwner,
          maxOwnerConcurrency,
        },
      },
      select: { id: true },
    });

    const totals: MarkDueRemindersResult = {
      processed: 0,
      markedLead: 0,
      markedAfter: 0,
      skippedDedup: 0,
      failedDueToMissingRecipients: 0,
    };

    try {
      for (let i = 0; i < ownerIds.length; i += maxOwnerConcurrency) {
        const chunk = ownerIds.slice(i, i + maxOwnerConcurrency);
        const chunkResults = await Promise.all(
          chunk.map((ownerId) =>
            this.markDueReminders({
              ownerId,
              now: input.now,
              windowMinutes,
              maxCandidates: maxCandidatesPerOwner,
            }),
          ),
        );
        for (const res of chunkResults) {
          totals.processed += res.processed;
          totals.markedLead += res.markedLead;
          totals.markedAfter += res.markedAfter;
          totals.skippedDedup += res.skippedDedup;
          totals.failedDueToMissingRecipients += res.failedDueToMissingRecipients;
        }
      }

      await tradingReminderJobRunRepo.tradingReminderJobRun.update({
        where: { id: jobRun.id },
        data: {
          finishedAt: new Date(),
          processed: totals.processed,
          markedLead: totals.markedLead,
          markedAfter: totals.markedAfter,
          skippedDedup: totals.skippedDedup,
          failedDueToMissingRecipients: totals.failedDueToMissingRecipients,
          status: "SUCCESS",
        },
      });
    } catch (error) {
      await tradingReminderJobRunRepo.tradingReminderJobRun.update({
        where: { id: jobRun.id },
        data: {
          finishedAt: new Date(),
          processed: totals.processed,
          markedLead: totals.markedLead,
          markedAfter: totals.markedAfter,
          skippedDedup: totals.skippedDedup,
          failedDueToMissingRecipients: totals.failedDueToMissingRecipients,
          status: "FAILED",
          errorSummary: error instanceof Error ? error.message : "UNKNOWN_CRON_ERROR",
        },
      });
      throw error;
    }

    return {
      ownerCount: ownerIds.length,
      totals,
      jobRunId: jobRun.id,
    };
  },

  async sendBuyerLeadTestEmail(input: { ownerId: number; toEmail: string }): Promise<
    | { ok: true; subscriptionId: number; toEmail: string; provider: string }
    | { ok: false; error: "NOT_FOUND" | "MISSING_RECIPIENT" | "SEND_FAILED"; detail?: string }
  > {
    const subscription = await prisma.subscription.findFirst({
      where: {
        ownerId: input.ownerId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: [{ renewalOrExpiryAt: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        usageMode: true,
        renewalOrExpiryAt: true,
        purchaseStartAt: true,
        remindDaysBefore: true,
        remindAfterExpiryDays: true,
        purchasePrice: true,
        salePrice: true,
        currency: true,
        category: { select: { name: true } },
        contact: { select: { name: true } },
      },
    });
    if (!subscription) return { ok: false, error: "NOT_FOUND" };
    if (!input.toEmail.trim()) return { ok: false, error: "MISSING_RECIPIENT" };

    const owner = await prisma.user.findFirst({
      where: { id: input.ownerId, deletedAt: null },
      select: { fullName: true, username: true },
    });
    const ownerDisplayName = owner?.fullName ?? owner?.username ?? "ADMIN";
    const appSettings = await appSettingService.getAllAppSettings();
    const settingsMap = new Map(appSettings.map((s) => [s.key, s.value]));
    const adminContact = readTradingAdminContact(settingsMap);

    const payload = {
      subscriptionId: subscription.id,
      serviceTitle: subscription.title,
      categoryName: subscription.category.name,
      purchaseDateText: ymdToViDate(subscription.purchaseStartAt ? toYMDLocal(subscription.purchaseStartAt) : null),
      expiryDateText: ymdToViDate(toYMDLocal(subscription.renewalOrExpiryAt)),
      remindDaysBefore: subscription.remindDaysBefore,
      remindAfterDays: subscription.remindAfterExpiryDays,
      purchasePriceText: formatMoney(decimalToDigitsString(subscription.purchasePrice), subscription.currency),
      salePriceText: formatMoney(decimalToDigitsString(subscription.salePrice), subscription.currency),
      profitText: calculateProfitText({
        salePrice: subscription.salePrice,
        purchasePrice: subscription.purchasePrice,
        currency: subscription.currency,
      }),
      ownerName: ownerDisplayName,
      buyerName: subscription.contact?.name ?? "Khách hàng",
      usageMode: subscription.usageMode,
      stage: "LEAD" as const,
      adminContact,
    };

    const subject = buildReminderSubject({
      stage: "LEAD",
      audience: "BUYER",
      serviceTitle: payload.serviceTitle,
      expiryDateText: payload.expiryDateText,
    });
    const html = buildReminderHtml({ payload, audience: "BUYER" });
    const idempotencyKey = `trading-reminder/${subscription.id}/LEAD/${toYMDLocal(subscription.renewalOrExpiryAt)}/BUYER/preview-${input.toEmail.toLowerCase()}`;
    const sendRes = await sendEmailViaResend({
      to: input.toEmail.trim(),
      subject,
      html,
      idempotencyKey,
    });
    if (!sendRes.ok) {
      return {
        ok: false,
        error: "SEND_FAILED",
        detail: `${sendRes.status}:${sendRes.code}:${sendRes.message}`,
      };
    }

    return { ok: true, subscriptionId: subscription.id, toEmail: input.toEmail.trim(), provider: sendRes.providerId ?? "resend" };
  },

  async getReminderAttempts(input: {
    ownerId: number;
    recipientEmail?: string;
    subscriptionId?: number;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
    return prisma.subscriptionReminderAttemptLog.findMany({
      where: {
        ...(input.recipientEmail ? { recipientEmail: input.recipientEmail } : {}),
        reminderLog: {
          subscription: {
            ownerId: input.ownerId,
            deletedAt: null,
            ...(input.subscriptionId ? { id: input.subscriptionId } : {}),
          },
        },
      },
      orderBy: [{ attemptedAt: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true,
        recipientEmail: true,
        audience: true,
        provider: true,
        providerMessageId: true,
        status: true,
        httpStatus: true,
        errorCode: true,
        errorMessage: true,
        retryable: true,
        attemptedAt: true,
        sentAt: true,
        failedAt: true,
        reminderLog: {
          select: {
            subscriptionId: true,
            stage: true,
            targetRenewalAt: true,
          },
        },
      },
    });
  },
};

