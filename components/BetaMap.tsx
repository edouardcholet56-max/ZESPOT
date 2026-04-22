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
 *
 * IMPORTANT: the map is built ONCE per places/coords/midpoint change.
 * Selection changes never rebuild the map — they only update marker icons
 * and gently pan (no zoom change) so the user keeps their zoom level.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // Spot markers keyed by place_id so we can update their icons on selection change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeMarkersRef = useRef<Map<string, any>>(new Map());

  // ── Build/rebuild map when data changes (NOT on selection change) ──
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      placeMarkersRef.current = new Map();

      const map = L.map(containerRef.current, {
        center: [midpoint.lat, midpoint.lng],
        zoom: 15,
        zoomControl: false,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Person markers — small black square with Helvetica Neue uppercase label.
      coords.forEach((c, i) => {
        const label = i === 0 ? 'TOI' : `A${i}`;
        const icon = L.divIcon({
          className: '',
          html: `<div style="display:flex;align-items:center;gap:4px;white-space:nowrap;">
            <div style="width:10px;height:10px;background:#000;"></div>
            <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:10px;letter-spacing:0.12em;color:#000;background:rgba(255,255,255,0.95);padding:2px 6px;border:1px solid rgba(0,0,0,0.15);">${label}</div>
          </div>`,
          iconSize: [60, 14],
          iconAnchor: [5, 7],
        });
        L.marker([c.lat, c.lng], { icon }).addTo(map);
      });

      // Midpoint — black cross.
      const midIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:14px;height:14px;">
          <div style="position:absolute;left:6px;top:0;width:2px;height:14px;background:#000;"></div>
          <div style="position:absolute;top:6px;left:0;width:14px;height:2px;background:#000;"></div>
        </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([midpoint.lat, midpoint.lng], { icon: midIcon }).addTo(map);

      // Spot markers — store in ref for later updates
      places.forEach((p) => {
        const isSelected = p.place_id === selectedPlaceId;
        const marker = L.marker([p.lat, p.lng], {
          icon: buildSpotIcon(L, p, isSelected),
        }).addTo(map);
        marker.on('click', () => onPlaceSelect?.(p));
        placeMarkersRef.current.set(p.place_id, marker);
      });

      // Initial fit-to-bounds
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
  }, [coords, midpoint, places]); // ← no selectedPlaceId here

  // ── Selection change: update icons + gentle pan (NO zoom change) ──
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Update every spot marker icon so old selection goes back to normal
    places.forEach((p) => {
      const marker = placeMarkersRef.current.get(p.place_id);
      if (!marker) return;
      const isSelected = p.place_id === selectedPlaceId;
      marker.setIcon(buildSpotIcon(L, p, isSelected));
      if (isSelected) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });

    // Gently pan if the selected spot is outside the visible area,
    // preserving the user's current zoom level.
    if (selectedPlaceId) {
      const place = places.find((p) => p.place_id === selectedPlaceId);
      if (place) {
        const latlng = L.latLng(place.lat, place.lng);
        const bounds = map.getBounds();
        if (!bounds.contains(latlng)) {
          map.panTo(latlng, { animate: true, duration: 0.4 });
        }
      }
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

// ── Icon factory ────────────────────────────────────────────────────────
// Helvetica Neue style: small square markers — thin outline by default,
// filled black when selected. Selected marker shows the venue name underneath.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSpotIcon(L: any, p: Place, isSelected: boolean) {
  const dotSize = isSelected ? 12 : 9;

  const dot = isSelected
    ? `<div style="width:${dotSize}px;height:${dotSize}px;background:#000;border:1px solid #000;cursor:pointer;"></div>`
    : `<div style="width:${dotSize}px;height:${dotSize}px;background:#fff;border:1.5px solid #000;cursor:pointer;"></div>`;

  const label = isSelected
    ? `<div style="position:absolute;top:${dotSize + 4}px;left:50%;transform:translateX(-50%);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.04em;color:#000;background:rgba(255,255,255,0.97);padding:3px 7px;border:1px solid rgba(0,0,0,0.15);white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${
        p.name.length > 22 ? p.name.slice(0, 20) + '…' : p.name
      }</div>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;">
      ${dot}
      ${label}
    </div>`,
    iconSize: [dotSize, dotSize],
    iconAnchor: [dotSize / 2, dotSize / 2],
  });
}
