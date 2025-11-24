// hooks/useVerificationPending.js
import { useEffect, useState } from "react";
import verificationService from "../features/verification/verificationService";
import { normalizeVerificationList, hasPending } from "../lib";

export default function useVerificationPending() {
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkPending = async () => {
      try {
        // This now uses the cached result if available
        const res = await verificationService.getMyVerificationRequests();
        const list = normalizeVerificationList(res);
        if (isMounted) setPending(hasPending(list));
      } catch {
        // Silent fail is OK; you can optionally log here
        if (isMounted) setPending(false);
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    checkPending();
    return () => {
      isMounted = false;
    };
  }, []);

  return { checking, pending };
}
