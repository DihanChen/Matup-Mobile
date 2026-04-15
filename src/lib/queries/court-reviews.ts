import type { SupabaseClient } from "@supabase/supabase-js";

export async function submitCourtReview(
  supabase: SupabaseClient,
  courtId: string,
  userId: string,
  rating: number,
  comment: string | null
) {
  return supabase.from("court_reviews").upsert(
    {
      court_id: courtId,
      user_id: userId,
      rating,
      comment,
    },
    { onConflict: "court_id,user_id" }
  );
}

export async function deleteCourtReview(supabase: SupabaseClient, reviewId: string) {
  return supabase.from("court_reviews").delete().eq("id", reviewId);
}
