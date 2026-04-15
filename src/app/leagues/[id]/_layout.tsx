import { Stack } from "expo-router";

export default function LeagueDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="fixture/[fixtureId]"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="submit-result"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="session/[sessionId]"
        options={{ presentation: "card" }}
      />
    </Stack>
  );
}
