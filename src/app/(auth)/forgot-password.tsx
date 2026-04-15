import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: "matup://reset-password" }
    );

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.white,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Ionicons
          name="mail-outline"
          size={56}
          color={Colors.accent}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Check your email
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 20,
          }}
        >
          We sent a password reset link to {email}. Click the link in the
          email to reset your password.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 999,
            backgroundColor: Colors.primary,
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{ color: Colors.white, fontWeight: "600", fontSize: 14 }}
          >
            Back to Sign In
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: Colors.white }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: "absolute", top: 54, left: 16 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={Colors.accent}
            style={{ marginBottom: 16 }}
          />
          <Text
            style={{ fontSize: 24, fontWeight: "700", color: Colors.text }}
          >
            Reset Password
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Enter your email and we'll send you a link to reset your
            password.
          </Text>
        </View>

        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: Colors.text,
            backgroundColor: Colors.surface,
            marginBottom: 16,
          }}
        />

        <TouchableOpacity
          onPress={handleReset}
          disabled={loading}
          style={{
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor: loading ? Colors.textTertiary : Colors.primary,
            alignItems: "center",
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{ color: Colors.white, fontWeight: "600", fontSize: 15 }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
