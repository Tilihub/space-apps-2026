// Inventory logic: expiry, forecast, safety checks, suggestions, authorisation and dispensing.
// Pure functions over a "state" object (built from data.js by MedLogic.buildState). No DOM here,
// so other pieces of the team's app can reuse it. Rules follow spec.md sections 4-6.

(function (global) {
  "use strict";

  var DAY_MS = 86400000;
  var HOUR_MS = 3600000;

  // ---------- dates ----------

  function parseDate(s) {
    if (!s) return null;
    if (s instanceof Date) return new Date(s.getTime());
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      var p = s.split("-");
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    return new Date(s);
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function subtractMonths(d, months) {
    var r = new Date(d.getTime());
    var day = r.getDate();
    r.setDate(1);
    r.setMonth(r.getMonth() - months);
    var last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
    return r;
  }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
  }

  // ---------- state ----------

  // Turns data.js into a working state with absolute times and separate lot objects.
  function buildState(data, now) {
    now = now || new Date();
    var d = JSON.parse(JSON.stringify(data));
    var state = {
      mission: d.mission,
      crew: d.crew,
      conditionLabels: d.conditionLabels || {},
      currentUserId: d.currentUserId,
      lockers: d.lockers,
      shelves: d.shelves,
      packs: d.packs,
      players: d.players || {},
      demoSymptoms: d.demoSymptoms || [],
      rxCodes: d.rxCodes || {},
      demoPlan: d.demoPlan || [],
      plans: [],
      symptoms: d.symptoms,
      redFlagVitals: d.redFlagVitals,
      redFlagSeverity: d.redFlagSeverity,
      ingredientLimits: d.ingredientLimits,
      stabilityMarginMonths: d.stabilityMarginMonths,
      items: [],
      lots: [],
      doseLog: [],
      requests: [],
      reports: [],
      seq: 1
    };

    state.crew.forEach(function (c) {
      c.nextEVA = c.nextEVAInDays == null ? null : new Date(now.getTime() + c.nextEVAInDays * DAY_MS).toISOString();
      delete c.nextEVAInDays;
    });

    d.items.forEach(function (it) {
      var lots = it.lots || [];
      delete it.lots;
      it.ingredients = it.ingredients || [];
      it.classes = it.classes || [];
      it.indications = it.indications || [];
      it.contraindications = it.contraindications || [];
      it.doseUnits = it.doseUnits || 1;
      it.stability = it.stability || "stable";
      it.reserve = it.reserve || 0;
      it.plannedUsePer30d = it.plannedUsePer30d || 0;
      var place = (d.placement || {})[it.id] || [null, null];
      it.shelfId = place[0];
      it.bin = place[1];
      state.items.push(it);
      lots.forEach(function (l, i) {
        state.lots.push({
          id: it.id + "#" + (i + 1),
          itemId: it.id,
          lotNumber: l[0],
          qty: l[1],
          expiry: l[2],
          tag: "TAG-" + l[0]
        });
      });
    });

    function relTime(daysAgo, hour, minute) {
      var t = startOfDay(now);
      t = new Date(t.getTime() - daysAgo * DAY_MS);
      t.setHours(hour || 0, minute || 0, 0, 0);
      if (t > now) t = new Date(now.getTime() - 5 * 60000);
      return t;
    }

    d.doseLog.forEach(function (e) {
      var time = relTime(e.daysAgo, e.hour, e.minute);
      var lot = state.lots.filter(function (l) { return l.lotNumber === e.lotNumber; })[0];
      state.doseLog.push({
        id: "D" + state.seq++,
        time: time.toISOString(),
        patientId: e.patientId,
        itemId: e.itemId,
        lotId: lot ? lot.id : null,
        qty: e.qty,
        reason: e.reason || "",
        auth: e.auth,
        groundReview: e.groundReview || "n/a",
        docsDue: e.docsDueHours ? new Date(time.getTime() + e.docsDueHours * HOUR_MS).toISOString() : null,
        documentation: e.documentation || "",
        countCheck: e.countCheck || null,
        followUp: e.followUp || null
      });
    });
    state.doseLog.sort(function (a, b) { return a.time < b.time ? 1 : -1; });

    d.requests.forEach(function (r) {
      var t = new Date(now.getTime() - r.minutesAgo * 60000);
      var item = getItem(state, r.itemId);
      state.requests.push({
        id: "R" + state.seq++,
        time: t.toISOString(),
        patientId: r.patientId,
        itemId: r.itemId,
        qty: r.qty,
        reason: r.reason,
        tier: item.tier,
        status: r.status,
        signatures: (r.signatures || []).map(function (s) {
          return { crewId: s.crewId, role: s.role, time: new Date(now.getTime() - s.minutesAgo * 60000).toISOString() };
        })
      });
    });

    return state;
  }

  // ---------- lookups ----------

  function getItem(state, id) { return state.items.filter(function (i) { return i.id === id; })[0] || null; }
  function getCrew(state, id) { return state.crew.filter(function (c) { return c.id === id; })[0] || null; }
  function getPack(state, id) { return state.packs.filter(function (p) { return p.id === id; })[0] || null; }
  function getLocker(state, id) { return state.lockers.filter(function (l) { return l.id === id; })[0] || null; }
  function getLot(state, id) { return state.lots.filter(function (l) { return l.id === id; })[0] || null; }
  function getSymptom(state, code) { return state.symptoms.filter(function (s) { return s.code === code; })[0] || null; }
  function lotsOf(state, itemId) { return state.lots.filter(function (l) { return l.itemId === itemId; }); }

  function getShelf(state, id) { return state.shelves.filter(function (s) { return s.id === id; })[0] || null; }

  var SHELF_NAMES = { 1: "Top shelf", 2: "Middle shelf", 3: "Bottom shelf" };

  // Where an item is: locker → shelf (a colour-coded zone) → bin
  function locationOf(state, item) {
    var shelf = getShelf(state, item.shelfId);
    var locker = shelf ? getLocker(state, shelf.lockerId) : null;
    return {
      locker: locker,
      shelf: shelf,
      shelfName: shelf ? SHELF_NAMES[shelf.level] : "",
      pack: getPack(state, shelf ? shelf.packId : item.packId),
      bin: item.bin
    };
  }

  // ---------- mission ----------

  function missionInfo(state, now) {
    var start = parseDate(state.mission.startDate);
    var end = new Date(start.getTime() + state.mission.durationDays * DAY_MS);
    var elapsed = daysBetween(start, now);
    return {
      start: start,
      end: end,
      day: Math.min(Math.max(elapsed + 1, 1), state.mission.durationDays),
      total: state.mission.durationDays,
      daysLeft: Math.max(daysBetween(now, end), 0)
    };
  }

  // ---------- expiry ----------

  function planningExpiry(state, item, lot) {
    var exp = parseDate(lot.expiry);
    if (!exp) return null;
    var margin = state.stabilityMarginMonths[item.stability] || 0;
    return subtractMonths(exp, margin);
  }

  // expired > potency-risk > before-end > ok ; "none" for items without expiry
  function lotStatus(state, item, lot, now) {
    var exp = parseDate(lot.expiry);
    if (!exp) return "none";
    var today = startOfDay(now);
    if (exp < today) return "expired";
    if (planningExpiry(state, item, lot) < today) return "potency-risk";
    if (planningExpiry(state, item, lot) < missionInfo(state, now).end) return "before-end";
    return "ok";
  }

  // Lots sorted first-expiry-first-out, by planning expiry
  function fefoLots(state, item) {
    return lotsOf(state, item.id).slice().sort(function (a, b) {
      var pa = planningExpiry(state, item, a), pb = planningExpiry(state, item, b);
      if (!pa && !pb) return 0;
      if (!pa) return 1;
      if (!pb) return -1;
      return pa - pb;
    });
  }

  // ---------- stock and forecast ----------

  function stock(state, item, now) {
    var onHand = 0, usable = 0, atRisk = 0, expired = 0;
    lotsOf(state, item.id).forEach(function (l) {
      var st = lotStatus(state, item, l, now);
      onHand += l.qty;
      if (st === "expired") expired += l.qty;
      else usable += l.qty;
      if (st === "potency-risk") atRisk += l.qty;
    });
    return { onHand: onHand, usable: usable, atRisk: atRisk, expired: expired };
  }

  function unitsUsed(state, itemId, sinceMs, now) {
    var from = now.getTime() - sinceMs;
    return state.doseLog.reduce(function (sum, e) {
      return e.itemId === itemId && new Date(e.time).getTime() >= from ? sum + e.qty : sum;
    }, 0);
  }

  function useRate(state, item, now) {
    // Emergency items are planned from the risk model: one recent event says little about the rate.
    if (item.tier === "4") return { perDay: (item.plannedUsePer30d || 0) / 30, basis: "planned rate" };
    var used = unitsUsed(state, item.id, 30 * DAY_MS, now);
    if (used > 0) return { perDay: used / 30, basis: "last 30 days" };
    return { perDay: (item.plannedUsePer30d || 0) / 30, basis: "planned rate" };
  }

  // FEFO simulation: how many days the usable stock lasts at the current use rate,
  // with each lot only usable until its planning expiry.
  function coverage(state, item, now) {
    var info = missionInfo(state, now);
    var rate = useRate(state, item, now);
    var today = startOfDay(now);
    if (item.kind === "equipment") return { rate: rate, days: Infinity, daysLeft: info.daysLeft, shortfall: false, waste: 0 };
    var t = 0, waste = 0;
    fefoLots(state, item).forEach(function (l) {
      if (l.qty <= 0) return;
      var pe = planningExpiry(state, item, l);
      var lastDay = pe ? daysBetween(today, pe) : Infinity;
      if (lastDay <= t) { waste += l.qty; return; }
      if (rate.perDay <= 0) { t = Math.max(t, lastDay); return; }
      var need = l.qty / rate.perDay;
      var endT = Math.min(t + need, lastDay);
      var used = (endT - t) * rate.perDay;
      waste += Math.max(l.qty - used, 0);
      t = endT;
    });
    var usable = stock(state, item, now).usable;
    var days = rate.perDay <= 0 ? (usable > 0 ? t : 0) : t;
    var short = rate.perDay > 0 && days < info.daysLeft;
    // "stock": not enough units even if nothing expired. "expiry": enough units, but lots expire first.
    var limitedBy = !short ? null : (usable < rate.perDay * info.daysLeft ? "stock" : "expiry");
    return {
      rate: rate,
      days: Math.floor(days),
      daysLeft: info.daysLeft,
      shortfall: limitedBy === "stock",
      expiryGap: limitedBy === "expiry",
      limitedBy: limitedBy,
      waste: Math.round(waste)
    };
  }

  // Flags shown in the dashboard. Ordered most serious first.
  function itemFlags(state, item, now) {
    var flags = [];
    var s = stock(state, item, now);
    var statuses = lotsOf(state, item.id).filter(function (l) { return l.qty > 0; }).map(function (l) { return lotStatus(state, item, l, now); });
    if (s.usable === 0) flags.push("empty");
    if (statuses.indexOf("expired") >= 0) flags.push("expired");
    if (statuses.indexOf("potency-risk") >= 0) flags.push("potency-risk");
    if (item.kind !== "equipment" && item.reserve && s.usable < item.reserve) flags.push("below-reserve");
    if (coverage(state, item, now).shortfall) flags.push("shortfall");
    if (statuses.indexOf("before-end") >= 0) flags.push("before-end");
    return flags;
  }

  function nextExpiry(state, item) {
    var lots = fefoLots(state, item).filter(function (l) { return l.qty > 0 && l.expiry; });
    return lots.length ? lots[0] : null;
  }

  // ---------- 24-hour history for a crew member ----------

  function recentDoses(state, patientId, hours, now) {
    var from = now.getTime() - hours * HOUR_MS;
    return state.doseLog.filter(function (e) {
      return e.patientId === patientId && new Date(e.time).getTime() >= from;
    });
  }

  // ---------- safety checks (spec section 5) ----------

  function pickLot(state, item, qty, now) {
    var lots = fefoLots(state, item).filter(function (l) { return l.qty >= qty; });
    var good = lots.filter(function (l) { var s = lotStatus(state, item, l, now); return s === "ok" || s === "before-end" || s === "none"; });
    if (good.length) return { lot: good[0], status: lotStatus(state, item, good[0], now) };
    var risky = lots.filter(function (l) { return lotStatus(state, item, l, now) === "potency-risk"; });
    if (risky.length) return { lot: risky[0], status: "potency-risk" };
    return { lot: null, status: lots.length ? "expired" : "empty" };
  }

  function safetyChecks(state, patientId, item, qty, now) {
    var crew = getCrew(state, patientId);
    var checks = [];
    function add(name, result, msg) { checks.push({ name: name, result: result, msg: msg }); }

    // Allergy
    var allergyHits = item.classes.concat(item.ingredients.map(function (g) { return g.name; }))
      .filter(function (c) { return crew.allergies.indexOf(c) >= 0; });
    add("Allergy", allergyHits.length ? "block" : "pass",
      allergyHits.length ? crew.name + " is allergic to " + allergyHits.join(", ") : "No known allergy");

    // Contraindication
    var contra = (item.contraindications || []).filter(function (c) { return crew.conditions.indexOf(c) >= 0; });
    add("Contraindication", contra.length ? "block" : "pass",
      contra.length ? "Not suitable with: " + contra.map(function (c) { return state.conditionLabels[c] || c; }).join(", ") : "None found");

    var last24 = recentDoses(state, patientId, 24, now);
    var last12 = recentDoses(state, patientId, 12, now);

    // Daily maximum: per item and per ingredient
    var sameItem = last24.filter(function (e) { return e.itemId === item.id; }).reduce(function (s, e) { return s + e.qty; }, 0);
    var dailyMsg = [], dailyBlock = false;
    if (item.maxPerDay) {
      if (sameItem + qty > item.maxPerDay) { dailyBlock = true; dailyMsg.push(sameItem + " already taken in 24 h, max " + item.maxPerDay); }
      else dailyMsg.push((sameItem + qty) + " of max " + item.maxPerDay + " per 24 h");
    }
    item.ingredients.forEach(function (g) {
      var limit = state.ingredientLimits[g.name];
      if (!limit || !g.mg) return;
      var taken = last24.reduce(function (s, e) {
        var it = getItem(state, e.itemId);
        var ing = it ? it.ingredients.filter(function (x) { return x.name === g.name; })[0] : null;
        return ing ? s + ing.mg * e.qty : s;
      }, 0);
      var total = taken + g.mg * qty;
      if (total > limit) { dailyBlock = true; dailyMsg.push(g.name + " " + total + " mg would exceed " + limit + " mg / 24 h"); }
      else if (taken > 0) dailyMsg.push(g.name + " " + total + " of " + limit + " mg / 24 h");
    });
    add("Daily maximum", dailyBlock ? "block" : "pass", dailyMsg.join("; ") || "Within limits");

    // Same class
    var classMsg = "", classResult = "pass";
    if (item.classes.indexOf("NSAID") >= 0) {
      var otherNsaid = last24.filter(function (e) {
        var it = getItem(state, e.itemId);
        return it && it.id !== item.id && it.classes.indexOf("NSAID") >= 0;
      });
      if (otherNsaid.length) { classResult = "block"; classMsg = "Another NSAID (" + getItem(state, otherNsaid[0].itemId).name + ") in the last 24 h"; }
    }
    if (classResult === "pass" && item.sedating) {
      var otherSed = last12.filter(function (e) { var it = getItem(state, e.itemId); return it && it.sedating; });
      if (otherSed.length) { classResult = "warn"; classMsg = "Another sedating medicine (" + getItem(state, otherSed[0].itemId).name + ") in the last 12 h"; }
    }
    add("Same class", classResult, classMsg || "No overlap");

    // Duplicate ingredient from another product
    var dupes = [];
    item.ingredients.forEach(function (g) {
      last24.forEach(function (e) {
        var it = getItem(state, e.itemId);
        if (it && it.id !== item.id && it.ingredients.some(function (x) { return x.name === g.name; })) dupes.push(g.name + " (in " + it.name + ")");
      });
    });
    add("Duplicate ingredient", dupes.length ? "warn" : "pass", dupes.length ? "Already taken today: " + dupes.join(", ") : "None");

    // EVA
    var evaSoon = crew.nextEVA && (new Date(crew.nextEVA) - now) < 24 * HOUR_MS && (new Date(crew.nextEVA) - now) > -HOUR_MS;
    add("EVA", item.sedating && evaSoon ? "warn" : "pass", item.sedating && evaSoon ? "Sedating, and " + crew.name + " has an EVA within 24 h" : (item.sedating ? "Sedating, no EVA within 24 h" : "Not sedating"));

    // Stock and reserve
    var s = stock(state, item, now);
    var pick = pickLot(state, item, qty, now);
    if (!pick.lot) add("Stock and reserve", "block", "No usable lot with " + qty + " left");
    else if (item.reserve && s.usable - qty < item.reserve) add("Stock and reserve", "block", "Would dip into the reserve (" + s.usable + " usable, reserve " + item.reserve + ")");
    else add("Stock and reserve", "pass", s.usable + " usable, reserve " + item.reserve);

    // Expiry
    if (pick.status === "potency-risk") add("Expiry", "warn", "Only lots past planning expiry left: potency at risk");
    else if (pick.status === "expired") add("Expiry", "block", "Only expired lots left");
    else if (pick.lot) add("Expiry", "pass", pick.lot.expiry ? "Lot " + pick.lot.lotNumber + ", expires " + pick.lot.expiry : "No expiry");
    else add("Expiry", "pass", "-");

    var result = checks.some(function (c) { return c.result === "block"; }) ? "block"
      : checks.some(function (c) { return c.result === "warn"; }) ? "warn" : "pass";
    return { result: result, checks: checks, lot: pick.lot };
  }

  // ---------- red flags and suggestions ----------

  function redFlags(state, report) {
    var reasons = [];
    (report.symptoms || []).forEach(function (s) {
      var sym = getSymptom(state, s.code);
      if (sym && sym.redFlag) reasons.push(sym.label);
      else if (s.severity >= state.redFlagSeverity) reasons.push((sym ? sym.label : s.code) + " at severity " + s.severity + "/10");
    });
    var v = report.vitals || {}, L = state.redFlagVitals;
    if (v.tempC != null && v.tempC >= L.tempCMax) reasons.push("Temperature " + v.tempC + " °C");
    if (v.spo2 != null && v.spo2 < L.spo2Min) reasons.push("SpO₂ " + v.spo2 + "%");
    if (v.heartRate != null && (v.heartRate > L.heartRateMax || v.heartRate < L.heartRateMin)) reasons.push("Heart rate " + v.heartRate);
    if (v.systolic != null && (v.systolic >= L.systolicMax || v.systolic < L.systolicMin)) reasons.push("Systolic BP " + v.systolic);
    return reasons;
  }

  function standingOrder(state, patientId, itemId) {
    var c = getCrew(state, patientId);
    return c ? (c.standingOrders || []).filter(function (o) { return o.itemId === itemId; })[0] || null : null;
  }

  function suggest(state, report, now) {
    var reasons = redFlags(state, report);
    if (reasons.length) return { escalate: true, reasons: reasons, suggestions: [], askCmo: [] };
    var codes = (report.symptoms || []).map(function (s) { return s.code; });
    var patientId = report.crewId;
    var suggestions = [], askCmo = [];
    state.items.forEach(function (it) {
      if (it.kind === "equipment") return;
      var matched = it.indications.filter(function (c) { return codes.indexOf(c) >= 0; });
      if (!matched.length) return;
      if (it.ownerCrewId && it.ownerCrewId !== patientId) return;
      var selfCare = it.tier === "S" || it.tier === "1" || (it.tier === "3" && standingOrder(state, patientId, it.id));
      if (!selfCare) { askCmo.push({ item: it, matched: matched }); return; }
      var qty = it.doseUnits || 1;
      var chk = safetyChecks(state, patientId, it, qty, now);
      suggestions.push({ item: it, matched: matched, qty: qty, safety: chk });
    });
    var order = { pass: 0, warn: 1, block: 2 };
    suggestions.sort(function (a, b) {
      if (order[a.safety.result] !== order[b.safety.result]) return order[a.safety.result] - order[b.safety.result];
      if (b.matched.length !== a.matched.length) return b.matched.length - a.matched.length;
      if (!!a.item.ownerCrewId !== !!b.item.ownerCrewId) return a.item.ownerCrewId ? -1 : 1;
      return (a.item.sedating ? 1 : 0) - (b.item.sedating ? 1 : 0);
    });
    return { escalate: false, reasons: [], suggestions: suggestions, askCmo: askCmo };
  }

  // ---------- authorisation (spec section 4) ----------

  // Returns which gate applies: none | self | standing-order | cmo | cmo+witness | break-glass
  function gateFor(state, patientId, item, qty, now, safety) {
    if (item.tier === "4") return { type: "break-glass", why: "Emergency item: release immediately, document within 2 hours" };
    if (item.tier === "3") {
      var so = standingOrder(state, patientId, item.id);
      if (so) {
        var taken = recentDoses(state, patientId, 24, now).filter(function (e) { return e.itemId === item.id; }).reduce(function (s, e) { return s + e.qty; }, 0);
        if (taken + qty <= so.maxPerDay && (!safety || safety.result !== "block")) return { type: "standing-order", why: "Standing order: " + so.maxPerDay + " per 24 h. Your PIN, then count check" };
      }
      return { type: "cmo+witness", why: "Controlled medicine (" + (item.controlled || "controlled") + "): CMO and a witness sign, then count check" };
    }
    if (item.tier === "2") return { type: "cmo", why: "Prescription item: CMO signs" };
    if (item.ownerCrewId && item.ownerCrewId !== patientId) return { type: "cmo", why: "Crew-specific item of another crew member: CMO signs" };
    if (safety && safety.result === "block") return { type: "cmo", why: "A safety check blocked self-care: the CMO decides" };
    if (item.tier === "1") return { type: "self", why: "Self-care: confirm with your PIN" };
    return { type: "none", why: "Supply item" };
  }

  function needsCountCheck(item) { return item.tier === "3" || !!item.controlled; }
  function needsGroundReview(item) { return item.tier === "3" || item.tier === "4" || !!item.controlled; }

  // Validates a signature. role: "patient" | "approver" | "witness"
  function checkSignature(state, role, crewId, pin, ctx) {
    var c = getCrew(state, crewId);
    if (!c) return "Choose who is signing";
    if (c.pin !== pin) return "Wrong PIN for " + c.name;
    if (role === "patient" && crewId !== ctx.patientId) return "The patient signs for a standing order or self-care";
    if (role === "approver") {
      if (crewId === ctx.patientId) return "The approver can't be the patient" + (c.isCMO ? ": the backup CMO signs" : "");
      if (!c.isCMO && !c.isBackupCMO) return c.name + " isn't the CMO or backup CMO";
      if (c.isBackupCMO && !c.isCMO) {
        var cmo = state.crew.filter(function (x) { return x.isCMO; })[0];
        if (cmo && cmo.id !== ctx.patientId && !ctx.cmoUnavailable) return "The backup CMO signs only when the CMO is the patient or unavailable";
      }
    }
    if (role === "witness") {
      if (crewId === ctx.patientId) return "The witness can't be the patient";
      if (crewId === ctx.approverId) return "The witness can't be the approver";
    }
    return null;
  }

  // ---------- dispensing ----------

  function dispense(state, opts, now) {
    var item = getItem(state, opts.itemId);
    var lot = getLot(state, opts.lotId);
    if (!item || !lot) throw new Error("Unknown item or lot");
    if (lot.qty < opts.qty) throw new Error("Not enough in lot " + lot.lotNumber);
    lot.qty -= opts.qty;
    var t = now.toISOString();
    var entry = {
      id: "D" + state.seq++,
      time: t,
      patientId: opts.patientId,
      itemId: item.id,
      lotId: lot.id,
      qty: opts.qty,
      reason: opts.reason || "",
      auth: { type: opts.authType, signedBy: opts.signedBy || [] },
      groundReview: needsGroundReview(item) ? "pending" : "n/a",
      docsDue: opts.authType === "break-glass" ? new Date(now.getTime() + 2 * HOUR_MS).toISOString() : null,
      documentation: "",
      countCheck: opts.countCheck || null,
      followUp: null,
      scanSkipped: !!opts.scanSkipped,
      requestId: opts.requestId || null,
      planId: opts.planId || null,
      planIdx: opts.planIdx == null ? null : opts.planIdx,
      override: opts.override || null   // safety warnings the person giving it chose to override (emergency only)
    };
    state.doseLog.unshift(entry);
    if (opts.requestId) {
      var r = state.requests.filter(function (x) { return x.id === opts.requestId; })[0];
      if (r) r.status = "dispensed";
    }
    return entry;
  }

  // ---------- alerts ----------

  function alerts(state, now) {
    var a = { expired: [], potencyRisk: [], beforeEnd: [], shortfall: [], belowReserve: [], pending: [], awaitingPickup: [], urgentReports: [], docsDue: [], groundReview: [], countIssues: [], followUps: [] };
    state.items.forEach(function (it) {
      var f = itemFlags(state, it, now);
      if (f.indexOf("expired") >= 0) a.expired.push(it);
      if (f.indexOf("potency-risk") >= 0) a.potencyRisk.push(it);
      if (f.indexOf("before-end") >= 0) a.beforeEnd.push(it);
      if (f.indexOf("shortfall") >= 0) a.shortfall.push(it);
      if (f.indexOf("below-reserve") >= 0 || f.indexOf("empty") >= 0) a.belowReserve.push(it);
    });
    a.pending = state.requests.filter(function (r) { return r.status === "pending"; });
    a.awaitingPickup = state.requests.filter(function (r) { return r.status === "approved"; });
    a.urgentReports = state.reports.filter(function (r) { return !r.cmoSeen && redFlags(state, r).length > 0; });
    state.doseLog.forEach(function (e) {
      if (e.auth.type === "break-glass" && !e.documentation) a.docsDue.push(e);
      if (e.groundReview === "pending") a.groundReview.push(e);
      if (e.countCheck && e.countCheck.counted !== e.countCheck.expected && !e.countCheck.resolved) a.countIssues.push(e);
      if (!e.followUp && (now - new Date(e.time)) > HOUR_MS && (now - new Date(e.time)) < 7 * DAY_MS) {
        var it = getItem(state, e.itemId);
        if (it && it.kind === "medication") a.followUps.push(e);
      }
    });
    return a;
  }

  // ---------- plans from Earth (spec section 8a) ----------
  // Code: RX1-<CREW>-<YYMMDD start>-<ITEM><units>X<times a day>X<days>[.<ITEM>...]-<check>
  // Example: RX1-C4-261114-OND1X2X3.CAL2X3X5-<check>. Short enough to type; also fits in a QR code.

  var RX_SLOTS = { 1: [8], 2: [8, 20], 3: [8, 14, 20], 4: [8, 12, 16, 20] };

  function rxCheck(body) {
    var h = 7;
    for (var i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) % 1296;
    var s = h.toString(36).toUpperCase();
    return s.length < 2 ? "0" + s : s;
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function encodeRx(state, patientId, start, items) {
    var codes = {};
    Object.keys(state.rxCodes).forEach(function (k) { codes[state.rxCodes[k]] = k; });
    var ymd = String(start.getFullYear()).slice(2) + pad2(start.getMonth() + 1) + pad2(start.getDate());
    var body = "RX1-" + patientId.toUpperCase() + "-" + ymd + "-" + items.map(function (x) {
      return codes[x.itemId] + x.units + "X" + x.perDay + "X" + x.days;
    }).join(".");
    return body + "-" + rxCheck(body);
  }

  function decodeRx(state, raw) {
    var code = String(raw || "").toUpperCase().replace(/\s+/g, "");
    var m = /^(RX1-([A-Z0-9]+)-(\d{6})-([A-Z0-9.]+))-([A-Z0-9]{2})$/.exec(code);
    if (!m) return { error: "That isn't a plan code." };
    if (rxCheck(m[1]) !== m[5]) return { error: "The code has a typo. Check it and try again." };
    var patientId = m[2].toLowerCase();
    if (!getCrew(state, patientId)) return { error: "Unknown crew member in the code." };
    var y = 2000 + Number(m[3].slice(0, 2)), mo = Number(m[3].slice(2, 4)), da = Number(m[3].slice(4, 6));
    var start = new Date(y, mo - 1, da);
    if (start.getMonth() !== mo - 1 || start.getDate() !== da) return { error: "Bad date in the code." };
    var items = [], parts = m[4].split(".");
    for (var i = 0; i < parts.length; i++) {
      var pm = /^([A-Z]{3})(\d)X(\d)X(\d{1,2})$/.exec(parts[i]);
      if (!pm) return { error: "Can't read " + parts[i] + "." };
      var it = getItem(state, state.rxCodes[pm[1]]);
      if (!it) return { error: "Unknown medicine " + pm[1] + "." };
      var units = Number(pm[2]), perDay = Number(pm[3]), days = Number(pm[4]);
      if (units < 1 || perDay < 1 || perDay > 4 || days < 1 || days > 30) return { error: it.name + ": dose out of range." };
      if (it.maxPerDay && units * perDay > it.maxPerDay) return { error: it.name + ": over the daily limit." };
      if (it.ownerCrewId && it.ownerCrewId !== patientId) return { error: it.name + " belongs to another crew member." };
      items.push({ itemId: it.id, units: units, perDay: perDay, days: days });
    }
    return { plan: { code: code, patientId: patientId, start: y + "-" + pad2(mo) + "-" + pad2(da), items: items } };
  }

  // Where one medicine of a plan stands right now: not-started | due | later | done-today | finished
  function planItemStatus(state, plan, idx, now) {
    var x = plan.items[idx], start = parseDate(plan.start), day = daysBetween(start, now) + 1;
    var slots = RX_SLOTS[x.perDay];
    var entries = state.doseLog.filter(function (e) { return e.planId === plan.id && e.planIdx === idx; });
    var total = x.perDay * x.days, taken = entries.length;
    var today = entries.filter(function (e) { return daysBetween(new Date(e.time), now) === 0; }).length;
    var s = { day: day, days: x.days, total: total, taken: taken, today: today, slots: slots, nextHour: null };
    if (day < 1) { s.state = "not-started"; return s; }
    if (day > x.days || taken >= total) { s.state = "finished"; return s; }
    if (today >= x.perDay) { s.state = "done-today"; return s; }
    // Due when the latest dose time today has passed and nothing was taken since then.
    // Missed earlier doses are not added up, so there's never a double dose.
    var h = now.getHours();
    var passed = slots.filter(function (x) { return h >= x; });
    var upcoming = slots.filter(function (x) { return x > h; });
    if (passed.length) {
      var slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), passed[passed.length - 1]);
      var takenSince = entries.some(function (e) { return new Date(e.time) >= slotTime; });
      if (!takenSince) { s.state = "due"; return s; }
    }
    if (!upcoming.length) { s.state = "done-today"; return s; }
    s.state = "later";
    s.nextHour = upcoming[0];
    return s;
  }

  // ---------- validation of incoming reports ----------

  function validateReport(state, r) {
    if (!r || r.type !== "symptom-report") return "Not a symptom report";
    if (!getCrew(state, r.crewId)) return "Unknown crewId: " + r.crewId;
    if (!Array.isArray(r.symptoms)) return "symptoms must be a list";
    for (var i = 0; i < r.symptoms.length; i++) {
      if (!getSymptom(state, r.symptoms[i].code)) return "Unknown symptom code: " + r.symptoms[i].code;
    }
    return null;
  }

  global.MedLogic = {
    DAY_MS: DAY_MS,
    parseDate: parseDate,
    daysBetween: daysBetween,
    buildState: buildState,
    getItem: getItem, getCrew: getCrew, getPack: getPack, getLocker: getLocker, getShelf: getShelf, getLot: getLot, getSymptom: getSymptom,
    lotsOf: lotsOf, fefoLots: fefoLots, locationOf: locationOf,
    missionInfo: missionInfo,
    planningExpiry: planningExpiry, lotStatus: lotStatus,
    stock: stock, useRate: useRate, coverage: coverage, itemFlags: itemFlags, nextExpiry: nextExpiry, unitsUsed: unitsUsed,
    recentDoses: recentDoses, pickLot: pickLot, safetyChecks: safetyChecks,
    redFlags: redFlags, standingOrder: standingOrder, suggest: suggest,
    gateFor: gateFor, needsCountCheck: needsCountCheck, needsGroundReview: needsGroundReview, checkSignature: checkSignature,
    dispense: dispense, alerts: alerts, validateReport: validateReport,
    encodeRx: encodeRx, decodeRx: decodeRx, planItemStatus: planItemStatus
  };
})(window);
