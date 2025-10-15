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
import { walletConnect_styles } from "../../assets/styles/walletConnect_styles";
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
  const { from } = useLocalSearchParams();
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

  // 🧩 1. Handle if user already has DID
  useEffect(() => {
    if (user?.did) {
      // Auto-display the saved DID as connected wallet
      const clean = user.did.replace("did:polygon:", "");
      setSavedAddress(clean);
    }
  }, [user]);

  // 🧩 2. Auto-save connected wallet (only if no DID yet)
    useEffect(() => {
      const saveIfConnected = async () => {
        try {
          if (isConnected && address && !user?.did) {
            const checksum = getAddress(address);
            await AsyncStorage.setItem("walletSession", JSON.stringify({ address: checksum }));
            setSavedAddress(checksum);
            await dispatch(updateDID(checksum)).unwrap();
          }
        } catch (e) {
          console.error("Auto-save checksum error:", e);
        }
      };
      saveIfConnected();
    }, [isConnected, address, user]);


  const connectWallet = async () => {
    if (user?.did) {
      Alert.alert("Wallet Already Linked", "You already have a linked wallet. Please disconnect it first to update.");
      return;
    }
    try {
      setLoading(true);
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
            if (provider?.disconnect) await provider.disconnect();
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

  const validateAndSaveDID = async () => {
    if (user?.did) {
      Alert.alert("Wallet Already Linked", "You already have a linked wallet. Please disconnect it first to change it.");
      return;
    }

    try {
      let input = (didInput || "").trim();
      if (input.startsWith("0x")) {
        if (!isAddress(input)) return Alert.alert("Invalid Address", "Please enter a valid wallet.");
        input = `did:polygon:${input}`;
      }
      if (!input.startsWith("did:polygon:")) {
        return Alert.alert("Invalid Format", "Must be a 0x... or did:polygon:0x...");
      }

      const rawAddr = input.replace("did:polygon:", "").trim();
      if (!isAddress(rawAddr)) return Alert.alert("Invalid Address", "Please enter a valid wallet.");

      const checksum = getAddress(rawAddr);
      const didString = `did:polygon:${checksum}`;

      Alert.alert("Confirm Wallet", `Save this wallet?\n\n${didString}`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            try {
              await AsyncStorage.setItem("walletSession", JSON.stringify({ address: checksum }));
              setSavedAddress(checksum);
              await dispatch(updateDID(checksum)).unwrap();
              Alert.alert("✅ Saved", "Your wallet has been saved.");
            } catch (err) {
              console.error("Error saving DID:", err);
              Alert.alert("Error", "Failed to save DID.");
            }
          },
        },
      ]);
    } catch (err) {
      console.error("Validation error:", err);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  return (
    <View style={walletConnect_styles.container}>
      <Stack.Screen options={{ headerTitle: "Connect Wallet" }} />

      <TouchableOpacity style={walletConnect_styles.backButton} onPress={() => router.push("/(main)/settings")}>
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={walletConnect_styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={walletConnect_styles.title}>Connect Your MetaMask Wallet</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : user?.did ? (
        // 🧩 3. If user DID exists, only show "Connected" + allow Disconnect
        <>
          <Text style={walletConnect_styles.addr}>Linked DID:</Text>
          <Text style={walletConnect_styles.addressValue}>{user.did}</Text>
          <Button title="Disconnect Wallet" color="red" onPress={disconnectWallet} />
        </>
      ) : savedAddress ? (
        <>
          <Text style={walletConnect_styles.addr}>Connected Address:</Text>
          <Text style={walletConnect_styles.addressValue}>{savedAddress}</Text>
          <Button title="Disconnect Wallet" color="red" onPress={disconnectWallet} />
        </>
      ) : (
        <>
          <Button title="Connect Wallet" onPress={connectWallet} />
          <Text style={walletConnect_styles.helperText}>⚠️ If WalletConnect fails, type your address below.</Text>
          <View style={{ height: 20 }} />
          <TextInput
            style={walletConnect_styles.input}
            placeholder="0x... or did:polygon:0x..."
            value={didInput}
            onChangeText={setDidInput}
            autoCapitalize="none"
          />
          <Button title="Validate and Save DID" onPress={validateAndSaveDID} />
        </>
      )}

      {cameFromSetup && (
        <TouchableOpacity style={walletConnect_styles.nextButton} onPress={() => router.push("/personal_info")}>
          <Text style={walletConnect_styles.nextText}>Continue to Personal Info</Text>
        </TouchableOpacity>
      )}

      <WalletConnectModal projectId={projectId} providerMetadata={providerMetadata} />
    </View>
  );
}

