import { View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Colors } from "@/constants/colors";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: Colors.border,
          overflow: "hidden",
        },
        padded && { padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
