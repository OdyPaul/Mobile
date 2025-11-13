// shims/mediapipe-face_detection.js
// Minimal stub so Metro can resolve "@mediapipe/face_detection" when using TFJS runtime.
// Not executed in Expo; prevents bundling errors.

class FaceDetection {
  constructor() {}
  setOptions() {}
  onResults() {}
  initialize() {}
  send() {}
  close() {}
}

module.exports = {
  FaceDetection,
  VERSION: 'stub-0',
};
