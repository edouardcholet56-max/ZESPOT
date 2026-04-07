import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { SoireeEvent, EventParticipant, TransportMode } from '@/lib/types';

// POST /api/event/[id] — add a participant or update mode
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();

  if (!redis.configured()) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const event = await redis.get<SoireeEvent>(`event:${id}`);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Update transport mode
  if (body.mode) {
    event.mode = body.mode as TransportMode;
    await redis.set(`event:${id}`, event, 60 * 60 * 24 * 14);
    return NextResponse.json({ event });
  }

  // Add participant
  const { name, address } = body;
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const participant: EventParticipant = {
    id: Math.random().toString(36).slice(2),
    name,
    address: address || undefined,
    joinedAt: Date.now(),
  };

  event.participants.push(participant);
  await redis.set(`event:${id}`, event, 60 * 60 * 24 * 14);

  return NextResponse.json({ event, participantId: participant.id });
}
