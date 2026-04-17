'use client';

import { useState, useEffect } from 'react';
import HomeScreen from '@/components/HomeScreen';
import LoadingScreen from '@/components/LoadingScreen';
import ResultsScreen from '@/components/ResultsScreen';
import { AddressItem, Place, LatLng, TransportMode } from '@/lib/types';
import { storage } from '@/lib/storage';
import { getMidpoint, haversine, uid, sleep } from '@/lib/utils';

type Screen = 'home' | 'loading' | 'results';

export default function FindPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<TransportMode>('transit');
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

  // Pre-fill first address from geolocation set during onboarding
  useEffect(() => {
    const saved = storage.myAddress;
    if (saved) {
      setAddresses((prev) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], value: saved };
        return updated;
      });
    }
  }, []);

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

      // ── Step 2: Calculate travel-time equidistant point ──
      setLoadingStep(2);
      let mid: LatLng;
      try {
        const originsStr = geocoded.map((c) => `${c.lat},${c.lng}`).join('|');
        const eqRes = await fetch(
          `/api/equidistant?origins=${encodeURIComponent(originsStr)}&mode=${mode}`
        );
        const eqData = await eqRes.json();
        mid = eqRes.ok && eqData.lat ? { lat: eqData.lat, lng: eqData.lng } : getMidpoint(geocoded);
      } catch {
        mid = getMidpoint(geocoded);
      }
      setMidpoint(mid);

      // ── Step 3: Find nearby bars ──
      setLoadingStep(3);
      let res = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=800`);
      let data = await res.json();
      let rawPlaces = data.places || [];
      if (rawPlaces.length < 3) {
        res = await fetch(`/api/places?lat=${mid.lat}&lng=${mid.lng}&radius=1500`);
        data = await res.json();
        rawPlaces = data.places || [];
      }

      // Add geographic distance, take top 10 candidates for travel time calc
      let candidates: Place[] = rawPlaces
        .map((p: Omit<Place, 'dist'>) => ({
          ...p,
          dist: haversine(mid.lat, mid.lng, p.lat, p.lng),
        }))
        .sort((a: Place, b: Place) => a.dist - b.dist)
        .slice(0, 10);

      // ── Step 4: Calculate real travel times ──
      setLoadingStep(4);
      try {
        const origins = geocoded.map((c) => `${c.lat},${c.lng}`).join('|');
        const destinations = candidates.map((p) => `${p.lat},${p.lng}`).join('|');
        const ttRes = await fetch(
          `/api/travel-times?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=${mode}`
        );
        const ttData = await ttRes.json();

        if (ttData.matrix) {
          // Attach per-person travel times to each place (matrix is [origin][dest])
          candidates = candidates.map((place, j) => ({
            ...place,
            travelTimes: ttData.matrix.map((row: (number | null)[]) => row[j]),
          }));

          // Re-rank: minimize the maximum travel time (most equitable spot)
          candidates.sort((a, b) => {
            const validA = (a.travelTimes || []).filter((t): t is number => t !== null);
            const validB = (b.travelTimes || []).filter((t): t is number => t !== null);
            const maxA = validA.length ? Math.max(...validA) : Infinity;
            const maxB = validB.length ? Math.max(...validB) : Infinity;
            return maxA - maxB;
          });
        }
      } catch {
        // Travel times unavailable — keep geographic sort, no big deal
      }

      await sleep(400);
      setPlaces(candidates.slice(0, 15));
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
          mode={mode}
          setMode={setMode}
        />
      )}
      {screen === 'loading' && <LoadingScreen step={loadingStep} />}
      {screen === 'results' && midpoint && (
        <ResultsScreen
          coords={coords}
          midpoint={midpoint}
          places={places}
          mode={mode}
          onBack={() => setScreen('home')}
        />
      )}
    </>
  );
}
