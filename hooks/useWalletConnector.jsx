// hooks/useWalletConnector.js
import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch } from "react-redux";
import { getAddress } from "ethers";
import { useWalletConnectModal } from "@walletconnect/modal-react-native";
import { updateDID } from "../features/auth/authSlice";

// ✅ Export these so RootLayout can import without calling the hook
export const PROJECT_ID = "2909466446bb37af0f229b405872de47";
export const PROVIDER_METADATA = {
  name: "WalletMobile",
  description: "DID connection for verification",
  url: "https://example.com",
  icons: ["https://walletconnect.com/walletconnect-logo.png"],
  redirect: { native: "mobile://" },
};

export default function useWalletConnector() {
  const dispatch = useDispatch();

  const { open, close, isConnected, address, provider } = useWalletConnectModal({
    projectId: PROJECT_ID,
    providerMetadata: PROVIDER_METADATA,
  });

  const saveSessionAndDid = useCallback(
    async (addr) => {
      const checksum = getAddress(addr);
      await AsyncStorage.setItem("walletSession", JSON.stringify({ address: checksum }));
      await dispatch(updateDID(checksum)).unwrap();
      return checksum;
    },
    [dispatch]
  );

  const disconnectAndClear = useCallback(async () => {
    try { await AsyncStorage.removeItem("walletSession"); } catch {}
    try { await provider?.disconnect?.(); } catch {}
    try { await close?.(); } catch {}
    try { await dispatch(updateDID(null)).unwrap(); } catch {}
  }, [provider, close, dispatch]);

  return {
    isConnected,
    address,
    provider,
    open,
    close,
    saveSessionAndDid,
    disconnectAndClear,
  };
}
