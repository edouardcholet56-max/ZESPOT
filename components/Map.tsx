'use client';

import { useEffect, useRef } from 'react';
import { LatLng, Place } from '@/lib/types';
import { formatDist } from '@/lib/utils';

interface Props {
  coords: (LatLng & { formatted: string })[];
  midpoint: LatLng;
  places: Place[];
  selectedPlaceId: string | null;
  onPlaceSelect?: (place: Place) => void;
}

export default function Map({ coords, midpoint, places, selectedPlaceId, onPlaceSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  // Build / rebuild map when data changes
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
      });
      mapRef.current = map;

      // Dark tile layer (CartoDB)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // ── Person markers ──
      coords.forEach((c, i) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:34px;height:34px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 10px rgba(0,0,0,0.6);border:2px solid #333;">👤</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        L.marker([c.lat, c.lng], { icon })
          .addTo(map)
          .bindPopup(
            `<b>${i === 0 ? 'Toi' : `Ami ${i}`}</b><br><span style="color:#888;font-size:11px">${c.formatted}</span>`
          );
      });

      // ── Midpoint marker ──
      const midIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#FF6B2C;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 5px rgba(255,107,44,0.2),0 2px 8px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([midpoint.lat, midpoint.lng], { icon: midIcon })
        .addTo(map)
        .bindPopup('<b>Point central ✦</b>');

      // ── Bar markers ──
      places.forEach((p, i) => {
        const isTop = i === 0;
        const isSelected = p.place_id === selectedPlaceId;
        const ratingHtml = p.rating != null
          ? `<div style="font-size:9px;font-weight:700;color:#FFD700;line-height:1;margin-top:1px;">★${p.rating.toFixed(1)}</div>`
          : '';
        const icon = L.divIcon({
          className: '',
          html: `<div style="min-width:38px;background:${isSelected ? '#FF6B2C' : '#1a1a1a'};border:2px solid ${isSelected ? '#fff' : isTop ? '#FF6B2C' : '#444'};border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 5px;box-shadow:0 2px 10px rgba(0,0,0,0.7),${isSelected ? '0 0 0 3px rgba(255,107,44,0.4)' : 'none'};cursor:pointer;transform:${isSelected ? 'scale(1.15)' : 'scale(1)'};transition:all 0.2s;">
            <div style="font-size:15px;line-height:1;">🍺</div>
            ${ratingHtml}
          </div>`,
          iconSize: [38, ratingHtml ? 44 : 30],
          iconAnchor: [19, ratingHtml ? 44 : 30],
        });
        const marker = L.marker([p.lat, p.lng], { icon }).addTo(map);
        // Click → select this place (no popup, handled by card)
        marker.on('click', () => {
          onPlaceSelect?.(p);
        });
      });
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, midpoint, places, selectedPlaceId]);

  // Pan to selected place when card is clicked
  useEffect(() => {
    if (!selectedPlaceId || !mapRef.current) return;
    const place = places.find((p) => p.place_id === selectedPlaceId);
    if (place) {
      mapRef.current.setView([place.lat, place.lng], 17);
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
