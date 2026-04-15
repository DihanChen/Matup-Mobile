import { Ionicons } from "@expo/vector-icons";
import { getSportEmoji } from "@/lib/share/sportEmojis";

export const SPORT_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
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

export type Activity = {
  id: string;
  name: string;
  emoji: string;
};

export const ACTIVITIES: Activity[] = [
  { id: "running", name: "Running", emoji: getSportEmoji("running") },
  { id: "tennis", name: "Tennis", emoji: getSportEmoji("tennis") },
  { id: "pickleball", name: "Pickleball", emoji: getSportEmoji("pickleball") },
  { id: "cycling", name: "Cycling", emoji: getSportEmoji("cycling") },
  { id: "gym", name: "Gym", emoji: getSportEmoji("gym") },
  { id: "yoga", name: "Yoga", emoji: getSportEmoji("yoga") },
  { id: "basketball", name: "Basketball", emoji: getSportEmoji("basketball") },
  { id: "soccer", name: "Soccer", emoji: getSportEmoji("soccer") },
  { id: "hiking", name: "Hiking", emoji: getSportEmoji("hiking") },
  { id: "other", name: "Other", emoji: getSportEmoji("other") },
];

export const VIBE_OPTIONS = [
  { value: "all", label: "Casual", description: "Just for fun and fitness" },
  { value: "intermediate", label: "Competitive", description: "Intense match, skilled play" },
  { value: "advanced", label: "Pro", description: "Advanced/Club level players" },
];

export const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];

export function generateDateOptions() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      value: date.toISOString().split("T")[0],
      dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: date.getDate(),
      month: date.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
      isTomorrow: i === 1,
    });
  }
  return dates;
}

export function generateQuickTimes() {
  const times: Array<{ value: string; label: string }> = [];
  for (let hour = 6; hour <= 21; hour++) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const h = hour % 12 || 12;
      const ampm = hour >= 12 ? "PM" : "AM";
      times.push({
        value,
        label: `${h}:${String(minute).padStart(2, "0")} ${ampm}`,
      });
    }
  }
  return times;
}

export type EventCreateFormData = {
  sportType: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  locationName: string;
  addressLine: string;
  title: string;
  description: string;
  skillLevel: string;
  maxParticipants: number;
};
