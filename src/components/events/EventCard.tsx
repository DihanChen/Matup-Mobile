import { View, Text, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { getSportEmoji } from "@/lib/share/sportEmojis";
import { getSportCover } from "@/lib/sportCovers";

type EventCardEvent = {
  id: string;
  title: string;
  sport_type: string;
  location: string;
  datetime: string;
  max_participants: number;
  skill_level?: string;
  creator_id?: string;
  participant_count?: number;
  cover_url?: string | null;
  distance?: number;
  creator_name?: string;
};

interface EventCardProps {
  event: EventCardEvent;
  variant?: "default" | "hosting" | "past";
  showHostBadge?: boolean;
}

function formatDistanceKm(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function EventCard({
  event,
  variant = "default",
  showHostBadge,
}: EventCardProps) {
  const router = useRouter();
  const isPast = variant === "past";
  const isHosting = variant === "hosting";

  const date = new Date(event.datetime);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const participantCount = event.participant_count ?? 0;
  const spotsLeft = event.max_participants - participantCount;
  const isFull = spotsLeft <= 0;
  const emoji = getSportEmoji(event.sport_type);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/events/${event.id}` as never)}
      activeOpacity={0.7}
      style={{
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: "hidden",
        opacity: isPast ? 0.6 : 1,
      }}
    >
      {/* Cover image */}
      <View style={{ height: 120, backgroundColor: Colors.borderLight }}>
        <Image
          source={event.cover_url ? { uri: event.cover_url } : getSportCover(event.sport_type)}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />

        {/* Sport badge */}
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: Colors.accent,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: Colors.white,
              fontSize: 10,
              fontWeight: "600",
              textTransform: "capitalize",
            }}
          >
            {event.sport_type}
          </Text>
        </View>

        {/* Participant count badge */}
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            backgroundColor: "rgba(255,255,255,0.9)",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
          <Text
            style={{
              color: Colors.textSecondary,
              fontSize: 10,
              fontWeight: "600",
            }}
          >
            {participantCount}/{event.max_participants}
          </Text>
        </View>

        {/* Past badge */}
        {isPast && (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              backgroundColor: "rgba(0,0,0,0.7)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "600" }}>
              Completed
            </Text>
          </View>
        )}

        {/* Host badge */}
        {showHostBadge && (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: "#3b82f6",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "600" }}>
              Host
            </Text>
          </View>
        )}
      </View>

      {/* Card body */}
      <View style={{ padding: 12 }}>
        {/* Location + Distance */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: Colors.textSecondary,
              fontSize: 11,
              flex: 1,
            }}
          >
            {event.location.split(",")[0]}
          </Text>
          {event.distance !== undefined && (
            <Text
              style={{
                color: Colors.textTertiary,
                fontSize: 10,
                fontWeight: "500",
                marginLeft: 8,
              }}
            >
              {formatDistanceKm(event.distance)}
            </Text>
          )}
        </View>

        {/* Title */}
        <Text
          numberOfLines={1}
          style={{
            fontWeight: "600",
            color: Colors.text,
            fontSize: 14,
            marginBottom: 6,
          }}
        >
          {event.title}
        </Text>

        {/* Date/Time */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginBottom: 10,
          }}
        >
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} />
          <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
            {formattedDate} {"\u2022"} {formattedTime}
          </Text>
        </View>

        {/* Action button */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {isHosting ? (
            <View
              style={{
                backgroundColor: Colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600" }}>
                Manage
              </Text>
            </View>
          ) : isPast ? (
            <View
              style={{
                backgroundColor: Colors.borderLight,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600" }}>
                Completed
              </Text>
            </View>
          ) : isFull ? (
            <View
              style={{
                backgroundColor: Colors.borderLight,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600" }}>
                Full
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: Colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600" }}>
                View
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
