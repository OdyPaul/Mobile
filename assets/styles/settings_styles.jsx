import { StyleSheet } from "react-native";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";

export const settings_styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB", //F9FAFB
  },
  container: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(40),
  },
  profileCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: moderateScale(20),
    flexDirection: "row",
    alignItems: "center",
    padding: scale(15),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    marginRight: scale(15),
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1E5128",
  },
  userEmail: {
    fontSize: moderateScale(14),
    color: "#666",
  },
  memberSince: {
    fontSize: moderateScale(12),
    color: "#888",
    marginTop: verticalScale(2),
  },
  editProfileButton: {
    backgroundColor: "#1E5128",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(15),
    marginBottom: verticalScale(20),
    alignItems: "center",
  },
  editProfileText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: moderateScale(15),
  },
  menuSection: {
    backgroundColor: "#F3F4F6",
    borderRadius: moderateScale(20),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(10),
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginTop:verticalScale(15),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(5),
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: moderateScale(15),
    color: "#222",
    marginLeft: scale(10),
    fontWeight: "500",
  },
  contactCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: moderateScale(20),
    paddingVertical: verticalScale(15),
    marginTop: verticalScale(25),
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(4),
  },
  contactText: {
    color: "#1E5128",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  contactEmail: {
    color: "#1E5128",
    fontSize: moderateScale(14),
    fontWeight: "700",
    textAlign: "center",
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: moderateScale(15),
    padding: verticalScale(20),
    alignItems: "center",
  },
  modalTitle: {
    fontSize: moderateScale(15),
    color: "#1E5128",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: verticalScale(15),
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    marginHorizontal: scale(5),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
  },
  confirmButton: {
    backgroundColor: "#1E5128",
  },
  cancelText: {
    color: "#333",
    fontWeight: "600",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
