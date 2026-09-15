/** Add conservative connection defaults for Supabase's shared pooler. */
export function resolvePrismaDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const url = new URL(raw);
  if (!url.hostname.endsWith(".pooler.supabase.com")) return raw;

  if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "30");
  if (url.port === "6543" && !url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
  return url.toString();
}
