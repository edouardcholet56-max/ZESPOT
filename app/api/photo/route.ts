import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  const w = request.nextUrl.searchParams.get('w') || '400';

  if (!ref) return NextResponse.json({ error: 'ref required' }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  try {
    // Try old Places API v1 photo endpoint first
    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photo_reference=${ref}&key=${key}`;
    const res = await fetch(googleUrl, { redirect: 'follow' });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      // Make sure we got an image, not a JSON error
      if (contentType.startsWith('image/')) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Photo fetch failed' }, { status: 500 });
  }
}
