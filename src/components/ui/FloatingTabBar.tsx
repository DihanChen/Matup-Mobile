import { useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Colors } from "@/constants/colors";

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

type TabConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  index: { icon: "home-outline", iconFilled: "home" },
  explore: { icon: "compass-outline", iconFilled: "compass" },
  leagues: { icon: "trophy-outline", iconFilled: "trophy" },
  profile: { icon: "person-outline", iconFilled: "person" },
};

function TabItem({
  routeName,
  isFocused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const config = TAB_CONFIG[routeName];
  if (!config) return null;

  const scale = useSharedValue(1);
  const pillWidth = useSharedValue(isFocused ? 1 : 0);

  // Animate pill on focus change
  pillWidth.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillWidth.value,
    transform: [
      {
        scaleX: interpolate(
          pillWidth.value,
          [0, 1],
          [0.5, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabItem}
    >
      {/* Active pill background */}
      <Animated.View
        style={[
          styles.activePill,
          pillStyle,
          { backgroundColor: Colors.accent + "18" },
        ]}
      />

      <Animated.View style={iconStyle}>
        <Ionicons
          name={isFocused ? config.iconFilled : config.icon}
          size={22}
          color={isFocused ? Colors.accent : Colors.textTertiary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.barOuter}>
        <View style={styles.barInner}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    paddingHorizontal: 40,
  },
  barOuter: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    width: "100%",
    maxWidth: 360,
    // Subtle border to enhance glass edge
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.5)",
  },
  barInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 28,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 6,
  },
  activePill: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 4,
    right: 4,
    borderRadius: 20,
  },
});
