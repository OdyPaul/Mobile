// assets/lib/urDecoder.js
import * as BCUR from '@ngraveio/bc-ur';

// Header detectors
function isLegacyHeader(s) {
  // only 1ofN
  return /^ur:[a-z0-9-]+\/\d+of\d+\//i.test(String(s));
}
function isFountainHeader(s) {
  // only 1-N
  return /^ur:[a-z0-9-]+\/\d+-\d+\//i.test(String(s));
}

// Best-effort class resolution (lib variants differ)
const LegacyDecoderClass =
  BCUR.URDecoder || BCUR.UrDecoder; // legacy 1ofN
const FountainDecoderClass =
  BCUR.UrFountainDecoder || BCUR.URFountainDecoder; // fountain 1-N

export default class URScanSession {
  constructor() {
    this.mode = null;       // 'legacy' | 'fountain'
    this.decoder = null;
    this.Decoder = null;
  }

  _ensureDecoderFor(firstPart) {
    if (this.decoder) return;
    const s = String(firstPart || '');

    if (isLegacyHeader(s) && typeof LegacyDecoderClass === 'function') {
      this.mode = 'legacy';
      this.Decoder = LegacyDecoderClass;
      this.decoder = new this.Decoder();
      return;
    }
    if (isFountainHeader(s) && typeof FountainDecoderClass === 'function') {
      this.mode = 'fountain';
      this.Decoder = FountainDecoderClass;
      this.decoder = new this.Decoder();
      return;
    }

    // Fallback heuristics
    if (/-/.test(s) && typeof FountainDecoderClass === 'function') {
      this.mode = 'fountain';
      this.Decoder = FountainDecoderClass;
      this.decoder = new this.Decoder();
      return;
    }
    if (typeof LegacyDecoderClass === 'function') {
      this.mode = 'legacy';
      this.Decoder = LegacyDecoderClass;
      this.decoder = new this.Decoder();
      return;
    }

    throw new Error('[UR] No compatible decoder found. Install @ngraveio/bc-ur >= 1.1.13');
  }

  receive(partString) {
    const s = String(partString || '').trim();
    if (!s) return;

    if (!this.decoder) this._ensureDecoderFor(s);

    // Build a UR object when available
    const canUR = !!(BCUR.UR && typeof BCUR.UR.fromString === 'function');
    const urObj = canUR ? BCUR.UR.fromString(s) : undefined;

    // Try only method/arg pairs that make sense for each decoder
    const tryCalls = [];

    if (this.mode === 'legacy') {
      // legacy decoders are usually string-based; some also accept UR
      tryCalls.push(['receivePart', s], ['receive', s]);
      if (canUR) tryCalls.push(['receiveUr', urObj]);
    } else {
      // FOUNTAIN: IMPORTANT — receivePartUr / receiveUr expect a UR object (not a string)
      if (canUR) tryCalls.push(['receivePartUr', urObj]);
      if (canUR) tryCalls.push(['receiveUr', urObj]);
      // some versions accept string too
      tryCalls.push(['receivePart', s], ['receive', s]);
    }

    let lastErr;
    for (const [name, arg] of tryCalls) {
      const fn = this.decoder && this.decoder[name];
      if (typeof fn !== 'function') continue;
      try {
        fn.call(this.decoder, arg);
        return; // success
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('[UR] No compatible receive* method on decoder');
  }

  get complete() {
    if (!this.decoder) return false;
    if (typeof this.decoder.isComplete === 'function') return !!this.decoder.isComplete();
    return !!this.decoder.complete;
  }

  get percent() {
    if (!this.decoder) return 0;
    if (typeof this.decoder.estimatedPercentComplete === 'function') {
      return Math.round((this.decoder.estimatedPercentComplete() || 0) * 100);
    }
    if (typeof this.decoder.getProgress === 'function') {
      return Math.round((this.decoder.getProgress() || 0) * 100);
    }
    return 0;
  }

  _readUR() {
    if (!this.decoder) return null;
    if (typeof this.decoder.resultUr === 'function') return this.decoder.resultUr();
    if (this.decoder.resultUr) return this.decoder.resultUr;
    if (typeof this.decoder.resultUR === 'function') return this.decoder.resultUR();
    if (this.decoder.resultUR) return this.decoder.resultUR;
    return null;
  }
  resultUr() { return this._readUR(); }
  resultUR() { return this._readUR(); }

  reset() {
    this.mode = null;
    this.decoder = null;
    this.Decoder = null;
  }
}
