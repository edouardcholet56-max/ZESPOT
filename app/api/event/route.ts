import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { SoireeEvent, EventParticipant, TransportMode, SpotFilters } from '@/lib/types';

function makeId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// POST /api/event — create a new event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, date, time, description, createdBy, creatorAddress, mode, filters } = body;

  if (!name || !date || !createdBy) {
    return NextResponse.json({ error: 'name, date and createdBy required' }, { status: 400 });
  }

  if (!redis.configured()) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const id = makeId();

  const creator: EventParticipant = {
    id: Math.random().toString(36).slice(2),
    name: createdBy,
    address: creatorAddress || undefined,
    joinedAt: Date.now(),
  };

  const event: SoireeEvent = {
    id,
    name,
    date,
    time: time || undefined,
    description: description || undefined,
    createdBy,
    createdAt: Date.now(),
    participants: [creator],
    mode: (mode as TransportMode) || 'transit',
    filters: (filters as SpotFilters) || undefined,
  };

  await redis.set(`event:${id}`, event, 60 * 60 * 24 * 14); // 14 days TTL
  return NextResponse.json({ id, event });
}

// GET /api/event?id=xxx — get event by id
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (!redis.configured()) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
  }

  const event = await redis.get<SoireeEvent>(`event:${id}`);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  return NextResponse.json({ event });
}
