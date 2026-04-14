import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('input');
  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ predictions: [] });

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'fr');
    url.searchParams.set('types', 'geocode');

    const res = await fetch(url.toString());
    const data = await res.json();

    const predictions = (data.predictions || []).slice(0, 5).map((p: {
      place_id: string;
      description: string;
      structured_formatting: { main_text: string; secondary_text?: string };
    }) => ({
      place_id: p.place_id,
      description: p.description,
      main: p.structured_formatting.main_text,
      secondary: p.structured_formatting.secondary_text || '',
    }));

    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
