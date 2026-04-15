import { useState } from "react";
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
import { ErrorState } from "@/components/ui";

export default function LogRunScreen() {
  const { id, sessionId } = useLocalSearchParams<{ id: string; sessionId: string }>();
  const router = useRouter();
  const { user: _user } = useAuth();

  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  async function handleSubmit() {
    setValidationMsg(null);
    setSubmitError(false);

    const mins = parseInt(minutes, 10) || 0;
    const secs = parseInt(seconds, 10) || 0;
    const totalSeconds = mins * 60 + secs;
    const dist = parseInt(distanceMeters, 10) || 0;

    if (totalSeconds <= 0) {
      setValidationMsg("Please enter your finish time.");
      return;
    }
    if (dist <= 0) {
      setValidationMsg("Please enter the distance in metres.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch(
        `${getApiBaseUrl()}/api/sessions/${sessionId}/runs/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({
            elapsed_seconds: totalSeconds,
            distance_meters: dist,
            notes: notes.trim() || undefined,
          }),
        }
      );

      if (res.ok) {
        router.back();
      } else {
        setSubmitError(true);
      }
    } catch {
      setSubmitError(true);
    }
    setSubmitting(false);
  }

  function handleRetry() {
    setSubmitError(false);
    handleSubmit();
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.accent,
          paddingTop: 56,
          paddingBottom: 20,
          paddingHorizontal: 16,
        }}
      >
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
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text
          style={{
            color: Colors.white,
            fontSize: 18,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Log your run
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 12,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Session {sessionId ? `· ${sessionId.slice(0, 8)}` : ""}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {submitError ? (
          <ErrorState
            title="Couldn't save your run"
            description="Check your connection and try again. Your times are preserved."
            onRetry={handleRetry}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {/* Finish time */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Finish time (HH:MM:SS)
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <TextInput
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Minutes"
              style={{
                width: "100%",
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                textAlign: "center",
                fontSize: 20,
                fontWeight: "700",
                color: Colors.text,
                backgroundColor: Colors.surface,
              }}
            />
            <Text style={{ fontSize: 10, color: Colors.textSecondary, marginTop: 3 }}>
              min
            </Text>
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: Colors.textTertiary,
              alignSelf: "center",
              marginBottom: 16,
            }}
          >
            :
          </Text>

          <View style={{ flex: 1, alignItems: "center" }}>
            <TextInput
              value={seconds}
              onChangeText={setSeconds}
              keyboardType="number-pad"
              placeholder="SS"
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Seconds"
              style={{
                width: "100%",
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                textAlign: "center",
                fontSize: 20,
                fontWeight: "700",
                color: Colors.text,
                backgroundColor: Colors.surface,
              }}
            />
            <Text style={{ fontSize: 10, color: Colors.textSecondary, marginTop: 3 }}>
              sec
            </Text>
          </View>
        </View>

        {/* Distance */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Distance (metres)
        </Text>
        <TextInput
          value={distanceMeters}
          onChangeText={setDistanceMeters}
          keyboardType="number-pad"
          placeholder="e.g. 5000"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Distance in metres"
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            fontWeight: "600",
            color: Colors.text,
            backgroundColor: Colors.surface,
            marginBottom: 16,
          }}
        />

        {/* Notes (optional) */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Notes (optional)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it go? Any conditions to note?"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Notes"
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 14,
            color: Colors.text,
            backgroundColor: Colors.surface,
            minHeight: 80,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        {/* Validation message */}
        {validationMsg && (
          <Text
            style={{
              fontSize: 13,
              color: Colors.error,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {validationMsg}
          </Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            backgroundColor: submitting ? Colors.textMuted : Colors.accent,
            paddingVertical: 16,
            borderRadius: 999,
            alignItems: "center",
          }}
          activeOpacity={0.8}
          accessibilityLabel="Submit run"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.white }}>
              Submit run
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
