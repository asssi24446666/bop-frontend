/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full URL of the Railway backend, e.g. https://bop-backend.up.railway.app */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
