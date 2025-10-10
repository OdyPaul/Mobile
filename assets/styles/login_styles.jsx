import { StyleSheet } from "react-native";
import { s, vs, ms } from "react-native-size-matters";
export const login_styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "flex-start", // move everything upward
    paddingHorizontal: s(20),
    paddingTop: vs(80), // adds top space for clean offset
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: vs(10), // slightly closer to the form
  },
  formCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: ms(20),
    padding: s(20),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderRadius: ms(10),
    paddingHorizontal: s(10),
    marginBottom: vs(15),
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    height: vs(40),
    fontSize: ms(14),
    color: "#333",
    marginLeft: s(8),
  },
  loginButton: {
    backgroundColor: "#4CAF50",
    borderRadius: ms(10),
    paddingVertical: vs(12),
    alignItems: "center",
    marginTop: vs(5),
  },
  loginText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: ms(16),
  },
  footerText: {
    textAlign: "center",
    marginTop: vs(10),
    fontSize: ms(13),
    color: "#666",
  },
  signUpText: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
});