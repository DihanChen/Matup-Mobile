import type { ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Colors } from "@/constants/colors";

type PageHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
  rightSlot?: ReactNode;
};

const SIDE_SLOT_WIDTH = 88;

export function PageHeader({
  title,
  onBack,
  backLabel = "Back",
  rightSlot,
}: PageHeaderProps) {
  const topPadding = Math.max((Constants.statusBarHeight ?? 0) + 16, 54);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: topPadding,
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.white,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.7}
        style={{
          width: SIDE_SLOT_WIDTH,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Ionicons name="arrow-back" size={22} color={Colors.text} />
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: Colors.text,
          }}
        >
          {backLabel}
        </Text>
      </TouchableOpacity>

      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          textAlign: "center",
          fontSize: 17,
          fontWeight: "700",
          color: Colors.text,
        }}
      >
        {title}
      </Text>

      <View
        style={{
          width: SIDE_SLOT_WIDTH,
          alignItems: "flex-end",
        }}
      >
        {rightSlot}
      </View>
    </View>
  );
}
