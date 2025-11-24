// hooks/useVerificationRouting.js
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import verificationService from "../features/verification/verificationService";
import { normalizeVerificationList, hasPending, STORAGE_KEYS } from "../lib";

function computeIsVerified(user) {
  if (!user) return false;
  const v = user.verified;
  const asString = typeof v === "string" ? v.toLowerCase() : "";
  return (
    v === true ||
    asString === "verified" ||
    user.verificationStatus === "verified" ||
    user.kycStatus === "verified"
  );
}

export default function useVerificationRouting(router, user) {
  const [loading, setLoading] = useState(false);

  const go = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Auth check
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

      // Always refresh from server when user explicitly taps the button
      const res = await verificationService.getMyVerificationRequests({
        forceRefresh: true,
      });
      const list = normalizeVerificationList(res);
      const pending = hasPending(list);

      if (pending) {
        router.replace("/(setup)/pendingVerification");
        return;
      }

      // Local user object verdict
      const isVerified = computeIsVerified(user);
      if (!isVerified) {
        // Let spinner stop while alert is visible
        setLoading(false);
        Alert.alert(
          "Account Not Verified",
          "Your account is not verified. Would you like to verify it now?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "OK",
              onPress: () => {
                setLoading(true);
                router.replace("/(setup)/startSetup");
              },
            },
          ]
        );
        return;
      }

      // ✅ Verified → go straight to profile
      setLoading(false);
      router.push("/subs/settings/profile");
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error checking verification",
        text2: err?.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  }, [loading, router, user]);

  return { loading, go };
}
