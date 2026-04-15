import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCourtById(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.from("courts").select("*").eq("id", id).single();
  return data;
}

export async function getCourtReviews(supabase: SupabaseClient, courtId: string) {
  const { data } = await supabase
    .from("court_reviews")
    .select("*, profiles:user_id(name, avatar_url)")
    .eq("court_id", courtId)
    .order("created_at", { ascending: false });
  return data;
}
