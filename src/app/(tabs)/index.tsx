import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { EventCard } from "@/components/events/EventCard";
import { EventCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState, ErrorState, Button } from "@/components/ui";
import { Colors } from "@/constants/colors";

type Event = {
  id: string;
  title: string;
  sport_type: string;
  location: string;
  datetime: string;
  max_participants: number;
  skill_level?: string;
  creator_id: string;
  cover_url?: string | null;
  participant_count?: number;
};

type UpcomingFixture = {
  id: string;
  leagueId: string;
  leagueName: string | null;
  sportType: string | null;
  weekNumber: number | null;
  fixtureType: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  court: { id: string; name: string; address: string | null } | null;
  opponents: Array<{ userId: string; name: string; side: string }>;
  pendingSubmissionId: string | null;
  needsAction: boolean;
};

type Tab = "hosting" | "joining" | "past";

const TABS: { id: Tab; label: string }[] = [
  { id: "hosting", label: "Hosting" },
  { id: "joining", label: "Joining" },
  { id: "past", label: "Past" },
];

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("hosting");
  const [createdEvents, setCreatedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState<UpcomingFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchUpcomingFixtures = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const resp = await fetch(`${getApiBaseUrl()}/api/users/me/upcoming-fixtures`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (resp.ok) {
        const json = await resp.json();
        setUpcomingFixtures(json.fixtures || []);
      }
    } catch {
      // Silently fail — events still load from Supabase
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setError(false);

    try {
    const now = new Date().toISOString();

    // Fetch events I'm hosting (upcoming)
    const { data: created } = await supabase
      .from("events")
      .select("*")
      .eq("creator_id", user.id)
      .gte("datetime", now)
      .order("datetime", { ascending: true });

    setCreatedEvents(created || []);

    // Fetch events I've joined (upcoming, not my own)
    const { data: participations } = await supabase
      .from("event_participants")
      .select("event_id")
      .eq("user_id", user.id);

    if (participations && participations.length > 0) {
      const eventIds = participations.map((p) => p.event_id);

      const { data: joined } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds)
        .neq("creator_id", user.id)
        .gte("datetime", now)
        .order("datetime", { ascending: true });

      setJoinedEvents(joined || []);
    } else {
      setJoinedEvents([]);
    }

    // Fetch past events
    const { data: pastCreated } = await supabase
      .from("events")
      .select("*")
      .eq("creator_id", user.id)
      .lt("datetime", now)
      .order("datetime", { ascending: false })
      .limit(10);

    const { data: pastParticipations } = await supabase
      .from("event_participants")
      .select("event_id")
      .eq("user_id", user.id);

    let allPastEvents = pastCreated || [];

    if (pastParticipations && pastParticipations.length > 0) {
      const pastEventIds = pastParticipations.map((p) => p.event_id);
      const { data: pastJoined } = await supabase
        .from("events")
        .select("*")
        .in("id", pastEventIds)
        .neq("creator_id", user.id)
        .lt("datetime", now)
        .order("datetime", { ascending: false })
        .limit(10);

      if (pastJoined) {
        allPastEvents = [...allPastEvents, ...pastJoined];
      }
    }

    allPastEvents.sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
    setPastEvents(allPastEvents.slice(0, 10));
    } catch {
      setError(true);
    }
  }, [user]);

  useEffect(() => {
    Promise.all([fetchData(), fetchUpcomingFixtures()]).finally(() => setLoading(false));
  }, [fetchData, fetchUpcomingFixtures]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchUpcomingFixtures()]);
    setRefreshing(false);
  }, [fetchData, fetchUpcomingFixtures]);

  const getActiveEvents = (): Event[] => {
    switch (activeTab) {
      case "hosting":
        return createdEvents;
      case "joining":
        return joinedEvents;
      case "past":
        return pastEvents;
    }
  };

  const getEmptyMessage = (): string => {
    switch (activeTab) {
      case "hosting":
        return "You haven't created any events yet.";
      case "joining":
        return "You haven't joined any events yet.";
      case "past":
        return "No past events yet.";
    }
  };

  const events = getActiveEvents();

  const actionsNeeded = upcomingFixtures.filter((f) => f.needsAction);
  const nextMatch = upcomingFixtures.find(
    (f) => f.fixtureType !== "time_trial_session" && f.status === "scheduled"
  );
  const thisWeekFixtures = upcomingFixtures.slice(0, 5);

  const formatFixtureDate = (iso: string | null): string => {
    if (!iso) return "TBD";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const getOpponentLabel = (fixture: UpcomingFixture): string => {
    if (fixture.fixtureType === "time_trial_session") return "Running Session";
    if (fixture.opponents.length === 0) return "Opponent TBD";
    return `vs ${fixture.opponents.map((o) => o.name).join(" & ")}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <FlatList
        data={loading ? [] : events}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            {/* Header */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: Colors.text,
                }}
              >
                My{" "}
                <Text style={{ color: Colors.accent }}>Activities</Text>
              </Text>
              <Text
                style={{
                  color: Colors.textSecondary,
                  marginTop: 4,
                  fontSize: 14,
                }}
              >
                Manage your upcoming and past events
              </Text>
            </View>

            {/* My Matches Section */}
            {upcomingFixtures.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                {/* Action Needed Banner */}
                {actionsNeeded.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      const first = actionsNeeded[0];
                      router.push(
                        `/leagues/${first.leagueId}/fixture/${first.id}` as never
                      );
                    }}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: "#fff7ed",
                      borderWidth: 1,
                      borderColor: "#fed7aa",
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: Colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>
                        {actionsNeeded.length}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "600", color: Colors.text, fontSize: 14 }}>
                        Action Needed
                      </Text>
                      <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {actionsNeeded.length === 1
                          ? "1 match needs your attention"
                          : `${actionsNeeded.length} matches need your attention`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* Next Match Card */}
                {nextMatch && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push(
                        `/leagues/${nextMatch.leagueId}/fixture/${nextMatch.id}` as never
                      )
                    }
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: Colors.accent,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                      }}
                    >
                      Next Match
                    </Text>
                    <Text style={{ fontWeight: "700", fontSize: 16, color: Colors.text }}>
                      {getOpponentLabel(nextMatch)}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
                        <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                          {formatFixtureDate(nextMatch.startsAt)}
                        </Text>
                      </View>
                      {nextMatch.court && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                          <Text
                            style={{ fontSize: 12, color: Colors.textSecondary }}
                            numberOfLines={1}
                          >
                            {nextMatch.court.name}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={{ fontSize: 11, color: Colors.textTertiary, marginTop: 4 }}
                      numberOfLines={1}
                    >
                      {nextMatch.leagueName}
                      {nextMatch.weekNumber ? ` · Week ${nextMatch.weekNumber}` : ""}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* This Week's Schedule */}
                {thisWeekFixtures.length > 1 && (
                  <View
                    style={{
                      backgroundColor: Colors.surface,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: Colors.textSecondary,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 8,
                      }}
                    >
                      Upcoming Schedule
                    </Text>
                    {thisWeekFixtures.map((f, i) => (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => {
                          if (f.fixtureType === "time_trial_session") {
                            router.push(`/leagues/${f.leagueId}` as never);
                          } else {
                            router.push(`/leagues/${f.leagueId}/fixture/${f.id}` as never);
                          }
                        }}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: Colors.borderLight,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 13, fontWeight: "500", color: Colors.text }}
                            numberOfLines={1}
                          >
                            {getOpponentLabel(f)}
                          </Text>
                          <Text
                            style={{ fontSize: 11, color: Colors.textTertiary, marginTop: 2 }}
                            numberOfLines={1}
                          >
                            {f.leagueName}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                            {formatFixtureDate(f.startsAt)}
                          </Text>
                          {f.needsAction && (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: Colors.accent,
                                marginTop: 4,
                              }}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
                gap: 24,
              }}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{ paddingBottom: 12 }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color:
                        activeTab === tab.id
                          ? Colors.text
                          : Colors.textTertiary,
                    }}
                  >
                    {tab.label}
                  </Text>
                  {activeTab === tab.id && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: Colors.text,
                        borderRadius: 999,
                      }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <EventCard
              event={item}
              variant={
                activeTab === "past"
                  ? "past"
                  : activeTab === "hosting"
                  ? "hosting"
                  : "default"
              }
              showHostBadge={
                activeTab === "past" && item.creator_id === user?.id
              }
            />
          </View>
        )}
        ListEmptyComponent={
          error ? (
            <ErrorState
              title="Couldn't load events"
              description="We hit a snag. Pull down to retry."
              onRetry={onRefresh}
            />
          ) : loading ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <EventCardSkeleton />
              </View>
              <View style={{ flex: 1 }}>
                <EventCardSkeleton />
              </View>
            </View>
          ) : (
            <EmptyState
              title={
                activeTab === "hosting"
                  ? "No events yet"
                  : activeTab === "joining"
                  ? "Nothing on your calendar"
                  : "No past events"
              }
              description={getEmptyMessage()}
              action={
                activeTab === "hosting" ? (
                  <Button
                    title="Create your first event"
                    onPress={() => router.push("/events/create" as never)}
                    variant="primary"
                    size="sm"
                  />
                ) : activeTab === "joining" ? (
                  <Button
                    title="Browse events"
                    onPress={() => router.push("/(tabs)/explore" as never)}
                    variant="primary"
                    size="sm"
                  />
                ) : undefined
              }
            />
          )
        }
      />
    </View>
  );
}
