export type TransportMode = 'walking' | 'bicycling' | 'transit';

export interface AddressItem {
  id: string;
  value: string;
  label?: string; // participant name
}

export interface Place {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  open_now?: boolean;
  dist: number;
  photo_reference?: string;
  photo_references?: string[];     // up to 3 photos
  travelTimes?: (number | null)[]; // seconds per participant, null if unavailable
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SessionParticipant {
  name: string;
  address: string;
}

export interface Session {
  id: string;
  mode: TransportMode;
  participants: SessionParticipant[];
  createdAt: number;
}

export interface EventParticipant {
  id: string;
  name: string;
  address?: string;
  joinedAt: number;
}

export type SpotVibe =
  | 'darts'
  | 'billiard'
  | 'sports'
  | 'cocktails'
  | 'live'
  | 'terrace'
  | 'games'
  | 'rooftop';

export interface SpotFilters {
  vibes: SpotVibe[];
  price?: 1 | 2 | 3;    // 1=€  2=€€  3=€€€
  openNow?: boolean;
  lateClosure?: boolean;
}

export interface SoireeEvent {
  id: string;
  name: string;
  date: string;       // "2026-04-20"
  time?: string;      // "20:00"
  description?: string;
  createdBy: string;
  createdAt: number;
  participants: EventParticipant[];
  mode: TransportMode;
  filters?: SpotFilters;
}
