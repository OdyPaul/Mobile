import { View, Text, StyleSheet, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome Home!</Text>
      <Button
        title="Start Setup"
        onPress={() => router.push("/(setup)/startSetup")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
});
