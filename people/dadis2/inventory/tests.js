// Regression checks for grants and dose-by-dose collection (DAD-1). Pure logic, no UI.
// Open tests.html in a browser; every line should say PASS.

(function () {
  "use strict";

  var L = window.MedLogic, D = window.INVENTORY_DATA, results = [];

  // Fixed mission times on 14 Nov 2026 (local mission time), so the checks don't depend on the clock
  function at(h, m, dayOffset) { return new Date(2026, 10, 14 + (dayOffset || 0), h, m || 0); }
  function fresh() { return L.buildState(D, at(8, 30)); }

  var TWO = [
    { itemId: "ondansetron-4", units: 1, perDay: 2, days: 3 },        // locker 2, top shelf, bin 7
    { itemId: "calcium-carbonate-500", units: 2, perDay: 3, days: 5 } // locker 1, middle shelf, bin 4
  ];

  function draft(state, issuerId, patientId, start, items) {
    var res = L.decodeGrant(state, L.encodeGrant(state, { issuerId: issuerId, patientId: patientId, start: start, items: items }));
    return res;
  }
  function added(state, items, start) {
    var res = draft(state, L.EARTH, "c4", start || at(0), items || TWO);
    if (res.error) throw new Error(res.error);
    return L.addGrant(state, res.grant, at(8, 0));
  }
  // Collect everything due under a grant, the way the app does after each scan
  function collectAll(state, g, now) {
    var due = L.grantDue(state, g, now);
    due.forEach(function (d) {
      var it = L.getItem(state, d.itemId), lot = L.pickLot(state, it, d.units, now).lot;
      L.dispense(state, { patientId: g.patientId, itemId: d.itemId, lotId: lot.id, qty: d.units, authType: "grant", signedBy: [g.issuerId],
        grantId: g.id, grantIdx: d.grantIdx, slot: d.slot }, now);
    });
    return due;
  }
  function ids(due) { return due.map(function (d) { return d.compartmentId; }).sort(); }

  function check(name, fn) {
    try {
      var r = fn();
      results.push({ name: name, ok: r === true, detail: r === true ? "" : String(r) });
    } catch (e) { results.push({ name: name, ok: false, detail: "threw: " + e.message }); }
  }
  function eq(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected) ? true : "expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual);
  }
  function errorLike(res, text) {
    return res.error && res.error.indexOf(text) >= 0 ? true : "expected an error with \"" + text + "\", got " + JSON.stringify(res.error || res.grant);
  }

  // --- the code format ---

  check("An Earth grant code reads back to the same medicines", function () {
    var s = fresh(), res = draft(s, L.EARTH, "c4", at(0), TWO);
    return eq([res.grant.issuerId, res.grant.patientId, res.grant.start, res.grant.items], [L.EARTH, "c4", "2026-11-14", TWO]);
  });
  check("An older RX1 code still reads as a grant from Earth", function () {
    var res = L.decodeGrant(fresh(), "RX1-C4-261114-OND1X2X3.CAL2X3X5-BA");
    return eq([res.grant && res.grant.issuerId, res.grant && res.grant.items.length], [L.EARTH, 2]);
  });
  check("A typo in the code is caught", function () {
    var s = fresh(), code = L.encodeGrant(s, { issuerId: L.EARTH, patientId: "c4", start: at(0), items: TWO });
    return errorLike(L.decodeGrant(s, code.replace("OND1X2X3", "OND1X2X4")), "typo");
  });

  // --- who may grant what ---

  check("The onboard doctor can grant a prescription medicine", function () {
    var res = draft(fresh(), "c2", "c4", at(0), [{ itemId: "ondansetron-4", units: 1, perDay: 1, days: 1 }]);
    return eq([res.error || null, res.grant && res.grant.issuerId], [null, "c2"]);
  });
  check("The onboard doctor can't grant a controlled medicine", function () {
    return errorLike(draft(fresh(), "c2", "c1", at(0), [{ itemId: "zolpidem-5", units: 1, perDay: 1, days: 3 }]), "only Earth");
  });
  check("Earth can grant a controlled medicine", function () {
    var res = draft(fresh(), L.EARTH, "c1", at(0), [{ itemId: "zolpidem-5", units: 1, perDay: 1, days: 3 }]);
    return eq(res.error || null, null);
  });
  check("The doctor can't grant medicine to themselves", function () {
    return errorLike(draft(fresh(), "c2", "c2", at(0), [{ itemId: "ondansetron-4", units: 1, perDay: 1, days: 1 }]), "themselves");
  });
  check("A crew member who isn't a doctor can't grant", function () {
    return errorLike(draft(fresh(), "c4", "c1", at(0), [{ itemId: "ondansetron-4", units: 1, perDay: 1, days: 1 }]), "onboard doctor or Earth");
  });
  check("More than the daily limit is refused", function () {
    return errorLike(draft(fresh(), L.EARTH, "c4", at(0), [{ itemId: "ondansetron-4", units: 2, perDay: 2, days: 1 }]), "daily limit");
  });
  check("Emergency medicines can't be granted", function () {
    var s = fresh();
    var why = L.canGrant(s, L.EARTH, "c4", L.getItem(s, "epinephrine-1mg"));
    return why && why.indexOf("Emergency") >= 0 ? true : "got " + why;
  });

  // --- binding to the right person, once ---

  check("A grant for someone else is refused on this device", function () {
    var s = fresh(), res = draft(s, L.EARTH, "c4", at(0), TWO);
    return eq(L.acceptGrant(s, res.grant, "c1"), "This grant is for Tomas Reyes.");
  });
  check("The same grant can't be added twice", function () {
    var s = fresh(), res = draft(s, L.EARTH, "c4", at(0), TWO);
    L.addGrant(s, res.grant, at(8, 0));
    return eq(L.acceptGrant(s, draft(s, L.EARTH, "c4", at(0), TWO).grant, "c4"), "Already added.");
  });

  // --- dose-by-dose collection ---

  check("Both prescribed bins open together; an unrelated bin stays closed", function () {
    var s = fresh(), g = added(s), due = ids(L.grantDue(s, g, at(8, 30)));
    var r = eq(due, ["L1-2-04", "L2-1-07"]);
    if (r !== true) return r;
    return due.indexOf("L1-1-02") < 0 ? true : "ibuprofen bin L1-1-02 was opened";
  });
  check("Each dose time is collected once", function () {
    var s = fresh(), g = added(s);
    collectAll(s, g, at(8, 30));
    var r = eq(ids(L.grantDue(s, g, at(9, 0))), []);
    if (r !== true) return "after collecting at 08:30: " + r;
    return eq(ids(L.grantDue(s, g, at(14, 30))), ["L1-2-04"]);
  });
  check("Each collection is recorded once, with its grant, dose time and stock taken", function () {
    var s = fresh(), g = added(s), lot = L.pickLot(s, L.getItem(s, "calcium-carbonate-500"), 2, at(8, 30)).lot, before = lot.qty;
    collectAll(s, g, at(8, 30));
    var mine = s.doseLog.filter(function (e) { return e.grantId === g.id; });
    return eq([mine.length, mine.map(function (e) { return e.slot; }), lot.qty], [2, ["2026-11-14@08", "2026-11-14@08"], before - 2]);
  });
  check("Missed doses are not added up (no double dose)", function () {
    var s = fresh(), g = added(s), due = L.grantDue(s, g, at(20, 30));
    return eq([ids(due), due.map(function (d) { return d.slot; })], [["L1-2-04", "L2-1-07"], ["2026-11-14@20", "2026-11-14@20"]]);
  });
  check("Nothing opens before the start date", function () {
    var s = fresh(), g = added(s, TWO, at(0, 0, 1));
    return eq(ids(L.grantDue(s, g, at(8, 30))), []);
  });
  check("A medicine stops opening when its course is over", function () {
    var s = fresh(), g = added(s);
    return eq(ids(L.grantDue(s, g, at(8, 30, 3))), ["L1-2-04"]); // day 4: ondansetron (3 days) is over, calcium (5 days) isn't
  });
  check("Compartment ids match the lockers", function () {
    var s = fresh(), c = L.compartmentOf(s, L.getItem(s, "ondansetron-4"));
    return eq(c, { compartmentId: "L2-1-07", lockerId: "L2", shelfId: "L2-1", bin: 7 });
  });

  // --- DAD-2: validity, cancelling, ground side, QR ---

  check("A grant can still be added on the last day of its course", function () {
    var s = fresh(), res = draft(s, L.EARTH, "c4", at(0), TWO); // longest medicine: 5 days → last day 18 Nov
    return eq(L.acceptGrant(s, res.grant, "c4", at(23, 0, 4)), null);
  });
  check("An expired grant is refused", function () {
    var s = fresh(), res = draft(s, L.EARTH, "c4", at(0), TWO);
    var why = L.acceptGrant(s, res.grant, "c4", at(8, 0, 5));
    return why && why.indexOf("expired") >= 0 ? true : "got " + why;
  });
  check("A cancelled grant opens nothing", function () {
    var s = fresh(), g = added(s), err = L.revokeGrant(s, g.id, "c2", at(9, 0));
    return eq([err, g.status, ids(L.grantDue(s, g, at(20, 30)))], [null, "revoked", []]);
  });
  check("Earth can cancel a grant", function () {
    var s = fresh(), g = added(s);
    return eq([L.revokeGrant(s, g.id, L.EARTH, at(9, 0)), g.revokedBy], [null, L.EARTH]);
  });
  check("A crew member who isn't a doctor can't cancel a grant", function () {
    var s = fresh(), g = added(s), why = L.revokeGrant(s, g.id, "c4", at(9, 0));
    return why && g.status === "active" ? true : "got " + why + ", status " + g.status;
  });
  check("The ground tool's code reads back on a crew device, sender marked not verified", function () {
    var s = fresh(), r = window.MedGround.makeGrant(s, { patientId: "c4", start: "2026-11-14", items: TWO });
    if (!r.ok) return r.error;
    var back = L.decodeGrant(s, r.code);
    return eq([back.grant.items, r.senderVerified, r.verification, r.validUntil], [TWO, false, "simulated", "2026-11-18"]);
  });
  check("The ground tool refuses emergency medicines with a plain reason", function () {
    var r = window.MedGround.makeGrant(fresh(), { patientId: "c4", start: "2026-11-14", items: [{ itemId: "epinephrine-1mg", units: 1, perDay: 1, days: 1 }] });
    return !r.ok && r.error.indexOf("emergency") >= 0 ? true : "got " + JSON.stringify(r);
  });
  check("The ground tool refuses another crew member's personal medicine", function () {
    var r = window.MedGround.makeGrant(fresh(), { patientId: "c1", start: "2026-11-14", items: [{ itemId: "omeprazole-20", units: 1, perDay: 1, days: 3 }] });
    return !r.ok && r.error.indexOf("another crew member") >= 0 ? true : "got " + JSON.stringify(r);
  });
  check("The QR image is made from the exact code", function () {
    var code = "RX2-EARTH-C4-261114-OND1X2X3.CAL2X3X5-LW", q = window.MedQR.svg(code);
    var ok = q.modules >= 21 && q.svg.indexOf("<svg") === 0 && q.svg.indexOf("QR code for " + code) > 0;
    return ok ? true : "modules " + q.modules;
  });

  // --- report ---

  var passed = results.filter(function (r) { return r.ok; }).length;
  document.getElementById("summary").textContent = passed + " of " + results.length + " checks pass";
  document.getElementById("summary").className = passed === results.length ? "pass" : "fail";
  document.getElementById("results").innerHTML = results.map(function (r) {
    return '<li class="' + (r.ok ? "pass" : "fail") + '">' + (r.ok ? "PASS" : "FAIL") + " · " + r.name.replace(/</g, "&lt;") +
      (r.detail ? ' <span class="detail">(' + r.detail.replace(/</g, "&lt;") + ")</span>" : "") + "</li>";
  }).join("");
  window.CHECK_RESULTS = results;
})();
