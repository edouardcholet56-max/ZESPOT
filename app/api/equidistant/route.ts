/**
 * Travel-time equidistant midpoint
 *
 * Uses an iterative weighted-centroid algorithm (Weiszfeld-inspired):
 *   1. Start from geographic midpoint
 *   2. Get real travel times from all origins → current candidate
 *   3. Re-weight each origin by its travel time (slower traveller pulls more)
 *   4. Compute new candidate as weighted centroid
 *   5. Repeat up to MAX_ITER times
 *
 * Result: the point minimising travel-time variance (fairest spot).
 */

import { NextRequest, NextResponse } from 'next/server';

const MAX_ITER = 3;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const originsParam = searchParams.get('origins'); // "lat1,lng1|lat2,lng2|…"
  const mode = searchParams.get('mode') || 'transit';

  if (!originsParam) {
    return NextResponse.json({ error: 'origins required' }, { status: 400 });
  }

  const KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!KEY) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  const origins = originsParam.split('|').map((o) => {
    const [lat, lng] = o.split(',').map(Number);
    return { lat, lng };
  }).filter((o) => !isNaN(o.lat) && !isNaN(o.lng));

  if (origins.length === 0) {
    return NextResponse.json({ error: 'No valid origins' }, { status: 400 });
  }

  // Single origin → return as-is
  if (origins.length === 1) {
    return NextResponse.json(origins[0]);
  }

  // Geographic centroid as starting point
  let point = {
    lat: origins.reduce((s, o) => s + o.lat, 0) / origins.length,
    lng: origins.reduce((s, o) => s + o.lng, 0) / origins.length,
  };

  // Map our mode names → Google API mode string
  const gmMode =
    mode === 'bicycling' ? 'bicycling' :
    mode === 'walking'   ? 'walking'   :
    mode === 'driving'   ? 'driving'   :
    'transit';

  for (let iter = 0; iter < MAX_ITER; iter++) {
    try {
      const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
      const dest = `${point.lat},${point.lng}`;

      const params = new URLSearchParams({
        origins: originsStr,
        destinations: dest,
        mode: gmMode,
        key: KEY,
        language: 'fr',
      });
      if (gmMode === 'transit') params.set('transit_mode', 'subway|bus|tram');

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
      );
      const data = await res.json();

      if (data.status !== 'OK') break;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const times: number[] = (data.rows ?? []).map((row: any) => {
        const el = row.elements?.[0];
        return el?.status === 'OK' ? (el.duration.value as number) : 0;
      });

      const totalTime = times.reduce((s, t) => s + t, 0);
      if (totalTime === 0) break;

      // Weighted centroid: origins with longer travel time attract the midpoint
      const newLat = origins.reduce((s, o, i) => s + o.lat * times[i], 0) / totalTime;
      const newLng = origins.reduce((s, o, i) => s + o.lng * times[i], 0) / totalTime;

      // Convergence check — stop if movement is negligible (< ~5 m)
      const dlat = Math.abs(newLat - point.lat);
      const dlng = Math.abs(newLng - point.lng);
      point = { lat: newLat, lng: newLng };
      if (dlat < 0.00005 && dlng < 0.00005) break;
    } catch {
      break; // fall back to best point found so far
    }
  }

  return NextResponse.json(point);
}
