/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MAINNET_RPC_URL: string;
  readonly VITE_SEPOLIA_RPC_URL: string;
  readonly DATABASE_URL: string;
  readonly BETTER_AUTH_SECRET: string;
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly DISCORD_CLIENT_ID: string;
  readonly DISCORD_CLIENT_SECRET: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
