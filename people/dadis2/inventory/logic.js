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
      grants: [],
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
        gate: item.tier === "3" || item.controlled ? "earth" : "cmo",
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
    var allergyHits = allergiesTo(state, patientId, item);
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

  // The crew member's allergies that this item hits (by class or ingredient)
  function allergiesTo(state, patientId, item) {
    var crew = getCrew(state, patientId);
    if (!crew || !item) return [];
    return (item.classes || []).concat((item.ingredients || []).map(function (g) { return g.name; }))
      .filter(function (c) { return crew.allergies.indexOf(c) >= 0; });
  }

  // Returns which gate applies: none | self | standing-order | cmo | earth | break-glass | blocked,
  // with `short` (a few words for bins and tiles) and `why`.
  // (dadis2's decisions, 14 Nov, evening.)
  // - By category: self-care → yourself; prescription → the onboard doctor; controlled → Earth (final
  //   say); emergency → the Emergency button. Standing orders are grants from Earth before launch.
  // - Then the person's situation, for self-care: kept in reserve, or not safe with their condition →
  //   the doctor decides; daily limit reached → wait; none left → nothing to give.
  // - An allergy blocks every category: nobody grants it. Only Emergency's two-tap "Give anyway" can.
  // - If approval can't wait, the Emergency button releases it, logged, with paperwork and Earth review.
  function gateFor(state, patientId, item, qty, now, safety) {
    if (item.tier === "4") return { type: "break-glass", short: "emergency medicine", why: "Emergency item: release immediately, document within 2 hours" };
    var blocks = safety ? safety.checks.filter(function (c) { return c.result === "block"; }).map(function (c) { return c.name; }) : [];
    if (blocks.indexOf("Allergy") >= 0) return { type: "blocked", short: "allergy: not for you", why: "Allergy: nobody grants it. In an emergency, only \"Give anyway\" can release it" };
    if (item.tier === "3") {
      var so = standingOrder(state, patientId, item.id);
      if (so) {
        var taken = recentDoses(state, patientId, 24, now).filter(function (e) { return e.itemId === item.id; }).reduce(function (s, e) { return s + e.qty; }, 0);
        if (taken + qty <= so.maxPerDay && (!safety || safety.result !== "block")) return { type: "standing-order", short: "standing order", why: "Standing order: " + so.maxPerDay + " per 24 h. Your PIN, then count check" };
      }
      return { type: "earth", short: "needs Earth's approval", why: "Controlled medicine (" + (item.controlled || "controlled") + "): Earth decides. If it can't wait, use Emergency" };
    }
    if (item.tier === "2") return { type: "cmo", short: "needs the CMO's approval", why: "Prescription medicine: the CMO signs" };
    if (item.ownerCrewId && item.ownerCrewId !== patientId) return { type: "blocked", short: "someone else's medicine", why: "Another crew member's own medicine" };
    if (item.tier === "1" && blocks.length) {
      if (safety && !safety.lot) return { type: "blocked", short: "none left", why: "None left: tell the CMO" };
      if (blocks.indexOf("Daily maximum") >= 0) return { type: "blocked", short: "daily limit reached", why: "Wait: the 24-hour limit allows another dose later" };
      if (blocks.indexOf("Same class") >= 0) return { type: "blocked", short: "too close to another dose", why: "Wait: another medicine of the same kind was taken in the last 24 hours" };
      if (blocks.indexOf("Contraindication") >= 0) return { type: "cmo", short: "not safe for you: the CMO decides", why: "Not safe with your condition: the CMO decides" };
      if (blocks.indexOf("Stock and reserve") >= 0) return { type: "cmo", short: "kept in reserve: the CMO decides", why: "Only the reserve is left: the CMO decides" };
      return { type: "cmo", short: "the CMO decides", why: "A safety check blocked self-care: the CMO decides" };
    }
    if (item.tier === "1") return { type: "self", short: "self-care", why: "Self-care: confirm with your PIN" };
    return { type: "none", short: "supply", why: "Supply item" };
  }

  // Checks that still hold back a granted dose at collection time. The doctor or Earth already weighed
  // the stock reserve and the person's conditions when granting, so those don't hold it back. An
  // allergy, the 24-hour limits and expired or missing stock still do.
  function grantHold(state, patientId, item, units, now) {
    var sf = safetyChecks(state, patientId, item, units, now);
    return {
      checks: sf.checks.filter(function (c) { return c.result === "block" && c.name !== "Stock and reserve" && c.name !== "Contraindication"; }),
      lot: sf.lot || pickLot(state, item, units, now).lot
    };
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
      if (!c.isCMO && !c.isBackupCMO) return c.name + " isn't the CMO or backup CMO";
      if (crewId === ctx.patientId) return "The approver can't be the patient" + (c.isCMO ? ": the backup doctor or Earth decides" : "");
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
      groundReview: needsGroundReview(item) || opts.groundReview ? "pending" : "n/a", // Earth reviews afterwards; never blocks
      docsDue: opts.authType === "break-glass" ? new Date(now.getTime() + 2 * HOUR_MS).toISOString() : null,
      documentation: "",
      countCheck: opts.countCheck || null,
      followUp: null,
      scanSkipped: !!opts.scanSkipped,
      requestId: opts.requestId || null,
      grantId: opts.grantId || null,                          // grant this dose was collected under
      grantIdx: opts.grantIdx == null ? null : opts.grantIdx,  // which medicine of the grant
      slot: opts.slot || null,                                 // dose time collected, e.g. "2026-11-14@08"
      override: opts.override || null,  // safety warnings the person giving it chose to override (emergency only)
      approvalBypassed: !!opts.approvalBypassed // released through Emergency without the normal approval (CMO or Earth)
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
    var a = { expired: [], potencyRisk: [], beforeEnd: [], shortfall: [], belowReserve: [], pending: [], waitingEarth: [], urgentReports: [], docsDue: [], groundReview: [], countIssues: [], followUps: [] };
    state.items.forEach(function (it) {
      var f = itemFlags(state, it, now);
      if (f.indexOf("expired") >= 0) a.expired.push(it);
      if (f.indexOf("potency-risk") >= 0) a.potencyRisk.push(it);
      if (f.indexOf("before-end") >= 0) a.beforeEnd.push(it);
      if (f.indexOf("shortfall") >= 0) a.shortfall.push(it);
      if (f.indexOf("below-reserve") >= 0 || f.indexOf("empty") >= 0) a.belowReserve.push(it);
    });
    a.pending = state.requests.filter(function (r) { return r.status === "pending" && r.gate !== "earth"; });
    a.waitingEarth = state.requests.filter(function (r) { return r.status === "pending" && r.gate === "earth"; });
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

  // ---------- grants: one authorisation format for the onboard doctor and Earth ----------
  // (spec section 8a, CONTRACT.md)
  //
  // Code: RX2-<ISSUER>-<CREW>-<YYMMDD start>-<ITEM><units>X<times a day>X<days>[.<ITEM>...]-<check>
  //   ISSUER is EARTH (a flight surgeon on Earth) or the onboard doctor's crew id (for example C2).
  //   Example: RX2-EARTH-C4-261114-OND1X2X3.CAL2X3X5-<check>. Short enough to type, fits in a QR code.
  //   Older RX1 codes (no issuer) are read as EARTH.
  // The check characters only catch typos. Who issued a grant is NOT verified yet: "simulated".
  //
  // Collection is dose by dose: at each dose time all of a grant's due compartments open together,
  // and each medicine can be collected once per dose time ("slot").

  var EARTH = "EARTH";
  var RX_SLOTS = { 1: [8], 2: [8, 20], 3: [8, 14, 20], 4: [8, 12, 16, 20] };

  function rxCheck(body) {
    var h = 7;
    for (var i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) % 1296;
    var s = h.toString(36).toUpperCase();
    return s.length < 2 ? "0" + s : s;
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function ymdOf(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  // Who may grant what (dadis2's decision, 14 Nov, evening): the onboard doctor grants self-care and
  // prescription medicines, never to themselves. Earth has the final say on controlled medicines and
  // on the doctor's own medicines. Emergency items are never granted. Anything that can't wait for
  // Earth goes through the Emergency button (logged, paperwork, Earth review), so nothing is locked.
  function canGrant(state, issuerId, patientId, item) {
    if (!item || item.kind !== "medication") return "Only medicines can be granted.";
    if (item.tier === "4") return item.name + " is an emergency medicine: use the Emergency button.";
    if (item.ownerCrewId && item.ownerCrewId !== patientId) return item.name + " belongs to another crew member.";
    var allergic = allergiesTo(state, patientId, item);
    if (allergic.length) {
      var p = getCrew(state, patientId);
      return (p ? p.name : patientId) + " is allergic to " + allergic.join(", ") + ": nobody grants " + item.name + ". In an emergency, only \"Give anyway\" can release it.";
    }
    if (issuerId === EARTH) return null;
    var c = getCrew(state, issuerId);
    if (!c || !(c.isCMO || c.isBackupCMO)) return "Only the onboard doctor or Earth can issue a grant.";
    if (issuerId === patientId) return "A doctor can't grant medicine to themselves: the backup doctor or Earth does.";
    if (item.tier === "3" || item.controlled) return item.name + " is controlled: Earth decides. If it can't wait, use Emergency.";
    return null;
  }

  // g: { issuerId: "EARTH" | crew id, patientId, start: Date | "YYYY-MM-DD", items: [{ itemId, units, perDay, days }] }
  function encodeGrant(state, g) {
    var codes = {};
    Object.keys(state.rxCodes).forEach(function (k) { codes[state.rxCodes[k]] = k; });
    var start = parseDate(g.start);
    var ymd = String(start.getFullYear()).slice(2) + pad2(start.getMonth() + 1) + pad2(start.getDate());
    var body = "RX2-" + String(g.issuerId).toUpperCase() + "-" + g.patientId.toUpperCase() + "-" + ymd + "-" + g.items.map(function (x) {
      if (!codes[x.itemId]) throw new Error("No grant code for " + x.itemId);
      return codes[x.itemId] + x.units + "X" + x.perDay + "X" + x.days;
    }).join(".");
    return body + "-" + rxCheck(body);
  }

  // Returns { grant } (a draft, not yet added) or { error }
  function decodeGrant(state, raw) {
    var code = String(raw || "").toUpperCase().replace(/\s+/g, "");
    var m2 = /^(RX2-([A-Z0-9]+)-([A-Z0-9]+)-(\d{6})-([A-Z0-9.]+))-([A-Z0-9]{2})$/.exec(code);
    var m1 = /^(RX1-([A-Z0-9]+)-(\d{6})-([A-Z0-9.]+))-([A-Z0-9]{2})$/.exec(code);
    var body, issuer, crew, ymd, list, check;
    if (m2) { body = m2[1]; issuer = m2[2]; crew = m2[3]; ymd = m2[4]; list = m2[5]; check = m2[6]; }
    else if (m1) { body = m1[1]; issuer = EARTH; crew = m1[2]; ymd = m1[3]; list = m1[4]; check = m1[5]; }
    else return { error: "That isn't a grant code." };
    if (rxCheck(body) !== check) return { error: "The code has a typo. Check it and try again." };
    var issuerId = issuer === EARTH ? EARTH : issuer.toLowerCase();
    if (issuerId !== EARTH && !getCrew(state, issuerId)) return { error: "Unknown issuer in the code." };
    var patientId = crew.toLowerCase();
    if (!getCrew(state, patientId)) return { error: "Unknown crew member in the code." };
    var y = 2000 + Number(ymd.slice(0, 2)), mo = Number(ymd.slice(2, 4)), da = Number(ymd.slice(4, 6));
    var start = new Date(y, mo - 1, da);
    if (start.getMonth() !== mo - 1 || start.getDate() !== da) return { error: "Bad date in the code." };
    var items = [], seen = {}, parts = list.split(".");
    for (var i = 0; i < parts.length; i++) {
      var pm = /^([A-Z]{3})(\d)X(\d)X(\d{1,2})$/.exec(parts[i]);
      if (!pm) return { error: "Can't read " + parts[i] + "." };
      var it = getItem(state, state.rxCodes[pm[1]]);
      if (!it) return { error: "Unknown medicine " + pm[1] + "." };
      if (seen[it.id]) return { error: it.name + " is listed twice." };
      seen[it.id] = true;
      var units = Number(pm[2]), perDay = Number(pm[3]), days = Number(pm[4]);
      if (units < 1 || perDay < 1 || perDay > 4 || days < 1 || days > 30) return { error: it.name + ": dose out of range." };
      if (it.maxPerDay && units * perDay > it.maxPerDay) return { error: it.name + ": over the daily limit." };
      var why = canGrant(state, issuerId, patientId, it);
      if (why) return { error: why };
      items.push({ itemId: it.id, units: units, perDay: perDay, days: days });
    }
    // senderVerified: the check characters only prove the code was typed correctly. Who sent it is
    // NOT verified (team decision 14 Nov: simulated for now). Never treat this as proof of the sender.
    return { grant: { code: code, issuerId: issuerId, patientId: patientId, start: ymdOf(start), items: items, verification: "simulated", senderVerified: false } };
  }

  // Last day of a grant's course (the longest medicine), as a Date at local midnight
  function grantLastDay(grant) {
    var start = parseDate(grant.start), days = Math.max.apply(null, grant.items.map(function (x) { return x.days; }));
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + days - 1);
  }

  // Checks before a grant is added on a crew member's device: right person, still valid, not already
  // added, and safe together with the person's other active grants (see grantConflicts).
  // A grant can be imported until the last day of its course; after that it has expired.
  function acceptGrant(state, draft, crewId, now) {
    if (draft.patientId !== crewId) {
      var c = getCrew(state, draft.patientId);
      return "This grant is for " + (c ? c.name : draft.patientId) + ".";
    }
    if (now && daysBetween(grantLastDay(draft), now) > 0) return "This grant has expired (its course ended " + ymdOf(grantLastDay(draft)) + ").";
    if (state.grants.some(function (g) { return g.code === draft.code; })) return "Already added.";
    if (now) {
      var cf = grantConflicts(state, draft, now);
      if (cf.error) return cf.error;
    }
    return null;
  }

  // ---- several grants for one person: never more than one course per medicine ----
  //
  // One active course per medicine per crew member. A new grant for a medicine that already has an
  // active course REPLACES that course (the newest instruction wins, from the doctor or Earth), so
  // overlapping grants can never add up to a double dose. Different medicines that share an
  // ingredient (acetaminophen alone and in oxycodone/acetaminophen) are added up per day and refused
  // if together they go over the ingredient's daily limit. Two different NSAIDs at once are refused.

  function itemLastDay(start, x) {
    var s = parseDate(start);
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + x.days - 1);
  }
  function rangesOverlap(aFrom, aTo, bFrom, bTo) { return aFrom <= bTo && bFrom <= aTo; }

  // The person's courses that are still running (not finished, cancelled or replaced)
  function activeCourses(state, patientId, now) {
    var out = [];
    state.grants.forEach(function (g) {
      if (g.patientId !== patientId || g.status !== "active") return;
      g.items.forEach(function (x, i) {
        var st = grantItemStatus(state, g, i, now).state;
        if (st === "finished" || st === "replaced") return;
        out.push({ grant: g, idx: i, item: x, from: parseDate(g.start), to: itemLastDay(g.start, x) });
      });
    });
    return out;
  }

  // Returns { replaces: [{ grantId, grantIdx, itemId, issuerId }], error }
  function grantConflicts(state, draft, now) {
    var courses = activeCourses(state, draft.patientId, now), replaces = [];
    var dFrom = parseDate(draft.start), dTo = grantLastDay(draft);
    draft.items.forEach(function (x) {
      courses.forEach(function (c) {
        if (c.item.itemId === x.itemId && rangesOverlap(dFrom, itemLastDay(draft.start, x), c.from, c.to)) {
          replaces.push({ grantId: c.grant.id, grantIdx: c.idx, itemId: x.itemId, issuerId: c.grant.issuerId });
        }
      });
    });
    var others = courses.filter(function (c) {
      return !replaces.some(function (r) { return r.grantId === c.grant.id && r.grantIdx === c.idx; }) && rangesOverlap(dFrom, dTo, c.from, c.to);
    });
    var all = draft.items.concat(others.map(function (c) { return c.item; }));
    // Ingredients added up per day
    var totals = {};
    all.forEach(function (x) {
      var it = getItem(state, x.itemId);
      it.ingredients.forEach(function (g) { if (g.mg) totals[g.name] = (totals[g.name] || 0) + g.mg * x.units * x.perDay; });
    });
    var names = Object.keys(totals);
    for (var i = 0; i < names.length; i++) {
      var lim = state.ingredientLimits[names[i]];
      if (lim && totals[names[i]] > lim) {
        return { replaces: replaces, error: "Together with " + (others.length ? "the other active grants" : "this grant's other medicines") + ", " + names[i] + " would be " +
          totals[names[i]] + " mg a day, over the " + lim + " mg limit." };
      }
    }
    // Two different NSAIDs at the same time
    var nsaids = all.map(function (x) { return getItem(state, x.itemId); }).filter(function (it) { return it.classes.indexOf("NSAID") >= 0; });
    var distinct = nsaids.filter(function (it, k) { return nsaids.map(function (n) { return n.id; }).indexOf(it.id) === k; });
    if (distinct.length > 1) return { replaces: replaces, error: distinct[0].name + " and " + distinct[1].name + " are both NSAIDs: not at the same time." };
    return { replaces: replaces, error: null };
  }

  // Cancel a grant: nothing more opens under it. Kept in the list so the log still makes sense.
  // byId: the onboard doctor's crew id, or EARTH (for a cancellation that arrives with a report).
  function revokeGrant(state, grantId, byId, now) {
    var g = getGrant(state, grantId);
    if (!g) return "Unknown grant.";
    if (g.status !== "active") return "This grant is already " + g.status + ".";
    if (byId !== EARTH) {
      var c = getCrew(state, byId);
      if (!c || !(c.isCMO || c.isBackupCMO)) return "Only the onboard doctor or Earth can cancel a grant.";
    }
    g.status = "revoked";
    g.revokedBy = byId;
    g.revokedAt = now.toISOString();
    return null;
  }

  // Adds the grant. Any running course of the same medicine is replaced by this one (see above).
  // canGrant refuses self-grants; selfGranted is only a safety flag (Earth would review it).
  function addGrant(state, draft, now) {
    var cf = grantConflicts(state, draft, now);
    var g = {
      id: "G" + state.seq++, code: draft.code, issuerId: draft.issuerId, patientId: draft.patientId, start: draft.start,
      items: JSON.parse(JSON.stringify(draft.items)), verification: draft.verification || "simulated", senderVerified: false,
      addedAt: now.toISOString(), status: "active", requestId: draft.requestId || null,
      selfGranted: draft.issuerId === draft.patientId, replaced: cf.replaces
    };
    cf.replaces.forEach(function (r) {
      var old = getGrant(state, r.grantId);
      if (old && old.items[r.grantIdx]) { old.items[r.grantIdx].replacedBy = g.id; old.items[r.grantIdx].replacedAt = now.toISOString(); }
    });
    state.grants.unshift(g);
    return g;
  }

  function getGrant(state, id) { return state.grants.filter(function (g) { return g.id === id; })[0] || null; }

  function slotKey(d, hour) { return ymdOf(d) + "@" + pad2(hour); }

  // Stable compartment id for the app and a future hardware bridge, for example "L2-1-07"
  function compartmentOf(state, item) {
    var loc = locationOf(state, item);
    return { compartmentId: item.shelfId + "-" + pad2(item.bin), lockerId: loc.locker ? loc.locker.id : null, shelfId: item.shelfId, bin: item.bin };
  }

  // Where one medicine of a grant stands now: not-started | due | later | done-today | finished
  // A dose is due when the latest dose time today has passed and that dose time wasn't collected.
  // Missed earlier dose times are not added up, so there's never a double dose.
  function grantItemStatus(state, grant, idx, now) {
    var x = grant.items[idx], start = parseDate(grant.start), day = daysBetween(start, now) + 1;
    var slots = RX_SLOTS[x.perDay];
    var entries = state.doseLog.filter(function (e) { return e.grantId === grant.id && e.grantIdx === idx; });
    var todayKeys = slots.map(function (h) { return slotKey(now, h); });
    var s = {
      day: day, days: x.days, total: x.perDay * x.days, taken: entries.length, slots: slots, nextHour: null, slot: null,
      today: entries.filter(function (e) { return todayKeys.indexOf(e.slot) >= 0; }).length
    };
    if (x.replacedBy) { s.state = "replaced"; return s; }
    if (day < 1) { s.state = "not-started"; return s; }
    if (day > x.days || s.taken >= s.total) { s.state = "finished"; return s; }
    var h = now.getHours();
    var passed = slots.filter(function (sh) { return h >= sh; });
    var upcoming = slots.filter(function (sh) { return sh > h; });
    if (passed.length) {
      var key = slotKey(now, passed[passed.length - 1]);
      if (!entries.some(function (e) { return e.slot === key; })) { s.state = "due"; s.slot = key; return s; }
    }
    if (!upcoming.length) { s.state = "done-today"; return s; }
    s.state = "later";
    s.nextHour = upcoming[0];
    return s;
  }

  // Everything to collect now under one grant: all of its due compartments, opened together.
  // Compartments not in the grant, or not due now, are not in the list.
  function grantDue(state, grant, now) {
    if (!grant || grant.status !== "active") return [];
    var out = [];
    grant.items.forEach(function (x, i) {
      var s = grantItemStatus(state, grant, i, now);
      if (s.state !== "due") return;
      out.push(Object.assign({ grantId: grant.id, grantIdx: i, itemId: x.itemId, units: x.units, slot: s.slot }, compartmentOf(state, getItem(state, x.itemId))));
    });
    return out;
  }

  // Finished: every medicine is done or replaced by a newer grant
  function grantFinished(state, grant, now) {
    return grant.items.every(function (x, i) { var st = grantItemStatus(state, grant, i, now).state; return st === "finished" || st === "replaced"; });
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
    gateFor: gateFor, allergiesTo: allergiesTo, grantHold: grantHold, needsCountCheck: needsCountCheck, needsGroundReview: needsGroundReview, checkSignature: checkSignature,
    dispense: dispense, alerts: alerts, validateReport: validateReport,
    EARTH: EARTH, canGrant: canGrant, encodeGrant: encodeGrant, decodeGrant: decodeGrant, acceptGrant: acceptGrant, addGrant: addGrant,
    getGrant: getGrant, grantLastDay: grantLastDay, revokeGrant: revokeGrant, grantConflicts: grantConflicts, activeCourses: activeCourses, slotKey: slotKey, compartmentOf: compartmentOf, grantItemStatus: grantItemStatus, grantDue: grantDue, grantFinished: grantFinished
  };
})(window);
