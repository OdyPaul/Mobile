// app/_layout.jsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import store from "../redux_store/store";
import { Provider } from "react-redux";
import Toast from "react-native-toast-message";
import { toastConfig } from "../assets/components/toast";

import { WalletConnectModal } from "@walletconnect/modal-react-native";
import { PROJECT_ID, PROVIDER_METADATA } from "../hooks/useWalletConnector";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(setup)" />
          <Stack.Screen name="(subs)" />
        </Stack>

        {/* ✅ Mount once globally. It does NOT auto-open. */}
        <WalletConnectModal projectId={PROJECT_ID} providerMetadata={PROVIDER_METADATA} />

        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </Provider>
  );
}
