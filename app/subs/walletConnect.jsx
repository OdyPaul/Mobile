import "react-native-get-random-values";
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  LogBox,
} from "react-native";
import { WalletConnectModal, useWalletConnectModal } from "@walletconnect/modal-react-native";
import { useDispatch, useSelector } from "react-redux";
import { updateUserDID, updateUser } from "../../features/wallet/didSlice";
import { useRouter } from "expo-router";
LogBox.ignoreLogs([
  "setLayoutAnimationEnabledExperimental",
  "SafeAreaView has been deprecated",
  "Falling back to file-based resolution",
  "WebSocket connection closed",
]);

const projectId = "2909466446bb37af0f229b405872de47";

const providerMetadata = {
  name: "VcWalletApp",
  description: "DID connection for verification",
  url: "https://example.com",
  icons: ["https://walletconnect.com/walletconnect-logo.png"],
  redirect: { native: "vcwalletapp://" },
};

export default function ConnectWalletScreen({ navigation }) {
      const router = useRouter();
  const walletConnect = useWalletConnectModal({
    projectId,
    providerMetadata,
  });

  const { open, close, isConnected, address, provider } = walletConnect;

  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (isConnected && address && user?.did) {
      navigation.replace("Settings");
    }
  }, [isConnected, address, user]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = user?.token;
      if (!token) return Alert.alert("Missing token. Please log in again.");

      const updatedUser = await dispatch(
        updateUserDID({
          userId: user._id,
          walletAddress: address,
          token,
        })
      ).unwrap();

      dispatch(updateUser(updatedUser));

      Alert.alert("✅ Wallet Linked", "Your wallet has been connected.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Settings", { triggerVerify: true }),
        },
      ]);
    } catch (err) {
      console.error("❌ DID Update Error:", err);
      Alert.alert("Error", err.message || "Failed to save wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert("Disconnect Wallet", "Are you sure you want to unlink your wallet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Disconnect",
        onPress: async () => {
          try {
            setLoading(true);
            const token = user?.token;
            if (!token) return Alert.alert("Missing token. Please log in again.");

            const updatedUser = await dispatch(
              updateUserDID({
                userId: user._id,
                walletAddress: null,
                token,
              })
            ).unwrap();

            dispatch(updateUser(updatedUser));

            await safeDisconnect(provider, close);

            setTimeout(() => {
              Alert.alert("✅ Wallet Disconnected", "Your wallet has been unlinked.", [
                { text: "OK", onPress: () => navigation.navigate("Settings") },
              ]);
            }, 600);
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

  const safeDisconnect = async (provider, close) => {
    try {
      if (provider?.disconnect) {
        await provider.disconnect();
      }
    } catch (err) {
      console.warn("⚠️ WalletConnect provider disconnect failed:", err.message);
    } finally {
      try {
        await close();
      } catch {}
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      await open();

      setTimeout(() => {
        if (isConnected && address) {
          handleSave();
        }
      }, 1000);
    } catch (err) {
      console.error("Wallet connect failed:", err);
      Alert.alert("Error", "Failed to open wallet connect modal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(main)/settings")}>
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={styles.backText}>Back to Settings</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Connect Your Wallet</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : isConnected ? (
        <>
          <Text style={styles.addr}>Connected Address:</Text>
          <Text style={styles.addressValue}>{address}</Text>
          <View style={{ height: 10 }} />
          <Button title="Disconnect Wallet" color="red" onPress={handleDisconnect} />
        </>
      ) : (
        <Button title="Connect Wallet" onPress={handleConnect} />
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
