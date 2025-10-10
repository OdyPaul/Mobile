import { BaseToast, ErrorToast } from "react-native-toast-message";

export const toastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#10B981",
        backgroundColor: "#1E293B",
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
      }}
      text2Style={{
        fontSize: 14,
        color: "#CBD5E1",
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#EF4444",
        backgroundColor: "#1E293B",
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
      }}
      text2Style={{
        fontSize: 14,
        color: "#CBD5E1",
      }}
    />
  ),
};
