export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "ai_checking"
  | "needs_review"
  | "approved"
  | "published"
  | "paused"
  | "rejected"
  | "expired"
  | "deleted";

export interface ListingImage {
  id: string;
  image: string;
  thumb: string | null;
  order: number;
  is_primary: boolean;
}

export interface Property {
  id: string;
  property_type: "apartment" | "house" | "room" | "office" | "commercial";
  rooms: number;
  area: number;
  floor: number | null;
  total_floors: number | null;
  furnished: boolean;
  has_parking: boolean;
  has_elevator: boolean;
  has_ac: boolean;
  has_internet: boolean;
  family_ok: boolean;
  students_ok: boolean;
  min_rental_months: number;
  deposit: number | null;
  description: string;
  city: string;
  district: string;
  address_line: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: "exact" | "approximate";
  amenities: { key: string; label: string }[];
}

export interface OwnerSummary {
  id: string;
  full_name: string;
  avatar: string | null;
  is_phone_verified: boolean;
  is_profile_verified: boolean;
  member_since: string | null;
  active_listings: number;
  role: string;
}

export interface ListingSummary {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  status: ListingStatus;
  views: number;
  created_at: string;
  published_at: string | null;
  property: Property;
  primary_image: { id: string; image: string; thumb: string | null } | null;
  image_count: number;
  owner: OwnerSummary;
  is_favorite: boolean;
  risk_level: string | null;
}

export interface ListingDetail extends ListingSummary {
  images: ListingImage[];
  verification: {
    owner_phone_verified: boolean;
    owner_profile_verified: boolean;
    listing_checked: boolean;
    risk_level: string | null;
    risk_reasons: string[];
  };
}

export interface MapMarker {
  id: string;
  slug: string;
  title: string;
  price: number;
  lat: number;
  lng: number;
  district: string;
  rooms: number | null;
  area: number | null;
  location_accuracy: "exact" | "approximate";
}

export interface UserProfile {
  id: string;
  phone: string;
  full_name: string;
  avatar: string | null;
  role: "tenant" | "owner" | "moderator" | "admin";
  is_phone_verified: boolean;
  is_profile_verified: boolean;
  trust_tier: string;
  city: string;
}

export interface Conversation {
  id: string;
  listing: ListingSummary;
  owner: OwnerSummary;
  tenant: OwnerSummary;
  last_message: string | null;
  last_message_at: string | null;
  updated_at: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  created_at: string;
}

export interface PopularArea {
  district: string;
  count: number;
  avg_price: number | null;
}

export interface PlatformStats {
  active_listings: number;
  districts: number;
  verified_owners: number;
}