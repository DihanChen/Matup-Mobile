import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getApiBaseUrl } from "@/lib/api";
import {
  fetchEventDetailData,
  type EventDetailEvent,
  type ParticipantInfo,
  type HostInfo,
  type EventComment,
} from "@/lib/queries/event-detail";
import { joinEvent } from "@/lib/queries/events";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getSportEmoji } from "@/lib/share/sportEmojis";
import { getSportCover } from "@/lib/sportCovers";
import { ParticipantsRow } from "@/components/events/ParticipantsRow";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetailEvent | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [host, setHost] = useState<HostInfo | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [existingReviews, setExistingReviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(
    null
  );

  // Action states
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingUser, setReviewingUser] = useState<ParticipantInfo | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const isJoined = participants.some((p) => p.user_id === user?.id);
  const isCreator = event?.creator_id === user?.id;
  const isFull = participants.length >= (event?.max_participants || 0);
  const isPastEvent = event ? new Date(event.datetime) < new Date() : false;

  const fetchData = useCallback(async () => {
    if (!id) return;
    const detail = await fetchEventDetailData(supabase, id, user ?? null);
    if (detail.error || !detail.event) {
      setError(detail.error || "Event not found");
      setLoading(false);
      return;
    }
    setEvent(detail.event);
    setHost(detail.host);
    setParticipants(detail.participants);
    setParticipantsError(detail.participantsError);
    setExistingReviews(detail.existingReviews);
    setComments(detail.comments);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function handleJoin() {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setJoining(true);
    const result = await joinEvent(supabase, id!);
    if (result.error || !result.participant) {
      Alert.alert("Error", result.error || "Failed to join event.");
      setJoining(false);
      return;
    }
    setParticipants((prev) => [...prev, result.participant!]);
    setJoining(false);
  }

  async function handleLeave() {
    if (!user) return;
    Alert.alert("Leave Event", "Are you sure you want to leave this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setJoining(true);
          await supabase
            .from("event_participants")
            .delete()
            .eq("event_id", id!)
            .eq("user_id", user.id);
          setParticipants((prev) => prev.filter((p) => p.user_id !== user.id));
          setJoining(false);
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!user || !isCreator) return;
    Alert.alert(
      "Delete Event",
      "This will permanently delete this event and remove all participants. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            await supabase.from("event_participants").delete().eq("event_id", id!);
            await supabase.from("events").delete().eq("id", id!).eq("creator_id", user.id);
            router.replace("/(tabs)");
          },
        },
      ]
    );
  }

  async function handleSubmitComment() {
    if (!user || !newComment.trim()) return;
    setSubmittingComment(true);
    const { data, error: err } = await supabase
      .from("event_comments")
      .insert({ event_id: id!, user_id: user.id, content: newComment.trim() })
      .select()
      .single();
    if (err) {
      Alert.alert("Error", err.message);
      setSubmittingComment(false);
      return;
    }
    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: user.id,
        user_name: user.user_metadata?.name || null,
        user_avatar: user.user_metadata?.avatar_url || null,
      },
    ]);
    setNewComment("");
    setSubmittingComment(false);
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      Alert.alert("Error", "Subject and message are required.");
      return;
    }
    setSendingEmail(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      Alert.alert("Error", "You must be logged in.");
      setSendingEmail(false);
      return;
    }
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/email/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: "event",
          id: id!,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }),
      });
      if (!response.ok) {
        const d = await response.json().catch(() => null);
        Alert.alert("Error", d?.error || "Failed to send email.");
      } else {
        const d = await response.json();
        Alert.alert("Sent", `Email sent to ${d.sent} participants.`);
        setShowEmailModal(false);
      }
    } catch {
      Alert.alert("Error", "Failed to send email.");
    }
    setSendingEmail(false);
  }

  async function handleSubmitReview() {
    if (!user || !reviewingUser || !event) return;
    setSubmittingReview(true);
    const { error: err } = await supabase.from("reviews").insert({
      event_id: event.id,
      reviewer_id: user.id,
      reviewed_id: reviewingUser.user_id,
      rating: reviewRating,
      comment: reviewComment || null,
    });
    if (err) {
      Alert.alert("Error", err.message);
      setSubmittingReview(false);
      return;
    }
    setExistingReviews((prev) => [...prev, reviewingUser.user_id]);
    setShowReviewModal(false);
    setReviewingUser(null);
    setReviewRating(5);
    setReviewComment("");
    setSubmittingReview(false);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, padding: 16 }}>
        <Skeleton width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} />
        <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={16} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>{error || "Event not found"}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const date = new Date(event.datetime);
  const formattedDate = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const formattedTime = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const emoji = getSportEmoji(event.sport_type);
  const spotsLeft = event.max_participants - participants.length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* Cover */}
        <View style={{ height: 200, backgroundColor: Colors.surface, position: "relative" }}>
          <Image
            source={event.cover_url ? { uri: event.cover_url } : getSportCover(event.sport_type)}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ position: "absolute", top: 50, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ position: "absolute", top: 50, right: 16, backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>{event.sport_type}</Text>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* Title */}
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.text, marginBottom: 4 }}>{event.title}</Text>

          {/* Host */}
          {host && (
            <TouchableOpacity
              onPress={() => router.push(`/users/${host.id}` as never)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}
              activeOpacity={0.7}
            >
              <Avatar name={host.name} avatarUrl={host.avatar_url} size={24} />
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                Hosted by <Text style={{ fontWeight: "600", color: Colors.text }}>{host.name || "Anonymous"}</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* Info grid */}
          <View style={{ backgroundColor: Colors.surface, borderRadius: 12, padding: 14, gap: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
              <Text style={{ fontSize: 14, color: Colors.text }}>{formattedDate} at {formattedTime}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="location-outline" size={18} color={Colors.accent} />
              <Text style={{ fontSize: 14, color: Colors.text, flex: 1 }} numberOfLines={2}>
                {event.location_name || event.location.split(",")[0]}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="people-outline" size={18} color={Colors.accent} />
              <Text style={{ fontSize: 14, color: Colors.text }}>
                {participants.length}/{event.max_participants} joined
                {spotsLeft > 0 && !isPastEvent && (
                  <Text style={{ color: Colors.textSecondary }}> ({spotsLeft} spots left)</Text>
                )}
              </Text>
            </View>
            {event.skill_level && event.skill_level !== "all" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="fitness-outline" size={18} color={Colors.accent} />
                <Text style={{ fontSize: 14, color: Colors.text, textTransform: "capitalize" }}>{event.skill_level}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {event.description && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>About</Text>
              <Text style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}>{event.description}</Text>
            </View>
          )}

          {/* Participants */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
              Participants ({participants.length})
            </Text>
            {loading ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} width={44} height={44} borderRadius={22} />
                ))}
              </View>
            ) : participantsError ? (
              <Text
                style={{ fontSize: 13, color: Colors.textSecondary }}
                accessibilityRole="alert"
              >
                Couldn't load participants
              </Text>
            ) : participants.length === 0 ? (
              <EmptyState
                compact
                icon={<Ionicons name="people-outline" size={20} color={Colors.textTertiary} />}
                title="No one has joined yet — be the first!"
              />
            ) : (
              <ParticipantsRow
                participants={participants.map((p) => ({
                  user_id: p.user_id,
                  name: p.name,
                  avatar_url: p.avatar_url,
                }))}
                onPress={(userId) => router.push(`/users/${userId}` as never)}
              />
            )}

            {/* Post-event review affordance — preserved from the previous grid. */}
            {isPastEvent && participants.length > 0 && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {participants
                  .filter(
                    (p) =>
                      p.user_id !== user?.id &&
                      !existingReviews.includes(p.user_id)
                  )
                  .map((p) => (
                    <TouchableOpacity
                      key={`review-${p.id}`}
                      onPress={() => {
                        setReviewingUser(p);
                        setReviewRating(5);
                        setReviewComment("");
                        setShowReviewModal(true);
                      }}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: Colors.accentTint,
                        borderWidth: 1,
                        borderColor: Colors.accent,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Review ${p.name ?? "participant"}`}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          flex: 1,
                        }}
                      >
                        <Avatar name={p.name} avatarUrl={p.avatar_url} size={28} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: Colors.text,
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {p.name || "Player"}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: Colors.accent,
                        }}
                      >
                        Review
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>

          {/* Comments */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 10 }}>
              Discussion ({comments.length})
            </Text>
            {comments.map((c) => (
              <View key={c.id} style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                <Avatar name={c.user_name} avatarUrl={c.user_avatar} size={32} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>{c.user_name || "User"}</Text>
                    <Text style={{ fontSize: 10, color: Colors.textTertiary }}>
                      {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>{c.content}</Text>
                </View>
              </View>
            ))}
            {user && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    flex: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: 999,
                    fontSize: 13,
                    color: Colors.text,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: newComment.trim() ? Colors.primary : Colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="send" size={16} color={Colors.white} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Host actions */}
          {isCreator && !isPastEvent && (
            <View style={{ gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => router.push(`/events/${id}/edit` as never)}
                style={{ backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
                activeOpacity={0.8}
              >
                <Text style={{ color: Colors.white, fontWeight: "600", fontSize: 14 }}>Edit Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!event) return;
                  const d = new Date(event.datetime);
                  const dateLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
                  const timeLabel = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                  setEmailSubject(`Reminder: ${event.title}`);
                  setEmailMessage(`Hi everyone,\nJust a reminder that ${event.title} is on ${dateLabel} at ${timeLabel}.\nLocation: ${event.location_name || event.location}\nSee you there!`);
                  setShowEmailModal(true);
                }}
                style={{ backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: Colors.border }}
                activeOpacity={0.7}
              >
                <Text style={{ color: Colors.text, fontWeight: "600", fontSize: 14 }}>Email Participants</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} disabled={deleting} activeOpacity={0.7}>
                <Text style={{ color: Colors.error, fontWeight: "600", fontSize: 13, textAlign: "center", paddingVertical: 8 }}>
                  {deleting ? "Deleting..." : "Delete Event"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      {!isCreator && !isPastEvent && (
        <View
          style={{
            backgroundColor: Colors.white,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: 34,
          }}
        >
          {isJoined ? (
            <TouchableOpacity
              onPress={handleLeave}
              disabled={joining}
              style={{ backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 999, alignItems: "center", borderWidth: 1, borderColor: Colors.border }}
              activeOpacity={0.7}
            >
              <Text style={{ color: Colors.text, fontWeight: "600", fontSize: 15 }}>
                {joining ? "Leaving..." : "Leave Event"}
              </Text>
            </TouchableOpacity>
          ) : isFull ? (
            <View style={{ backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}>
              <Text style={{ color: Colors.textSecondary, fontWeight: "600", fontSize: 15 }}>Event Full</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleJoin}
              disabled={joining}
              style={{ backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>
                {joining ? "Joining..." : "Join Event"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Email Modal */}
      <Modal visible={showEmailModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.text }}>Email Participants</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>Subject</Text>
            <TextInput
              value={emailSubject}
              onChangeText={setEmailSubject}
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text, marginBottom: 12 }}
            />
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>Message</Text>
            <TextInput
              value={emailMessage}
              onChangeText={setEmailMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text, minHeight: 120, marginBottom: 16 }}
            />
            <TouchableOpacity
              onPress={handleSendEmail}
              disabled={sendingEmail}
              style={{ backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.white, fontWeight: "600", fontSize: 14 }}>
                {sendingEmail ? "Sending..." : "Send Email"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.text }}>
                Review {reviewingUser?.name || "Participant"}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Rating</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)} activeOpacity={0.7}>
                  <Ionicons
                    name={star <= reviewRating ? "star" : "star-outline"}
                    size={32}
                    color={star <= reviewRating ? Colors.accent : Colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text, marginBottom: 6 }}>Comment (optional)</Text>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="How was your experience?"
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text, minHeight: 80, marginBottom: 16 }}
            />
            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={submittingReview}
              style={{ backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 999, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text style={{ color: Colors.white, fontWeight: "600", fontSize: 14 }}>
                {submittingReview ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
