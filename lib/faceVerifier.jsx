// lib/FaceVerifier.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { Camera as FaceCamera } from "react-native-vision-camera-face-detector";

/**
 * FaceVerifier
 * - Blink + guided head movements (TURN_LEFT / TURN_RIGHT / LOOK_UP / LOOK_DOWN)
 * - No photo capture; used as a liveness gate only
 * - Pass condition: 3 successful movements out of max 5 attempts
 * - Calls onPassed() when liveness passes
 * - Calls onClose() when user taps "‹ Back"
 */

/* =================== CONFIG =================== */

const REQUIRED_SUCCESSES = 3; // need 3
const MAX_ATTEMPTS = 5;       // out of 5 tries

// Blink
const OPEN_T = 0.6;
const CLOSED_T = 0.3;
const CONSEC = 3;
const CLOSE_MAX_MS = 900;
const TOTAL_TIMEOUT_MS = 7000;

// Head pose actions
const ACTIONS = ["TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN"];
const ACTION_LABEL = {
  TURN_LEFT: "Turn head LEFT",
  TURN_RIGHT: "Turn head RIGHT",
  LOOK_UP: "Look UP",
  LOOK_DOWN: "Look DOWN",
};
const ACTION_CONSEC = 3;       // consecutive frames to count as success
const ACTION_TIMEOUT_MS = 5000; // per movement (try)
const YAW_DEG = 15;
const PITCH_DEG = 12;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Normalize pose fields across plugin variants */
const getAngles = (f) => {
  const yaw =
    (isNum(f?.yawAngle) ? f.yawAngle : null) ??
    (isNum(f?.headEulerAngleY) ? f.headEulerAngleY : null) ??
    (isNum(f?.yaw) ? f.yaw : 0);

  const pitch =
    (isNum(f?.pitchAngle) ? f.pitchAngle : null) ??
    (isNum(f?.headEulerAngleX) ? f.headEulerAngleX : null) ??
    (isNum(f?.pitch) ? f.pitch : 0);

  const roll =
    (isNum(f?.rollAngle) ? f.rollAngle : null) ??
    (isNum(f?.headEulerAngleZ) ? f.headEulerAngleZ : null) ??
    (isNum(f?.roll) ? f.roll : 0);

  return { yaw: yaw ?? 0, pitch: pitch ?? 0, roll: roll ?? 0 };
};

export default function FaceVerifier({ onClose, onPassed }) {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef(null);

  const [faces, setFaces] = useState([]);

  // Blink + movements
  const [blinkPassed, setBlinkPassed] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  // Debug / UI
  const [debugOpen, setDebugOpen] = useState(null);
  const [debugPose, setDebugPose] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);

  // Blink FSM
  const fsmRef = useRef({
    state: "WAIT_OPEN",
    openCount: 0,
    closeCount: 0,
    t0: 0,
    lastSeen: 0,
  });

  // Movement action state
  const actionRef = useRef({
    active: false,
    target: null,
    baseline: { yaw: 0, pitch: 0 },
    consec: 0,
    startedAt: 0,
    lastTarget: null,
  });

  // Counts stored in ref for logic, mirrored to state for UI
  const countsRef = useRef({ success: 0, attempts: 0 });

  // Done flag to stop extra processing
  const doneRef = useRef(false);

  const facePresent = useMemo(() => faces.length === 1, [faces]);

  /* ===== Permission: auto-request camera on mount ===== */
  useEffect(() => {
    if (!hasPermission) {
      requestPermission().catch(() => {
        Toast.show({
          type: "error",
          text1: "Camera permission is required",
        });
      });
    }
  }, [hasPermission, requestPermission]);

  /* ===== Reset helpers ===== */
  const resetBlinkFSM = () => {
    fsmRef.current = {
      state: "WAIT_OPEN",
      openCount: 0,
      closeCount: 0,
      t0: 0,
      lastSeen: 0,
    };
  };

  const fullReset = () => {
    resetBlinkFSM();
    setBlinkPassed(false);
    countsRef.current = { success: 0, attempts: 0 };
    setSuccessCount(0);
    setAttemptCount(0);
    setDebugOpen(null);
    setDebugPose(null);
    setActionTarget(null);
    actionRef.current = {
      active: false,
      target: null,
      baseline: { yaw: 0, pitch: 0 },
      consec: 0,
      startedAt: 0,
      lastTarget: null,
    };
    doneRef.current = false;
  };

  const handleBack = () => {
    fullReset();
    onClose?.();
  };

  /* ===== Blink + action helpers ===== */

  const eyeOpenness = (f) => {
    const vals = [
      f?.leftEyeOpenProbability,
      f?.rightEyeOpenProbability,
      f?.leftEyeOpen,
      f?.rightEyeOpen,
    ].filter((v) => isNum(v) && v >= 0 && v <= 1);
    return vals.length ? Math.max(...vals) : null;
  };

  const pickTarget = (last) => {
    const pool = ACTIONS.filter((a) => a !== last);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const startAction = (face, now) => {
    if (!face) return;
    const { yaw, pitch } = getAngles(face);
    const target = pickTarget(actionRef.current.lastTarget);
    actionRef.current = {
      active: true,
      target,
      baseline: { yaw, pitch },
      consec: 0,
      startedAt: now,
      lastTarget: target,
    };
    setActionTarget(target);

    const attempts = countsRef.current.attempts;
    const successes = countsRef.current.success;
    Toast.show({
      type: "info",
      text1: `Move attempt ${attempts + 1}/${MAX_ATTEMPTS}`,
      text2: `${ACTION_LABEL[target]} • successes ${successes}/${REQUIRED_SUCCESSES}`,
    });
  };

  const actionSatisfied = (target, baseline, current) => {
    const dyaw = current.yaw - baseline.yaw;
    const dpitch = current.pitch - baseline.pitch;
    switch (target) {
      case "TURN_LEFT":
        return dyaw >= YAW_DEG;
      case "TURN_RIGHT":
        return dyaw <= -YAW_DEG;
      case "LOOK_UP":
        return dpitch <= -PITCH_DEG;
      case "LOOK_DOWN":
        return dpitch >= PITCH_DEG;
      default:
        return false;
    }
  };

  const finishAttempt = (success, face) => {
    const counts = countsRef.current;
    counts.attempts += 1;
    if (success) counts.success += 1;
    setAttemptCount(counts.attempts);
    setSuccessCount(counts.success);

    actionRef.current.active = false;
    actionRef.current.consec = 0;
    setActionTarget(null);

    // Check overall result
    if (counts.success >= REQUIRED_SUCCESSES) {
      doneRef.current = true;
      Toast.hide();
      Toast.show({
        type: "success",
        text1: "Liveness check passed",
      });
      onPassed?.();
      return;
    }

    if (counts.attempts >= MAX_ATTEMPTS) {
      Toast.hide();
      Toast.show({
        type: "error",
        text1: "Liveness check failed",
        text2: "We couldn't verify enough movements.",
      });
      // Reset session, but stay on camera so they can try again
      fullReset();
      return;
    }

    // Start next action
    const now = Date.now();
    startAction(face, now);
  };

  /* ===== Main face callback ===== */
  const onFaces = (detected) => {
    if (doneRef.current) return;

    const arr = Array.isArray(detected) ? detected : [];
    setFaces(arr);

    if (arr.length !== 1) {
      // Lost single face → reset blink but keep movement counts
      const now = Date.now();
      const f = fsmRef.current;
      if (f.lastSeen && now - f.lastSeen > 1000) {
        resetBlinkFSM();
        setBlinkPassed(false);
      }
      setDebugOpen(null);
      setDebugPose(null);
      return;
    }

    const face = arr[0];
    const open = eyeOpenness(face);
    const now = Date.now();
    const fsm = fsmRef.current;

    if (open == null) {
      setDebugOpen("—");
    } else {
      setDebugOpen(Number(open.toFixed(2)));
    }

    const angles = getAngles(face);
    setDebugPose(
      `yaw ${angles.yaw.toFixed(1)}° • pitch ${angles.pitch.toFixed(1)}°`
    );

    fsm.lastSeen = now;

    // --- BLINK PHASE ---
    if (!blinkPassed) {
      if (isNum(open)) {
        if (open >= OPEN_T) {
          fsm.openCount += 1;
          fsm.closeCount = 0;
        } else if (open <= CLOSED_T) {
          fsm.closeCount += 1;
          fsm.openCount = 0;
        }
      }

      if (!fsm.t0) fsm.t0 = now;
      if (now - fsm.t0 > TOTAL_TIMEOUT_MS) {
        resetBlinkFSM();
        return;
      }

      if (fsm.state === "WAIT_OPEN" && fsm.openCount >= CONSEC) {
        fsm.state = "WAIT_CLOSE";
        fsm.t0 = now;
      } else if (fsm.state === "WAIT_CLOSE" && fsm.closeCount >= CONSEC) {
        fsm.state = "WAIT_REOPEN";
        fsm.t0 = now;
      } else if (fsm.state === "WAIT_REOPEN") {
        if (now - fsm.t0 > CLOSE_MAX_MS) {
          resetBlinkFSM();
          return;
        }
        if (fsm.openCount >= CONSEC) {
          setBlinkPassed(true);
          Toast.hide();
          Toast.show({ type: "success", text1: "Blink detected" });
          // Start first movement
          startAction(face, now);
        }
      }
      return;
    }

    // --- ACTION PHASE (3 successes out of 5 tries) ---
    const act = actionRef.current;

    // If no action active yet, start one
    if (!act.active) {
      // Might have been reset after failing; ensure we don't start new action if we've already passed
      if (countsRef.current.success >= REQUIRED_SUCCESSES) return;
      if (countsRef.current.attempts >= MAX_ATTEMPTS) return;
      startAction(face, now);
      return;
    }

    // Check timeout
    if (now - act.startedAt > ACTION_TIMEOUT_MS) {
      finishAttempt(false, face);
      return;
    }

    // Check if movement satisfied
    if (
      actionSatisfied(act.target, act.baseline, angles)
    ) {
      act.consec += 1;
      if (act.consec >= ACTION_CONSEC) {
        finishAttempt(true, face);
      }
    } else {
      act.consec = 0;
    }
  };

  /* ===== UI ===== */

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Face Verification</Text>
        <Text style={styles.subtitle}>No front camera device found.</Text>
        <TouchableOpacity onPress={handleBack} style={styles.skipBtn}>
          <Text style={styles.skipText}>‹ Back</Text>
        </TouchableOpacity>
        <Toast />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Waiting for camera permission…</Text>
        <TouchableOpacity onPress={handleBack} style={styles.skipBtn}>
          <Text style={styles.skipText}>‹ Back</Text>
        </TouchableOpacity>
        <Toast />
      </View>
    );
  }

  // Detection options: MUST have classificationMode: 'all' for eye probabilities
  const faceDetectionOptions = {
    performanceMode: "fast",
    classificationMode: "all",
    contourMode: "none",
    landmarkMode: "none",
    trackingEnabled: false,
    minFaceSize: 0.15,
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1, borderRadius: 10, overflow: "hidden" }}>
        <FaceCamera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={!doneRef.current}
          photo={false}
          faceDetectionCallback={onFaces}
          faceDetectionOptions={faceDetectionOptions}
        />

        {/* Back button (lower-left) */}
        <View style={styles.backWrap}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        {/* Top overlay instructions */}
        <View style={styles.overlayTop}>
          {faces.length === 0 && (
            <Text style={styles.overlayText}>Show your face in the frame</Text>
          )}
          {faces.length > 1 && (
            <Text style={styles.overlayText}>Only one person please</Text>
          )}
          {facePresent && !blinkPassed && (
            <Text style={styles.overlayText}>Blink to verify liveness</Text>
          )}
          {facePresent && blinkPassed && !doneRef.current && (
            <Text style={styles.overlayText}>
              {actionTarget
                ? `${ACTION_LABEL[actionTarget]} • attempts ${attemptCount}/${MAX_ATTEMPTS} • successes ${successCount}/${REQUIRED_SUCCESSES}`
                : "Get ready for movement…"}
            </Text>
          )}
          {doneRef.current && (
            <Text style={styles.overlayText}>Liveness check complete</Text>
          )}

          {debugOpen !== null && (
            <Text style={styles.debugText}>Eye: {String(debugOpen)}</Text>
          )}
          {debugPose && (
            <Text style={styles.debugText}>{String(debugPose)}</Text>
          )}
        </View>

        {/* Faces counter (tiny debug) */}
        <View style={styles.overlayCounter}>
          <Text style={styles.counterText}>Faces: {faces.length}</Text>
        </View>
      </View>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  skipBtn: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: "#bbb", fontWeight: "600" },

  camera: { flex: 1 },

  overlayTop: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  overlayText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  debugText: { color: "#ddd", fontSize: 11, marginTop: 2 },

  overlayCounter: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  counterText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  backWrap: { position: "absolute", bottom: 28, left: 20 },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backText: { color: "#fff", fontWeight: "700" },
});
