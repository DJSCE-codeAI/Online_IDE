export async function parseErrorBody(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return data.error;
  } catch {
    // response body wasn't JSON (e.g. a framework error page) — fall through
  }
  return `Request failed (${res.status}). If this is your first run, make sure .env.local has your Supabase URL/anon key and restart the dev server.`;
}
