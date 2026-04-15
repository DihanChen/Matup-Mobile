import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Colors } from "@/constants/colors";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const name = user?.user_metadata?.name || "User";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.white }}
      contentContainerStyle={{ padding: 16, paddingTop: 28, paddingBottom: 100 }}
    >
      {/* Profile header */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Avatar
          name={name}
          avatarUrl={user?.user_metadata?.avatar_url}
          size={80}
        />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: Colors.text,
            marginTop: 12,
          }}
        >
          {name}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            marginTop: 4,
          }}
        >
          {user?.email}
        </Text>
      </View>

      {/* Menu items */}
      <View
        style={{
          backgroundColor: Colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: Colors.border,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <MenuItem
          icon="people-outline"
          label="Friends"
          onPress={() => router.push("/friends" as never)}
        />
        <MenuItem
          icon="create-outline"
          label="Edit Profile"
          onPress={() => router.push("/profile-edit" as never)}
        />
        <MenuItem
          icon="settings-outline"
          label="Settings"
          onPress={() => router.push("/settings" as never)}
          isLast
        />
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={signOut}
        style={{
          backgroundColor: Colors.errorBg,
          borderRadius: 16,
          paddingVertical: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: Colors.errorBorder,
        }}
        activeOpacity={0.7}
      >
        <Text
          style={{
            color: Colors.error,
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          Sign Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isLast?: boolean;
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
        color={Colors.textSecondary}
      />
      <Text style={{ flex: 1, fontSize: 15, color: Colors.text }}>
        {label}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.textMuted}
      />
    </TouchableOpacity>
  );
}
