// hooks/useSignOut.js
import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { logout } from "../features/auth/authSlice";
import verificationService from "../features/verification/verificationService";

export default function useSignOut() {
  const router = useRouter();
  const dispatch = useDispatch();

  const signOut = useCallback(async () => {
    try {
      // Clear auth via Redux
      await dispatch(logout());

      // Also clear any cached verification data
      await verificationService.clearVerificationCache();

      Toast.show({
        type: "success",
        text1: "Logged Out",
        text2: "You have been logged out successfully.",
      });

      router.replace("/(auth)/login");
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Logout error",
        text2: e?.message || "Please try again.",
      });
    }
  }, [dispatch, router]);

  return { signOut };
}
