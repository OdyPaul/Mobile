// assets/styles/register_styles.js
import { StyleSheet } from "react-native";
import { s, vs, ms } from "react-native-size-matters";

export const register_styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: s(8),
    fontFamily: "cursive",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 25,
    marginTop: 4,
  },

  // ✅ Label for inputs
  inputLabel: {
    alignSelf: "flex-start",
    marginBottom: 4,
    marginLeft: 4,
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: "#f9fafb",
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 45,
    color: "#111827",
  },
  eyeIcon: {
    padding: 5,
  },
  button: {
    backgroundColor: "#43A047",
    width: "100%",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    marginTop: 15,
  },
  footerText: {
    color: "#6b7280",
  },
  loginLink: {
    color: "#43A047",
    fontWeight: "bold",
  },

  otpWrapper: {
    marginTop: vs(18),
    width: "100%",
    alignItems: "center",
  },
  otpLabel: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: vs(8),
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
  },
  otpInput: {
    width: s(42),
    height: vs(48),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
});
