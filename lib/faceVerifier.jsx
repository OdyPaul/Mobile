// lib/FaceVerifier.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
 * - Guided liveness: blink + 3 head movements (LEFT/RIGHT/UP/DOWN)
 * - Renders its own UI and calls onClose() when user taps "‹ Back"
 * - Calls onCapture(uri) after a successful shot
 */

/* =================== CONFIG =================== */

// Blink/liveness
const REQUIRED_MOVES = 3;
const OPEN_T = 0.6;
const CLOSED_T = 0.3;
const CONSEC = 3;
const CLOSE_MAX_MS = 900;
const TOTAL_TIMEOUT_MS = 7000;

// Pose / head movement
const ACTIONS = ["TURN_LEFT", "TURN_RIGHT", "LOOK_UP", "LOOK_DOWN"];
const ACTION_LABEL = {
  TURN_LEFT: "Turn head LEFT",
  TURN_RIGHT: "Turn head RIGHT",
  LOOK_UP: "Look UP",
  LOOK_DOWN: "Look DOWN",
};
const ACTION_CONSEC = 3;
const ACTION_TIMEOUT_MS = 5000; // per movement
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

export default function FaceVerifier({ onClose, onCapture }) {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [faces, setFaces] = useState([]);
  const [photo, setPhoto] = useState("");

  // Liveness state
  const [blinkPassed, setBlinkPassed] = useState(false);
  const [successCount, setSuccessCount] = useState(0); // how many moves done
  const [canCapture, setCanCapture] = useState(false);

  // Debug
  const [debugOpen, setDebugOpen] = useState(null);
  const [debugPose, setDebugPose] = useState(null);

  // Blink FSM
  const fsmRef = useRef({
    state: "WAIT_OPEN",
    openCount: 0,
    closeCount: 0,
    t0: 0,
    lastSeen: 0,
  });

  // Head-movement action state
  const actionRef = useRef({
    active: false,
    target: null,
    baseline: { yaw: 0, pitch: 0 },
    consec: 0,
    startedAt: 0,
    deadline: 0,
    lastTarget: null,
  });
  const [actionTarget, setActionTarget] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const facePresent = useMemo(() => faces.length === 1, [faces]);

  // Update canCapture whenever liveness pieces change
  useEffect(() => {
    setCanCapture(blinkPassed && successCount >= REQUIRED_MOVES);
  }, [blinkPassed, successCount]);

  // Action countdown tick
  useEffect(() => {
    if (!actionRef.current.active) return;
    const id = setInterval(() => {
      const now = Date.now();
      const left = Math.max(
        0,
        Math.ceil((actionRef.current.deadline - now) / 1000)
      );
      setTimeLeft(left);
      if (left <= 0) {
        rerollAction();
      }
    }, 250);
    return () => clearInterval(id);
  }, [actionTarget]);

  const resetFSM = () => {
    fsmRef.current = {
      state: "WAIT_OPEN",
      openCount: 0,
      closeCount: 0,
      t0: 0,
      lastSeen: 0,
    };
  };

  const fullReset = () => {
    resetFSM();
    setBlinkPassed(false);
    setSuccessCount(0);
    setCanCapture(false);
    setDebugOpen(null);
    setDebugPose(null);

    actionRef.current = {
      active: false,
      target: null,
      baseline: { yaw: 0, pitch: 0 },
      consec: 0,
      startedAt: 0,
      deadline: 0,
      lastTarget: null,
    };
    setActionTarget(null);
    setTimeLeft(0);
  };

  const askPermissionAndStart = async () => {
    if (!hasPermission) {
      const ok = await requestPermission();
      if (!ok) {
        Toast.show({ type: "error", text1: "Camera permission is required" });
        return;
      }
    }
    if (!device) {
      Toast.show({ type: "error", text1: "No camera device found" });
      return;
    }
    setPhoto("");
    setCameraOn(true);
    fullReset();
  };

  const backToHome = () => {
    setCameraOn(false);
    setPhoto("");
    fullReset();
    onClose?.();
  };

  const retake = () => {
    setPhoto("");
    setCameraOn(true);
    fullReset();
  };

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

  const startAction = (face) => {
    if (successCount >= REQUIRED_MOVES) return; // already done
    const { yaw, pitch } = getAngles(face);
    const target = pickTarget(actionRef.current.lastTarget);
    const now = Date.now();
    actionRef.current = {
      active: true,
      target,
      baseline: { yaw, pitch },
      consec: 0,
      startedAt: now,
      deadline: now + ACTION_TIMEOUT_MS,
      lastTarget: target,
    };
    setActionTarget(target);
    setTimeLeft(Math.ceil(ACTION_TIMEOUT_MS / 1000));
    Toast.show({
      type: "info",
      text1: `Move ${successCount + 1}/${REQUIRED_MOVES}: ${
        ACTION_LABEL[target]
      }`,
    });
  };

  const rerollAction = () => {
    if (successCount >= REQUIRED_MOVES) {
      actionRef.current.active = false;
      setActionTarget(null);
      setTimeLeft(0);
      return;
    }
    const current = faces?.[0];
    if (!current) {
      actionRef.current.active = false;
      setActionTarget(null);
      setTimeLeft(0);
      return;
    }
    startAction(current);
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

  /* -------- main face callback -------- */
  const onFaces = (detected) => {
    const arr = Array.isArray(detected) ? detected : [];
    setFaces(arr);

    if (arr.length !== 1) {
      // Lost single face → relax everything, but keep previous success so far
      const now = Date.now();
      const f = fsmRef.current;
      if (f.lastSeen && now - f.lastSeen > 1000) {
        resetFSM();
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
        resetFSM();
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
          resetFSM();
          return;
        }
        if (fsm.openCount >= CONSEC) {
          setBlinkPassed(true);
          Toast.hide();
          Toast.show({ type: "success", text1: "Blink detected" });
          startAction(face); // start first movement
        }
      }
      return;
    }

    // --- ACTION (HEAD MOVEMENT) PHASE ---
    if (successCount < REQUIRED_MOVES) {
      if (!actionRef.current.active) {
        startAction(face);
        return;
      }

      if (Date.now() > actionRef.current.deadline) {
        rerollAction();
        return;
      }

      if (
        actionSatisfied(
          actionRef.current.target,
          actionRef.current.baseline,
          angles
        )
      ) {
        actionRef.current.consec += 1;
        if (actionRef.current.consec >= ACTION_CONSEC) {
          const next = successCount + 1;
          setSuccessCount(next);
          actionRef.current.active = false;
          setActionTarget(null);
          setTimeLeft(0);

          if (next >= REQUIRED_MOVES) {
            Toast.hide();
            Toast.show({
              type: "success",
              text1: "Liveness passed — you can now take a photo",
            });
          } else {
            setTimeout(() => startAction(face), 400);
          }
        }
      } else {
        actionRef.current.consec = 0;
      }
    }
  };

  const takeShot = async () => {
    if (!cameraRef.current) return;
    if (!canCapture) {
      Toast.show({
        type: "info",
        text1: `Complete blink + ${REQUIRED_MOVES} head moves first`,
      });
      return;
    }
    try {
      const shot = await cameraRef.current.takePhoto({});
      const uri = shot?.path?.startsWith("file://")
        ? shot.path
        : `file://${shot.path}`;
      setPhoto(uri);
      setCameraOn(false);
      onCapture?.(uri);
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Capture failed",
        text2: String(e?.message || e),
      });
    }
  };

  /* =================== UI =================== */

  // After capture: preview with Retake / Use Photo
  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        <View style={styles.bottomRowFixed}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={retake}>
            <Text style={styles.secondaryText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={backToHome}>
            <Text style={styles.primaryText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
        <Toast />
      </View>
    );
  }

  // Pre-camera screen
  if (!cameraOn) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Face Verification</Text>
        <Text style={styles.subtitle}>
          We’ll ask you to blink and move your head to confirm liveness.
        </Text>
        <TouchableOpacity
          onPress={askPermissionAndStart}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryText}>Activate Camera</Text>
        </TouchableOpacity>
        {!device && <Text style={styles.warn}>No camera device found</Text>}
        <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
          <Text style={styles.skipText}>‹ Back</Text>
        </TouchableOpacity>
        <Toast />
      </View>
    );
  }

  // Waiting for permission / device
  if (!device || !hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>
          {device ? "Waiting for permission…" : "No camera device found"}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
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
          isActive={true}
          photo={true}
          faceDetectionCallback={onFaces}
          faceDetectionOptions={faceDetectionOptions}
        />

        {/* Back button (lower-left) */}
        <View style={styles.backWrap}>
          <TouchableOpacity onPress={backToHome} style={styles.backBtn}>
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
          {facePresent && blinkPassed && successCount < REQUIRED_MOVES && (
            <Text style={styles.overlayText}>
              Move {successCount + 1}/{REQUIRED_MOVES}:{" "}
              {actionTarget ? ACTION_LABEL[actionTarget] : "Get ready…"}
              {timeLeft ? ` • ${timeLeft}s` : ""}
            </Text>
          )}
          {facePresent && canCapture && (
            <Text style={styles.overlayText}>
              Liveness passed — tap the shutter
            </Text>
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

      {/* Shutter: enabled only after liveness passed */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          onPress={takeShot}
          style={[styles.shutterButton, !canCapture && styles.shutterDisabled]}
          disabled={!canCapture}
        />
        {!canCapture && (
          <Text style={styles.hint}>
            Blink + complete {REQUIRED_MOVES} head moves to enable shutter
          </Text>
        )}
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
  primaryBtn: {
    backgroundColor: "#4F8EF7",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    borderColor: "#fff",
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryText: { color: "#fff", fontWeight: "600" },
  skipBtn: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: "#bbb", fontWeight: "600" },
  warn: { marginTop: 8, color: "#f77" },

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

  bottomRow: {
    position: "absolute",
    bottom: 28,
    width: "100%",
    alignItems: "center",
    gap: 8,
  },

  bottomRowFixed: {
    position: "absolute",
    bottom: 28,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backWrap: { position: "absolute", bottom: 28, left: 20 },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backText: { color: "#fff", fontWeight: "700" },

  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
  },
  shutterDisabled: { backgroundColor: "#777" },
  hint: { color: "#ccc", marginTop: 6, fontSize: 12 },

  preview: { flex: 1, borderRadius: 10, margin: 12 },
});
