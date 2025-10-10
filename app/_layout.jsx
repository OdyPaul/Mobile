// app/_layout.jsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import store from "../redux_store/store"
import { Provider } from "react-redux";
import Toast from "react-native-toast-message";
import {toastConfig} from "../assets/components/toast"
export default function RootLayout() {
  return (
    <Provider store={store}>
        <SafeAreaProvider>  
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
          </Stack>
          <Toast config={toastConfig}/>
        </SafeAreaProvider>
    </Provider>
  );
}
