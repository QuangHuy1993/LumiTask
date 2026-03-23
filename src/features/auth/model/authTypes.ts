export type LoginErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "REQUIRES_2FA"
  | "RATE_LIMITED"
  | "SERVER_ERROR";

export type LoginInput = {
  identifier: string;
  password: string;
  rememberMe?: boolean;
};

export type LoginResult =
  | { success: true; redirectUrl: string }
  | { success: false; error: "REQUIRES_2FA"; preAuthToken: string }
  | {
      success: false;
      error: Exclude<LoginErrorCode, "REQUIRES_2FA">;
      field?: "identifier" | "password";
      retryAfterMs?: number;
    };

export type SessionCreated = {
  sessionId: number;
  token: string;
  expiresAt: Date;
};
