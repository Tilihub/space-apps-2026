// Draws a grant code as a QR image (SVG markup), using the vendored qrcode-generator library
// (vendor/qrcode.js, MIT). Works offline. Used by the Earth tool and the CMO's Approvals screen.

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

  global.MedQR = { svg: svg };
})(window);
