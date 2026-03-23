export type SettingsErrorCode =
  // Password
  | "WRONG_CURRENT_PASSWORD"
  | "SAME_PASSWORD"
  | "VALIDATION_ERROR"
  | "USER_NOT_FOUND"
  // 2FA
  | "INVALID_CODE"
  | "NOT_INITIALIZED"
  | "WRONG_PASSWORD"
  // Banking
  | "DUPLICATE_ACCOUNT"
  | "LIMIT_EXCEEDED"
  | "INVALID_BANK"
  // Session
  | "ALREADY_REVOKED"
  | "CANNOT_REVOKE_CURRENT"
  // Common
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "DB_ERROR"
  | "RATE_LIMITED";

export class SettingsError extends Error {
  constructor(public code: SettingsErrorCode, message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

export type SettingsResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: SettingsErrorCode; message?: string };
