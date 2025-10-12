// app/(setup)/_layout.jsx
import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="startSetup" />
      <Stack.Screen name="personal_info" />
      <Stack.Screen name="educ_info" />
      <Stack.Screen name="selfie" />
      <Stack.Screen name="valid_id" />
      <Stack.Screen name="confirm" />
    </Stack>
  );
}
