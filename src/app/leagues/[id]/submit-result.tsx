import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";
import type { ApiFixture, ApiFixtureParticipant } from "@/lib/league-types";
import {
  setLabel,
  ADD_SET_LABEL,
  ERROR_SELECT_WINNER,
  ERROR_SUBMIT_FAILED,
  ERROR_NETWORK,
  SUCCESS_PENDING_CONFIRMATION,
  SUCCESS_FINALIZED,
  SUBMIT_BUTTON_LABEL,
  SUBMIT_BUTTON_LOADING_LABEL,
  WINNER_SECTION_LABEL,
  SET_SCORES_SECTION_LABEL,
} from "@/lib/result-submission-strings";

type SetScore = [number, number];

export default function SubmitResultScreen() {
  const { id, fixtureId } = useLocalSearchParams<{ id: string; fixtureId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [fixture, setFixture] = useState<ApiFixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [winner, setWinner] = useState<"A" | "B" | null>(null);
  const [sets, setSets] = useState<SetScore[]>([[0, 0]]);
  const [outcomeType, setOutcomeType] = useState<"played" | "forfeit">("played");

  const fetchFixture = useCallback(async () => {
    if (!id || !fixtureId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/leagues/${id}/fixtures`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const found = (data.fixtures || []).find(
        (f: ApiFixture) => f.id === fixtureId
      );
      if (found) setFixture(found);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [id, fixtureId]);

  useEffect(() => {
    fetchFixture();
  }, [fetchFixture]);

  function getSideNames(participants: ApiFixtureParticipant[], side: string): string {
    return participants
      .filter((p) => p.side === side)
      .map((p) => p.name || "Anonymous")
      .join(" & ");
  }

  function updateSet(index: number, sideIdx: 0 | 1, value: string) {
    const num = parseInt(value, 10);
    if (value !== "" && (isNaN(num) || num < 0)) return;
    setSets((prev) => {
      const updated = [...prev];
      updated[index] = [...updated[index]] as SetScore;
      updated[index][sideIdx] = value === "" ? 0 : num;
      return updated;
    });
  }

  function addSet() {
    if (sets.length >= 5) return;
    setSets((prev) => [...prev, [0, 0]]);
  }

  function removeSet(index: number) {
    if (sets.length <= 1) return;
    setSets((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!winner) {
      Alert.alert("Required", ERROR_SELECT_WINNER);
      return;
    }

    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();

    const payload: Record<string, unknown> = {
      winner,
      outcome_type: outcomeType,
    };

    if (outcomeType === "played") {
      payload.sets = sets.filter((s) => s[0] > 0 || s[1] > 0);
    }

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/fixtures/${fixtureId}/results/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ payload }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        Alert.alert(
          "Submitted",
          data.finalized ? SUCCESS_FINALIZED : SUCCESS_PENDING_CONFIRMATION,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        const err = await res.json();
        Alert.alert("Error", err.error || ERROR_SUBMIT_FAILED);
      }
    } catch {
      Alert.alert("Error", ERROR_NETWORK);
    }
    setSubmitting(false);
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

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Header */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "700", flex: 1 }}>Submit Result</Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Match info */}
        <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: Colors.border }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.textSecondary, marginBottom: 4 }}>
            {fixture.week_number ? `Week ${fixture.week_number}` : "Match"}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text }}>
            {sideA} vs {sideB}
          </Text>
        </View>

        {/* Outcome type */}
        <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 8 }}>Outcome</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {(["played", "forfeit"] as const).map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setOutcomeType(type)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: outcomeType === type ? Colors.accent : Colors.border,
                backgroundColor: outcomeType === type ? "#fff7ed" : Colors.white,
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontWeight: "600", color: outcomeType === type ? Colors.accent : Colors.textSecondary, textTransform: "capitalize" }}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Winner selection */}
        <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 8 }}>{WINNER_SECTION_LABEL}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setWinner("A")}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: winner === "A" ? Colors.accent : Colors.border,
              backgroundColor: winner === "A" ? "#fff7ed" : Colors.white,
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontWeight: "700", color: winner === "A" ? Colors.accent : Colors.text, fontSize: 14 }}>
              {sideA || "Side A"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWinner("B")}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: winner === "B" ? Colors.accent : Colors.border,
              backgroundColor: winner === "B" ? "#fff7ed" : Colors.white,
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontWeight: "700", color: winner === "B" ? Colors.accent : Colors.text, fontSize: 14 }}>
              {sideB || "Side B"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Set scores */}
        {outcomeType === "played" && (
          <>
            <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 8 }}>{SET_SCORES_SECTION_LABEL}</Text>
            {sets.map((set, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Text style={{ width: 50, fontSize: 12, fontWeight: "600", color: Colors.textSecondary }}>{setLabel(i + 1)}</Text>
                <TextInput
                  value={set[0] === 0 ? "" : String(set[0])}
                  onChangeText={(v) => updateSet(i, 0, v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: "700",
                    color: Colors.text,
                  }}
                />
                <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textTertiary }}>-</Text>
                <TextInput
                  value={set[1] === 0 ? "" : String(set[1])}
                  onChangeText={(v) => updateSet(i, 1, v)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: "700",
                    color: Colors.text,
                  }}
                />
                {sets.length > 1 && (
                  <TouchableOpacity onPress={() => removeSet(i)} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {sets.length < 5 && (
              <TouchableOpacity onPress={addSet} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8 }} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
                <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: "600" }}>{ADD_SET_LABEL}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Submit button */}
      <View style={{ padding: 16, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !winner}
          style={{
            backgroundColor: winner ? Colors.accent : Colors.textMuted,
            paddingVertical: 16,
            borderRadius: 999,
            alignItems: "center",
            opacity: submitting ? 0.6 : 1,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 16 }}>
            {submitting ? SUBMIT_BUTTON_LOADING_LABEL : SUBMIT_BUTTON_LABEL}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
