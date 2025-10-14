// app/(subs)/walletConnect.jsx
import "../../polyfills";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  WalletConnectModal,
  useWalletConnectModal,
} from "@walletconnect/modal-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { updateDID } from "../../features/auth/authSlice";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { isAddress, getAddress } from "ethers";

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
  const { from } = useLocalSearchParams(); // 👈 detect source
  const cameFromSetup = String(from || "") === "setup";
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const { open, close, isConnected, address, provider } = useWalletConnectModal({
    projectId,
    providerMetadata,
  });

  const [loading, setLoading] = useState(false);
  const [savedAddress, setSavedAddress] = useState(null);
  const [didInput, setDidInput] = useState("");

  // Optional native header
  useEffect(() => {
    // no-op; Stack.Screen is declared in render
  }, []);

  // Load saved wallet on mount
  useEffect(() => {
    const loadWallet = async () => {
      try {
        const stored = await AsyncStorage.getItem("walletSession");
        if (stored) {
          const { address: a } = JSON.parse(stored);
          setSavedAddress(a);
        }
      } catch (e) {
        console.error("Load wallet error:", e);
      }
    };
    loadWallet();
  }, []);

  // Auto-save wallet if connected (normalize to checksum)
  useEffect(() => {
    const saveIfConnected = async () => {
      try {
        if (isConnected && address) {
          const checksum = getAddress(address); // throws if invalid
          await AsyncStorage.setItem("walletSession", JSON.stringify({ address: checksum }));
          setSavedAddress(checksum);

          // Update user DID if needed
          if (!user || !user.did) {
            try {
              await dispatch(updateDID(checksum)).unwrap();
            } catch (err) {
              console.error("DID update failed:", err);
            }
          }
        }
      } catch (e) {
        console.error("Auto-save checksum error:", e);
      }
    };
    saveIfConnected();
  }, [isConnected, address]);

  const connectWallet = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await open();
    } catch (err) {
      console.error("Wallet connect failed:", err);
      Alert.alert("Error", "Failed to connect wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            if (provider && provider.disconnect) await provider.disconnect();
            await close();
            Alert.alert("✅ Wallet Disconnected", "Your wallet has been unlinked.", [
              { text: "OK", onPress: () => router.push("/(main)/settings") },
            ]);
          } catch (err) {
            console.error("❌ Disconnect Error:", err);
            Alert.alert("Error", "Failed to disconnect wallet.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Validate DID or plain wallet, then confirm & save
  const validateAndSaveDID = async () => {
    try {
      let input = (didInput || "").trim();

      // Accept plain 0x... address and auto-convert to did:polygon
      if (input.startsWith("0x")) {
        if (!isAddress(input)) {
          Alert.alert("Invalid Address", "Please enter a valid Ethereum/Polygon address.");
          return;
        }
        input = `did:polygon:${input}`;
      }

      if (!input.startsWith("did:polygon:")) {
        Alert.alert(
          "Invalid Format",
          "Your input must be a valid wallet (0x...) or DID (did:polygon:0x...)."
        );
        return;
      }

      const rawAddr = input.replace("did:polygon:", "").trim();
      if (!isAddress(rawAddr)) {
        Alert.alert("Invalid Address", "Please enter a valid Ethereum/Polygon address.");
        return;
      }

      // Normalize to checksum + show a confirmation dialog
      const checksum = getAddress(rawAddr);
      const didString = `did:polygon:${checksum}`;

      Alert.alert(
        "Confirm Wallet",
        `Save this wallet to your account?\n\nAddress:\n${checksum}\n\nDID:\n${didString}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async () => {
              try {
                await AsyncStorage.setItem("walletSession", JSON.stringify({ address: checksum }));
                setSavedAddress(checksum);
                await dispatch(updateDID(checksum)).unwrap();
                Alert.alert(
                  "✅ Saved",
                  "Your wallet address has been saved and linked to your account."
                );
              } catch (err) {
                console.error("Error saving DID:", err);
                Alert.alert("Error", "Failed to save DID.");
              }
            },
          },
        ]
      );
    } catch (err) {
      console.error("Validation error:", err);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ headerTitle: "Connect Wallet", headerBackTitleVisible: false }}
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/(main)/settings")}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={styles.backText}>Back</Text>
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
        <>
          {/* WalletConnect Button */}
          <Button title="Connect Wallet" onPress={connectWallet} />

          {/* Helper Text */}
          <Text style={styles.helperText}>
            ⚠️ If WalletConnect is not working, type your address below.
          </Text>

          <View style={{ height: 30 }} />
          <Text style={styles.instruction}>Type your wallet address from MetaMask here:</Text>
          <TextInput
            style={styles.input}
            placeholder="0x... or did:polygon:0x..."
            value={didInput}
            onChangeText={setDidInput}
            autoCapitalize="none"
          />
          <View style={{ height: 10 }} />
          <Button title="Validate and Save DID" onPress={validateAndSaveDID} />
        </>
      )}

      {/* 👇 Only show when opened from StartSetup */}
      {cameFromSetup && (
        <>
          <View style={{ height: 20 }} />
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => router.push("/personal_info")}
          >
            <Text style={styles.nextText}>Continue to Personal Info</Text>
          </TouchableOpacity>
        </>
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
  instruction: { fontSize: 14, marginBottom: 10, textAlign: "center" },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
  },
  helperText: {
    color: "#d9534f",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  nextButton: {
    backgroundColor: "#0066FF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  nextText: { color: "#fff", fontWeight: "600" },
});
