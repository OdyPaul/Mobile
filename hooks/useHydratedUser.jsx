import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSelector } from "react-redux";

export default function useHydratedUser() {
  const reduxUser = useSelector((s) => s.auth.user);
  const [localUser, setLocalUser] = useState(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        setLocalUser(stored ? JSON.parse(stored) : null);
      } catch (err) {
        console.error("Error reading stored user:", err);
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  const user = useMemo(() => {
    if (reduxUser?.email) return reduxUser;
    if (localUser?.email) return localUser;
    return null;
  }, [reduxUser, localUser]);

  return { user, hydrating };
}
