export type Court = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  sport_types: string[];
  image_url: string | null;
  created_by: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type CourtWithDistance = Court & {
  distance?: number;
};

export type CourtCreateFormData = {
  name: string;
  description: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  sportTypes: string[];
  imageUrl: string;
};

export type OsmCourt = {
  osm_id: number;
  osm_type: "way" | "node";
  name: string | null;
  latitude: number;
  longitude: number;
  sport: string;
  surface: string | null;
  lit: boolean | null;
  access: string | null;
  operator: string | null;
  opening_hours: string | null;
};

export type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type DisplayCourt = {
  id: string;
  source: "db" | "osm";
  osm_id: number | null;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sport_types: string[];
  surface: string | null;
  lighting: boolean | null;
  image_url: string | null;
  average_rating: number;
  review_count: number;
  distance?: number;
};

export type CourtDetail = Court & {
  osm_id: number | null;
  source: string;
  surface: string | null;
  num_courts: number | null;
  lighting: boolean | null;
  access_type: string | null;
  amenities: string[];
  operator: string | null;
  opening_hours: string | null;
  average_rating: number;
  review_count: number;
};

export type CourtReview = {
  id: string;
  court_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string | null;
  user_avatar: string | null;
};
