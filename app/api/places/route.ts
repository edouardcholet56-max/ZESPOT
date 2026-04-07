import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '800';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=bar&key=${key}&language=fr`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: `Google Places error: ${data.status}` },
        { status: 502 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const places = (data.results || []).map((p: any) => ({
      place_id: p.place_id,
      name: p.name,
      address: p.vicinity,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      rating: p.rating ?? null,
      user_ratings_total: p.user_ratings_total ?? null,
      price_level: p.price_level ?? null,
      open_now: p.opening_hours?.open_now ?? null,
      photo_reference: p.photos?.[0]?.photo_reference ?? null,
    }));

    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: 'Places search failed' }, { status: 500 });
  }
}
