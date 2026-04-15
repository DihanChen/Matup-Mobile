import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParticipantInfo } from "./event-detail";
import { syncProfileFromAuthUser } from "./profile";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  sport_type: string;
  location: string;
  datetime: string;
  max_participants: number;
  creator_id: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  skill_level: string;
  cover_url?: string | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
};

type ParticipantRow = {
  event_id: string;
  user_id: string;
};

export type EventWithMetadata = EventRow & {
  participant_count: number;
  creator_name: string;
  is_joined_by_current_user: boolean;
};

type EventBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export async function getCurrentUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getUpcomingEventsWithMetadata(
  supabase: SupabaseClient,
  sportFilter: string,
  bounds?: EventBounds | null,
  currentUserId?: string | null
): Promise<EventWithMetadata[]> {
  let query = supabase
    .from("events")
    .select("*")
    .gte("datetime", new Date().toISOString())
    .order("datetime", { ascending: true });

  if (sportFilter) {
    query = query.eq("sport_type", sportFilter);
  }

  if (bounds) {
    query = query
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east);
  }

  const { data: eventsData, error } = await query;
  if (error || !eventsData || eventsData.length === 0) {
    return [];
  }

  const eventIds = eventsData.map((event) => event.id);
  const creatorIds = [...new Set(eventsData.map((event) => event.creator_id))];

  const [{ data: participantsData }, { data: profilesData }] = await Promise.all([
    supabase.from("event_participants").select("event_id, user_id").in("event_id", eventIds),
    supabase.from("profiles").select("id, name").in("id", creatorIds),
  ]);

  const counts: Record<string, number> = {};
  const joinedEventIds = new Set<string>();
  (participantsData as ParticipantRow[] | null)?.forEach((participant) => {
    counts[participant.event_id] = (counts[participant.event_id] || 0) + 1;
    if (currentUserId && participant.user_id === currentUserId) {
      joinedEventIds.add(participant.event_id);
    }
  });

  const creatorNames: Record<string, string> = {};
  (profilesData as ProfileRow[] | null)?.forEach((profile) => {
    creatorNames[profile.id] = profile.name || "Anonymous";
  });

  return eventsData.map((event) => ({
    ...(event as EventRow),
    participant_count: counts[event.id] || 0,
    creator_name: creatorNames[event.creator_id] || "Anonymous",
    is_joined_by_current_user: joinedEventIds.has(event.id),
  }));
}

export async function joinEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<{
  participant: ParticipantInfo | null;
  userId: string | null;
  error: string | null;
  requiresAuth: boolean;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      participant: null,
      userId: null,
      error: null,
      requiresAuth: true,
    };
  }

  const syncedProfile = await syncProfileFromAuthUser(supabase, user);
  const { data, error } = await supabase
    .from("event_participants")
    .insert({ event_id: eventId, user_id: user.id })
    .select("id, user_id")
    .single();

  if (error || !data) {
    return {
      participant: null,
      userId: user.id,
      error: error?.message || "Failed to join event.",
      requiresAuth: false,
    };
  }

  return {
    participant: {
      id: data.id,
      user_id: data.user_id,
      name: syncedProfile.name,
      avatar_url: syncedProfile.avatar_url,
    },
    userId: user.id,
    error: null,
    requiresAuth: false,
  };
}
