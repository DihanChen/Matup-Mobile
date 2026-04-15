import { useEffect, useRef } from "react";
import { View, Animated, type ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: Colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: "hidden",
      }}
    >
      <Skeleton width="100%" height={144} borderRadius={0} />
      <View style={{ padding: 12 }}>
        <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}
