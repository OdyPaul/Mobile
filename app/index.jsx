// app/index.jsx
import { useEffect } from "react";
import { useRouter, useRootNavigationState } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();
  const rootNavigation = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigation?.key) return; // wait for layout to mount
    const timer = setTimeout(() => {
      router.replace("/onboarding");
    }, 1000);
    return () => clearTimeout(timer);
  }, [rootNavigation?.key]);


  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
