// Upstash Redis REST API — no npm package needed, just two env vars:
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

function isConfigured(): boolean {
  return Boolean(URL && TOKEN);
}

async function cmd(...args: (string | number)[]): Promise<unknown> {
  if (!isConfigured()) throw new Error('Redis not configured');
  const res = await fetch(URL!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export const redis = {
  configured: isConfigured,

  async set(key: string, value: unknown, ttlSeconds = 86400): Promise<void> {
    await cmd('SET', key, JSON.stringify(value), 'EX', ttlSeconds);
  },

  async get<T>(key: string): Promise<T | null> {
    const raw = (await cmd('GET', key)) as string | null;
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  },
};
