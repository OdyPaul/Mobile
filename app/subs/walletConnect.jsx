import "react-native-get-random-values";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  WalletConnectModal,
  useWalletConnectModal,
} from "@walletconnect/modal-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { updateDID } from "../../features/auth/authSlice";
import { useRouter } from "expo-router";

const projectId = "2909466446bb37af0f229b405872de47";

const providerMetadata = {
  name: "WalletMobile",
  description: "DID connection for verification",
  url: "https://example.com",
  icons: ["https://walletconnect.com/walletconnect-logo.png"],
  redirect: { native: "mobile://" },
};

export default function ConnectWalletScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const { open, close, isConnected, address, provider } = useWalletConnectModal({
    projectId,
    providerMetadata,
  });

  const [loading, setLoading] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);

  // ✅ Load existing saved wallet
  useEffect(() => {
    const loadWallet = async () => {
      const stored = await AsyncStorage.getItem("walletSession");
      if (stored) {
        const { address } = JSON.parse(stored);
        setSavedAddress(address);
      }
    };
    loadWallet();
  }, []);

  // ✅ Save wallet address to local storage only when it’s rendered
  useEffect(() => {
    const saveIfConnected = async () => {
      if (isConnected && address) {
        await AsyncStorage.setItem("walletSession", JSON.stringify({ address }));
        setSavedAddress(address);

        // update DID if not linked yet
        if (!user?.did) {
          try {
            await dispatch(updateDID(address)).unwrap();
          } catch (err) {
            console.error("DID update failed:", err);
          }
        }
      }
    };
    saveIfConnected();
  }, [isConnected, address]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 200)); // ensure modal mounts
      await open();
    } catch (err) {
      console.error("Wallet connect failed:", err);
      Alert.alert("Error", "Failed to connect wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };
//works
  const disconnectWallet = async () => {
    Alert.alert("Disconnect Wallet", "Are you sure you want to unlink your wallet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Disconnect",
        onPress: async () => {
          try {
            setLoading(true);
            await AsyncStorage.removeItem("walletSession");
            setSavedAddress(null);
            await dispatch(updateDID(null)).unwrap();
            if (provider?.disconnect) await provider.disconnect();
            await close();

            Alert.alert("✅ Wallet Disconnected", "Your wallet has been unlinked.", [
              { text: "OK", onPress: () => router.push("/(main)/settings") },
            ]);
          } catch (err) {
            console.error("❌ Disconnect Error:", err);
            Alert.alert("Error", err.message || "Failed to disconnect wallet.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/(main)/settings")}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={styles.backText}>Back to Settings</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Connect Your MetaMask Wallet</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : savedAddress ? (
        <>
          <Text style={styles.addr}>Connected Address:</Text>
          <Text style={styles.addressValue}>{savedAddress}</Text>
          <View style={{ height: 10 }} />
          <Button title="Disconnect Wallet" color="red" onPress={disconnectWallet} />
        </>
      ) : (
        <Button title="Connect Wallet" onPress={connectWallet} />
      )}

      <WalletConnectModal projectId={projectId} providerMetadata={providerMetadata} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  addr: { fontSize: 14, marginBottom: 6, textAlign: "center" },
  addressValue: { fontSize: 12, color: "#555", textAlign: "center", marginBottom: 20 },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backText: { marginLeft: 6, fontSize: 16, color: "#000" },
});
