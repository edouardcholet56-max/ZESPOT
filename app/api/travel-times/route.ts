import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origins = searchParams.get('origins');       // "lat1,lng1|lat2,lng2"
  const destinations = searchParams.get('destinations'); // "lat1,lng1|lat2,lng2"
  const mode = searchParams.get('mode') || 'transit'; // walking|bicycling|transit

  if (!origins || !destinations) {
    return NextResponse.json({ error: 'origins and destinations required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  try {
    const params = new URLSearchParams({
      origins,
      destinations,
      mode,
      key,
      language: 'fr',
    });
    if (mode === 'transit') params.set('transit_mode', 'subway|bus|tram');

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`
    );
    const data = await res.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ error: `Distance Matrix: ${data.status}` }, { status: 502 });
    }

    // matrix[originIdx][destIdx] = seconds, or null if route unavailable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matrix: (number | null)[][] = data.rows.map((row: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.elements.map((el: any) =>
        el.status === 'OK' ? (el.duration.value as number) : null
      )
    );

    return NextResponse.json({ matrix });
  } catch {
    return NextResponse.json({ error: 'Travel times calculation failed' }, { status: 500 });
  }
}
