import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";
import { ErrorState } from "@/components/ui";
import type { ApiRunningSessionsResponse, League } from "@/lib/league-types";
import {
  SCREEN_TITLE,
  SCREEN_SUBTITLE,
  TITLE_LABEL,
  DATE_LABEL,
  TIME_LABEL,
  DISTANCE_LABEL,
  TITLE_PLACEHOLDER,
  DATE_PLACEHOLDER,
  TIME_PLACEHOLDER,
  DISTANCE_PLACEHOLDER,
  ERROR_TITLE_REQUIRED,
  ERROR_DATE_INVALID,
  ERROR_TIME_INVALID,
  ERROR_DISTANCE_INVALID,
  ERROR_CREATE_FAILED,
  ERROR_NOT_AUTHENTICATED,
  SUBMIT_BUTTON_LABEL,
  SUBMIT_BUTTON_LOADING_LABEL,
} from "@/lib/create-session-strings";

/**
 * Parse MM/DD/YYYY + HH:MM (24h) into an ISO string, or null if invalid.
 * Uses the device's local timezone — no UTC coercion here.
 */
function toIsoFromLocal(date: string, time: string): string | null {
  const dateMatch = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const month = Number(dateMatch[1]);
  const day = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function CreateSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [maxExistingWeek, setMaxExistingWeek] = useState<number>(0);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [distance, setDistance] = useState("5000");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const init = useCallback(async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    // Load league + existing sessions in parallel. Week number is derived
    // silently from existing sessions, matching web's openCreateRunningSessionModal
    // pattern: (maxExistingWeekNumber ?? 0) + 1.
    const { data: leagueData } = await supabase
      .from("leagues")
      .select("*")
      .eq("id", id)
      .single();

    if (!leagueData) {
      setLoading(false);
      return;
    }
    const leagueRow = leagueData as League;
    setLeague(leagueRow);
    setAuthorized(leagueRow.creator_id === user.id);

    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (authSession?.access_token) {
      try {
        const resp = await fetch(
          `${getApiBaseUrl()}/api/leagues/${id}/sessions`,
          { headers: { Authorization: `Bearer ${authSession.access_token}` } }
        );
        if (resp.ok) {
          const data: ApiRunningSessionsResponse = await resp.json();
          const existing = data.sessions || [];
          const max = existing.reduce(
            (acc, s) => Math.max(acc, s.week_number ?? 0),
            0
          );
          setMaxExistingWeek(max);
        }
      } catch {
        // Leave max at 0 — first session defaults to week 1
      }
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    init();
  }, [init]);

  async function handleSubmit() {
    setFormError(null);
    setNetworkError(null);

    if (!title.trim()) {
      setFormError(ERROR_TITLE_REQUIRED);
      return;
    }
    const startsAt = toIsoFromLocal(date, time);
    if (!date.trim() || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date.trim())) {
      setFormError(ERROR_DATE_INVALID);
      return;
    }
    if (!time.trim() || !/^\d{1,2}:\d{2}$/.test(time.trim()) || !startsAt) {
      setFormError(startsAt ? ERROR_TIME_INVALID : ERROR_DATE_INVALID);
      return;
    }
    const distanceMeters = Number.parseInt(distance, 10);
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      setFormError(ERROR_DISTANCE_INVALID);
      return;
    }

    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      setFormError(ERROR_NOT_AUTHENTICATED);
      return;
    }

    // Derive weekNumber silently — never shown to the user.
    const weekNumber = (maxExistingWeek ?? 0) + 1;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/leagues/${id}/sessions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weekNumber,
            sessionType: "time_trial",
            distanceMeters,
            startsAt,
            routeName: title.trim(),
            comparisonMode: "personal_progress",
            status: "scheduled",
          }),
        }
      );
      if (!response.ok) {
        setNetworkError(ERROR_CREATE_FAILED);
        setSubmitting(false);
        return;
      }
      router.back();
    } catch {
      setNetworkError(ERROR_CREATE_FAILED);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!league || !authorized) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <Header onBack={() => router.back()} />
        <ErrorState
          title="Not authorized"
          description="Only the league organizer can create sessions."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: Colors.white }}
    >
      <Header onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.text }}>
          {SCREEN_TITLE}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: Colors.textSecondary,
            marginTop: 4,
            marginBottom: 20,
          }}
        >
          {SCREEN_SUBTITLE}
        </Text>

        <FieldLabel>{TITLE_LABEL}</FieldLabel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={TITLE_PLACEHOLDER}
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel={TITLE_LABEL}
          style={inputStyle}
        />

        <FieldLabel>{DATE_LABEL}</FieldLabel>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder={DATE_PLACEHOLDER}
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel={DATE_LABEL}
          keyboardType="numbers-and-punctuation"
          style={inputStyle}
        />

        <FieldLabel>{TIME_LABEL}</FieldLabel>
        <TextInput
          value={time}
          onChangeText={setTime}
          placeholder={TIME_PLACEHOLDER}
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel={TIME_LABEL}
          keyboardType="numbers-and-punctuation"
          style={inputStyle}
        />

        <FieldLabel>{DISTANCE_LABEL}</FieldLabel>
        <TextInput
          value={distance}
          onChangeText={setDistance}
          placeholder={DISTANCE_PLACEHOLDER}
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel={DISTANCE_LABEL}
          keyboardType="number-pad"
          style={inputStyle}
        />

        {formError && (
          <Text
            style={{
              color: Colors.error,
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {formError}
          </Text>
        )}

        {networkError && (
          <View style={{ marginTop: 16 }}>
            <ErrorState
              compact
              title={networkError}
              description="Your entries have been kept — tap try again to retry."
              onRetry={handleSubmit}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={SUBMIT_BUTTON_LABEL}
          style={{
            marginTop: 24,
            backgroundColor: Colors.accent,
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: "center",
            opacity: submitting ? 0.7 : 1,
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}
          >
            {submitting ? SUBMIT_BUTTON_LOADING_LABEL : SUBMIT_BUTTON_LABEL}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View
      style={{
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        backgroundColor: Colors.white,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ padding: 4 }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: Colors.text,
        marginTop: 16,
        marginBottom: 6,
      }}
    >
      {children}
    </Text>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  color: Colors.text,
};
