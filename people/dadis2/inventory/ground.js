// Ground side (Earth): makes a grant code and its QR image. No UI here, so zt's Earth clinician
// screen can call it directly. Needs data.js, logic.js, vendor/qrcode.js and qr.js loaded first.
//
// MedGround.makeGrant(state, { patientId, start, items: [{ itemId, units, perDay, days }] })
//   → { ok: true, code, grant, validUntil, qrSvg, senderVerified: false, verification: "simulated" }
//   → { ok: false, error }
//
// The sender is NOT verified (team decision, 14 Nov: simulated). The check characters only catch typos.

(function (global) {
  "use strict";

  var L = global.MedLogic;

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  function makeGrant(state, req) {
    if (!req || !req.patientId) return { ok: false, error: "Choose the crew member." };
    if (!req.items || !req.items.length) return { ok: false, error: "Add at least one medicine." };
    for (var i = 0; i < req.items.length; i++) {
      var x = req.items[i];
      if (!(x.units >= 1 && x.units <= 9)) return { ok: false, error: "Units per dose must be 1 to 9." };
      if (!(x.perDay >= 1 && x.perDay <= 4)) return { ok: false, error: "Times a day must be 1 to 4." };
      if (!(x.days >= 1 && x.days <= 30)) return { ok: false, error: "Days must be 1 to 30." };
      var why = L.canGrant(state, L.EARTH, req.patientId, L.getItem(state, x.itemId));
      if (why) return { ok: false, error: why };
    }
    var code;
    try {
      code = L.encodeGrant(state, { issuerId: L.EARTH, patientId: req.patientId, start: req.start || new Date(), items: req.items });
    } catch (e) { return { ok: false, error: e.message }; }
    // Read the code back with the same checks a crew device uses
    var res = L.decodeGrant(state, code);
    if (res.error) return { ok: false, error: res.error };
    var qr = null;
    try { qr = global.MedQR ? global.MedQR.svg(code).svg : null; } catch (e) { qr = null; }
    return {
      ok: true, code: code, grant: res.grant, validUntil: ymd(L.grantLastDay(res.grant)), qrSvg: qr,
      senderVerified: false, verification: "simulated"
    };
  }

  global.MedGround = { makeGrant: makeGrant };
})(window);
