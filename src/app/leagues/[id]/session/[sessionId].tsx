import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui";
import { formatDuration } from "@/lib/league-utils";
import type { RunningSession, RunningSessionRun } from "@/lib/league-types";
import {
  RUN_TIME_LABEL,
  RUN_DISTANCE_LABEL,
  RUN_DISTANCE_PLACEHOLDER,
  ERROR_RUN_TIME_INVALID,
  ERROR_RUN_DISTANCE_INVALID,
  SUCCESS_RUN_LOGGED,
  ERROR_RUN_SUBMIT_FAILED,
  ERROR_RUN_NETWORK,
} from "@/lib/result-submission-strings";

export default function SessionDetailScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [session, setSession] = useState<RunningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingRun, setSubmittingRun] = useState(false);

  // Run entry form
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [showRunEntry, setShowRunEntry] = useState(false);

  // Inline validation / feedback state
  const [timeError, setTimeError] = useState<string | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [runNetworkError, setRunNetworkError] = useState<string | null>(null);
  const [runSuccessMsg, setRunSuccessMsg] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!id || !sessionId) return;
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) return;

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/leagues/${id}/sessions`,
        { headers: { Authorization: `Bearer ${authSession.access_token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const found = (data.sessions || []).find(
        (s: RunningSession) => s.id === sessionId
      );
      if (found) setSession(found);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [id, sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const canSubmitRun = session && (session.status === "open" || session.status === "scheduled") && !session.my_run;

  async function handleSubmitRun() {
    setTimeError(null);
    setDistanceError(null);
    setRunNetworkError(null);
    setRunSuccessMsg(null);

    const mins = parseInt(minutes, 10) || 0;
    const secs = parseInt(seconds, 10) || 0;
    const totalSeconds = mins * 60 + secs;

    if (totalSeconds <= 0) {
      setTimeError(ERROR_RUN_TIME_INVALID);
      return;
    }

    // Distance is optional. Blank → omit from payload (backend falls back to
    // the session's configured distance_meters). Non-blank must parse as a
    // positive integer or we surface ERROR_RUN_DISTANCE_INVALID inline.
    const trimmedDistance = distanceMeters.trim();
    let distancePayload: number | undefined = undefined;
    if (trimmedDistance !== "") {
      const parsedDistance = Number(trimmedDistance);
      if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
        setDistanceError(ERROR_RUN_DISTANCE_INVALID);
        return;
      }
      distancePayload = Math.round(parsedDistance);
    }

    setSubmittingRun(true);
    const { data: { session: authSession } } = await supabase.auth.getSession();

    const requestBody: { elapsed_seconds: number; distance_meters?: number } = {
      elapsed_seconds: totalSeconds,
    };
    if (distancePayload !== undefined) {
      requestBody.distance_meters = distancePayload;
    }

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/sessions/${sessionId}/runs/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (res.ok) {
        setRunSuccessMsg(SUCCESS_RUN_LOGGED);
        setShowRunEntry(false);
        setMinutes("");
        setSeconds("");
        setDistanceMeters("");
        await fetchSession();
      } else {
        const err = await res.json();
        setRunNetworkError(err.error || ERROR_RUN_SUBMIT_FAILED);
      }
    } catch {
      setRunNetworkError(ERROR_RUN_NETWORK);
    }
    setSubmittingRun(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary }}>Session not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = session.status === "open" ? Colors.success :
    session.status === "finalized" ? Colors.textSecondary :
    Colors.accent;

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
          {session.week_number ? `Week ${session.week_number} Session` : "Running Session"}
        </Text>
        <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: "center", marginTop: 6 }}>
          <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>
            {session.status}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Session info */}
        <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Type</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.text, textTransform: "capitalize" }}>
              {session.session_type.replace(/_/g, " ")}
            </Text>
          </View>
          {session.distance_meters && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Distance</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.text }}>
                {(session.distance_meters / 1000).toFixed(1)} km
              </Text>
            </View>
          )}
          {session.route_name && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Route</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.text }}>{session.route_name}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Mode</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.text, textTransform: "capitalize" }}>
              {session.comparison_mode.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {/* My run */}
        {session.my_run && (
          <View style={{ backgroundColor: "#ecfdf5", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#a7f3d0" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.success, marginBottom: 4 }}>Your Run</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text }}>
              {formatDuration(session.my_run.elapsed_seconds)} · {(session.my_run.distance_meters / 1000).toFixed(2)} km
            </Text>
            <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 2, textTransform: "capitalize" }}>
              Status: {session.my_run.status}
            </Text>
          </View>
        )}

        {/* Run entry form */}
        {canSubmitRun && !showRunEntry && (
          <TouchableOpacity
            onPress={() => setShowRunEntry(true)}
            style={{ backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center", marginBottom: 16 }}
            activeOpacity={0.8}
          >
            <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>Log Your Run</Text>
          </TouchableOpacity>
        )}

        {showRunEntry && (
          <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12 }}>Log Your Run</Text>

            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6 }}>{RUN_TIME_LABEL}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: timeError ? 4 : 12 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={minutes}
                  onChangeText={(v) => { setMinutes(v); setTimeError(null); }}
                  keyboardType="number-pad"
                  placeholder="Min"
                  placeholderTextColor={Colors.textMuted}
                  style={{ borderWidth: 1, borderColor: timeError ? Colors.error : Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlign: "center", fontSize: 16, fontWeight: "700", color: Colors.text }}
                />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.textTertiary, alignSelf: "center" }}>:</Text>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={seconds}
                  onChangeText={(v) => { setSeconds(v); setTimeError(null); }}
                  keyboardType="number-pad"
                  placeholder="Sec"
                  placeholderTextColor={Colors.textMuted}
                  style={{ borderWidth: 1, borderColor: timeError ? Colors.error : Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, textAlign: "center", fontSize: 16, fontWeight: "700", color: Colors.text }}
                />
              </View>
            </View>
            {timeError && (
              <Text style={{ color: Colors.error, fontSize: 12, marginBottom: 10 }} accessibilityRole="alert">{timeError}</Text>
            )}

            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 6 }}>{RUN_DISTANCE_LABEL}</Text>
            <TextInput
              value={distanceMeters}
              onChangeText={(v) => { setDistanceMeters(v); setDistanceError(null); }}
              keyboardType="number-pad"
              placeholder={session.distance_meters ? String(session.distance_meters) : RUN_DISTANCE_PLACEHOLDER}
              placeholderTextColor={Colors.textMuted}
              style={{ borderWidth: 1, borderColor: distanceError ? Colors.error : Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: distanceError ? 4 : 16 }}
            />
            {distanceError && (
              <Text style={{ color: Colors.error, fontSize: 12, marginBottom: 12 }} accessibilityRole="alert">{distanceError}</Text>
            )}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowRunEntry(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center" }}
                activeOpacity={0.7}
              >
                <Text style={{ fontWeight: "600", color: Colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitRun}
                disabled={submittingRun}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: Colors.accent, alignItems: "center" }}
                activeOpacity={0.8}
              >
                <Text style={{ fontWeight: "700", color: Colors.white }}>
                  {submittingRun ? "Submitting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
            {runNetworkError && (
              <ErrorState
                compact
                title="Couldn't submit run"
                description={runNetworkError}
                onRetry={handleSubmitRun}
                retryLabel="Try again"
              />
            )}
          </View>
        )}

        {runSuccessMsg && (
          <Text
            style={{ color: Colors.success, fontSize: 14, fontWeight: "600", textAlign: "center", paddingVertical: 8 }}
            accessibilityRole="alert"
          >
            {runSuccessMsg}
          </Text>
        )}

        {/* Leaderboard */}
        {session.runs.length > 0 && (
          <>
            <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
              Runs ({session.runs.length})
            </Text>
            {session.runs
              .sort((a, b) => a.elapsed_seconds - b.elapsed_seconds)
              .map((run, index) => (
                <View
                  key={run.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.borderLight,
                    gap: 8,
                  }}
                >
                  <Text style={{ width: 24, fontSize: 13, fontWeight: "700", color: index < 3 ? Colors.accent : Colors.textSecondary }}>
                    #{index + 1}
                  </Text>
                  <Avatar name={run.name} avatarUrl={run.avatar_url} size={28} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: "600", color: Colors.text }}>
                    {run.name || "Anonymous"}
                  </Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.text }}>
                      {formatDuration(run.elapsed_seconds)}
                    </Text>
                    <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
                      {(run.distance_meters / 1000).toFixed(2)} km
                    </Text>
                  </View>
                </View>
              ))}
          </>
        )}

        {session.runs.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Ionicons name="fitness-outline" size={40} color={Colors.textMuted} />
            <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 8 }}>
              No runs submitted yet
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
