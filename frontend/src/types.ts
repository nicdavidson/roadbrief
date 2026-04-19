// TypeScript interfaces matching backend SQLModel schemas

export interface Ride {
  id: number;
  org_id: number;
  name: string;
  description?: string | null;
  start_date: string; // date as ISO string
  end_date: string;   // date as ISO string
  share_code: string;
  status: string;     // "draft" | "published" | "archived"
  created_by: number;
  created_at: string; // datetime as ISO string
  days?: DayRead[];
}

export interface DayRead {
  id: number;
  ride_id: number;
  day_number: number;
  date: string;       // ISO date string
  title: string;
  notes?: string | null;
  stops?: StopRead[];
  legs?: LegRead[];
  highlights?: HighlightRead[];
}

export interface StopRead {
  id: number;
  day_id: number;
  name: string;
  lat: number;
  lng: number;
  stop_type: string;  // "start" | "gas" | "meal" | "overnight" | "waypoint" | "end"
  order_in_day: number;
  destination_mode: string; // "city_center" | "pinned"
  rally_point_lat?: number | null;
  rally_point_lng?: number | null;
  rally_point_name?: string | null;
  pois?: POIRead[];
}

export interface LegRead {
  id: number;
  day_id: number;
  start_stop_id: number;
  end_stop_id: number;
  route_geometry: string; // encoded polyline from OSRM
  distance_miles: number;
  duration_minutes: number;
  order_in_day: number;
}

export interface POIRead {
  id: number;
  stop_id: number;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  poi_type: string;     // "gas" | "food" | "hotel" | "campground"
  hours?: string | null;
  rating?: number | null;
  phone?: string | null;
  motorcycle_friendly: boolean;
  source: string;       // "google" | "osm" | "manual"
  source_id?: string | null;
}

export interface HighlightRead {
  id: number;
  ride_id: number;
  day_id?: number | null;
  leg_id?: number | null;
  stop_id?: number | null;
  title: string;
  body: string;         // markdown
  category: string;     // "scenic" | "warning" | "cost" | "tip" | "info"
  sort_order: number;
}

// API response shape for GET /api/v1/rides/{share_code}
export interface RideResponse {
  id: number;
  org_id: number;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  share_code: string;
  status: string;
  created_by: number;
  created_at: string;
  days?: DayRead[];
}

// Photo types
export interface PhotoRead {
  id: number;
  ride_id: number;
  day_num?: number | null;
  stop_num?: number | null;
  file_path: string;
  caption?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
}

// Rider profile types
export interface RiderProfile {
  id: number;
  username: string;
  email?: string | null;
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  motorcycle_type?: string | null;
  riding_experience?: string | null;
  created_at: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string;
  motorcycle_type?: string;
  riding_experience?: string;
}
