import AsyncStorage from "@react-native-async-storage/async-storage";
import WalletConnect from "@walletconnect/client";

const projectId = "2909466446bb37af0f229b405872de47";

export const autoConnectWallet = async (onSuccess, onFail) => {
  try {
    const cachedSession = await AsyncStorage.getItem("walletconnect");
    if (!cachedSession) {
      console.log("🔸 No cached WalletConnect session found");
      return;
    }

    console.log("🔁 Found cached WalletConnect session, reconnecting...");

    const modal = new WalletConnectModal({
      projectId,
      relayUrl: "wss://relay.walletconnect.com",
      providerMetadata: {
        name: "Mobile",
        description: "Auto-Connect Wallet",
        url: "https://mobileapp.com",
        icons: ["https://mobileapp.com/icon.png"],
      },
    });

    await modal.initialize(); // make sure it sets up the bridge
    const provider = modal.getProvider();
    const accounts = await provider?.enable?.();

    if (accounts && accounts[0]) {
      console.log("✅ Auto-connected to:", accounts[0]);
      onSuccess?.(accounts[0]);
    } else {
      console.warn("⚠️ No wallet address found during auto-connect");
      onFail?.();
    }
  } catch (err) {
    console.warn("⚠️ Auto-connect failed:", err);
    onFail?.(err);
  }
};
