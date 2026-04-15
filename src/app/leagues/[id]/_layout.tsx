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
      <Stack.Screen
        name="session/[sessionId]/log-run"
        options={{ presentation: "card" }}
      />
      <Stack.Screen
        name="create-session"
        options={{ presentation: "card" }}
      />
    </Stack>
  );
}
