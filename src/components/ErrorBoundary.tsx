import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.white,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Ionicons
            name="warning-outline"
            size={56}
            color={Colors.accent}
            style={{ marginBottom: 16 }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: Colors.text,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: "center",
              marginBottom: 24,
              lineHeight: 20,
            }}
          >
            An unexpected error occurred. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: Colors.accent,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: Colors.white,
                fontWeight: "600",
                fontSize: 15,
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
