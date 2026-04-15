import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { getSportCover } from "@/lib/sportCovers";
import type { ExploreEvent } from "@/lib/exploreSwipe";
import type { DisplayCourt } from "@/lib/court-types";
import { getCourtDisplayName } from "@/lib/courtName";

interface EventSwipeCardProps {
  event: ExploreEvent;
  onJoin: () => void;
  onSkip?: () => void;
  onPress: () => void;
  joining: boolean;
}

export function EventSwipeCard({
  event,
  onJoin,
  onSkip,
  onPress,
  joining,
}: EventSwipeCardProps) {
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
  const spotsLeft = event.max_participants - event.participant_count;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={{
        width: "100%",
        backgroundColor: Colors.white,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 5,
        overflow: "hidden",
      }}
    >
      {/* Cover */}
      <View
        style={{
          height: 160,
          backgroundColor: Colors.surface,
        }}
      >
        <Image
          source={event.cover_url ? { uri: event.cover_url } : getSportCover(event.sport_type)}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: Colors.accent,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              color: Colors.white,
              fontSize: 11,
              fontWeight: "700",
              textTransform: "capitalize",
            }}
          >
            {event.sport_type}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={{ padding: 16 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 4,
          }}
        >
          {event.title}
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: Colors.textSecondary,
            marginBottom: 12,
          }}
        >
          by {event.creator_name}
        </Text>

        <View style={{ gap: 6, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="calendar-outline" size={15} color={Colors.accent} />
            <Text style={{ fontSize: 13, color: Colors.text }}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="location-outline" size={15} color={Colors.accent} />
            <Text
              numberOfLines={1}
              style={{ fontSize: 13, color: Colors.text, flex: 1 }}
            >
              {event.location.split(",")[0]}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="people-outline" size={15} color={Colors.accent} />
            <Text style={{ fontSize: 13, color: Colors.text }}>
              {event.participant_count}/{event.max_participants}
              {spotsLeft > 0 && (
                <Text style={{ color: Colors.textSecondary }}>
                  {" "}
                  ({spotsLeft} left)
                </Text>
              )}
            </Text>
          </View>
          {event.distance !== undefined && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="navigate-outline" size={15} color={Colors.accent} />
              <Text style={{ fontSize: 13, color: Colors.text }}>
                {event.distance < 1
                  ? `${Math.round(event.distance * 1000)}m away`
                  : `${event.distance.toFixed(1)}km away`}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {onSkip && (
            <TouchableOpacity
              onPress={onSkip}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontWeight: "600", color: Colors.textSecondary, fontSize: 14 }}>
                Skip
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onJoin}
            disabled={joining}
            style={{
              flex: 2,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: Colors.accent,
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontWeight: "700", color: Colors.white, fontSize: 14 }}>
              {joining ? "Joining..." : "Join Event"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface CourtSwipeCardProps {
  court: DisplayCourt;
  onPress: () => void;
  onSkip?: () => void;
}

export function CourtSwipeCard({
  court,
  onPress,
  onSkip,
}: CourtSwipeCardProps) {
  const sportLabel = court.sport_types.join(", ");

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={{
        width: "100%",
        backgroundColor: Colors.white,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 5,
        overflow: "hidden",
      }}
    >
      {/* Cover */}
      <View
        style={{
          height: 160,
          backgroundColor: Colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {court.image_url ? (
          <Image
            source={{ uri: court.image_url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ alignItems: "center" }}>
            <Ionicons name="tennisball" size={48} color={Colors.success} />
          </View>
        )}
        {court.source === "osm" && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "rgba(0,0,0,0.5)",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: Colors.white, fontSize: 10, fontWeight: "600" }}>
              OSM
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ padding: 16 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 4,
          }}
        >
          {getCourtDisplayName(court.name, court.address, court.sport_types)}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 }}>
          <Ionicons name="tennisball-outline" size={14} color={Colors.textSecondary} />
          <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
            {sportLabel}
          </Text>
        </View>

        <View style={{ gap: 6, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="location-outline" size={15} color={Colors.accent} />
            <Text
              numberOfLines={1}
              style={{ fontSize: 13, color: Colors.text, flex: 1 }}
            >
              {court.address}
            </Text>
          </View>
          {court.review_count > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="star" size={15} color={Colors.accent} />
              <Text style={{ fontSize: 13, color: Colors.text }}>
                {court.average_rating.toFixed(1)} ({court.review_count}{" "}
                {court.review_count === 1 ? "review" : "reviews"})
              </Text>
            </View>
          )}
          {court.distance !== undefined && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="navigate-outline" size={15} color={Colors.accent} />
              <Text style={{ fontSize: 13, color: Colors.text }}>
                {court.distance < 1
                  ? `${Math.round(court.distance * 1000)}m away`
                  : `${court.distance.toFixed(1)}km away`}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {onSkip && (
            <TouchableOpacity
              onPress={onSkip}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: Colors.surface,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontWeight: "600", color: Colors.textSecondary, fontSize: 14 }}>
                Skip
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onPress}
            style={{
              flex: 2,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: Colors.primary,
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontWeight: "700", color: Colors.white, fontSize: 14 }}>
              View Court
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
