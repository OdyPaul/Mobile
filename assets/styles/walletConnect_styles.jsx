import { StyleSheet } from "react-native";
import { s, vs, ms } from "react-native-size-matters";

export const walletConnect_styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  addr: { fontSize: 14, marginBottom: 6, textAlign: "center" },
  addressValue: { fontSize: 12, color: "#555", textAlign: "center", marginBottom: 20 },
  backButton: { position: "absolute", top: 60, left: 20, flexDirection: "row", alignItems: "center" },
  backText: { marginLeft: 6, fontSize: 16, color: "#000" },
  helperText: { color: "#d9534f", fontSize: 14, textAlign: "center", marginTop: 8 },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8 },
  nextButton: { backgroundColor: "#0066FF", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  nextText: { color: "#fff", fontWeight: "600" },
});