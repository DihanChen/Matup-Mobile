import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState, ErrorState } from "@/components/ui";
import {
  HOSTED_EVENTS_EMPTY_TITLE,
  HOSTED_EVENTS_LOADING_ERROR,
  HOSTED_EVENTS_SECTION_LABEL,
  LEAGUE_STATS_TITLE,
  STAT_PLAYED_LABEL,
  STAT_WIN_RATE_LABEL,
  STAT_WON_LABEL,
  STAT_LOST_LABEL,
  STATS_LOAD_ERROR,
} from "@/lib/profile-strings";

type PublicProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

type HostedEvent = {
  id: string;
  title: string;
  sport: string;
  starts_at: string;
  location: string;
  max_participants: number | null;
  current_participants: number | null;
};

type HostedEventsApiResponse = {
  events?: HostedEvent[];
};

type LeagueStats = {
  played: number;
  won: number;
  lost: number;
  winRate: number;
};

type LeagueStatsApiResponse = {
  stats?: LeagueStats;
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatEventDate(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const month = MONTH_LABELS[date.getMonth()] ?? "";
  return `${month} ${date.getDate()}`;
}

function formatSpots(event: HostedEvent): string {
  const current = event.current_participants ?? 0;
  if (event.max_participants == null) {
    return `${current} joined`;
  }
  return `${current} / ${event.max_participants} spots`;
}

function capitalize(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StatColumn({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{ fontSize: 11, color: Colors.textSecondary, marginBottom: 4 }}
      >
        {label}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: "800", color }}>{value}</Text>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostedEvents, setHostedEvents] = useState<HostedEvent[]>([]);
  const [hostedLoading, setHostedLoading] = useState(true);
  const [hostedError, setHostedError] = useState(false);
  const [stats, setStats] = useState<LeagueStats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [statsReloadKey, setStatsReloadKey] = useState(0);

  useEffect(() => {
    async function fetch() {
      if (!id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, bio, created_at")
        .eq("id", id)
        .single();
      setProfile(data as PublicProfile | null);
      setLoading(false);
    }
    fetch();
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchHosted() {
      if (!id) return;
      setHostedLoading(true);
      setHostedError(false);
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (authSession?.access_token) {
          headers.Authorization = `Bearer ${authSession.access_token}`;
        }

        const response = await fetch(
          `${getApiBaseUrl()}/api/users/${id}/hosted-events`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as HostedEventsApiResponse;
        if (cancelled) return;
        setHostedEvents(Array.isArray(payload.events) ? payload.events : []);
      } catch {
        if (cancelled) return;
        setHostedError(true);
      } finally {
        if (!cancelled) {
          setHostedLoading(false);
        }
      }
    }

    fetchHosted();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      if (!id) return;
      setStatsError(false);
      try {
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (authSession?.access_token) {
          headers.Authorization = `Bearer ${authSession.access_token}`;
        }

        const response = await fetch(
          `${getApiBaseUrl()}/api/users/${id}/stats`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as LeagueStatsApiResponse;
        if (cancelled) return;
        setStats(payload.stats ?? null);
      } catch {
        if (cancelled) return;
        setStatsError(true);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [id, statsReloadKey]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, padding: 16 }}>
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
          <Skeleton width={140} height={20} style={{ marginBottom: 8 }} />
          <Skeleton width={200} height={14} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Header */}
      <View style={{ paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ alignItems: "center", padding: 24 }}>
          <Avatar name={profile.name} avatarUrl={profile.avatar_url} size={80} />
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.text, marginTop: 12 }}>
            {profile.name || "Anonymous"}
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>
            Joined {joinDate}
          </Text>
          {profile.bio && (
            <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 12, textAlign: "center", lineHeight: 20 }}>
              {profile.bio}
            </Text>
          )}
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: Colors.text,
              marginBottom: 12,
            }}
          >
            {HOSTED_EVENTS_SECTION_LABEL}
          </Text>

          {hostedError ? (
            <ErrorState compact title={HOSTED_EVENTS_LOADING_ERROR} />
          ) : hostedLoading ? (
            <View style={{ gap: 12 }}>
              <Skeleton width="100%" height={64} borderRadius={12} />
              <Skeleton width="100%" height={64} borderRadius={12} />
            </View>
          ) : hostedEvents.length === 0 ? (
            <EmptyState compact title={HOSTED_EVENTS_EMPTY_TITLE} />
          ) : (
            <View style={{ gap: 12 }}>
              {hostedEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/events/${event.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${event.title}, ${capitalize(event.sport)}, ${formatEventDate(event.starts_at)}`}
                  style={{
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: 12,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: Colors.background,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: Colors.accentTint,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.accent,
                      }}
                    >
                      {capitalize(event.sport).slice(0, 3)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: Colors.text,
                      }}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: Colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {formatEventDate(event.starts_at)} • {formatSpots(event)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {(statsError || (stats && stats.played > 0)) && (
          <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: Colors.text,
                marginBottom: 12,
              }}
            >
              {LEAGUE_STATS_TITLE}
            </Text>

            {statsError ? (
              <ErrorState
                compact
                title={STATS_LOAD_ERROR}
                onRetry={() => setStatsReloadKey((k) => k + 1)}
                retryLabel="Try again"
              />
            ) : stats ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: Colors.background,
                }}
              >
                <StatColumn label={STAT_PLAYED_LABEL} value={stats.played} color={Colors.text} />
                <StatColumn label={STAT_WIN_RATE_LABEL} value={`${stats.winRate}%`} color={Colors.accent} />
                <StatColumn label={STAT_WON_LABEL} value={stats.won} color={Colors.success} />
                <StatColumn label={STAT_LOST_LABEL} value={stats.lost} color={Colors.error} />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
