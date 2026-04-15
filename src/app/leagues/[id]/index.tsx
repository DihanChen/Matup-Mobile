import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  Linking,
  Image,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { getSportEmoji } from "@/lib/share/sportEmojis";
import { getSportCover } from "@/lib/sportCovers";
import {
  FORMAT_LABELS,
  type League,
  type LeagueMember,
  type LeagueMatch,
  type Standing,
  type TeamStanding,
  type RunningMode,
  type RunningSession,
  type ApiStandingsResponse,
  type ApiRunningSessionsResponse,
  type ApiFixture,
  mapFixturesToMatches,
  getRunningModeFromRules,
} from "@/lib/league-types";
import { formatDuration } from "@/lib/league-utils";

type DetailTab = "overview" | "schedule" | "standings";

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    body: string;
    created_at: string;
    author_name: string;
  }>>([]);
  const [runningSessions, setRunningSessions] = useState<RunningSession[]>([]);
  const [runningMode, setRunningMode] = useState<RunningMode>("personal_progress");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  // Pending actions for the current user
  const pendingActions = useMemo(() => {
    if (!user?.id) return [];
    return matches.filter((m) => {
      const isParticipant = m.participants.some((p) => p.user_id === user.id);
      const hasPending = m.latest_submission?.status === "pending";
      const isOpponentSubmission = hasPending && m.latest_submission?.submitted_by !== user.id;
      return isParticipant && isOpponentSubmission;
    });
  }, [matches, user?.id]);

  // Action states
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Computed
  const currentMember = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user?.id]
  );
  const isOwnerOrAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";
  const isMember = !!currentMember;
  const isFull = league ? members.length >= league.max_members : false;
  const isDoubles = league?.scoring_format === "doubles";
  const isRacketLeague = league?.scoring_format === "singles" || isDoubles;
  const isRunningLeague = league?.sport_type === "running";

  const upcomingMatches = useMemo(
    () => matches.filter((m) => m.status === "scheduled"),
    [matches]
  );
  const completedMatches = useMemo(
    () => matches.filter((m) => m.status === "completed"),
    [matches]
  );

  const fetchData = useCallback(async () => {
    if (!id) return;

    // Fetch league
    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select("*")
      .eq("id", id)
      .single();

    if (leagueError || !leagueData) {
      setError("League not found");
      setLoading(false);
      return;
    }
    setLeague(leagueData as League);

    if (leagueData.rules_jsonb) {
      setRunningMode(getRunningModeFromRules(leagueData.rules_jsonb));
    }

    // Fetch members with profiles
    const { data: membersData } = await supabase
      .from("league_members")
      .select("id, user_id, role, joined_at")
      .eq("league_id", id);

    if (membersData && membersData.length > 0) {
      const userIds = membersData.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const profileMap: Record<string, { name: string | null; avatar_url: string | null }> = {};
      profiles?.forEach((p) => {
        profileMap[p.id] = { name: p.name, avatar_url: p.avatar_url };
      });

      setMembers(
        membersData.map((m) => ({
          ...m,
          name: profileMap[m.user_id]?.name || null,
          avatar_url: profileMap[m.user_id]?.avatar_url || null,
        }))
      );
    }

    // Fetch fixtures and standings via API
    let allMatches: LeagueMatch[] = [];
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const fixturesRes = await fetch(
          `${getApiBaseUrl()}/api/leagues/${id}/fixtures`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (fixturesRes.ok) {
          const fixturesData = await fixturesRes.json();
          allMatches = mapFixturesToMatches(fixturesData.fixtures || []);
        }
      } catch {
        // Ignore fixture fetch errors
      }

      try {
        const standingsRes = await fetch(
          `${getApiBaseUrl()}/api/leagues/${id}/standings`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (standingsRes.ok) {
          const standingsData: ApiStandingsResponse = await standingsRes.json();
          setStandings(standingsData.standings || []);
          setTeamStandings(standingsData.teamStandings || []);
          if (standingsData.runningMode) {
            setRunningMode(standingsData.runningMode);
          }
        }
      } catch {
        // Ignore standings fetch errors
      }

      // Fetch running sessions if applicable
      if (leagueData.sport_type === "running") {
        try {
          const sessionsRes = await fetch(
            `${getApiBaseUrl()}/api/leagues/${id}/sessions`,
            {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }
          );
          if (sessionsRes.ok) {
            const sessionsData: ApiRunningSessionsResponse = await sessionsRes.json();
            setRunningSessions(sessionsData.sessions || []);
          }
        } catch {
          // Ignore session fetch errors
        }
      }

      // Load announcements
      try {
        const annRes = await fetch(
          `${getApiBaseUrl()}/api/leagues/${id}/announcements`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (annRes.ok) {
          const annData = await annRes.json();
          setAnnouncements(annData.announcements || []);
        }
      } catch {
        // Ignore
      }
    }

    setMatches(allMatches);
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function handleJoin() {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setJoining(true);
    const { error: joinError } = await supabase
      .from("league_members")
      .insert({ league_id: id!, user_id: user.id, role: "member" });

    if (joinError) {
      Alert.alert("Error", joinError.message);
      setJoining(false);
      return;
    }
    await fetchData();
    setJoining(false);
  }

  async function handleLeave() {
    Alert.alert("Leave League", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);
          await supabase
            .from("league_members")
            .delete()
            .eq("league_id", id!)
            .eq("user_id", user!.id);
          setMembers((prev) => prev.filter((m) => m.user_id !== user!.id));
          setLeaving(false);
        },
      },
    ]);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("league_members").delete().eq("league_id", id!);
    await supabase.from("leagues").delete().eq("id", id!).eq("creator_id", user!.id);
    router.replace("/(tabs)/leagues" as never);
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      Alert.alert("Error", "Subject and message are required.");
      return;
    }
    setSendingEmail(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          type: "league",
          id: id!,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      });
      if (response.ok) {
        const d = await response.json();
        Alert.alert("Sent", `Email sent to ${d.sent} members.`);
        setShowEmailModal(false);
      } else {
        Alert.alert("Error", "Failed to send email.");
      }
    } catch {
      Alert.alert("Error", "Failed to send email.");
    }
    setSendingEmail(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, padding: 16 }}>
        <Skeleton width="100%" height={160} borderRadius={16} style={{ marginBottom: 16 }} />
        <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 12 }} />
      </View>
    );
  }

  if (error || !league) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>{error || "League not found"}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emoji = getSportEmoji(league.sport_type);
  const formatLabel = FORMAT_LABELS[league.scoring_format] || league.scoring_format;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Header banner */}
        <View
          style={{
            height: 180,
            backgroundColor: Colors.accent,
            position: "relative",
          }}
        >
          <Image
            source={getSportCover(league.sport_type)}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
          />
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" }} />
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: 50,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          {user?.id === league.creator_id && (
            <TouchableOpacity
              onPress={() => router.push(`/leagues/${id}/edit` as never)}
              style={{
                position: "absolute",
                top: 50,
                right: 16,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.3)",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
              accessibilityLabel="Edit league"
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color={Colors.white} />
            </TouchableOpacity>
          )}
          <View style={{ position: "absolute", bottom: 12, left: 16, flexDirection: "row", gap: 6 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{league.sport_type}</Text>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700" }}>{formatLabel}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* Title */}
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.text, marginBottom: 4 }}>
            {league.name}
          </Text>
          {league.description && (
            <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 12, lineHeight: 20 }}>
              {league.description}
            </Text>
          )}

          {/* Stats row */}
          <View style={{ flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 12, padding: 12, marginBottom: 16, gap: 0 }}>
            <StatItem label="Members" value={`${members.length}/${league.max_members}`} />
            <StatItem label="Format" value={formatLabel} />
            <StatItem label="Season" value={league.season_weeks ? `${league.season_weeks} wks` : "Open"} />
            <StatItem label="Results" value={String(completedMatches.length)} />
          </View>

          {/* Tab bar */}
          <View style={{ flexDirection: "row", gap: 0, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 16 }}>
            {(["overview", "schedule", "standings"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab ? Colors.accent : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: activeTab === tab ? Colors.accent : Colors.textSecondary,
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === "overview" && (
            <>
              {pendingActions.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text }}>
                      Pending Actions
                    </Text>
                    <View style={{ backgroundColor: Colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.white }}>{pendingActions.length}</Text>
                    </View>
                  </View>
                  {pendingActions.map((match) => {
                    const sideA = match.participants.filter((p) => p.team === "A").map((p) => p.name || "?").join(" & ");
                    const sideB = match.participants.filter((p) => p.team === "B").map((p) => p.name || "?").join(" & ");
                    return (
                      <TouchableOpacity
                        key={match.id}
                        onPress={() => router.push(`/leagues/${id}/fixture/${match.id}` as never)}
                        style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#fde68a" }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#92400e", marginBottom: 2 }}>
                          Confirm result
                        </Text>
                        <Text style={{ fontSize: 13, color: Colors.text }}>
                          {sideA} vs {sideB}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <OverviewTab
                members={members}
                isOwnerOrAdmin={isOwnerOrAdmin}
                announcements={announcements}
                runningSessions={runningSessions}
                isRunningLeague={isRunningLeague}
                leagueId={id!}
                onMemberPress={(userId) => router.push(`/users/${userId}` as never)}
                onSessionPress={(sessionId) => router.push(`/leagues/${id}/session/${sessionId}` as never)}
                onLogRunPress={(sessionId) => router.push(`/leagues/${id}/session/${sessionId}/log-run` as never)}
                onAddSession={
                  isOwnerOrAdmin && isRunningLeague
                    ? () => router.push(`/leagues/${id}/create-session` as never)
                    : undefined
                }
              />
            </>
          )}

          {activeTab === "schedule" && (
            <FixturesTab
              upcomingMatches={upcomingMatches}
              completedMatches={completedMatches}
              members={members}
              leagueId={id!}
              onFixturePress={(fixtureId) => router.push(`/leagues/${id}/fixture/${fixtureId}` as never)}
            />
          )}

          {activeTab === "standings" && (
            <StandingsTab
              standings={standings}
              teamStandings={teamStandings}
              isDoubles={isDoubles}
              isRacketLeague={isRacketLeague}
              isRunningLeague={isRunningLeague}
              runningMode={runningMode}
              onUserPress={(userId) => router.push(`/users/${userId}` as never)}
            />
          )}

          {/* Actions */}
          {isOwnerOrAdmin && (
            <View style={{ gap: 10, marginTop: 16, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  setEmailSubject(`Update: ${league.name}`);
                  setEmailMessage("");
                  setShowEmailModal(true);
                }}
                style={{ backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: Colors.border }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.text, fontWeight: "600", fontSize: 14 }}>Email Members</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(true)}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.error, fontWeight: "600", fontSize: 13, textAlign: "center", paddingVertical: 8 }}>
                  Delete League
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      {!isOwnerOrAdmin && (
        <View
          style={{
            backgroundColor: Colors.white,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: 34,
          }}
        >
          {isMember ? (
            <TouchableOpacity
              onPress={handleLeave}
              disabled={leaving}
              style={{ backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: Colors.border }}
              activeOpacity={0.7}
            >
              <Text style={{ color: Colors.text, fontWeight: "600", fontSize: 15 }}>
                {leaving ? "Leaving..." : "Leave League"}
              </Text>
            </TouchableOpacity>
          ) : isFull ? (
            <View style={{ backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}>
              <Text style={{ color: Colors.textSecondary, fontWeight: "600", fontSize: 15 }}>League Full</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleJoin}
              disabled={joining}
              style={{ backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>
                {joining ? "Joining..." : "Join League"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Email Modal */}
      <Modal visible={showEmailModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.text }}>Email Members</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>Subject</Text>
            <TextInput value={emailSubject} onChangeText={setEmailSubject} style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text, marginBottom: 12 }} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>Message</Text>
            <TextInput value={emailMessage} onChangeText={setEmailMessage} multiline numberOfLines={6} textAlignVertical="top" style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text, minHeight: 120, marginBottom: 16 }} />
            <TouchableOpacity onPress={handleSendEmail} disabled={sendingEmail} style={{ backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 999, alignItems: "center" }} activeOpacity={0.8}>
              <Text style={{ color: Colors.white, fontWeight: "600", fontSize: 14 }}>{sendingEmail ? "Sending..." : "Send Email"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ backgroundColor: Colors.white, borderRadius: 16, padding: 24, width: "100%" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.text, marginBottom: 8 }}>Delete League</Text>
            <Text style={{ fontSize: 14, color: Colors.textSecondary, marginBottom: 20 }}>
              This will permanently delete this league and remove all members. This action cannot be undone.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center" }}
                activeOpacity={0.7}
              >
                <Text style={{ fontWeight: "600", color: Colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: Colors.error, alignItems: "center" }}
                activeOpacity={0.8}
              >
                <Text style={{ fontWeight: "600", color: Colors.white }}>{deleting ? "Deleting..." : "Delete"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.text }}>{value}</Text>
      <Text style={{ fontSize: 10, color: Colors.textSecondary, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function OverviewTab({
  members,
  isOwnerOrAdmin,
  announcements,
  runningSessions,
  isRunningLeague,
  leagueId,
  onMemberPress,
  onSessionPress,
  onLogRunPress,
  onAddSession,
}: {
  members: LeagueMember[];
  isOwnerOrAdmin: boolean;
  announcements: Array<{ id: string; title: string; body: string; created_at: string; author_name: string }>;
  runningSessions: RunningSession[];
  isRunningLeague: boolean;
  leagueId: string;
  onMemberPress: (userId: string) => void;
  onSessionPress: (sessionId: string) => void;
  onLogRunPress: (sessionId: string) => void;
  onAddSession?: () => void;
}) {
  return (
    <View>
      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
            Announcements
          </Text>
          {announcements.slice(0, 3).map((a) => (
            <View
              key={a.id}
              style={{
                backgroundColor: Colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: Colors.borderLight,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, flex: 1 }} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={{ fontSize: 10, color: Colors.textTertiary }}>
                  {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: Colors.textSecondary }} numberOfLines={3}>
                {a.body}
              </Text>
              <Text style={{ fontSize: 10, color: Colors.textTertiary, marginTop: 4 }}>
                {a.author_name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Add session CTA (organizer + running league only) */}
      {isRunningLeague && onAddSession && (
        <TouchableOpacity
          onPress={onAddSession}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add running session"
          style={{
            marginBottom: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: Colors.accent,
            alignItems: "center",
            backgroundColor: Colors.accentTint,
          }}
        >
          <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 13 }}>
            + Add session
          </Text>
        </TouchableOpacity>
      )}

      {/* Running sessions */}
      {isRunningLeague && runningSessions.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
            Sessions ({runningSessions.length})
          </Text>
          {runningSessions.slice(0, 5).map((session) => {
            const statusColor = session.status === "open" ? Colors.success :
              session.status === "finalized" ? Colors.textSecondary : Colors.accent;
            return (
              <TouchableOpacity
                key={session.id}
                onPress={() => onSessionPress(session.id)}
                style={{
                  backgroundColor: Colors.surface,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: Colors.borderLight,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>
                    {session.week_number ? `Week ${session.week_number}` : "Session"}
                  </Text>
                  <View style={{ backgroundColor: statusColor + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: statusColor, textTransform: "capitalize" }}>
                      {session.status}
                    </Text>
                  </View>
                </View>
                {session.my_run && (
                  <Text style={{ fontSize: 11, color: Colors.success, marginTop: 4 }}>
                    Your run: {formatDuration(session.my_run.elapsed_seconds)}
                  </Text>
                )}
                {!session.my_run && session.status !== "finalized" && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onLogRunPress(session.id);
                    }}
                    style={{
                      marginTop: 8,
                      backgroundColor: Colors.accent,
                      paddingVertical: 7,
                      borderRadius: 999,
                      alignItems: "center",
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel="Log your run"
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.white }}>
                      Log result
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
        Members ({members.length})
      </Text>
      {members.map((m) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => onMemberPress(m.user_id)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.borderLight,
            gap: 10,
          }}
          activeOpacity={0.7}
        >
          <Avatar name={m.name} avatarUrl={m.avatar_url} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text }}>{m.name || "Anonymous"}</Text>
            <Text style={{ fontSize: 11, color: Colors.textSecondary, textTransform: "capitalize" }}>{m.role}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function FixturesTab({
  upcomingMatches,
  completedMatches,
  members,
  leagueId,
  onFixturePress,
}: {
  upcomingMatches: LeagueMatch[];
  completedMatches: LeagueMatch[];
  members: LeagueMember[];
  leagueId: string;
  onFixturePress: (fixtureId: string) => void;
}) {
  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.user_id] = m.name || "Anonymous";
    });
    return map;
  }, [members]);

  function formatSideNames(match: LeagueMatch, side: string): string {
    return match.participants
      .filter((p) => p.team === side)
      .map((p) => p.name || memberNames[p.user_id] || "Unknown")
      .join(" & ");
  }

  return (
    <View>
      {upcomingMatches.length > 0 && (
        <>
          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
            Upcoming ({upcomingMatches.length})
          </Text>
          {upcomingMatches.slice(0, 10).map((match) => (
            <MatchCard key={match.id} match={match} formatSideNames={formatSideNames} isResult={false} onPress={() => onFixturePress(match.id)} />
          ))}
        </>
      )}

      {completedMatches.length > 0 && (
        <>
          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginTop: 16, marginBottom: 10 }}>
            Results ({completedMatches.length})
          </Text>
          {completedMatches.slice(0, 10).map((match) => (
            <MatchCard key={match.id} match={match} formatSideNames={formatSideNames} isResult onPress={() => onFixturePress(match.id)} />
          ))}
        </>
      )}

      {upcomingMatches.length === 0 && completedMatches.length === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
          <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 8 }}>No fixtures yet</Text>
        </View>
      )}
    </View>
  );
}

function MatchCard({
  match,
  formatSideNames,
  isResult,
  onPress,
}: {
  match: LeagueMatch;
  formatSideNames: (m: LeagueMatch, side: string) => string;
  isResult: boolean;
  onPress?: () => void;
}) {
  const sideA = formatSideNames(match, "A");
  const sideB = formatSideNames(match, "B");
  const setScores = match.participants[0]?.set_scores?.sets;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.borderLight,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        {match.week_number != null && (
          <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.accent }}>
            WEEK {match.week_number}
          </Text>
        )}
        {match.match_date && (
          <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
            {new Date(match.match_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: match.winner === "A" ? "700" : "400",
            color: match.winner === "A" ? Colors.text : Colors.textSecondary,
          }}
        >
          {sideA || "TBD"}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.textTertiary }}>vs</Text>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            textAlign: "right",
            fontSize: 14,
            fontWeight: match.winner === "B" ? "700" : "400",
            color: match.winner === "B" ? Colors.text : Colors.textSecondary,
          }}
        >
          {sideB || "TBD"}
        </Text>
      </View>

      {isResult && setScores && setScores.length > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 6 }}>
          {setScores.map((set, i) => (
            <Text key={i} style={{ fontSize: 12, fontWeight: "600", color: Colors.textSecondary }}>
              {set[0]}-{set[1]}
            </Text>
          ))}
        </View>
      )}
      {match.court && (
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${match.court!.latitude},${match.court!.longitude}`
            )
          }
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={12} color={Colors.accent} />
          <Text style={{ fontSize: 11, color: Colors.accent }}>{match.court.name}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function StandingsTab({
  standings,
  teamStandings,
  isDoubles,
  isRacketLeague,
  isRunningLeague,
  runningMode,
  onUserPress,
}: {
  standings: Standing[];
  teamStandings: TeamStanding[];
  isDoubles: boolean;
  isRacketLeague: boolean;
  isRunningLeague: boolean;
  runningMode: RunningMode;
  onUserPress: (userId: string) => void;
}) {
  if (standings.length === 0 && teamStandings.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 32 }}>
        <Ionicons name="podium-outline" size={40} color={Colors.textMuted} />
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 8 }}>
          No standings yet. Play some matches!
        </Text>
      </View>
    );
  }

  const showTeamStandings = isDoubles && teamStandings.length > 0;

  return (
    <View>
      {showTeamStandings && (
        <>
          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
            Team Standings
          </Text>
          {teamStandings.map((team, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: Colors.borderLight,
              }}
            >
              <Text style={{ width: 28, fontSize: 14, fontWeight: "700", color: index < 3 ? Colors.accent : Colors.textSecondary }}>
                #{index + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>
                  {team.player_names.join(" & ") || "TBD"}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                {team.wins}W {team.losses}L
              </Text>
            </View>
          ))}
        </>
      )}

      <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10, marginTop: showTeamStandings ? 16 : 0 }}>
        {showTeamStandings ? "Individual Standings" : "Standings"}
      </Text>
      {standings.map((s, index) => (
        <TouchableOpacity
          key={s.user_id}
          onPress={() => onUserPress(s.user_id)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.borderLight,
          }}
        >
          <Text style={{ width: 28, fontSize: 14, fontWeight: "700", color: index < 3 ? Colors.accent : Colors.textSecondary }}>
            #{index + 1}
          </Text>
          <Avatar name={s.name} avatarUrl={s.avatar_url} size={28} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "600", color: Colors.text, marginLeft: 8 }}>
            {s.name || "Anonymous"}
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.text }}>
              {isRacketLeague
                ? `${s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0}%`
                : `${s.points} pts`}
            </Text>
            <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
              {s.wins}W {s.losses}L · {s.played}P
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}
