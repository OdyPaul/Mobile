// hooks/useVerificationPending.js
import { useEffect, useState } from "react";
import verificationService from "../features/verification/verificationService";
import { normalizeVerificationList, hasPending } from "../lib";

export default function useVerificationPending() {
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkPending = async () => {
      try {
        const res = await verificationService.getMyVerificationRequests();
        const list = normalizeVerificationList(res);
        if (mounted) setPending(hasPending(list));
      } catch (err) {
        // Silent fail — optional: console.warn("Verification check failed", err);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkPending();
    return () => {
      mounted = false;
    };
  }, []);

  return { checking, pending };
}
