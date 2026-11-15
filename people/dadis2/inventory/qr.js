// Grant codes as QR images, both ways, offline:
// - drawing: MedQR.svg(text), with qrcode-generator (vendor/qrcode.js, MIT). Used by the Earth tool,
//   Earth's reply page and the CMO's Approvals screen.
// - reading from the camera: MedQR.read(video), with the browser's own reader or jsQR
//   (vendor/jsQR.js, Apache-2.0). Used by Import from Earth.

(function (global) {
  "use strict";

  var n = 0;

  // Returns { svg, modules } for the given text. Grant codes only use QR "alphanumeric" characters
  // (A–Z, 0–9, "-", "."), which gives the smallest QR image.
  function svg(text, cellSize) {
    if (typeof global.qrcode !== "function") throw new Error("QR library missing (vendor/qrcode.js)");
    text = String(text);
    var q = global.qrcode(0, "M"); // 0 = smallest size that fits; M = medium error correction (about 15%)
    q.addData(text, /^[0-9A-Z $%*+\-.\/:]*$/.test(text) ? "Alphanumeric" : "Byte");
    q.make();
    n += 1;
    return {
      svg: q.createSvgTag({ cellSize: cellSize || 6, margin: 4, scalable: true, title: { text: "QR code for " + text, id: "qr-title-" + n } }),
      modules: q.getModuleCount()
    };
  }

  // ---- reading a QR code from the camera ----
  // Uses the browser's own QR reader where there is one (Chrome on Android or macOS), otherwise
  // jsQR (vendor/jsQR.js, Apache-2.0), which works in every browser, Windows laptops included.

  var detector = null; // null: not tried yet; false: not available
  var canvas = null;

  function canRead() { return "BarcodeDetector" in global || typeof global.jsQR === "function"; }

  // Size of a video, image or canvas, or null while there's nothing to read yet
  function sizeOf(src) {
    var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (src.readyState !== undefined && src.readyState < 2) return null;
    return w && h ? { w: w, h: h } : null;
  }

  function readWithJsQR(src) {
    var size = sizeOf(src);
    if (!size || typeof global.jsQR !== "function") return null;
    var scale = Math.min(1, 960 / size.w);
    canvas = canvas || document.createElement("canvas");
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // attemptBoth: also reads a light code on a dark screen (a phone in dark mode)
    var found = global.jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
    return found && found.data ? found.data : null;
  }

  // Resolves with the text of a QR code in view, or null
  function read(src) {
    if (!src || !sizeOf(src)) return Promise.resolve(null);
    if (detector === null) {
      detector = false;
      if ("BarcodeDetector" in global) { try { detector = new global.BarcodeDetector({ formats: ["qr_code"] }); } catch (e) { detector = false; } }
    }
    if (!detector) return Promise.resolve(readWithJsQR(src));
    return detector.detect(src).then(function (codes) {
      return codes && codes.length ? codes[0].rawValue : readWithJsQR(src);
    }, function () { detector = false; return readWithJsQR(src); });
  }

  // A scanned QR may hold the code itself, or a link with "#grant=<code>" (from the Earth tool)
  function codeFrom(text) {
    var m = /[#&?]grant=([^&#\s]+)/.exec(String(text || ""));
    return (m ? decodeURIComponent(m[1]) : String(text || "")).trim();
  }

  global.MedQR = { svg: svg, read: read, canRead: canRead, codeFrom: codeFrom };
})(window);
