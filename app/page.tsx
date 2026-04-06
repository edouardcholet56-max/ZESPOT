'use client';

import { useState } from 'react';
import HomeScreen from '@/components/HomeScreen';
import LoadingScreen from '@/components/LoadingScreen';
import ResultsScreen from '@/components/ResultsScreen';
import { AddressItem, Place, LatLng } from '@/lib/types';
import { getMidpoint, haversine, uid, sleep } from '@/lib/utils';

type Screen = 'home' | 'loading' | 'results';

export default function Page() {
  const [screen, setScreen] = useState<Screen>('home');
  const [addresses, setAddresses] = useState<AddressItem[]>([
    { id: uid(), value: '' },
    { id: uid(), value: '' },
    { id: uid(), value: '' },
  ]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [coords, setCoords] = useState<(LatLng & { formatted: string })[]>([]);
  const [midpoint, setMidpoint] = useState<LatLng | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState('');

  const findSpot = async () => {
    const filled = addresses.filter((a) => a.value.trim().length > 0);
    if (filled.length < 2) {
      setError('Entre au moins 2 adresses !');
      return;
    }
    setError('');
    setScreen('loading');
    setLoadingStep(1);

    try {
      // ── Step 1: Geocode all addresses ──
      const geocoded: (LatLng & { formatted: string })[] = [];
      for (const addr of filled) {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(addr.value)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Geocoding failed');
        geocoded.push(data);
      }
      setCoords(geocoded);

      // ── Step 2: Calculate midpoint ──
      setLoadingStep(2);
      await sleep(400);
      const mid = getMidpoint(geocoded);
      setMidpoint(mid);

      // ── Step 3: Find nearby bars ──
      setLoadingStep(3);
      let res = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=800`);
      let data = await res.json();
      let rawPlaces = data.places || [];

      // Expand radius if too few results
      if (rawPlaces.length < 3) {
        res = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=1500`);
        data = await res.json();
        rawPlaces = data.places || [];
      }

      // Enrich with distance from midpoint, sort, cap
      const sorted: Place[] = rawPlaces
        .map((p: Omit<Place, 'dist'>) => ({
          ...p,
          dist: haversine(mid.lat, mid.lng, p.lat, p.lng),
        }))
        .sort((a: Place, b: Place) => a.dist - b.dist)
        .slice(0, 15);

      setPlaces(sorted);
      await sleep(500);
      setScreen('results');
    } catch (err: unknown) {
      setScreen('home');
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  };

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          addresses={addresses}
          setAddresses={setAddresses}
          onFind={findSpot}
          error={error}
          setError={setError}
        />
      )}
      {screen === 'loading' && <LoadingScreen step={loadingStep} />}
      {screen === 'results' && midpoint && (
        <ResultsScreen
          coords={coords}
          midpoint={midpoint}
          places={places}
          onBack={() => setScreen('home')}
        />
      )}
    </>
  );
}
