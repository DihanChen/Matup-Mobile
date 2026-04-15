import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import { Colors } from "@/constants/colors";

export default function JoinLeagueScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter an invite code.");
      return;
    }
    if (!user) {
      router.push("/(auth)/login");
      return;
    }

    setJoining(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/leagues/join/${trimmed}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to join league.");
        setJoining(false);
        return;
      }

      Alert.alert("Joined!", `You've joined ${data.leagueName || "the league"}.`, [
        {
          text: "View League",
          onPress: () => router.replace(`/leagues/${data.leagueId}` as never),
        },
      ]);
    } catch {
      Alert.alert("Error", "Failed to join league.");
    }
    setJoining(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.white }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 54,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "700",
            color: Colors.text,
          }}
        >
          Join League
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ padding: 24, alignItems: "center" }}>
        <Ionicons
          name="enter-outline"
          size={56}
          color={Colors.accent}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Enter Invite Code
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Ask the league organizer for the invite code to join their league.
        </Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Paste invite code"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            width: "100%",
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            color: Colors.text,
            backgroundColor: Colors.surface,
            textAlign: "center",
            letterSpacing: 1,
            marginBottom: 20,
          }}
        />

        <TouchableOpacity
          onPress={handleJoin}
          disabled={joining || !code.trim()}
          style={{
            width: "100%",
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor:
              !code.trim() ? Colors.textMuted : Colors.accent,
            alignItems: "center",
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>
            {joining ? "Joining..." : "Join League"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
