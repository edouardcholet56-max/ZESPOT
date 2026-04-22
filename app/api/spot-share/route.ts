import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

function makeCode(): string {
  // 6 chars, unambiguous alphabet (no 0/O/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/spot-share  { spot: Place, time?: string }  → { code }
export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body?.spot?.place_id) {
    return NextResponse.json({ error: 'spot required' }, { status: 400 });
  }
  if (!redis.configured()) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const code = makeCode();
  await redis.set(`spot:${code}`, body, 60 * 60 * 24 * 7); // 7 days TTL
  return NextResponse.json({ code });
}

// GET /api/spot-share?code=XXXX  → { spot, time? }
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.toUpperCase().trim();
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
  if (!redis.configured()) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const data = await redis.get<{ spot: unknown; time?: string }>(`spot:${code}`);
  if (!data) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/spot-share  { code, time? }  → { ok }
// Used to attach/update a meeting time on an existing shared spot without rotating the code.
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const code: string | undefined = body?.code?.toUpperCase().trim();
  const time: string | null = typeof body?.time === 'string' && body.time ? body.time : null;
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });
  if (!redis.configured()) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const existing = await redis.get<{ spot: unknown; time?: string }>(`spot:${code}`);
  if (!existing) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 404 });

  const next = time ? { ...existing, time } : { spot: existing.spot };
  await redis.set(`spot:${code}`, next, 60 * 60 * 24 * 7);
  return NextResponse.json({ ok: true });
}
