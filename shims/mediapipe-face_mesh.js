// shims/mediapipe-face_mesh.js
// Minimal stub so Metro can resolve "@mediapipe/face_mesh" when using runtime: 'tfjs'.
// We never actually execute this path, but detector.js requires it at module scope.

class FaceMesh {
  constructor() {}
  onResults() {}     // no-op
  setOptions() {}    // no-op
  initialize() {}    // no-op
  send() {}          // no-op
  close() {}         // no-op
}

module.exports = {
  FaceMesh,
  VERSION: 'stub-0',
};
