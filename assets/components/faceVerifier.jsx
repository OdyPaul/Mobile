// assets/components/faceVerifier.jsx
import React, { useEffect, useMemo, useRef } from "react";
import * as FileSystem from "expo-file-system";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native"; // registers the RN backend
import { decodeJpeg } from "@tensorflow/tfjs-react-native";
import * as FaceLandmarks from "@tensorflow-models/face-landmarks-detection";

/**
 * FaceVerifier (JSX, RN/Expo)
 * - Loads TFJS rn-webgl backend
 * - Creates a MediaPipeFaceMesh detector (tfjs runtime)
 * - Extracts 468 landmarks for each image (first face)
 * - Builds normalized embeddings and compares via cosine similarity
 * - Calls onComplete({ ok, score, threshold, reason })
 *
 * Props:
 *  - sourceUri: string  (selfie)
 *  - targetUri: string  (reference / ID)
 *  - startKey:  any     (change to trigger verification)
 *  - threshold: number  (default 0.88)
 *  - onComplete: (result) => void
 *
 * NOTE: This component renders nothing.
 */

const DEFAULT_THRESHOLD = 0.88;

export default function FaceVerifier({
  sourceUri,
  targetUri,
  startKey = "idle",
  threshold = DEFAULT_THRESHOLD,
  onComplete,
}) {
  const readyRef = useRef(false);
  const detectorRef = useRef(null);
  const runningRef = useRef(false);

  const canRun = useMemo(
    () =>
      !!sourceUri &&
      !!targetUri &&
      !!startKey &&
      readyRef.current &&
      !runningRef.current,
    [sourceUri, targetUri, startKey]
  );

  // Init TF + detector once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Prepare TF backend
        await tf.ready();
        if (tf.getBackend() !== "rn-webgl") {
          try {
            await tf.setBackend("rn-webgl");
            await tf.ready();
          } catch {
            // fallback to whatever backend is available
          }
        }

        // Create detector (tfjs runtime)
        const det = await FaceLandmarks.createDetector(
          FaceLandmarks.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: "tfjs",
            refineLandmarks: true,
            maxFaces: 1,
          }
        );

        if (!mounted) {
          try { det?.dispose?.(); } catch {}
          return;
        }
        detectorRef.current = det;
        readyRef.current = true;
      } catch (e) {
        readyRef.current = false;
        safeComplete(onComplete, {
          ok: false,
          score: 0,
          threshold,
          reason: `init_failed: ${e?.message || String(e)}`,
        });
      }
    })();

    return () => {
      mounted = false;
      try { detectorRef.current?.dispose?.(); } catch {}
      detectorRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run when ready and inputs change
  useEffect(() => {
    if (!canRun) return;
    runningRef.current = true;

    (async () => {
      try {
        const det = detectorRef.current;
        if (!det) throw new Error("detector_unavailable");

        // Decode both images to tensors
        const [tA, tB] = await Promise.all([
          decodeJpegFromUri(sourceUri),
          decodeJpegFromUri(targetUri),
        ]);
        if (!tA || !tB) {
          disposeMany([tA, tB]);
          throw new Error("decode_failed");
        }

        // Estimate faces
        const [facesA, facesB] = await Promise.all([
          det.estimateFaces(tA, { flipHorizontal: false }),
          det.estimateFaces(tB, { flipHorizontal: false }),
        ]);

        // Clean large image tensors as early as possible
        disposeMany([tA, tB]);

        const ptsA = pickLandmarks(facesA);
        const ptsB = pickLandmarks(facesB);
        if (!ptsA) throw new Error("no_face_source");
        if (!ptsB) throw new Error("no_face_target");

        // Embeddings
        const embA = buildEmbedding(ptsA);
        const embB = buildEmbedding(ptsB);
        if (!embA?.length || !embB?.length) throw new Error("embed_failed");

        // Cosine similarity
        const score = cosineSim(embA, embB);
        const ok = score >= threshold;

        safeComplete(onComplete, {
          ok,
          score,
          threshold,
          reason: ok ? "match" : "no_match",
        });
      } catch (e) {
        safeComplete(onComplete, {
          ok: false,
          score: 0,
          threshold,
          reason: e?.message || "error",
        });
      } finally {
        // let GC/tf clean up
        setTimeout(() => {
          runningRef.current = false;
          try { tf.engine().startScope(); tf.engine().endScope(); } catch {}
        }, 0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, startKey, sourceUri, targetUri, threshold]);

  return null;
}

/* ------------------------------ helpers ------------------------------ */

function safeComplete(cb, res) {
  try { cb?.(res); } catch {}
}

function disposeMany(arr) {
  (arr || []).forEach((t) => {
    try { t?.dispose?.(); } catch {}
  });
}

/** Convert any RN URI (file://, content://, asset-library://, data:...) into a Tensor3D via decodeJpeg */
async function decodeJpegFromUri(uri) {
  try {
    if (!uri) return null;

    let base64 = null;
    if (uri.startsWith("data:")) {
      // data URI
      const i = uri.indexOf("base64,");
      base64 = i >= 0 ? uri.slice(i + 7) : null;
    } else {
      // local/remote path → read as base64
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    if (!base64) return null;

    const u8 = tf.util.encodeString(base64, "base64");
    const tensor = decodeJpeg(u8, 3); // shape: [h, w, 3]
    return tensor;
  } catch {
    return null;
  }
}

/** Pick first face’s 468 landmarks (supports old/new detector outputs) */
function pickLandmarks(faces) {
  if (!Array.isArray(faces) || faces.length === 0) return null;
  const f = faces[0];

  // Newer API
  if (Array.isArray(f?.keypoints) && f.keypoints.length >= 100) {
    return f.keypoints.map((p) => [
      Number(p.x || 0),
      Number(p.y || 0),
      Number(p.z || 0),
    ]);
  }

  // Legacy API
  if (Array.isArray(f?.scaledMesh) && f.scaledMesh.length >= 100) {
    return f.scaledMesh.map((p) => [
      Number(p[0] || 0),
      Number(p[1] || 0),
      Number(p[2] || 0),
    ]);
  }

  return null;
}

/**
 * Build normalized embedding:
 *  - zero-center (subtract centroid)
 *  - scale by stddev of x & y
 *  - flatten [x,y,z, ...]
 */
function buildEmbedding(points) {
  if (!Array.isArray(points) || points.length === 0) return null;

  const xs = [];
  const ys = [];
  const zs = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i] || [0, 0, 0];
    xs.push(Number(p[0] || 0));
    ys.push(Number(p[1] || 0));
    zs.push(Number(p[2] || 0));
  }

  const cx = mean(xs);
  const cy = mean(ys);
  const cz = mean(zs);

  const zx = xs.map((v) => v - cx);
  const zy = ys.map((v) => v - cy);
  const zz = zs.map((v) => v - cz);

  const s = Math.max(1e-6, stddev([...zx, ...zy]));
  const nx = zx.map((v) => v / s);
  const ny = zy.map((v) => v / s);
  const nz = zz.map((v) => v / s);

  const out = new Float32Array(points.length * 3);
  let k = 0;
  for (let i = 0; i < points.length; i++) {
    out[k++] = nx[i];
    out[k++] = ny[i];
    out[k++] = nz[i];
  }
  return out;
}

function mean(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function stddev(arr) {
  if (!arr.length) return 1;
  const m = mean(arr);
  let v = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    v += d * d;
  }
  v /= arr.length;
  return Math.sqrt(Math.max(v, 1e-12));
}

/** Cosine similarity in [0..1] (clamped) */
function cosineSim(a, b) {
  if (!a || !b) return 0;
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1e-12;
  const raw = dot / denom; // [-1..1]
  return Math.max(0, Math.min(1, raw));
}
