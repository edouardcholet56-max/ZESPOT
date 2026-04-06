export interface AddressItem {
  id: string;
  value: string;
  coords?: {
    lat: number;
    lng: number;
    formatted: string;
  };
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
}

export interface LatLng {
  lat: number;
  lng: number;
}
