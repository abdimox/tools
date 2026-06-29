export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  AUTH_PEPPER: string;
  CONFIG_ENCRYPTION_KEY: string;
  BOOTSTRAP_ADMIN_PASSWORD?: string;
  ALLOWED_AI_HOSTS?: string;
  AI_API_BASE_URL?: string;
  AI_TEXT_API_KEY?: string;
  AI_IMAGE_API_KEY?: string;
  AI_TEXT_MODEL?: string;
  AI_IMAGE_MODEL?: string;
  AI_REQUEST_TIMEOUT_MS?: string;
}

export type AppVariables = {
  user: AuthUser;
  sessionToken: string;
};

export interface AuthUser {
  id: string;
  displayName: string;
  role: 'admin' | 'employee';
}

export interface AppBindings {
  Bindings: Env;
  Variables: AppVariables;
}
