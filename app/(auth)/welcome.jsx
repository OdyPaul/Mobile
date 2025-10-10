import { View, Text, Button, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>

      <Button
        title="Login"
        onPress={() => router.push("/login")}
      />

      <Button
        title="Register"
        onPress={() => router.push("/register")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, marginBottom: 20, fontWeight: "bold" },
});
