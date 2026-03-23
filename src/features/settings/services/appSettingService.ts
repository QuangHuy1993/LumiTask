import { prisma } from "@/lib/db/prisma";
import { SettingsError } from "../model/settingsTypes";
import { appSettingSchema, aiSettingSchema } from "../model/settingsValidation";
import { z } from "zod";

export const appSettingService = {
  /**
   * Lấy tất cả app settings
   */
  async getAllAppSettings() {
    return prisma.appSetting.findMany({
      orderBy: { key: "asc" },
    });
  },

  /**
   * Upsert một app setting
   */
  async upsertAppSetting(userId: number, data: z.infer<typeof appSettingSchema>) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.appSetting.findUnique({
        where: { key: data.key },
      });

      const result = await tx.appSetting.upsert({
        where: { key: data.key },
        create: {
          key: data.key,
          value: data.value,
          description: data.description,
          updatedById: userId,
        },
        update: {
          value: data.value,
          description: data.description,
          updatedById: userId,
          updatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          action: "SETTING_UPDATED",
          userId,
          metadata: { 
            key: data.key, 
            previousValue: existing?.value 
          },
        },
      });

      return result;
    });
  },

  /**
   * Upsert nhiều app settings trong một transaction
   */
  async upsertAppSettings(userId: number, settings: Array<z.infer<typeof appSettingSchema>>) {
    return prisma.$transaction(async (tx) => {
      const keys = settings.map((s) => s.key);
      const existingRows = await tx.appSetting.findMany({
        where: { key: { in: keys } },
        select: { key: true, value: true },
      });
      const previousByKey = new Map(existingRows.map((row) => [row.key, row.value]));

      await Promise.all(
        settings.map((data) =>
          tx.appSetting.upsert({
            where: { key: data.key },
            create: {
              key: data.key,
              value: data.value,
              description: data.description,
              updatedById: userId,
            },
            update: {
              value: data.value,
              description: data.description,
              updatedById: userId,
              updatedAt: new Date(),
            },
          }),
        ),
      );

      await tx.auditLog.create({
        data: {
          action: "SETTING_UPDATED",
          userId,
          metadata: {
            keys,
            previousValues: Object.fromEntries(keys.map((key) => [key, previousByKey.get(key) ?? null])),
          },
        },
      });
    });
  },

  /**
   * Lấy danh sách AI settings
   */
  async getAISettings(userId: number) {
    return prisma.aISetting.findMany({
      where: { ownerId: userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  },

  /**
   * Upsert AI setting
   */
  async upsertAISetting(userId: number, data: z.infer<typeof aiSettingSchema>) {
    // Note: In a real app, apiKey should be encrypted
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.aISetting.updateMany({
          where: { ownerId: userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // Simplified: always create new or update based on generic name logic
      // For this task, we'll assume name is the unique identifier for a user's profile
      const existing = await tx.aISetting.findFirst({
        where: { ownerId: userId, name: data.name },
      });

      if (existing) {
        return tx.aISetting.update({
          where: { id: existing.id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });
      } else {
        return tx.aISetting.create({
          data: {
            ...data,
            ownerId: userId,
          },
        });
      }
    });
  },
};
