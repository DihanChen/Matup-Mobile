import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { ACTIVITIES, SPORT_ICON_MAP } from "@/constants/events";
import { haversineDistance } from "@/lib/geo";
import {
  getUpcomingEventsWithMetadata,
  joinEvent,
  type EventWithMetadata,
} from "@/lib/queries/events";
import { getApprovedCourts } from "@/lib/queries/courts";
import type { Court, DisplayCourt } from "@/lib/court-types";
import {
  rankSwipeEvents,
  rankSwipeCourts,
  type ExploreEvent,
  type SwipeTab,
} from "@/lib/exploreSwipe";
import { ExploreMapView } from "@/components/map/ExploreMapView";
import { EventSwipeCard, CourtSwipeCard } from "@/components/map/SwipeCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui";

type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type ExploreMode = "map" | "swipe";

const SPORT_FILTERS = [
  { value: "", label: "All", icon: null as keyof typeof Ionicons.glyphMap | null },
  ...ACTIVITIES.filter((a) => a.id !== "other").map((a) => ({
    value: a.id,
    label: a.name,
    icon: (SPORT_ICON_MAP[a.id] ?? "fitness-outline") as keyof typeof Ionicons.glyphMap,
  })),
];

const EXPLORE_MODE_OPTIONS = [
  { value: "map" as const, label: "Map", icon: "map" as const },
  { value: "swipe" as const, label: "Discover", icon: "layers" as const },
];

const DISCOVER_TAB_OPTIONS = [
  { value: "events" as const, label: "Events" },
  { value: "courts" as const, label: "Courts" },
];

/**
 * Returns true when an event starts today in the device's local timezone AND
 * has at least one open spot. Compares year/month/date locally — never uses
 * toISOString() which would convert to UTC and shift day boundaries.
 */
export function isTonightWithOpenSpots(event: {
  datetime: string;
  max_participants: number;
  participant_count?: number;
}): boolean {
  const now = new Date();
  const eventStart = new Date(event.datetime);
  const sameLocalDay =
    eventStart.getFullYear() === now.getFullYear() &&
    eventStart.getMonth() === now.getMonth() &&
    eventStart.getDate() === now.getDate();
  const hasOpenSpots = (event.participant_count ?? 0) < event.max_participants;
  return sameLocalDay && hasOpenSpots;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Mode
  const [mode, setMode] = useState<ExploreMode>("map");
  const [activeTab, setActiveTab] = useState<SwipeTab>("events");

  // Location
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);

  // Data
  const [events, setEvents] = useState<EventWithMetadata[]>([]);
  const [dbCourts, setDbCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Map state
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [searchedBounds, setSearchedBounds] = useState<MapBounds | null>(null);

  // Filters
  const [sportFilter, setSportFilter] = useState("");
  const [tonightOnly, setTonightOnly] = useState(false);

  const [joining, setJoining] = useState<string | null>(null);

  // Track fetch version to prevent race conditions
  const fetchVersionRef = useRef(0);

  // Request location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);

          // Auto-set search bounds near user
          const delta = 0.03;
          const nearBounds: MapBounds = {
            south: coords.latitude - delta,
            north: coords.latitude + delta,
            west: coords.longitude - delta,
            east: coords.longitude + delta,
          };
          setSearchedBounds(nearBounds);
        } else {
          // Permission denied — set a wide default so the map still loads
          setLocationError(true);
        }
      } catch {
        setLocationError(true);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // Fetch data when searchedBounds changes (only after location resolves)
  useEffect(() => {
    // Don't fetch until we have bounds (location resolved or user searched)
    if (!searchedBounds) return;

    const version = ++fetchVersionRef.current;

    async function fetchData() {
      setLoading(true);
      setFetchError(false);

      try {
        const [eventsResult, courtsResult] = await Promise.all([
          getUpcomingEventsWithMetadata(
            supabase,
            sportFilter,
            searchedBounds,
            user?.id
          ),
          getApprovedCourts(supabase, sportFilter, searchedBounds),
        ]);

        // Guard against stale results from a previous fetch
        if (version !== fetchVersionRef.current) return;

        setEvents(eventsResult);
        setDbCourts(courtsResult);
      } catch {
        if (version !== fetchVersionRef.current) return;
        setFetchError(true);
      } finally {
        if (version === fetchVersionRef.current) {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [searchedBounds, sportFilter, user?.id]);

  // Derived data with distance
  const eventsWithDistance: ExploreEvent[] = useMemo(() => {
    const filtered = tonightOnly ? events.filter(isTonightWithOpenSpots) : events;
    return filtered.map((event) => {
      if (
        userLocation &&
        event.latitude != null &&
        event.longitude != null
      ) {
        return {
          ...event,
          distance: haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            event.latitude,
            event.longitude
          ),
        };
      }
      return event;
    });
  }, [events, userLocation, tonightOnly]);

  const displayCourts: DisplayCourt[] = useMemo(() => {
    return dbCourts.map((court) => ({
      id: court.id,
      source: "db" as const,
      osm_id: null,
      name: court.name,
      address: court.address,
      latitude: court.latitude,
      longitude: court.longitude,
      sport_types: court.sport_types,
      surface: null,
      lighting: null,
      image_url: court.image_url,
      average_rating: 0,
      review_count: 0,
      distance: userLocation
        ? haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            court.latitude,
            court.longitude
          )
        : undefined,
    }));
  }, [dbCourts, userLocation]);

  // Ranked swipe items
  const rankedEvents = useMemo(
    () => rankSwipeEvents(eventsWithDistance, user?.id ?? null),
    [eventsWithDistance, user?.id]
  );

  const rankedCourts = useMemo(
    () => rankSwipeCourts(displayCourts),
    [displayCourts]
  );

  // Map handlers
  const handleRegionChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    if (mapBounds) {
      setSearchedBounds({ ...mapBounds });
    }
  }, [mapBounds]);

  const handleLocateMe = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(true);
        return;
      }
      setLocationError(false);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      // Always create a new object so React detects the change and
      // ExploreMapView's useEffect fires the map animation
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation({ ...coords });

      const delta = 0.03;
      const nearBounds: MapBounds = {
        south: coords.latitude - delta,
        north: coords.latitude + delta,
        west: coords.longitude - delta,
        east: coords.longitude + delta,
      };
      setSearchedBounds(nearBounds);
    } catch {
      setLocationError(true);
    }
  }, []);

  async function handleJoinEvent(event: ExploreEvent) {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    setJoining(event.id);
    try {
      const result = await joinEvent(supabase, event.id);
      if (result.error) {
        setJoining(null);
        return;
      }
      if (result.requiresAuth) {
        router.push("/(auth)/login");
        setJoining(null);
        return;
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id
            ? {
                ...e,
                participant_count: e.participant_count + 1,
                is_joined_by_current_user: true,
              }
            : e
        )
      );
    } catch {
      // Silently handle — user can retry
    }
    setJoining(null);
  }

  const showSearchButton =
    mapBounds !== null &&
    (searchedBounds === null ||
      mapBounds.south !== searchedBounds.south ||
      mapBounds.north !== searchedBounds.north);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      {/* Sport filter chips */}
      <View
        style={{
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}
        >
          <TouchableOpacity
            key="__tonight__"
            onPress={() => setTonightOnly((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Join tonight filter"
            accessibilityState={{ selected: tonightOnly }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: tonightOnly ? Colors.accent : Colors.surface,
              borderWidth: 1,
              borderColor: tonightOnly ? Colors.accent : Colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons
                name="moon-outline"
                size={14}
                color={tonightOnly ? Colors.white : Colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: tonightOnly ? Colors.white : Colors.text,
                }}
              >
                Join tonight
              </Text>
            </View>
          </TouchableOpacity>
          {SPORT_FILTERS.map((filter) => {
            const isSelected = sportFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.value || "__all__"}
                onPress={() => setSportFilter(filter.value)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: isSelected
                    ? Colors.primary
                    : Colors.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? Colors.primary : Colors.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  {filter.icon ? (
                    <Ionicons
                      name={filter.icon}
                      size={14}
                      color={isSelected ? Colors.white : Colors.textSecondary}
                    />
                  ) : null}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: isSelected ? Colors.white : Colors.text,
                    }}
                  >
                    {filter.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Mode toggle */}
      <View
        style={{
          backgroundColor: Colors.white,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <SegmentedControl
          options={EXPLORE_MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          activeBackgroundColor={Colors.primary}
          activeTextColor={Colors.white}
          inactiveTextColor={Colors.textSecondary}
        />
      </View>

      {/* Content */}
      {mode === "map" ? (
        <View style={{ flex: 1 }}>
          {locationLoading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text
                style={{
                  color: Colors.textSecondary,
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                Getting your location...
              </Text>
            </View>
          ) : (
            <ExploreMapView
              events={eventsWithDistance}
              courts={displayCourts}
              userLocation={userLocation}
              onRegionChange={handleRegionChange}
              onSearchThisArea={handleSearchThisArea}
              showSearchButton={showSearchButton}
              onEventPress={(eventId) =>
                router.push(`/events/${eventId}` as never)
              }
              onCourtPress={(courtId) =>
                router.push(`/courts/${courtId}` as never)
              }
              selectedMarkerId={null}
              onLocateMe={handleLocateMe}
            />
          )}

          {/* Location error banner */}
          {locationError && !locationLoading && (
            <View
              style={{
                position: "absolute",
                top: 12,
                left: 16,
                right: 16,
                backgroundColor: Colors.errorBg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: Colors.errorBorder,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="location-outline" size={18} color={Colors.error} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: Colors.textSecondary,
                }}
              >
                Location unavailable. Tap "Search this area" after panning the
                map.
              </Text>
            </View>
          )}

          {/* Event count badge */}
          {!loading && !fetchError && searchedBounds && (
            <View
              style={{
                position: "absolute",
                bottom: 90,
                left: 16,
                backgroundColor: Colors.white,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: Colors.text,
                }}
              >
                {eventsWithDistance.length} events · {displayCourts.length}{" "}
                courts
              </Text>
            </View>
          )}

          {/* Fetch error badge */}
          {fetchError && !loading && (
            <View
              style={{
                position: "absolute",
                bottom: 90,
                left: 16,
                backgroundColor: Colors.errorBg,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: Colors.errorBorder,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: Colors.error,
                }}
              >
                Failed to load data
              </Text>
            </View>
          )}

          {loading && (
            <View
              style={{
                position: "absolute",
                top: locationError ? 70 : 16,
                alignSelf: "center",
                backgroundColor: Colors.white,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text
                style={{ fontSize: 12, color: Colors.textSecondary }}
              >
                Loading...
              </Text>
            </View>
          )}
        </View>
      ) : (
        // Discover view — scrollable card list
        <View style={{ flex: 1, backgroundColor: Colors.surface }}>
          {/* Events / Courts toggle */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 4,
            }}
          >
            <SegmentedControl
              options={DISCOVER_TAB_OPTIONS}
              value={activeTab}
              onChange={setActiveTab}
              activeBackgroundColor={Colors.accent}
              activeTextColor={Colors.white}
              inactiveTextColor={Colors.text}
            />
          </View>

          {/* Card list */}
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={Colors.accent} />
            </View>
          ) : fetchError ? (
            <EmptyState
              title="Couldn't load nearby"
              description="Try switching sport filters or check your connection."
              icon={
                <Ionicons
                  name="cloud-offline-outline"
                  size={28}
                  color={Colors.textTertiary}
                />
              }
            />
          ) : activeTab === "events" ? (
            <FlatList
              data={rankedEvents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
              ListEmptyComponent={
                tonightOnly ? (
                  <EmptyState
                    title="Nothing tonight"
                    description="No events tonight with open spots"
                    icon={
                      <Ionicons
                        name="moon-outline"
                        size={28}
                        color={Colors.textTertiary}
                      />
                    }
                  />
                ) : (
                  <EmptyState
                    title="No events nearby"
                    description="Widen the search radius or try a different sport."
                    icon={
                      <Ionicons
                        name="search-outline"
                        size={28}
                        color={Colors.textTertiary}
                      />
                    }
                  />
                )
              }
              renderItem={({ item }) => (
                <EventSwipeCard
                  event={item}
                  onJoin={() => handleJoinEvent(item)}
                  onPress={() => router.push(`/events/${item.id}` as never)}
                  joining={joining === item.id}
                />
              )}
            />
          ) : (
            <FlatList
              data={rankedCourts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
              ListEmptyComponent={
                <EmptyState
                  title="No courts nearby"
                  description="Try a broader radius or a different sport."
                  icon={
                    <Ionicons
                      name="search-outline"
                      size={28}
                      color={Colors.textTertiary}
                    />
                  }
                />
              }
              renderItem={({ item }) => (
                <CourtSwipeCard
                  court={item}
                  onPress={() => router.push(`/courts/${item.id}` as never)}
                />
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

