import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";
import FaceVerifier from "../../lib/faceVerifier"; // <-- adjust path if needed

export default function Home() {
  const router = useRouter();
  const [showFace, setShowFace] = React.useState(false);

  if (showFace) {
    return <FaceVerifier onClose={() => setShowFace(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome Home!</Text>

      <Button
        title="Start Setup"
        onPress={() => router.push("/(setup)/startSetup")}
      />

      <View style={{ height: 12 }} />

      <Button
        title="Open Face Verification"
        onPress={() => setShowFace(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
});
