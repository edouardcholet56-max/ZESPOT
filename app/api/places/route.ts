import { NextRequest, NextResponse } from 'next/server';

const VIBE_KEYWORDS: Record<string, string> = {
  darts:     'fléchettes darts',
  billiard:  'billard',
  sports:    'bar sportif sport',
  cocktails: 'cocktails',
  live:      'musique live concert',
  terrace:   'terrasse',
  games:     'jeux bar à jeux',
  rooftop:   'rooftop',
};

// Map our friendly "spot types" → Google Places API `type` parameter.
// These are the official Google Place types → guarantees real results,
// not approximations (important for the V0 promise).
const SPOT_TYPE_MAP: Record<string, string> = {
  bar:        'bar',
  restaurant: 'restaurant',
  park:       'park',
  museum:     'museum',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '800';
  const vibesParam = searchParams.get('vibes') || '';       // comma-separated
  const maxprice = searchParams.get('maxprice') || '';
  const opennow = searchParams.get('opennow') === 'true';
  const spotType = (searchParams.get('type') || 'bar').toLowerCase();

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  // Resolve to a valid Google Places type
  const googleType = SPOT_TYPE_MAP[spotType] || 'bar';

  try {
    // Build keyword from vibes (only meaningful for bars right now)
    const vibes = vibesParam ? vibesParam.split(',').filter(Boolean) : [];
    const keyword = vibes.map((v) => VIBE_KEYWORDS[v] || v).join(' ').trim();

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`
      + `?location=${lat},${lng}`
      + `&radius=${radius}`
      + `&type=${googleType}`
      + `&key=${key}`
      + `&language=fr`;

    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
    if (maxprice) url += `&maxprice=${maxprice}`;
    if (opennow)  url += `&opennow=true`;

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
      photo_references: (p.photos || []).slice(0, 3).map((ph: { photo_reference: string }) => ph.photo_reference).filter(Boolean),
    }));

    return NextResponse.json({ places, type: spotType });
  } catch {
    return NextResponse.json({ error: 'Places search failed' }, { status: 500 });
  }
}
