import type { SupabaseClient, User } from "@supabase/supabase-js";

export type EventDetailEvent = {
  id: string;
  title: string;
  description: string | null;
  sport_type: string;
  location: string;
  datetime: string;
  duration: number;
  max_participants: number;
  creator_id: string;
  created_at: string;
  skill_level: string;
  latitude: number | null;
  longitude: number | null;
  cover_url?: string | null;
  location_name?: string | null;
  address_line?: string | null;
};

export type ParticipantInfo = {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
};

export type EventComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
};

export type HostInfo = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type EventDetailData = {
  error: string | null;
  event: EventDetailEvent | null;
  host: HostInfo | null;
  participants: ParticipantInfo[];
  existingReviews: string[];
  comments: EventComment[];
};

export async function fetchEventDetailData(
  supabase: SupabaseClient,
  eventId: string,
  user: User | null
): Promise<EventDetailData> {
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !eventData) {
    return {
      error: "Event not found",
      event: null,
      host: null,
      participants: [],
      existingReviews: [],
      comments: [],
    };
  }

  const event = eventData as EventDetailEvent;

  let host: HostInfo | null;
  if (user && event.creator_id === user.id) {
    host = {
      id: user.id,
      name: user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    };
  } else {
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .eq("id", event.creator_id)
      .single();

    host = hostProfile || {
      id: event.creator_id,
      name: null,
      avatar_url: null,
    };
  }

  const { data: participantsData } = await supabase
    .from("event_participants")
    .select("id, user_id")
    .eq("event_id", eventId);

  const participantRows = participantsData || [];
  const participantIds = participantRows.map((participant) => participant.user_id);
  const { data: participantProfiles } = participantIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", participantIds)
    : { data: [] as Array<{ id: string; name: string | null; avatar_url: string | null }> };
  const participantProfileById = new Map(
    (participantProfiles || []).map((profile) => [profile.id, profile])
  );

  const participants: ParticipantInfo[] = participantRows.map((participant) => {
    if (user && participant.user_id === user.id) {
      return {
        id: participant.id,
        user_id: participant.user_id,
        name: user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      };
    }

    const profile = participantProfileById.get(participant.user_id);
    return {
      id: participant.id,
      user_id: participant.user_id,
      name: profile?.name || null,
      avatar_url: profile?.avatar_url || null,
    };
  });

  const existingReviews: string[] = [];
  if (user) {
    const { data: userReviews } = await supabase
      .from("reviews")
      .select("reviewed_id")
      .eq("event_id", eventId)
      .eq("reviewer_id", user.id);

    (userReviews || []).forEach((review) => existingReviews.push(review.reviewed_id));
  }

  const { data: commentsData } = await supabase
    .from("event_comments")
    .select("id, content, created_at, user_id")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const commentRows = commentsData || [];
  const commenterIds = commentRows.map((comment) => comment.user_id);
  const { data: commenterProfiles } = commenterIds.length
    ? await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", commenterIds)
    : { data: [] as Array<{ id: string; name: string | null; avatar_url: string | null }> };
  const commenterProfileById = new Map(
    (commenterProfiles || []).map((profile) => [profile.id, profile])
  );

  const comments: EventComment[] = commentRows.map((comment) => {
    if (user && comment.user_id === user.id) {
      return {
        ...comment,
        user_name: user.user_metadata?.name || null,
        user_avatar: user.user_metadata?.avatar_url || null,
      };
    }

    const profile = commenterProfileById.get(comment.user_id);
    return {
      ...comment,
      user_name: profile?.name || null,
      user_avatar: profile?.avatar_url || null,
    };
  });

  return {
    error: null,
    event,
    host,
    participants,
    existingReviews,
    comments,
  };
}
