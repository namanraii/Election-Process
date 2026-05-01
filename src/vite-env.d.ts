/// <reference types="vite/client" />

/**
 * Type declarations for Vite environment variables.
 * All keys must be prefixed with VITE_ to be exposed to the client bundle.
 */
interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_DB_URL: string;
  readonly VITE_FIREBASE_STORAGE: string;
  readonly VITE_FIREBASE_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT: string;
  readonly VITE_MAPS_API_KEY: string;
  readonly VITE_ROUTES_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
