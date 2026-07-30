import { Stack } from "expo-router";

import { colors } from "@/constants/theme";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackVisible: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Welcome to Snacc" }} />
      <Stack.Screen name="avatar" options={{ title: "Profile Picture" }} />
    </Stack>
  );
}
