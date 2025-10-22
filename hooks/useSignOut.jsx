import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import Toast from "react-native-toast-message";
import { logout } from "../features/auth/authSlice";
import useWalletConnector from "./useWalletConnector";

export default function useSignOut() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isConnected, disconnectAndClear } = useWalletConnector();

  const signOut = useCallback(async () => {
    try {
      // Disconnect WalletConnect (provider + DID + local walletSession)
      if (isConnected) {
        await disconnectAndClear();
      }

      // Clear user/token from storage via redux thunk/service
      await dispatch(logout());

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
  }, [isConnected, disconnectAndClear, dispatch, router]);

  return { signOut };
}
