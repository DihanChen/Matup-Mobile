import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { Colors } from "@/constants/colors";
import {
  ACTIVITIES,
  VIBE_OPTIONS,
  DURATION_OPTIONS,
  generateDateOptions,
  generateQuickTimes,
  type EventCreateFormData,
} from "@/constants/events";

const TOTAL_STEPS = 3;
const DATE_OPTIONS = generateDateOptions();
const QUICK_TIMES = generateQuickTimes();

const STEP_LABELS = ["Select Sport", "When & Where", "Almost there"];

export default function EventCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<EventCreateFormData>({
    sportType: "",
    date: "",
    time: "",
    duration: 60,
    location: "",
    coordinates: null,
    locationName: "",
    addressLine: "",
    title: "",
    description: "",
    skillLevel: "all",
    maxParticipants: 4,
  });

  const update = (updates: Partial<EventCreateFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!formData.sportType;
      case 2:
        return !!formData.date && !!formData.time && !!formData.location.trim();
      case 3:
        return formData.maxParticipants >= 2;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS && canProceed()) {
      if (step === 2 && !formData.title) {
        const activity = ACTIVITIES.find((a) => a.id === formData.sportType);
        const locationShort = formData.location.split(",")[0];
        update({ title: `${activity?.name || "Activity"} at ${locationShort}` });
      }
      setStep(step + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    } else {
      router.back();
    }
  };

  async function handleSubmit() {
    if (!canProceed() || !user) return;

    setLoading(true);
    setError(null);

    const title =
      formData.title ||
      `${ACTIVITIES.find((a) => a.id === formData.sportType)?.name || "Event"} at ${formData.location.split(",")[0]}`;

    const datetime = new Date(`${formData.date}T${formData.time}`).toISOString();

    const { data: eventData, error: submitError } = await supabase
      .from("events")
      .insert({
        title,
        description: formData.description || null,
        sport_type: formData.sportType,
        location: formData.location,
        datetime,
        duration: formData.duration,
        skill_level: formData.skillLevel,
        max_participants: formData.maxParticipants,
        creator_id: user.id,
        latitude: formData.coordinates?.lat || null,
        longitude: formData.coordinates?.lng || null,
        location_name:
          formData.locationName ||
          formData.location.split(",")[0]?.trim() ||
          null,
        address_line: formData.addressLine || null,
      })
      .select("id")
      .single();

    if (submitError) {
      setError(submitError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert("Event Created!", "Your event is live.", [
      {
        text: "View Event",
        onPress: () =>
          router.replace(`/events/${eventData?.id}` as never),
      },
      {
        text: "Go to Dashboard",
        onPress: () => router.replace("/(tabs)"),
      },
    ]);
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: Colors.white }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: Colors.text }}>
            Create Event
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Step indicator */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
              Step <Text style={{ color: Colors.accent, fontWeight: "700" }}>{String(step).padStart(2, "0")}</Text> / {String(TOTAL_STEPS).padStart(2, "0")}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "500", color: Colors.text }}>
              {STEP_LABELS[step - 1]}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: Colors.border, borderRadius: 999 }}>
            <View
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: Colors.accent,
                borderRadius: 999,
              }}
            />
          </View>
        </View>

        {error && (
          <View style={{ marginBottom: 16, padding: 12, backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.errorBorder, borderRadius: 12 }}>
            <Text style={{ color: Colors.error, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Step 1: Sport Selection */}
        {step === 1 && (
          <View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.text, textAlign: "center", marginBottom: 24 }}>
              What are we{"\n"}<Text style={{ color: Colors.accent }}>playing today?</Text>
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {ACTIVITIES.map((activity) => {
                const selected = formData.sportType === activity.id;
                return (
                  <TouchableOpacity
                    key={activity.id}
                    onPress={() => update({ sportType: activity.id })}
                    activeOpacity={0.7}
                    style={{
                      width: "30%",
                      flexGrow: 1,
                      minWidth: 90,
                      paddingVertical: 20,
                      paddingHorizontal: 8,
                      borderRadius: 16,
                      backgroundColor: Colors.surface,
                      alignItems: "center",
                      borderWidth: selected ? 2 : 0,
                      borderColor: selected ? Colors.accent : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{activity.emoji}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>
                      {activity.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 2: When & Where */}
        {step === 2 && (
          <View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.text, textAlign: "center", marginBottom: 24 }}>
              When & <Text style={{ color: Colors.accent }}>Where</Text>
            </Text>

            {/* Date picker */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Date</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={DATE_OPTIONS}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ gap: 8, marginBottom: 20 }}
              renderItem={({ item }) => {
                const selected = formData.date === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => update({ date: item.value })}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: selected ? Colors.primary : Colors.surface,
                      alignItems: "center",
                      minWidth: 56,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "500", color: selected ? Colors.white : Colors.textTertiary, marginBottom: 2 }}>
                      {item.isToday ? "Today" : item.isTomorrow ? "Tmrw" : item.dayName}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: selected ? Colors.white : Colors.text }}>
                      {item.dayNum}
                    </Text>
                    <Text style={{ fontSize: 10, color: selected ? "rgba(255,255,255,0.7)" : Colors.textTertiary }}>
                      {item.month}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Time picker */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Time</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={QUICK_TIMES}
              keyExtractor={(item) => item.value}
              contentContainerStyle={{ gap: 8, marginBottom: 20 }}
              renderItem={({ item }) => {
                const selected = formData.time === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => update({ time: item.value })}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: selected ? Colors.primary : Colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: selected ? Colors.white : Colors.text }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Duration */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Duration</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={DURATION_OPTIONS}
              keyExtractor={(item) => String(item.value)}
              contentContainerStyle={{ gap: 8, marginBottom: 20 }}
              renderItem={({ item }) => {
                const selected = formData.duration === item.value;
                return (
                  <TouchableOpacity
                    onPress={() => update({ duration: item.value })}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      backgroundColor: selected ? Colors.primary : Colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: selected ? Colors.white : Colors.text }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Location */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Location</Text>
            <LocationAutocomplete
              value={formData.location}
              onChange={(val) => update({ location: val })}
              onLocationSelect={(loc) =>
                update({
                  location: loc.address,
                  coordinates: { lat: loc.lat, lng: loc.lng },
                  locationName: loc.locationName,
                  addressLine: loc.addressLine,
                })
              }
            />
          </View>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: Colors.text, textAlign: "center", marginBottom: 24 }}>
              How many <Text style={{ color: Colors.accent }}>buddies?</Text>
            </Text>

            {/* Max Participants */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Max Participants</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => update({ maxParticipants: Math.max(2, formData.maxParticipants - 1) })}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.text, minWidth: 50, textAlign: "center" }}>
                {formData.maxParticipants}
              </Text>
              <TouchableOpacity
                onPress={() => update({ maxParticipants: Math.min(100, formData.maxParticipants + 1) })}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Skill Level / Vibe */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Vibe</Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {VIBE_OPTIONS.map((vibe) => {
                const selected = formData.skillLevel === vibe.value;
                return (
                  <TouchableOpacity
                    key={vibe.value}
                    onPress={() => update({ skillLevel: vibe.value })}
                    activeOpacity={0.7}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: selected ? Colors.primary : Colors.surface,
                      borderWidth: selected ? 0 : 1,
                      borderColor: Colors.border,
                    }}
                  >
                    <Text style={{ fontWeight: "600", fontSize: 14, color: selected ? Colors.white : Colors.text }}>
                      {vibe.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: selected ? "rgba(255,255,255,0.7)" : Colors.textSecondary, marginTop: 2 }}>
                      {vibe.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Event Title (optional)</Text>
            <TextInput
              value={formData.title}
              onChangeText={(val) => update({ title: val })}
              placeholder="Auto-generated if left blank"
              placeholderTextColor={Colors.textTertiary}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 12,
                backgroundColor: Colors.surface,
                color: Colors.text,
                fontSize: 14,
                marginBottom: 16,
              }}
            />

            {/* Description */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 }}>Notes (optional)</Text>
            <TextInput
              value={formData.description}
              onChangeText={(val) => update({ description: val })}
              placeholder="Tell people what to expect..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: 12,
                backgroundColor: Colors.surface,
                color: Colors.text,
                fontSize: 14,
                minHeight: 100,
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: 34,
          flexDirection: "row",
          gap: 12,
        }}
      >
        {step > 1 && (
          <TouchableOpacity
            onPress={handleBack}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontWeight: "600", color: Colors.text, fontSize: 14 }}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={step === TOTAL_STEPS ? handleSubmit : handleNext}
          disabled={!canProceed() || loading}
          style={{
            flex: step > 1 ? 2 : 1,
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor: canProceed() && !loading ? Colors.primary : Colors.textMuted,
            alignItems: "center",
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontWeight: "600", color: Colors.white, fontSize: 14 }}>
            {loading ? "Creating..." : step === TOTAL_STEPS ? "Create Event" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
