import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Colors } from "@/constants/colors";

type LocationSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

type LocationResult = {
  address: string;
  lat: number;
  lng: number;
  locationName: string;
  addressLine: string;
};

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: LocationResult) => void;
  placeholder?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Search for a location",
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: query,
            format: "json",
            addressdetails: "1",
            limit: "5",
          }),
        {
          headers: { "Accept-Language": "en-US,en" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
        setIsOpen(true);
      }
    } catch {
      setSuggestions([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleInputChange(text: string) {
    onChange(text);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 1000);
  }

  function handleSelect(suggestion: LocationSuggestion) {
    const formattedAddress = suggestion.display_name;
    const parts = formattedAddress.split(",");
    const locationName = parts[0]?.trim() || formattedAddress;
    const addressLine = parts.slice(1).join(",").trim() || formattedAddress;

    onChange(formattedAddress);
    onLocationSelect({
      address: formattedAddress,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      locationName,
      addressLine,
    });
    setSuggestions([]);
    setIsOpen(false);
    Keyboard.dismiss();
  }

  function formatShortName(suggestion: LocationSuggestion): string {
    const parts = [];
    const addr = suggestion.address;

    if (addr.city) parts.push(addr.city);
    else if (addr.town) parts.push(addr.town);
    else if (addr.village) parts.push(addr.village);

    if (addr.state) parts.push(addr.state);
    if (addr.country) parts.push(addr.country);

    return parts.join(", ") || suggestion.display_name;
  }

  return (
    <View style={{ zIndex: 10 }}>
      <View style={{ position: "relative" }}>
        <TextInput
          value={value}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          style={{
            width: "100%",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            backgroundColor: Colors.surface,
            color: Colors.text,
            fontSize: 14,
          }}
        />
        {isLoading && (
          <View style={{ position: "absolute", right: 12, top: 12 }}>
            <ActivityIndicator size="small" color={Colors.accent} />
          </View>
        )}
      </View>

      {value.length > 0 && value.length < 3 && (
        <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>
          Type at least 3 characters to search
        </Text>
      )}

      {isOpen && (
        <View
          style={{
            position: "absolute",
            top: 52,
            left: 0,
            right: 0,
            backgroundColor: Colors.white,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 12,
            maxHeight: 240,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            zIndex: 20,
          }}
        >
          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(_, index) => String(index)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.6}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.borderLight,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 16, marginTop: 1 }}>{"\uD83D\uDCCD"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontWeight: "600",
                        color: Colors.text,
                        fontSize: 14,
                      }}
                    >
                      {formatShortName(item)}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: Colors.textSecondary,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {item.display_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : !isLoading ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                No locations found
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
