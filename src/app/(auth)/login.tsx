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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      Alert.alert("Sign In Failed", error.message);
    }

    setLoading(false);
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const redirectTo = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error || !data?.url) {
        Alert.alert("Error", error?.message ?? "Could not start Google sign in.");
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
          Alert.alert("Error", "Could not complete sign in. Please try again.");
        }
      }
    } catch {
      Alert.alert("Error", "Google sign in failed. Please try again.");
    }
    setGoogleLoading(false);
  }

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
            Welcome back
          </Text>
          <Text className="text-zinc-500 mt-2">
            Sign in to find your fitness partners
          </Text>
        </View>

        {/* Google OAuth */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
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
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="w-full py-3.5 rounded-full items-center mt-2"
            style={{
              backgroundColor: loading ? Colors.textTertiary : Colors.primary,
            }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-sm">
              {loading ? "Signing in..." : "Sign in"}
            </Text>
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity className="items-center mt-3" activeOpacity={0.7}>
              <Text style={{ color: Colors.textSecondary }} className="text-sm">
                Forgot password?
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-center mt-6">
          <Text className="text-zinc-500">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={{ color: Colors.accent }} className="font-semibold">
                Get started
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
