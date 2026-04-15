import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  activeBackgroundColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
};

const CONTAINER_PADDING = 3;
const SEGMENT_GAP = 4;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeBackgroundColor = Colors.primary,
  activeTextColor = Colors.white,
  inactiveTextColor = Colors.textSecondary,
}: SegmentedControlProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const animatedIndex = useRef(new Animated.Value(selectedIndex)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: selectedIndex,
      useNativeDriver: true,
      stiffness: 220,
      damping: 24,
      mass: 0.9,
    }).start();
  }, [animatedIndex, selectedIndex]);

  const segmentWidth = useMemo(() => {
    if (!containerWidth || options.length === 0) return 0;

    return (
      (containerWidth - CONTAINER_PADDING * 2 - SEGMENT_GAP * (options.length - 1)) /
      options.length
    );
  }, [containerWidth, options.length]);

  const outputRange = useMemo(
    () =>
      options.map(
        (_, index) => CONTAINER_PADDING + index * (segmentWidth + SEGMENT_GAP)
      ),
    [options, segmentWidth]
  );

  const translateX =
    outputRange.length > 1
      ? animatedIndex.interpolate({
          inputRange: options.map((_, index) => index),
          outputRange,
        })
      : CONTAINER_PADDING;

  function handleLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        position: "relative",
        padding: CONTAINER_PADDING,
        borderRadius: 999,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: CONTAINER_PADDING,
            bottom: CONTAINER_PADDING,
            width: segmentWidth,
            borderRadius: 999,
            backgroundColor: activeBackgroundColor,
            shadowColor: Colors.black,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
            transform: [{ translateX }],
          }}
        />
      ) : null}

      <View style={{ flexDirection: "row", gap: SEGMENT_GAP }}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              activeOpacity={0.8}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={15}
                    color={isSelected ? activeTextColor : inactiveTextColor}
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: isSelected ? activeTextColor : inactiveTextColor,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
