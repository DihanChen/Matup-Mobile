import { View, Text, Image } from "react-native";
import { Colors } from "@/constants/colors";
import { getInitials } from "@/lib/league-utils";

interface AvatarProps {
  name: string | null;
  avatarUrl: string | null;
  size?: number;
}

export function Avatar({ name, avatarUrl, size = 40 }: AvatarProps) {
  const fontSize = size * 0.35;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.borderLight,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.textMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: Colors.white,
          fontSize,
          fontWeight: "600",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}
