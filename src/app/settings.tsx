import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { PageHeader } from "@/components/ui/PageHeader";

const UNITS_KEY = "matup_distance_units";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Units state
  const [useKm, setUseKm] = useState(true);

  useEffect(() => {
    // Check notification permission
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === "granted");
    });

    // Load saved units preference
    SecureStore.getItemAsync(UNITS_KEY).then((value) => {
      if (value === "mi") setUseKm(false);
    });
  }, []);

  async function handleToggleNotifications(value: boolean) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === "granted");
      if (status !== "granted") {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      Alert.alert(
        "Disable Notifications",
        "To turn off notifications, go to your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }
  }

  async function handleToggleUnits(toKm: boolean) {
    setUseKm(toKm);
    await SecureStore.setItemAsync(UNITS_KEY, toKm ? "km" : "mi");
  }

  async function handleChangePassword() {
    if (!user?.email) {
      Alert.alert("Error", "No email associated with your account.");
      return;
    }

    Alert.alert(
      "Reset Password",
      `We'll send a password reset link to ${user.email}. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Link",
          onPress: async () => {
            const { error } = await supabase.auth.resetPasswordForEmail(
              user.email!,
              { redirectTo: "matup://reset-password" }
            );
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              Alert.alert("Email Sent", "Check your inbox for the reset link.");
            }
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you sure?",
              "Please confirm you want to permanently delete your account.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: async () => {
                    // Sign out locally — actual account deletion would need a backend endpoint
                    await signOut();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <PageHeader title="Settings" onBack={() => router.back()} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 100 }}
        >
          {/* Notifications */}
          <SectionHeader label="Notifications" />
          <View style={styles.card}>
            <ToggleItem
              icon="notifications-outline"
              label="Push Notifications"
              value={notificationsEnabled}
              onToggle={handleToggleNotifications}
            />
          </View>

          {/* Units & Preferences */}
          <SectionHeader label="Units & Preferences" />
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Ionicons name="speedometer-outline" size={20} color={Colors.textSecondary} />
                <Text style={{ fontSize: 15, color: Colors.text }}>
                  Distance Units
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 0 }}>
                <TouchableOpacity
                  onPress={() => handleToggleUnits(true)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderTopLeftRadius: 8,
                    borderBottomLeftRadius: 8,
                    backgroundColor: useKm ? Colors.primary : Colors.surface,
                    borderWidth: 1,
                    borderColor: useKm ? Colors.primary : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: useKm ? Colors.white : Colors.text,
                    }}
                  >
                    km
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggleUnits(false)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderTopRightRadius: 8,
                    borderBottomRightRadius: 8,
                    backgroundColor: !useKm ? Colors.primary : Colors.surface,
                    borderWidth: 1,
                    borderLeftWidth: 0,
                    borderColor: !useKm ? Colors.primary : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: !useKm ? Colors.white : Colors.text,
                    }}
                  >
                    mi
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Account & Privacy */}
          <SectionHeader label="Account & Privacy" />
          <View style={styles.card}>
            <MenuItem
              icon="lock-closed-outline"
              label="Change Password"
              onPress={handleChangePassword}
            />
            <MenuItem
              icon="trash-outline"
              label="Delete Account"
              onPress={handleDeleteAccount}
              isLast
              destructive
            />
          </View>

          {/* About & Support */}
          <SectionHeader label="About & Support" />
          <View style={styles.card}>
            <MenuItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => WebBrowser.openBrowserAsync("https://matup.app/terms")}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => WebBrowser.openBrowserAsync("https://matup.app/privacy")}
            />
            <MenuItem
              icon="mail-outline"
              label="Contact Support"
              onPress={() => Linking.openURL("mailto:support@matup.app")}
              isLast
            />
          </View>

          {/* App version */}
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: Colors.textMuted,
              marginTop: 24,
            }}
          >
            MatUp v{appVersion}
          </Text>
        </ScrollView>
      </View>
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "700",
        color: Colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 4,
      }}
    >
      {label}
    </Text>
  );
}

function ToggleItem({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: string;
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={Colors.textSecondary}
        />
        <Text style={{ fontSize: 15, color: Colors.text }}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.accent }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  isLast,
  destructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isLast?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: Colors.borderLight,
        gap: 12,
      }}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={20}
        color={destructive ? Colors.error : Colors.textSecondary}
      />
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: destructive ? Colors.error : Colors.text,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = {
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
    overflow: "hidden" as const,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
};
