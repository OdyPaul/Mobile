// hooks/useVerificationRouting.js
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import verificationService from "../features/verification/verificationService";
import { normalizeVerificationList, hasPending, STORAGE_KEYS } from "../lib";

export default function useVerificationRouting(router, user) {
  const [loading, setLoading] = useState(false);

  const go = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        Toast.show({
          type: "error",
          text1: "Not authenticated",
          text2: "Please log in again.",
        });
        router.replace("/(auth)/login");
        return;
      }

      const res = await verificationService.getMyVerificationRequests();
      const list = normalizeVerificationList(res);
      const pending = hasPending(list);

      if (pending) {
        router.replace("/(setup)/pendingVerification");
        return;
      }

      const unverified =
        !user?.verified ||
        String(user.verified).toLowerCase() === "unverified";

      if (unverified) {
        // Let the button stop spinning while the alert is visible
        setLoading(false);
        Alert.alert(
          "Account Not Verified",
          "Your account is not verified. Would you like to verify it now?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "OK",
              onPress: () => {
                // Optional: show spinner again only on confirm
                setLoading(true);
                router.replace("/(setup)/startSetup");
              },
            },
          ]
        );
        return;
      }

      Toast.show({
        type: "info",
        text1: "You’re already verified",
        text2: "No verification needed.",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error checking verification",
        text2: err?.message || "Please try again later.",
      });
    } finally {
      // If user tapped OK, we may have set loading back to true briefly;
      // the route change will unmount anyway. If they canceled, this ensures it resets.
      setLoading(false);
    }
  }, [loading, router, user]);

  return { loading, go };
}
