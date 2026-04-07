import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const w = request.nextUrl.searchParams.get('w') || '400';

  if (!ref) return NextResponse.json({ error: 'ref required' }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  try {
    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photo_reference=${ref}&key=${key}`;
    const res = await fetch(googleUrl, { redirect: 'follow' });

    if (!res.ok) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // cache 24h
      },
    });
  } catch {
    return NextResponse.json({ error: 'Photo fetch failed' }, { status: 500 });
  }
}
