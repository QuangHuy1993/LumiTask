import { prisma } from "@/lib/db/prisma";
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

      const emptyOptional = (v: string | undefined | null) =>
        v == null || String(v).trim() === "";

      if (existing) {
        const mergedApiKey =
          !emptyOptional(data.apiKey) ? String(data.apiKey).trim() : existing.apiKey;
        const baseUrl =
          emptyOptional(data.baseUrl) ? null : String(data.baseUrl).trim();

        return tx.aISetting.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            provider: data.provider,
            model: data.model.trim(),
            baseUrl,
            apiKey: mergedApiKey,
            temperature: data.temperature ?? null,
            maxTokens: data.maxTokens ?? null,
            isDefault: data.isDefault ?? false,
            isActive: data.isActive ?? true,
            updatedAt: new Date(),
          },
        });
      }

      return tx.aISetting.create({
        data: {
          name: data.name,
          provider: data.provider,
          model: data.model.trim(),
          baseUrl: emptyOptional(data.baseUrl) ? null : String(data.baseUrl).trim(),
          apiKey: emptyOptional(data.apiKey) ? null : String(data.apiKey).trim(),
          temperature: data.temperature ?? null,
          maxTokens: data.maxTokens ?? null,
          isDefault: data.isDefault ?? false,
          isActive: data.isActive ?? true,
          ownerId: userId,
        },
      });
    });
  },
};
