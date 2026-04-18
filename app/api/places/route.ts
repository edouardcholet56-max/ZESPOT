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
const SPOT_TYPE_MAP: Record<string, string> = {
  bar:        'bar',
  restaurant: 'restaurant',
  park:       'park',
  museum:     'museum',
};

/**
 * Strict filter rules for each spot type.
 * - `require`: at least one of these must appear in the result's `types` array
 * - `excludeTypes`: hard reject if any of these appear (e.g. cinema tagged "restaurant")
 *
 * This is necessary because Google Places' `type` query param is a loose filter —
 * a cinema with a brasserie inside shows up for `type=restaurant`.
 */
const TYPE_FILTERS: Record<string, { require: string[]; excludeTypes: string[] }> = {
  bar: {
    require: ['bar', 'night_club', 'pub'],
    excludeTypes: ['lodging', 'movie_theater', 'gas_station', 'supermarket', 'convenience_store', 'pharmacy', 'bakery', 'cafe'],
  },
  restaurant: {
    require: ['restaurant', 'meal_takeaway', 'meal_delivery'],
    excludeTypes: ['movie_theater', 'lodging', 'gas_station', 'supermarket', 'convenience_store', 'pharmacy', 'tourist_attraction', 'shopping_mall', 'department_store', 'amusement_park', 'casino', 'bar', 'night_club'],
  },
  park: {
    require: ['park'],
    excludeTypes: ['parking', 'amusement_park', 'campground', 'rv_park'],
  },
  museum: {
    require: ['museum', 'art_gallery'],
    excludeTypes: ['movie_theater', 'store', 'shopping_mall'],
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '800';
  const vibesParam = searchParams.get('vibes') || '';
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

  const googleType = SPOT_TYPE_MAP[spotType] || 'bar';
  const filter = TYPE_FILTERS[spotType] || TYPE_FILTERS.bar;

  try {
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
    const allResults: any[] = data.results || [];

    // Strict type filtering: require matching types, exclude unwanted types
    const filtered = allResults.filter((p) => {
      const types: string[] = p.types || [];
      const hasRequired = filter.require.some((t) => types.includes(t));
      const hasExcluded = filter.excludeTypes.some((t) => types.includes(t));
      return hasRequired && !hasExcluded;
    });

    const places = filtered.map((p) => ({
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
      types: types(p),
    }));

    return NextResponse.json({ places, type: spotType, raw: allResults.length, kept: filtered.length });
  } catch {
    return NextResponse.json({ error: 'Places search failed' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function types(p: any): string[] {
  return Array.isArray(p.types) ? p.types : [];
}
