import type { SupabaseClient, User } from "@supabase/supabase-js";

type ProfileRow = {
  name: string | null;
  avatar_url: string | null;
};

export type SyncedProfile = {
  name: string | null;
  avatar_url: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function syncProfileFromAuthUser(
  supabase: SupabaseClient,
  user: User
): Promise<SyncedProfile> {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const metadataName = normalizeString(metadata?.name) ?? normalizeString(metadata?.full_name);
  const metadataAvatar =
    normalizeString(metadata?.avatar_url) ?? normalizeString(metadata?.picture);

  const fallback: SyncedProfile = {
    name: metadataName,
    avatar_url: metadataAvatar,
  };

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const existing = (existingProfile as ProfileRow | null) ?? null;
  const nextProfile: SyncedProfile = {
    name: normalizeString(existing?.name) ?? fallback.name,
    avatar_url: normalizeString(existing?.avatar_url) ?? fallback.avatar_url,
  };

  const needsUpsert =
    !existing ||
    existing.name !== nextProfile.name ||
    existing.avatar_url !== nextProfile.avatar_url;

  if (needsUpsert) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        name: nextProfile.name,
        avatar_url: nextProfile.avatar_url,
      },
      { onConflict: "id" }
    );
  }

  return nextProfile;
}
