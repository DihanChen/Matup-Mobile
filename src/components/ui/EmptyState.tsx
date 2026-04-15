import { View, Text, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export interface EmptyStateProps {
  /** Short heading — what's empty. "No events yet" / "No friends added". */
  title: string;
  /** Action-oriented sentence: what the user can do next. */
  description?: string;
  /** Custom icon node. Defaults to a calendar. Use @expo/vector-icons Ionicons. */
  icon?: ReactNode;
  /** Primary CTA. */
  action?: ReactNode;
  /** Secondary action or helper link. */
  secondaryAction?: ReactNode;
  /** Compact variant — use inside cards or narrow columns. */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Mirrors frontend/src/components/ui/EmptyState.tsx. Copy should invite action
 * rather than announce absence — "Find a league near you" > "No leagues found".
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  compact = false,
  style,
}: EmptyStateProps) {
  const iconSize = compact ? 20 : 28;
  const bubbleSize = compact ? 40 : 56;

  return (
    <View
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
          backgroundColor: Colors.borderLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon ?? (
          <Ionicons name="calendar-outline" size={iconSize} color={Colors.textTertiary} />
        )}
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
      {description && (
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
      )}
      {(action || secondaryAction) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {action}
          {secondaryAction}
        </View>
      )}
    </View>
  );
}

export default EmptyState;
