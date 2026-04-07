import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Session, TransportMode } from '@/lib/types';

function genId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { creatorName, mode } = body as { creatorName?: string; mode?: TransportMode };

  const id = genId();
  const session: Session = {
    id,
    mode: mode || 'transit',
    participants: creatorName ? [{ name: creatorName, address: '' }] : [],
    createdAt: Date.now(),
  };

  try {
    await kv.set(`session:${id}`, session, { ex: 86400 }); // 24h TTL
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json(
      { error: 'Storage unavailable. Configure Vercel KV.' },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const session = await kv.get<Session>(`session:${id}`);
    if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }
}
