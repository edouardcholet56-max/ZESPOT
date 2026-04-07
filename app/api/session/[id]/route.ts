import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Session } from '@/lib/types';

// POST /api/session/[id] — add a participant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { name, address } = body as { name: string; address: string };

  if (!name?.trim() || !address?.trim()) {
    return NextResponse.json({ error: 'name and address required' }, { status: 400 });
  }

  try {
    const session = await kv.get<Session>(`session:${id}`);
    if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

    const alreadyIn = session.participants.some(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (!alreadyIn) {
      session.participants.push({ name: name.trim(), address: address.trim() });
      await kv.set(`session:${id}`, session, { ex: 86400 });
    }

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
  }
}
