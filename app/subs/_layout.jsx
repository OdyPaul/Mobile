// app/subs/_layout.jsx
import { Stack } from "expo-router";

export default function SubsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="vc/detail" />
      <Stack.Screen name="vc/share" />
      <Stack.Screen name="settings/profile" />
      <Stack.Screen name="home/request_vc" />



    </Stack>
  );
}
