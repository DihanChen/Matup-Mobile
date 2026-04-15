import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Colors } from "@/constants/colors";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: Colors.primary, text: Colors.white },
  secondary: { bg: Colors.borderLight, text: Colors.text },
  outline: { bg: "transparent", text: Colors.text, border: Colors.border },
  ghost: { bg: "transparent", text: Colors.textSecondary },
  danger: { bg: Colors.error, text: Colors.white },
};

const sizeStyles: Record<ButtonSize, { py: number; px: number; fontSize: number }> = {
  sm: { py: 8, px: 16, fontSize: 12 },
  md: { py: 12, px: 20, fontSize: 14 },
  lg: { py: 16, px: 24, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: v.bg,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: isDisabled ? 0.5 : 1,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={v.text}
          style={{ marginRight: 8 }}
        />
      ) : null}
      <Text
        style={[
          {
            color: v.text,
            fontSize: s.fontSize,
            fontWeight: "600",
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
