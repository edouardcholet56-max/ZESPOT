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
