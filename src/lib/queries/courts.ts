import { SupabaseClient } from "@supabase/supabase-js";
import type { BoundingBox, Court, CourtCreateFormData } from "../court-types";

export async function getApprovedCourts(
  supabase: SupabaseClient,
  sportFilter?: string,
  bounds?: BoundingBox | null
): Promise<Court[]> {
  let query = supabase
    .from("courts")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (sportFilter) {
    query = query.contains("sport_types", [sportFilter]);
  }

  if (bounds) {
    query = query
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data as Court[];
}

export async function createCourt(
  supabase: SupabaseClient,
  courtData: CourtCreateFormData
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("courts")
    .insert({
      name: courtData.name,
      description: courtData.description || null,
      address: courtData.address,
      latitude: courtData.coordinates?.lat,
      longitude: courtData.coordinates?.lng,
      sport_types: courtData.sportTypes,
      image_url: courtData.imageUrl || null,
      created_by: user?.id,
      status: "pending",
    })
    .select("*")
    .single();

  return {
    data: (data as Court | null) ?? null,
    error,
  };
}
