import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=fr`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results[0]) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    return NextResponse.json({ address: data.results[0].formatted_address });
  } catch {
    return NextResponse.json({ error: 'Reverse geocoding failed' }, { status: 500 });
  }
}
