import { View, Text, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Button } from "./Button";

export interface ErrorStateProps {
  /** Short heading — "Couldn't load leagues". Specific to the surface. */
  title?: string;
  /** One sentence explaining what to try. */
  description?: string;
  /** Retry handler. If omitted, the retry button is hidden. */
  onRetry?: () => void;
  /** Label for the retry button. */
  retryLabel?: string;
  /** Optional secondary action (node or callback). */
  action?: ReactNode;
  /** Compact variant — use inside cards or smaller containers. */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Mirrors frontend/src/components/ui/ErrorState.tsx. Use when a fetch fails
 * and the user can retry. Copy should be warm and specific.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  action,
  compact = false,
  style,
}: ErrorStateProps) {
  const iconSize = compact ? 20 : 28;
  const bubbleSize = compact ? 40 : 56;

  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: compact ? 24 : 56,
          paddingHorizontal: 16,
          gap: compact ? 8 : 12,
        },
        style,
      ]}
    >
      <View
        style={{
          width: bubbleSize,
          height: bubbleSize,
          borderRadius: bubbleSize / 2,
          backgroundColor: "#fff8f1",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="alert-circle-outline" size={iconSize} color={Colors.accentHover} />
      </View>
      <Text
        style={{
          fontSize: compact ? 14 : 16,
          fontWeight: "600",
          color: Colors.text,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: compact ? 12 : 14,
          color: Colors.textSecondary,
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {description}
      </Text>
      {(onRetry || action) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          {onRetry && (
            <Button
              title={retryLabel}
              onPress={onRetry}
              variant="primary"
              size={compact ? "sm" : "md"}
            />
          )}
          {action}
        </View>
      )}
    </View>
  );
}

export default ErrorState;
