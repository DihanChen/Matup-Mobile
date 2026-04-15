import { Stack } from "expo-router";

export default function LeaguesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create" />
      <Stack.Screen name="join" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
