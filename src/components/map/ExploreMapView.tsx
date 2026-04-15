import { useRef, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapView, { Marker, Region, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { SPORT_ICON_MAP } from "@/constants/events";
import type { EventWithMetadata } from "@/lib/queries/events";
import type { DisplayCourt } from "@/lib/court-types";

type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

interface ExploreMapViewProps {
  events: EventWithMetadata[];
  courts: DisplayCourt[];
  userLocation: { latitude: number; longitude: number } | null;
  onRegionChange: (bounds: MapBounds) => void;
  onSearchThisArea: () => void;
  showSearchButton: boolean;
  onEventPress: (eventId: string) => void;
  onCourtPress: (courtId: string) => void;
  selectedMarkerId: string | null;
  onLocateMe?: () => void;
}

export function ExploreMapView({
  events,
  courts,
  userLocation,
  onRegionChange,
  onSearchThisArea,
  showSearchButton,
  onEventPress,
  onCourtPress,
  selectedMarkerId,
  onLocateMe,
}: ExploreMapViewProps) {
  const mapRef = useRef<MapView>(null);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      const bounds: MapBounds = {
        south: region.latitude - region.latitudeDelta / 2,
        north: region.latitude + region.latitudeDelta / 2,
        west: region.longitude - region.longitudeDelta / 2,
        east: region.longitude + region.longitudeDelta / 2,
      };
      onRegionChange(bounds);
    },
    [onRegionChange]
  );

  const initialRegion: Region = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : {
        latitude: 39.8283,
        longitude: -98.5795,
        latitudeDelta: 40,
        longitudeDelta: 40,
      };

  // Animate map whenever userLocation object changes (new reference = re-center)
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      300
    );
  }, [userLocation]);

  function centerOnUser() {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        300
      );
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {events
          .filter((e) => e.latitude != null && e.longitude != null)
          .map((event) => (
            <Marker
              key={`event-${event.id}`}
              coordinate={{
                latitude: event.latitude!,
                longitude: event.longitude!,
              }}
              onPress={() => onEventPress(event.id)}
            >
              <View
                style={[
                  styles.markerContainer,
                  selectedMarkerId === event.id && styles.markerSelected,
                ]}
              >
                <Ionicons
                  name={SPORT_ICON_MAP[event.sport_type] ?? "fitness-outline"}
                  size={18}
                  color={Colors.accent}
                />
              </View>
            </Marker>
          ))}

        {(() => {
          // Group courts by proximity — one marker per location
          const groups: Array<{
            key: string;
            latitude: number;
            longitude: number;
            count: number;
            firstId: string;
          }> = [];
          for (const court of courts) {
            const existing = groups.find(
              (g) =>
                Math.abs(g.latitude - court.latitude) < 0.00135 &&
                Math.abs(g.longitude - court.longitude) < 0.00135
            );
            if (existing) {
              existing.count += 1;
              // Average the position
              existing.latitude =
                (existing.latitude * (existing.count - 1) + court.latitude) /
                existing.count;
              existing.longitude =
                (existing.longitude * (existing.count - 1) + court.longitude) /
                existing.count;
            } else {
              groups.push({
                key: `court-group-${court.id}`,
                latitude: court.latitude,
                longitude: court.longitude,
                count: 1,
                firstId: court.id,
              });
            }
          }
          return groups.map((group) => (
            <Marker
              key={group.key}
              coordinate={{
                latitude: group.latitude,
                longitude: group.longitude,
              }}
              onPress={() => onCourtPress(group.firstId)}
            >
              <View
                style={[
                  styles.courtMarker,
                  selectedMarkerId === group.firstId && styles.markerSelected,
                ]}
              >
                <Ionicons name="tennisball" size={14} color={Colors.white} />
              </View>
            </Marker>
          ));
        })()}
      </MapView>

      {/* Search this area button */}
      {showSearchButton && (
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchThisArea}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={14} color={Colors.white} />
          <Text style={styles.searchButtonText}>Search this area</Text>
        </TouchableOpacity>
      )}

      {/* Locate me button — always visible */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          if (onLocateMe) {
            onLocateMe();
          } else {
            centerOnUser();
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={20} color={Colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  courtMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markerSelected: {
    borderColor: Colors.primary,
    transform: [{ scale: 1.2 }],
  },
  searchButton: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  locationButton: {
    position: "absolute",
    bottom: 90,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
