import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
      },
    });

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          name: name.trim(),
          avatar_url: null,
        },
        { onConflict: "id" }
      );
    }

    Alert.alert(
      "Check Your Email",
      "We sent you a confirmation link. Please verify your email to continue.",
      [{ text: "OK" }]
    );

    setLoading(false);
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    try {
      const redirectTo = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data?.url) {
        Alert.alert("Error", error?.message ?? "Could not start Google sign up.");
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else {
          Alert.alert("Error", "Could not complete sign up. Please try again.");
        }
      }
    } catch {
      Alert.alert("Error", "Google sign up failed. Please try again.");
    }
    setGoogleLoading(false);
  }

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        {/* Logo */}
        <View className="items-center mb-8">
          <View className="flex-row gap-1 mb-6">
            <View
              className="w-5 h-5 rounded-md"
              style={{ backgroundColor: Colors.primary, marginTop: 10 }}
            />
            <View
              className="w-5 h-5 rounded-md"
              style={{ backgroundColor: Colors.primary }}
            />
          </View>
          <Text className="text-3xl font-bold text-zinc-900 tracking-tight">
            Create your account
          </Text>
          <Text className="text-zinc-500 mt-2">
            Start finding fitness partners today
          </Text>
        </View>

        {/* Google OAuth */}
        <TouchableOpacity
          onPress={handleGoogleSignup}
          disabled={googleLoading}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: Colors.border,
            backgroundColor: Colors.white,
            marginBottom: 16,
            opacity: googleLoading ? 0.6 : 1,
          }}
        >
          <GoogleIcon size={18} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text }}>
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        {/* Separator */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          <Text
            style={{
              paddingHorizontal: 12,
              fontSize: 12,
              color: Colors.textTertiary,
            }}
          >
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
        </View>

        {/* Form */}
        <View className="bg-white rounded-2xl border border-zinc-200 p-6">
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1.5">
              Full name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              autoComplete="name"
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1.5">
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
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1.5">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900"
            />
            <Text className="text-xs text-zinc-500 mt-1.5">
              Must be at least 6 characters
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1.5">
              Confirm Password
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              style={{
                borderColor: passwordsMatch
                  ? Colors.accent
                  : Colors.border,
              }}
              className="w-full px-4 py-3 border rounded-xl bg-zinc-50 text-zinc-900"
            />
            {passwordsMatch && (
              <Text style={{ color: Colors.accent }} className="text-xs mt-1.5">
                Passwords match
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            className="w-full py-3.5 rounded-full items-center mt-2"
            style={{
              backgroundColor: loading ? Colors.textTertiary : Colors.primary,
            }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">
              {loading ? "Creating account..." : "Create account"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-center mt-6 mb-8">
          <Text className="text-zinc-500">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={{ color: Colors.accent }} className="font-semibold">
                Sign in
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
