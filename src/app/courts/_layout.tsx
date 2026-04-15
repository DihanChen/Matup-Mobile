import { Stack } from "expo-router";

export default function CourtsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="create" />
    </Stack>
  );
}
