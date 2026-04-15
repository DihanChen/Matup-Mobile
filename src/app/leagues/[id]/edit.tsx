import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { ErrorState } from "@/components/ui";
import {
  EDIT_LEAGUE_TITLE,
  NAME_LABEL,
  DESCRIPTION_LABEL,
  VISIBILITY_LABEL,
  COVER_IMAGE_LABEL,
  SAVE_BUTTON_LABEL,
  SAVING_BUTTON_LABEL,
  IMMUTABLE_FIELD_HELPER,
  ERROR_LOAD_FAILED,
  ERROR_SAVE_FAILED,
} from "@/lib/league-edit-strings";
import { FORMAT_LABELS } from "@/lib/league-types";

// Cover image presets.
// Source: frontend/src/features/leagues/components/create/LeagueDetailsStep.tsx
// (LeagueDetailsStep does not currently expose explicit cover-image choices;
// mobile re-uses the same sport-cover asset catalog that the detail banner
// renders via lib/sportCovers.ts so the picker stays consistent with every
// other league surface. Keep this list aligned with that catalog.)
const COVER_IMAGE_PRESETS: Array<{ id: string; url: string; label: string }> = [
  { id: "tennis", url: "/covers/tennis.jpg", label: "Tennis" },
  { id: "pickleball", url: "/covers/pickleball.jpg", label: "Pickleball" },
  { id: "running", url: "/covers/running.jpg", label: "Running" },
  { id: "basketball", url: "/covers/basketball.jpg", label: "Basketball" },
  { id: "soccer", url: "/covers/soccer.jpg", label: "Soccer" },
  { id: "gym", url: "/covers/gym.jpg", label: "Gym" },
  { id: "yoga", url: "/covers/yoga.jpg", label: "Yoga" },
  { id: "cycling", url: "/covers/cycling.jpg", label: "Cycling" },
  { id: "hiking", url: "/covers/hiking.jpg", label: "Hiking" },
];

// Local preview assets for cover thumbnails (bundled with the app).
const COVER_PREVIEW_SOURCES: Record<string, number> = {
  "/covers/tennis.jpg": require("../../../../assets/covers/tennis.jpg"),
  "/covers/pickleball.jpg": require("../../../../assets/covers/pickleball.jpg"),
  "/covers/running.jpg": require("../../../../assets/covers/running.jpg"),
  "/covers/basketball.jpg": require("../../../../assets/covers/basketball.jpg"),
  "/covers/soccer.jpg": require("../../../../assets/covers/soccer.jpg"),
  "/covers/gym.jpg": require("../../../../assets/covers/gym.jpg"),
  "/covers/yoga.jpg": require("../../../../assets/covers/yoga.jpg"),
  "/covers/cycling.jpg": require("../../../../assets/covers/cycling.jpg"),
  "/covers/hiking.jpg": require("../../../../assets/covers/hiking.jpg"),
};

type Visibility = "public" | "private" | "invite_only";

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string }> = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "invite_only", label: "Invite only" },
];

type LeagueRow = {
  id: string;
  name: string;
  description: string | null;
  sport_type: string;
  scoring_format: string;
  max_members: number;
  creator_id: string;
  visibility: Visibility | null;
  cover_image_url: string | null;
};

export default function EditLeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const [league, setLeague] = useState<LeagueRow | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const fetchLeague = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from("leagues")
      .select(
        "id, name, description, sport_type, scoring_format, max_members, creator_id, visibility, cover_image_url"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      setLoadError(true);
      setLoading(false);
      return;
    }

    const row = data as LeagueRow;
    setLeague(row);
    setName(row.name ?? "");
    setDescription(row.description ?? "");
    setVisibility((row.visibility as Visibility) ?? "public");
    setCoverImageUrl(row.cover_image_url ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchLeague();
  }, [fetchLeague]);

  const handleSave = useCallback(async () => {
    if (!id || !user?.id || !league) return;
    setNetworkError(null);
    setSaving(true);

    const { error } = await supabase
      .from("leagues")
      .update({
        name: name.trim(),
        description: description.trim(),
        visibility,
        cover_image_url: coverImageUrl,
      })
      .eq("id", id)
      .eq("creator_id", user.id);

    setSaving(false);

    if (error) {
      setNetworkError(ERROR_SAVE_FAILED);
      return;
    }

    router.back();
  }, [
    id,
    user?.id,
    league,
    name,
    description,
    visibility,
    coverImageUrl,
    router,
  ]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (loadError || !league) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <View
          style={{
            backgroundColor: Colors.primary,
            paddingTop: 56,
            paddingBottom: 16,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 12 }}
            activeOpacity={0.7}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text
            style={{
              color: Colors.white,
              fontSize: 17,
              fontWeight: "700",
              flex: 1,
            }}
          >
            {EDIT_LEAGUE_TITLE}
          </Text>
        </View>
        <ErrorState
          title="Couldn't load league"
          description={ERROR_LOAD_FAILED}
          onRetry={fetchLeague}
          retryLabel="Try again"
        />
      </View>
    );
  }

  const formatLabel =
    FORMAT_LABELS[league.scoring_format as keyof typeof FORMAT_LABELS] ??
    league.scoring_format;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.primary,
          paddingTop: 56,
          paddingBottom: 16,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
          activeOpacity={0.7}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text
          style={{
            color: Colors.white,
            fontSize: 17,
            fontWeight: "700",
            flex: 1,
          }}
        >
          {EDIT_LEAGUE_TITLE}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          {NAME_LABEL}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="League name"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel={NAME_LABEL}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 15,
            fontWeight: "600",
            color: Colors.text,
            backgroundColor: Colors.surface,
            marginBottom: 20,
          }}
        />

        {/* Description */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          {DESCRIPTION_LABEL}
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What's this league about?"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel={DESCRIPTION_LABEL}
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 14,
            color: Colors.text,
            backgroundColor: Colors.surface,
            minHeight: 96,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        {/* Visibility */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          {VISIBILITY_LABEL}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {VISIBILITY_OPTIONS.map((opt) => {
            const selected = visibility === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setVisibility(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: selected ? Colors.accent : Colors.border,
                  backgroundColor: selected ? Colors.accentTint : Colors.white,
                  alignItems: "center",
                }}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`Set visibility to ${opt.label}`}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: selected ? Colors.accent : Colors.textSecondary,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cover image */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          {COVER_IMAGE_LABEL}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
          style={{ marginBottom: 20 }}
        >
          {COVER_IMAGE_PRESETS.map((preset) => {
            const selected = coverImageUrl === preset.url;
            const src = COVER_PREVIEW_SOURCES[preset.url];
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => setCoverImageUrl(preset.url)}
                activeOpacity={0.8}
                accessibilityLabel={`Select ${preset.label} cover`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={{
                  width: 96,
                  height: 64,
                  borderRadius: 10,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: selected ? Colors.accent : Colors.border,
                  backgroundColor: Colors.surface,
                }}
              >
                {src ? (
                  <Image
                    source={src}
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
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: Colors.textSecondary,
                      }}
                    >
                      {preset.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Immutable fields */}
        <View
          style={{
            backgroundColor: Colors.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 10,
          }}
        >
          <ImmutableRow label="Sport" value={league.sport_type} capitalize />
          <ImmutableRow label="Scoring format" value={formatLabel} />
          <ImmutableRow
            label="Max members"
            value={String(league.max_members)}
            isLast
          />
        </View>
        <Text
          style={{
            fontSize: 12,
            color: Colors.textSecondary,
            marginBottom: 20,
            lineHeight: 16,
          }}
        >
          {IMMUTABLE_FIELD_HELPER}
        </Text>

        {/* Inline save error — preserves field values */}
        {networkError ? (
          <ErrorState
            compact
            title="Couldn't save"
            description={networkError}
            onRetry={handleSave}
            retryLabel="Try again"
            style={{ marginBottom: 12 }}
          />
        ) : null}
      </ScrollView>

      {/* Save button */}
      <View
        style={{
          padding: 16,
          paddingBottom: 34,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={{
            backgroundColor:
              saving || !name.trim() ? Colors.textMuted : Colors.accent,
            paddingVertical: 16,
            borderRadius: 999,
            alignItems: "center",
          }}
          activeOpacity={0.8}
          accessibilityLabel={saving ? SAVING_BUTTON_LABEL : SAVE_BUTTON_LABEL}
          accessibilityRole="button"
          accessibilityState={{
            disabled: saving || !name.trim(),
            busy: saving,
          }}
        >
          <Text
            style={{
              color: Colors.white,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {saving ? SAVING_BUTTON_LABEL : SAVE_BUTTON_LABEL}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ImmutableRow({
  label,
  value,
  capitalize = false,
  isLast = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: Colors.borderLight,
      }}
    >
      <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
