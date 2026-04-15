import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import type {
  ApiFixture,
  ApiFixtureParticipant,
} from "@/lib/league-types";

type FixtureDetail = ApiFixture & {
  court?: { id: string; name: string; address: string; latitude: number; longitude: number } | null;
};

export default function FixtureDetailScreen() {
  const { id, fixtureId } = useLocalSearchParams<{ id: string; fixtureId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [fixture, setFixture] = useState<FixtureDetail | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchFixture = useCallback(async () => {
    if (!id || !fixtureId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/leagues/${id}/fixtures?week=`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const found = (data.fixtures || []).find(
        (f: FixtureDetail) => f.id === fixtureId
      );
      if (found) setFixture(found);

      // Check role for reschedule button
      if (user?.id && id) {
        const { data: membership } = await supabase
          .from("league_members")
          .select("role")
          .eq("league_id", id)
          .eq("user_id", user.id)
          .single();
        setIsOwnerOrAdmin(membership?.role === "owner" || membership?.role === "admin");
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [id, fixtureId, user?.id]);

  useEffect(() => {
    fetchFixture();
  }, [fetchFixture]);

  const userIsParticipant = useMemo(
    () =>
      !!user?.id &&
      fixture?.participants.some((p) => p.user_id === user.id),
    [fixture, user?.id]
  );

  const userSide = useMemo(() => {
    if (!user?.id || !fixture) return null;
    const p = fixture.participants.find((p) => p.user_id === user.id);
    return p?.side || null;
  }, [fixture, user?.id]);

  const hasPendingSubmission = fixture?.latest_submission?.status === "pending";
  const isOpponentPending =
    hasPendingSubmission &&
    fixture?.latest_submission?.submitted_by !== user?.id;
  const canSubmit =
    userIsParticipant && fixture?.status === "scheduled";

  function getSideNames(participants: ApiFixtureParticipant[], side: string): string {
    return participants
      .filter((p) => p.side === side)
      .map((p) => p.name || "Anonymous")
      .join(" & ");
  }

  async function handleConfirm() {
    if (!fixture?.latest_submission?.id) return;
    setConfirming(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/fixtures/${fixtureId}/results/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            submissionId: fixture.latest_submission.id,
            decision: "confirm",
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        Alert.alert(
          "Confirmed",
          data.finalized ? "Result has been finalized." : "Your confirmation has been recorded."
        );
        await fetchFixture();
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error || "Failed to confirm result.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    }
    setConfirming(false);
  }

  async function handleReject() {
    if (!fixture?.latest_submission?.id) return;
    setRejecting(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/fixtures/${fixtureId}/results/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            submissionId: fixture.latest_submission.id,
            decision: "reject",
            reason: "Disputed from mobile",
          }),
        }
      );
      if (res.ok) {
        Alert.alert("Rejected", "The result has been disputed.");
        await fetchFixture();
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error || "Failed to reject result.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong.");
    }
    setRejecting(false);
  }

  async function handleReschedule() {
    if (!fixture) return;
    Alert.prompt(
      "Reschedule Match",
      "Enter new date (YYYY-MM-DD):",
      async (dateStr) => {
        if (!dateStr?.trim()) return;
        const parsed = new Date(`${dateStr.trim()}T12:00:00`);
        if (isNaN(parsed.getTime())) {
          Alert.alert("Invalid Date", "Please enter a valid date in YYYY-MM-DD format.");
          return;
        }
        setRescheduling(true);
        const { data: { session } } = await supabase.auth.getSession();
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/api/fixtures/${fixtureId}/reschedule`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                starts_at: parsed.toISOString(),
                ends_at: new Date(parsed.getTime() + 2 * 60 * 60 * 1000).toISOString(),
              }),
            }
          );
          if (res.ok) {
            Alert.alert("Rescheduled", "The match has been rescheduled.");
            await fetchFixture();
          } else {
            const err = await res.json().catch(() => ({}));
            Alert.alert("Error", err.error || "Failed to reschedule.");
          }
        } catch {
          Alert.alert("Error", "Something went wrong.");
        }
        setRescheduling(false);
      },
      "plain-text"
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!fixture) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary }}>Fixture not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sideA = getSideNames(fixture.participants, "A");
  const sideB = getSideNames(fixture.participants, "B");
  const payload = fixture.latest_submission?.payload;
  const sets = Array.isArray(payload?.sets) ? payload.sets : [];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Header */}
      <View style={{ backgroundColor: Colors.accent, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: "absolute", top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={{ color: Colors.white, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
          {fixture.week_number ? `Week ${fixture.week_number}` : "Match Details"}
        </Text>
        <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: "center", marginTop: 6 }}>
          <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>
            {fixture.status}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Match card */}
        <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: payload?.winner === "A" ? "800" : "500", color: payload?.winner === "A" ? Colors.accent : Colors.text }}>
                {sideA || "TBD"}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.textTertiary, marginHorizontal: 12 }}>vs</Text>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: payload?.winner === "B" ? "800" : "500", color: payload?.winner === "B" ? Colors.accent : Colors.text }}>
                {sideB || "TBD"}
              </Text>
            </View>
          </View>

          {sets.length > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 12 }}>
              {sets.map((set: number[], i: number) => (
                <View key={i} style={{ backgroundColor: Colors.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text }}>{set[0]}-{set[1]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Date & Venue */}
        {(fixture.starts_at || fixture.court) && (
          <View style={{ marginBottom: 16, gap: 8 }}>
            {fixture.starts_at && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                  {new Date(fixture.starts_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            )}
            {fixture.court && (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${fixture.court!.latitude},${fixture.court!.longitude}`
                  )
                }
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={Colors.accent} />
                <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: "500" }}>
                  {fixture.court.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pending submission info */}
        {hasPendingSubmission && fixture.latest_submission && (
          <View style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#fde68a", marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#92400e", marginBottom: 4 }}>
              Result Pending Confirmation
            </Text>
            <Text style={{ fontSize: 12, color: "#a16207" }}>
              Winner: Side {fixture.latest_submission.payload?.winner || "?"}
              {sets.length > 0 && ` (${sets.map((s: number[]) => `${s[0]}-${s[1]}`).join(", ")})`}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 10, marginBottom: 32 }}>
          {canSubmit && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: `/leagues/${id}/submit-result` as never,
                  params: { fixtureId: fixture.id },
                })
              }
              style={{ backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>Submit Result</Text>
            </TouchableOpacity>
          )}

          {isOpponentPending && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={confirming}
                style={{ flex: 1, backgroundColor: Colors.success, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 14 }}>
                  {confirming ? "Confirming..." : "Confirm Result"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={rejecting}
                style={{ flex: 1, backgroundColor: Colors.white, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: Colors.error }}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.error, fontWeight: "700", fontSize: 14 }}>
                  {rejecting ? "Rejecting..." : "Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isOwnerOrAdmin && fixture.status === "scheduled" && (
            <TouchableOpacity
              onPress={handleReschedule}
              disabled={rescheduling}
              style={{
                backgroundColor: Colors.white,
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: "center",
                borderWidth: 1,
                borderColor: Colors.border,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.text, fontWeight: "600", fontSize: 14 }}>
                {rescheduling ? "Rescheduling..." : "Reschedule"}
              </Text>
            </TouchableOpacity>
          )}

          {fixture.status === "finalized" && (
            <View style={{ backgroundColor: Colors.successBg, borderRadius: 12, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.success }}>
                Match Finalized
              </Text>
            </View>
          )}

          {fixture.status === "disputed" && (
            <View style={{ backgroundColor: Colors.errorBg, borderRadius: 12, padding: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.error }}>
                Result Disputed — awaiting organizer resolution
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
