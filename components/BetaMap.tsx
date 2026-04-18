'use client';

import { useEffect, useRef } from 'react';
import { LatLng, Place } from '@/lib/types';

interface Props {
  coords: LatLng[];
  midpoint: LatLng;
  places: Place[];
  selectedPlaceId: string | null;
  onPlaceSelect?: (place: Place) => void;
}

/**
 * Light-themed map for /beta.
 * - Pink midpoint
 * - White person markers
 * - Pink pill markers for spots, gold-outlined for 4★+
 */
export default function BetaMap({
  coords,
  midpoint,
  places,
  selectedPlaceId,
  onPlaceSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      // Destroy previous instance
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [midpoint.lat, midpoint.lng],
        zoom: 15,
        zoomControl: false,
      });
      mapRef.current = map;

      // Light CartoDB tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // ── Person markers (soft white circles) ──
      coords.forEach((c, i) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:32px;height:32px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,0.12);border:2px solid #FF4D8F;">${i === 0 ? '🏠' : '👋'}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([c.lat, c.lng], { icon }).addTo(map);
      });

      // ── Midpoint (green with halo) ──
      const midIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#10D29B;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 6px rgba(16,210,155,0.25),0 4px 12px rgba(0,0,0,0.15);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([midpoint.lat, midpoint.lng], { icon: midIcon }).addTo(map);

      // ── Spot markers ──
      places.forEach((p) => {
        const isSelected = p.place_id === selectedPlaceId;
        const isTop = (p.rating ?? 0) >= 4;

        const bg = isSelected ? '#FF4D8F' : '#fff';
        const color = isSelected ? '#fff' : '#1F1B2E';
        const border = isTop ? '#F5B800' : isSelected ? '#FF4D8F' : '#F0E5EA';
        const borderWidth = isTop ? 3 : 2;
        const scale = isSelected ? 1.12 : 1;

        const ratingHtml =
          p.rating != null
            ? `<span style="font-size:10px;font-weight:800;margin-left:3px;">${isTop ? '⭐' : '★'}${p.rating.toFixed(1)}</span>`
            : '';

        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${bg};color:${color};border:${borderWidth}px solid ${border};border-radius:14px;padding:5px 9px;display:inline-flex;align-items:center;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,${isSelected ? 0.22 : 0.1});transform:scale(${scale});transition:all 0.2s;cursor:pointer;max-width:140px;overflow:hidden;text-overflow:ellipsis;">
            ${p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name}${ratingHtml}
          </div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
        marker.on('click', () => onPlaceSelect?.(p));
      });

      // Fit bounds around everything
      const allPoints = [
        ...coords.map((c) => [c.lat, c.lng] as [number, number]),
        [midpoint.lat, midpoint.lng] as [number, number],
        ...places.map((p) => [p.lat, p.lng] as [number, number]),
      ];
      if (allPoints.length > 1) {
        map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 16 });
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, midpoint, places, selectedPlaceId]);

  // Pan to selected place
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current) return;
    const place = places.find((p) => p.place_id === selectedPlaceId);
    if (place) {
      mapRef.current.setView([place.lat, place.lng], 16);
    }
  }, [selectedPlaceId, places]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}
