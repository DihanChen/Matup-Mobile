import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { formatDisplayName } from "@/lib/league-utils";

export interface ParticipantRowItem {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

interface ParticipantsRowProps {
  participants: ParticipantRowItem[];
  onPress: (userId: string) => void;
}

const MAX_INLINE = 6;
const AVATAR_SIZE = 44;

/**
 * Horizontal avatar row for an event's participant list. When there are more
 * than MAX_INLINE participants a "+N more" pill is rendered at the end of the
 * row; tapping it expands the full list below as a vertical stack.
 *
 * Pure presentational — parent is responsible for fetching the list and
 * handling the per-avatar tap (typically `router.push('/users/:id')`).
 */
export function ParticipantsRow({
  participants,
  onPress,
}: ParticipantsRowProps) {
  const [expanded, setExpanded] = useState(false);

  const hasOverflow = participants.length > MAX_INLINE;
  const visible = hasOverflow
    ? participants.slice(0, MAX_INLINE)
    : participants;
  const overflowCount = participants.length - MAX_INLINE;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 12,
          paddingVertical: 2,
          paddingRight: 4,
        }}
      >
        {visible.map((participant) => (
          <TouchableOpacity
            key={participant.user_id}
            onPress={() => onPress(participant.user_id)}
            activeOpacity={0.7}
            style={{ alignItems: "center", width: 64 }}
            accessibilityRole="button"
            accessibilityLabel={`View profile for ${
              participant.name ?? "participant"
            }`}
          >
            <Avatar
              name={participant.name}
              avatarUrl={participant.avatar_url}
              size={AVATAR_SIZE}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                color: Colors.textSecondary,
                marginTop: 6,
                textAlign: "center",
                maxWidth: 64,
              }}
            >
              {formatDisplayName(participant.name)}
            </Text>
          </TouchableOpacity>
        ))}

        {hasOverflow ? (
          <TouchableOpacity
            onPress={() => setExpanded((prev) => !prev)}
            activeOpacity={0.7}
            style={{ alignItems: "center", width: 64 }}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? "Hide full participant list"
                : `Show ${overflowCount} more participants`
            }
            accessibilityState={{ expanded }}
          >
            <View
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                backgroundColor: Colors.accentTint,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: Colors.accent,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: Colors.accent,
                }}
              >
                +{overflowCount}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                color: Colors.accent,
                fontWeight: "600",
                marginTop: 6,
                textAlign: "center",
                maxWidth: 64,
              }}
            >
              {expanded ? "Hide" : "more"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {hasOverflow && expanded ? (
        <View
          style={{
            marginTop: 14,
            borderTopWidth: 1,
            borderTopColor: Colors.borderLight,
            paddingTop: 10,
          }}
        >
          {participants.map((participant) => (
            <TouchableOpacity
              key={`expanded-${participant.user_id}`}
              onPress={() => onPress(participant.user_id)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                gap: 12,
              }}
              accessibilityRole="button"
              accessibilityLabel={`View profile for ${
                participant.name ?? "participant"
              }`}
            >
              <Avatar
                name={participant.name}
                avatarUrl={participant.avatar_url}
                size={36}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: Colors.text,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {participant.name ?? "Player"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default ParticipantsRow;
