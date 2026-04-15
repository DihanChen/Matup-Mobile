import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui";
import { getSportEmoji } from "@/lib/share/sportEmojis";

const SPORT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: "walk-outline",
  tennis: "tennisball-outline",
  pickleball: "tennisball-outline",
  cycling: "bicycle-outline",
  gym: "barbell-outline",
  yoga: "body-outline",
  basketball: "basketball-outline",
  soccer: "football-outline",
  hiking: "trail-sign-outline",
};
import { haversineDistance } from "@/lib/geo";
import { getCourtById, getCourtReviews } from "@/lib/queries/court-detail";
import { submitCourtReview } from "@/lib/queries/court-reviews";
import type { CourtDetail, CourtReview } from "@/lib/court-types";
import { getCourtDisplayName } from "@/lib/courtName";

export default function CourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [court, setCourt] = useState<CourtDetail | null>(null);
  const [reviews, setReviews] = useState<CourtReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [nearbyCourtsCount, setNearbyCourtsCount] = useState<number | null>(null);

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [courtData, reviewsData] = await Promise.all([
      getCourtById(supabase, id),
      getCourtReviews(supabase, id),
    ]);

    if (!courtData) {
      setError("Court not found");
      setLoading(false);
      return;
    }

    const detail: CourtDetail = {
      ...courtData,
      osm_id: courtData.osm_id ?? null,
      source: courtData.source ?? "user",
      surface: courtData.surface ?? null,
      num_courts: courtData.num_courts ?? null,
      lighting: courtData.lighting ?? null,
      access_type: courtData.access_type ?? null,
      amenities: courtData.amenities ?? [],
      operator: courtData.operator ?? null,
      opening_hours: courtData.opening_hours ?? null,
      average_rating: courtData.average_rating ?? 0,
      review_count: courtData.review_count ?? 0,
    };

    setCourt(detail);

    // Count courts at the same location (within ~55m)
    const { count } = await supabase
      .from("courts")
      .select("id", { count: "exact", head: true })
      .gte("latitude", detail.latitude - 0.00135)
      .lte("latitude", detail.latitude + 0.00135)
      .gte("longitude", detail.longitude - 0.00135)
      .lte("longitude", detail.longitude + 0.00135)
      .eq("status", "approved");
    setNearbyCourtsCount(count ?? null);

    const mappedReviews: CourtReview[] = (reviewsData || []).map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        court_id: r.court_id as string,
        user_id: r.user_id as string,
        rating: r.rating as number,
        comment: r.comment as string | null,
        created_at: r.created_at as string,
        user_name:
          (r.profiles as Record<string, unknown>)?.name as string | null,
        user_avatar:
          (r.profiles as Record<string, unknown>)?.avatar_url as string | null,
      })
    );
    setReviews(mappedReviews);
    setLoading(false);

    // Get distance
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setDistance(
        haversineDistance(
          loc.coords.latitude,
          loc.coords.longitude,
          detail.latitude,
          detail.longitude
        )
      );
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function handleSubmitReview() {
    if (!user || !court) return;
    setSubmittingReview(true);
    const { error: err } = await submitCourtReview(
      supabase,
      court.id,
      user.id,
      reviewRating,
      reviewComment.trim() || null
    );
    if (err) {
      Alert.alert("Error", err.message);
      setSubmittingReview(false);
      return;
    }
    setShowReviewModal(false);
    setReviewRating(5);
    setReviewComment("");
    setSubmittingReview(false);
    await fetchData();
  }

  function handleGetDirections() {
    if (!court) return;
    const url = `https://maps.apple.com/?daddr=${court.latitude},${court.longitude}`;
    Linking.openURL(url);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, padding: 16 }}>
        <Skeleton
          width="100%"
          height={200}
          borderRadius={16}
          style={{ marginBottom: 16 }}
        />
        <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={16} />
      </View>
    );
  }

  if (error || !court) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.white,
          justifyContent: "center",
        }}
      >
        <ErrorState
          title={error ? "Couldn't load court" : "Court not found"}
          description={
            error
              ? "We hit a snag pulling this court. Check your connection and try again."
              : "This court may have been removed."
          }
          onRetry={error ? fetchData : undefined}
          action={
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text style={{ color: Colors.text, fontWeight: "600", fontSize: 14 }}>
                Go back
              </Text>
            </TouchableOpacity>
          }
        />
      </View>
    );
  }

  const sportEmojis = court.sport_types
    .map((s) => getSportEmoji(s))
    .join(" ");
  const hasReviewed = reviews.some((r) => r.user_id === user?.id);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Cover */}
        <View
          style={{
            height: 200,
            backgroundColor: Colors.surface,
            position: "relative",
          }}
        >
          {court.image_url ? (
            <Image
              source={{ uri: court.image_url }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="tennisball" size={56} color={Colors.success} />
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: 50,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(255,255,255,0.9)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          {/* Sport tags */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {court.sport_types.map((sport) => (
              <View
                key={sport}
                style={{
                  backgroundColor: Colors.accent,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons
                    name={(SPORT_ICON_MAP[sport] ?? "fitness-outline") as keyof typeof Ionicons.glyphMap}
                    size={11}
                    color={Colors.white}
                  />
                  <Text
                    style={{
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {sport}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: Colors.text,
              marginBottom: 4,
            }}
          >
            {getCourtDisplayName(court.name, court.address, court.sport_types)}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              marginBottom: 16,
            }}
          >
            {court.address}
          </Text>

          {/* Quick stats */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: Colors.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              gap: 0,
            }}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons name="star" size={16} color={Colors.accent} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: Colors.text,
                  }}
                >
                  {court.average_rating > 0
                    ? court.average_rating.toFixed(1)
                    : "—"}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 10,
                  color: Colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Rating
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: Colors.text,
                }}
              >
                {court.review_count}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: Colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Reviews
              </Text>
            </View>
            {nearbyCourtsCount != null && nearbyCourtsCount > 0 && (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: Colors.text,
                  }}
                >
                  {nearbyCourtsCount}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: Colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {nearbyCourtsCount === 1 ? "Court" : "Courts"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: Colors.text,
                }}
              >
                {distance != null
                  ? distance < 1
                    ? `${Math.round(distance * 1000)}m`
                    : `${distance.toFixed(1)}km`
                  : "—"}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: Colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Distance
              </Text>
            </View>
          </View>

          {/* Details grid */}
          <View
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 12,
              padding: 14,
              gap: 10,
              marginBottom: 16,
            }}
          >
            {court.surface && (
              <DetailRow
                icon="layers-outline"
                label="Surface"
                value={court.surface}
              />
            )}
            {court.num_courts != null && (
              <DetailRow
                icon="grid-outline"
                label="Courts"
                value={String(court.num_courts)}
              />
            )}
            {court.lighting != null && (
              <DetailRow
                icon="bulb-outline"
                label="Lighting"
                value={court.lighting ? "Yes" : "No"}
              />
            )}
            {court.access_type && (
              <DetailRow
                icon="lock-open-outline"
                label="Access"
                value={court.access_type}
              />
            )}
            {court.opening_hours && (
              <DetailRow
                icon="time-outline"
                label="Hours"
                value={court.opening_hours}
              />
            )}
            {court.amenities.length > 0 && (
              <DetailRow
                icon="cafe-outline"
                label="Amenities"
                value={court.amenities.join(", ")}
              />
            )}
          </View>

          {/* Description */}
          {court.description && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: Colors.text,
                  marginBottom: 6,
                }}
              >
                About
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                {court.description}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleGetDirections}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: Colors.accent,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={16} color={Colors.white} />
              <Text
                style={{
                  color: Colors.white,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Directions
              </Text>
            </TouchableOpacity>
            {user && !hasReviewed && (
              <TouchableOpacity
                onPress={() => setShowReviewModal(true)}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 12,
                  borderRadius: 999,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="star-outline" size={16} color={Colors.text} />
                <Text
                  style={{
                    color: Colors.text,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Review
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reviews */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: Colors.text,
                marginBottom: 10,
              }}
            >
              Reviews ({reviews.length})
            </Text>
            {reviews.length === 0 ? (
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  textAlign: "center",
                  paddingVertical: 20,
                }}
              >
                No reviews yet. Be the first!
              </Text>
            ) : (
              reviews.map((review) => (
                <View
                  key={review.id}
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <Avatar
                    name={review.user_name}
                    avatarUrl={review.user_avatar}
                    size={32}
                  />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: Colors.text,
                        }}
                      >
                        {review.user_name || "Anonymous"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: Colors.textTertiary,
                        }}
                      >
                        {new Date(review.created_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 2,
                        marginBottom: 4,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={
                            star <= review.rating ? "star" : "star-outline"
                          }
                          size={12}
                          color={
                            star <= review.rating
                              ? Colors.accent
                              : Colors.textMuted
                          }
                        />
                      ))}
                    </View>
                    {review.comment && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: Colors.textSecondary,
                        }}
                      >
                        {review.comment}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: Colors.white,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: Colors.text,
                }}
              >
                Write a Review
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons
                  name="close"
                  size={24}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: Colors.text,
                marginBottom: 8,
              }}
            >
              Rating
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= reviewRating ? "star" : "star-outline"}
                    size={32}
                    color={
                      star <= reviewRating
                        ? Colors.accent
                        : Colors.textMuted
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: Colors.text,
                marginBottom: 6,
              }}
            >
              Comment (optional)
            </Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                color: Colors.text,
                minHeight: 80,
                marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={submittingReview}
              style={{
                backgroundColor: Colors.accent,
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: Colors.white,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={Colors.accent}
      />
      <Text style={{ fontSize: 12, color: Colors.textSecondary, width: 70 }}>
        {label}
      </Text>
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: Colors.text,
          textTransform: "capitalize",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
