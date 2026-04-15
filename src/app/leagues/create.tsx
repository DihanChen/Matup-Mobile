import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { buildLeagueRules } from "@/lib/league-rules";
import { getSportEmoji } from "@/lib/share/sportEmojis";
import {
  generateDateOptions,
  generateQuickTimes,
} from "@/constants/events";

const SPORTS = [
  { id: "tennis", label: "Tennis" },
  { id: "pickleball", label: "Pickleball" },
  { id: "running", label: "Running" },
];

const MATCH_TYPES = [
  { id: "singles", label: "Singles" },
  { id: "doubles", label: "Doubles" },
];

const ROTATION_TYPES = [
  { id: "random", label: "Random Weekly" },
  { id: "assigned", label: "Assigned Partners" },
];

const TOTAL_STEPS = 3;
const DATE_OPTIONS = generateDateOptions();

export default function LeagueCreateScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Sport & Format
  const [sportType, setSportType] = useState("");
  const [matchType, setMatchType] = useState("");
  const [rotationType, setRotationType] = useState("");

  // Step 2: Schedule
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [seasonWeeks, setSeasonWeeks] = useState(10);

  // Step 3: Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(20);

  const isRacketSport = sportType === "tennis" || sportType === "pickleball";
  const isRunning = sportType === "running";
  const isDoubles = matchType === "doubles";

  function canAdvance(): boolean {
    if (step === 1) {
      if (!sportType) return false;
      if (isRacketSport && !matchType) return false;
      if (isDoubles && !rotationType) return false;
      return true;
    }
    if (step === 2) {
      return !!startDate && !!startTime;
    }
    if (step === 3) {
      return !!name.trim();
    }
    return false;
  }

  async function handleSubmit() {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Error", "League name is required.");
      return;
    }

    setLoading(true);

    // Determine scoring format
    let scoringFormat = "singles";
    if (isRunning) {
      scoringFormat = "individual_time";
    } else if (isDoubles) {
      scoringFormat = "doubles";
    } else if (matchType === "singles") {
      scoringFormat = "singles";
    }

    // Build rules
    const rulesJson = buildLeagueRules({
      sportType: sportType as "tennis" | "pickleball" | "running",
      matchType: (matchType || "") as "" | "singles" | "doubles",
      rotationType: (rotationType || "") as "" | "random" | "assigned",
      runningComparisonMode: "personal_progress",
      startDate: startDate || "",
      startTime: startTime || "",
      seasonWeeks,
    });

    const { data: league, error } = await supabase
      .from("leagues")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        sport_type: sportType,
        scoring_format: scoringFormat,
        league_type: "season",
        max_members: maxMembers,
        start_date: startDate || null,
        season_weeks: seasonWeeks,
        rotation_type: isDoubles ? rotationType || null : null,
        rules_version: 1,
        rules_jsonb: rulesJson,
        creator_id: user.id,
      })
      .select("id")
      .single();

    if (error || !league) {
      Alert.alert("Error", error?.message || "Failed to create league.");
      setLoading(false);
      return;
    }

    // Add creator as owner
    await supabase.from("league_members").insert({
      league_id: league.id,
      user_id: user.id,
      role: "owner",
    });

    setLoading(false);
    Alert.alert("League Created!", `"${name}" has been created.`, [
      {
        text: "View League",
        onPress: () => router.replace(`/leagues/${league.id}` as never),
      },
    ]);
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
        }}
      >
        <TouchableOpacity
          onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700", color: Colors.text }}>
          Create League
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
          {step}/{TOTAL_STEPS}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 3,
          backgroundColor: Colors.borderLight,
        }}
      >
        <View
          style={{
            height: 3,
            width: `${(step / TOTAL_STEPS) * 100}%`,
            backgroundColor: Colors.accent,
          }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <StepSportFormat
            sportType={sportType}
            setSportType={(s) => {
              setSportType(s);
              setMatchType("");
              setRotationType("");
            }}
            matchType={matchType}
            setMatchType={(m) => {
              setMatchType(m);
              setRotationType("");
            }}
            rotationType={rotationType}
            setRotationType={setRotationType}
            isRacketSport={isRacketSport}
            isDoubles={isDoubles}
          />
        )}

        {step === 2 && (
          <StepSchedule
            startDate={startDate}
            setStartDate={setStartDate}
            startTime={startTime}
            setStartTime={setStartTime}
            seasonWeeks={seasonWeeks}
            setSeasonWeeks={setSeasonWeeks}
          />
        )}

        {step === 3 && (
          <StepDetails
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            maxMembers={maxMembers}
            setMaxMembers={setMaxMembers}
          />
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: 34,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.white,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (step < TOTAL_STEPS) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={!canAdvance() || loading}
          style={{
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor: canAdvance() ? Colors.accent : Colors.textMuted,
            alignItems: "center",
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 15 }}>
            {loading
              ? "Creating..."
              : step < TOTAL_STEPS
                ? "Continue"
                : "Create League"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepSportFormat({
  sportType,
  setSportType,
  matchType,
  setMatchType,
  rotationType,
  setRotationType,
  isRacketSport,
  isDoubles,
}: {
  sportType: string;
  setSportType: (s: string) => void;
  matchType: string;
  setMatchType: (m: string) => void;
  rotationType: string;
  setRotationType: (r: string) => void;
  isRacketSport: boolean;
  isDoubles: boolean;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: Colors.text,
          marginBottom: 4,
        }}
      >
        Sport & Format
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: Colors.textSecondary,
          marginBottom: 20,
        }}
      >
        Choose the sport and match format for your league.
      </Text>

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          marginBottom: 10,
        }}
      >
        Sport
      </Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {SPORTS.map((sport) => {
          const isSelected = sportType === sport.id;
          return (
            <TouchableOpacity
              key={sport.id}
              onPress={() => setSportType(sport.id)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: isSelected
                  ? Colors.primary
                  : Colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? Colors.primary : Colors.border,
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 12 }}>
                {getSportEmoji(sport.id)}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: "600",
                  color: isSelected ? Colors.white : Colors.text,
                }}
              >
                {sport.label}
              </Text>
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

      {isRacketSport && (
        <>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: Colors.text,
              marginBottom: 10,
            }}
          >
            Match Type
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {MATCH_TYPES.map((mt) => {
              const isSelected = matchType === mt.id;
              return (
                <TouchableOpacity
                  key={mt.id}
                  onPress={() => setMatchType(mt.id)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
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
                      fontSize: 14,
                      fontWeight: "600",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {isDoubles && (
        <>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: Colors.text,
              marginBottom: 10,
            }}
          >
            Partner Rotation
          </Text>
          <View style={{ gap: 8 }}>
            {ROTATION_TYPES.map((rt) => {
              const isSelected = rotationType === rt.id;
              return (
                <TouchableOpacity
                  key={rt.id}
                  onPress={() => setRotationType(rt.id)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: isSelected
                      ? Colors.primary
                      : Colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? Colors.primary
                      : Colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: "600",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {rt.label}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={Colors.white}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

function StepSchedule({
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  seasonWeeks,
  setSeasonWeeks,
}: {
  startDate: string;
  setStartDate: (d: string) => void;
  startTime: string;
  setStartTime: (t: string) => void;
  seasonWeeks: number;
  setSeasonWeeks: (w: number) => void;
}) {
  const QUICK_TIMES = generateQuickTimes();

  return (
    <View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: Colors.text,
          marginBottom: 4,
        }}
      >
        Schedule
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: Colors.textSecondary,
          marginBottom: 20,
        }}
      >
        When does the league season start?
      </Text>

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          marginBottom: 8,
        }}
      >
        Start Date
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {DATE_OPTIONS.map((d) => {
            const isSelected = startDate === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                onPress={() => setStartDate(d.value)}
                activeOpacity={0.7}
                style={{
                  width: 56,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? Colors.primary
                    : Colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? Colors.primary : Colors.border,
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

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          marginBottom: 8,
        }}
      >
        Start Time
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          {QUICK_TIMES.map((t) => {
            const isSelected = startTime === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => setStartTime(t.value)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: isSelected
                    ? Colors.primary
                    : Colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? Colors.primary : Colors.border,
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

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          marginBottom: 8,
        }}
      >
        Season Length (weeks)
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setSeasonWeeks(Math.max(4, seasonWeeks - 1))}
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
          {seasonWeeks}
        </Text>
        <TouchableOpacity
          onPress={() => setSeasonWeeks(Math.min(52, seasonWeeks + 1))}
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
    </View>
  );
}

function StepDetails({
  name,
  setName,
  description,
  setDescription,
  maxMembers,
  setMaxMembers,
}: {
  name: string;
  setName: (n: string) => void;
  description: string;
  setDescription: (d: string) => void;
  maxMembers: number;
  setMaxMembers: (m: number) => void;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: Colors.text,
          marginBottom: 4,
        }}
      >
        League Details
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: Colors.textSecondary,
          marginBottom: 20,
        }}
      >
        Name your league and set member limits.
      </Text>

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          marginBottom: 6,
        }}
      >
        League Name *
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Saturday Tennis League"
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
        placeholder="Tell members about this league..."
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

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: Colors.text,
          marginBottom: 8,
        }}
      >
        Max Members
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setMaxMembers(Math.max(4, maxMembers - 1))}
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
          {maxMembers}
        </Text>
        <TouchableOpacity
          onPress={() => setMaxMembers(Math.min(100, maxMembers + 1))}
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
    </View>
  );
}
