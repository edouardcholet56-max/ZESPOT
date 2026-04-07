import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { Session } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { name, address } = body as { name: string; address: string };

  if (!name?.trim() || !address?.trim()) {
    return NextResponse.json({ error: 'name et address requis' }, { status: 400 });
  }

  try {
    const session = await redis.get<Session>(`session:${id}`);
    if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

    const alreadyIn = session.participants.some(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (!alreadyIn) {
      session.participants.push({ name: name.trim(), address: address.trim() });
      await redis.set(`session:${id}`, session);
    }

    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Storage non configuré' }, { status: 503 });
  }
}
