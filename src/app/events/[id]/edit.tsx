import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
} from "@/constants/events";

export default function EventEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sportType, setSportType] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [duration, setDuration] = useState(60);
  const [skillLevel, setSkillLevel] = useState("all");
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const DATE_OPTIONS = generateDateOptions();
  const QUICK_TIMES = generateQuickTimes();

  useEffect(() => {
    async function fetchEvent() {
      if (!id || !user) return;

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (eventError || !eventData) {
        setError("Event not found");
        setLoading(false);
        return;
      }

      if (eventData.creator_id !== user.id) {
        router.back();
        return;
      }

      if (new Date(eventData.datetime) < new Date()) {
        router.back();
        return;
      }

      // Populate form
      setTitle(eventData.title);
      setDescription(eventData.description || "");
      setSportType(eventData.sport_type);
      setLocation(eventData.location);
      setMaxParticipants(eventData.max_participants);
      setDuration(eventData.duration || 60);
      setSkillLevel(eventData.skill_level || "all");

      const dt = new Date(eventData.datetime);
      setDate(dt.toISOString().split("T")[0]);
      setTime(dt.toTimeString().slice(0, 5));

      if (eventData.latitude && eventData.longitude) {
        setCoordinates({
          lat: eventData.latitude,
          lng: eventData.longitude,
        });
      }
      if (eventData.location_name) setLocationName(eventData.location_name);
      if (eventData.address_line) setAddressLine(eventData.address_line);

      setLoading(false);
    }

    fetchEvent();
  }, [id, user]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required.");
      return;
    }
    if (!date || !time) {
      Alert.alert("Error", "Date and time are required.");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Error", "Location is required.");
      return;
    }

    setSaving(true);

    const datetime = new Date(`${date}T${time}`).toISOString();

    const { error: updateError } = await supabase
      .from("events")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        sport_type: sportType,
        location,
        datetime,
        duration,
        skill_level: skillLevel,
        max_participants: maxParticipants,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        location_name:
          locationName || location.split(",")[0]?.trim() || null,
        address_line: addressLine || null,
      })
      .eq("id", id!)
      .eq("creator_id", user?.id);

    if (updateError) {
      Alert.alert("Error", updateError.message);
      setSaving(false);
      return;
    }

    Alert.alert("Saved", "Event updated successfully.", [
      { text: "OK", onPress: () => router.back() },
    ]);
    setSaving(false);
  }

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

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: Colors.textSecondary, marginBottom: 16 }}>
          {error}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.accent, fontWeight: "600" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.white }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 54,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          backgroundColor: Colors.white,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 17, fontWeight: "700", color: Colors.text }}
        >
          Edit Event
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: saving ? Colors.textMuted : Colors.accent,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sport Type */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Sport
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {ACTIVITIES.map((activity) => {
              const isSelected =
                sportType.toLowerCase() === activity.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={activity.id}
                  onPress={() => setSportType(activity.name)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: isSelected
                      ? Colors.primary
                      : Colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? Colors.primary
                      : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {activity.emoji} {activity.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Title */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor={Colors.textTertiary}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: Colors.text,
            backgroundColor: Colors.surface,
            marginBottom: 16,
          }}
        />

        {/* Description */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What should participants know?"
          placeholderTextColor={Colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            color: Colors.text,
            backgroundColor: Colors.surface,
            minHeight: 90,
            marginBottom: 16,
          }}
        />

        {/* Date */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Date
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {DATE_OPTIONS.map((d) => {
              const isSelected = date === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => setDate(d.value)}
                  activeOpacity={0.7}
                  style={{
                    width: 56,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isSelected
                      ? Colors.primary
                      : Colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? Colors.primary
                      : Colors.border,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: isSelected
                        ? Colors.white
                        : Colors.textSecondary,
                      marginBottom: 2,
                    }}
                  >
                    {d.isToday
                      ? "Today"
                      : d.isTomorrow
                        ? "Tmrw"
                        : d.dayName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {d.dayNum}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: isSelected
                        ? Colors.white
                        : Colors.textSecondary,
                    }}
                  >
                    {d.month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Time */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Time
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {QUICK_TIMES.map((t) => {
              const isSelected = time === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTime(t.value)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: isSelected
                      ? Colors.primary
                      : Colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? Colors.primary
                      : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Duration */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Duration
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {DURATION_OPTIONS.map((d) => {
              const isSelected = duration === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => setDuration(d.value)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: isSelected
                      ? Colors.primary
                      : Colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? Colors.primary
                      : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Location */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 6,
          }}
        >
          Location
        </Text>
        <View style={{ marginBottom: 16, zIndex: 10 }}>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            onLocationSelect={(loc) => {
              setLocation(loc.address);
              setCoordinates({ lat: loc.lat, lng: loc.lng });
              setLocationName(loc.locationName);
              setAddressLine(loc.addressLine);
            }}
            placeholder="Search for a location"
          />
        </View>

        {/* Skill Level */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Vibe
        </Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {VIBE_OPTIONS.map((v) => {
            const isSelected = skillLevel === v.value;
            return (
              <TouchableOpacity
                key={v.value}
                onPress={() => setSkillLevel(v.value)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? Colors.primary
                    : Colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected
                    ? Colors.primary
                    : Colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {v.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isSelected
                        ? "rgba(255,255,255,0.7)"
                        : Colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {v.description}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.white}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Max Participants */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: Colors.text,
            marginBottom: 8,
          }}
        >
          Max Participants
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              setMaxParticipants(Math.max(2, maxParticipants - 1))
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: Colors.text,
              minWidth: 40,
              textAlign: "center",
            }}
          >
            {maxParticipants}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setMaxParticipants(Math.min(100, maxParticipants + 1))
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
