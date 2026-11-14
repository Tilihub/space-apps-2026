// UI for the medicine prototype. Plain JS, no build step.
// Logic lives in logic.js (MedLogic); sample data in data.js.
//
// The app runs on each crew member's own device, so there is no patient picker.
// Home is one page: the medicine panel on the left, the three lockers on the right.
// Symptoms are entered on another page (not part of this module), which sends a report with
// MedInventory.receiveSymptomReport(report) or window.postMessage(report).
// A flight surgeon on Earth can send a plan as a short code or QR code ("Import from Earth").

(function () {
  "use strict";

  var L = window.MedLogic;
  var STORE_KEY = "medInventory.v3";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var TIER = {
    S: { label: "Supply", cls: "t-s" },
    "1": { label: "Self-care", cls: "t-1" },
    "2": { label: "Prescription", cls: "t-2" },
    "3": { label: "Controlled", cls: "t-3" },
    "4": { label: "Emergency", cls: "t-4" }
  };
  var FLAG = {
    empty: { label: "Out of stock", cls: "bad" },
    expired: { label: "Expired lot", cls: "bad" },
    "potency-risk": { label: "Potency at risk", cls: "warn" },
    "below-reserve": { label: "Below reserve", cls: "warn" },
    shortfall: { label: "Runs out before mission end", cls: "warn" },
    "before-end": { label: "Expires before mission end", cls: "info" }
  };
  var LOTSTATUS = {
    expired: { label: "Expired", cls: "bad" },
    "potency-risk": { label: "Potency at risk", cls: "warn" },
    "before-end": { label: "Expires before mission end", cls: "info" },
    ok: { label: "OK", cls: "ok" },
    none: { label: "No expiry", cls: "muted" }
  };
  var AUTH = {
    none: "Supply item",
    self: "Self-care",
    "standing-order": "Standing order",
    cmo: "CMO sign-off",
    "cmo+witness": "CMO and witness sign-off",
    "ground-plan": "Plan from Earth",
    "break-glass": "Emergency"
  };
  var SHELF_SHORT = { 1: "Top", 2: "Middle", 3: "Bottom" };

  // Gamification: points for safe habits only (right box, quick find, answering "Did it help?",
  // taking a planned dose on schedule), never for taking extra medicine.
  var XP = { firstTry: 10, found: 5, fast: 5, followUp: 10, onSchedule: 5 };
  var FAST_SEC = 30;
  var BADGES = {
    "first-find": { icon: "🎯", label: "First find" },
    "sharp-eye": { icon: "👁️", label: "Sharp eye" },
    "good-reporter": { icon: "📝", label: "Good reporter" },
    "speedy": { icon: "⚡", label: "Speedy" },
    "course-complete": { icon: "🏁", label: "Plan complete" }
  };

  var state = null;
  var me = null;
  var ui = {
    view: "home",
    screen: "main",      // main | request | confirm | emergency | import
    flow: null,          // active retrieval: locate → (count) → done
    paused: null,        // a retrieval paused by the Emergency button
    pick: null,          // { itemId, reportId } on the confirm screen
    query: "",
    em: null,
    rxCode: "", rxPreview: null, rxError: "", qrActive: false,
    filters: { q: "", pack: "", tier: "", flag: "" },
    drawerItemId: null,
    lockerFocus: null,
    appr: {}, docs: {}, notes: {},
    logPatient: ""
  };
  var toastTimer = null;
  var qr = { stream: null, timer: null, detector: null };

  function now() { return new Date(); }

  // ---------- storage (per-viewer demo state; the page works without it) ----------

  function load() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { saved = null; }
    if (saved) {
      try { state = JSON.parse(saved); } catch (e) { state = null; }
    }
    if (!state || !state.shelves || !state.rxCodes) state = L.buildState(window.INVENTORY_DATA, now());
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    qrStop();
    state = L.buildState(window.INVENTORY_DATA, now());
    resolveUser();
    ui.flow = null; ui.paused = null; ui.screen = "main"; ui.pick = null; ui.em = null; ui.drawerItemId = null; ui.lockerFocus = null;
    ui.rxCode = ""; ui.rxPreview = null; ui.rxError = "";
    ui.appr = {}; ui.docs = {}; ui.notes = {};
    save();
    toast("Demo reset");
  }

  function resolveUser() {
    var id = null;
    try { id = new URLSearchParams(window.location.search).get("user"); } catch (e) { id = null; }
    me = id && L.getCrew(state, id) ? id : state.currentUserId;
  }
  function meCrew() { return L.getCrew(state, me); }
  function isCMO() { var c = meCrew(); return !!(c && (c.isCMO || c.isBackupCMO)); }

  // ---------- gamification ----------

  function player(id) {
    id = id || me;
    if (!state.players[id]) state.players[id] = { xp: 0, streak: 0, retrievals: 0, firstTryScans: 0, followUps: 0, bestTimeSec: null, badges: [] };
    return state.players[id];
  }
  function level(xp) { return Math.floor(xp / 100) + 1; }
  function unlock(p, id, list) { if (p.badges.indexOf(id) < 0) { p.badges.push(id); list.push(id); } }

  // ---------- formatting ----------

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDate(v) { var d = L.parseDate(v); return d ? d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() : "–"; }
  function fmtShort(v) { var d = L.parseDate(v); return d ? d.getDate() + " " + MONTHS[d.getMonth()] : "–"; }
  function fmtTime(v) { var d = new Date(v); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function clock(v) { var d = new Date(v); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function ago(v) {
    var m = Math.round((now() - new Date(v)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    return h < 48 ? h + " h ago" : Math.round(h / 24) + " days ago";
  }
  function crewName(id) {
    if (id === "ground") return "Flight surgeon (Earth)";
    var c = L.getCrew(state, id);
    return c ? c.name : String(id);
  }
  function firstName(id) { return crewName(id).split(" ")[0]; }
  function itemLabel(it) { return it.name + (it.strength ? " " + it.strength : ""); }
  function symLabel(code) { var s = L.getSymptom(state, code); return s ? s.label : code; }
  function shortName(it) { var n = it.name.replace(/ \(.*\)$/, ""); return n.length > 18 ? n.slice(0, 17) + "…" : n; }
  function unitWord(it, qty) {
    var f = { cream: "tube", ointment: "tube", "orally disintegrating tablet": "dissolving tablet" }[it.form] || it.form || "unit";
    return qty === 1 || /s$/.test(f) ? f : f + "s";
  }
  function doseText(it, qty) { return qty + " " + unitWord(it, qty); }
  function timesADay(n) { return n === 1 ? "once a day" : n === 2 ? "twice a day" : n + " times a day"; }
  function cmo() { return state.crew.filter(function (c) { return c.isCMO; })[0]; }

  // ---------- small components ----------

  function tierBadge(t, controlled) {
    var x = TIER[t] || TIER.S;
    return '<span class="badge ' + x.cls + '">' + x.label + (controlled ? " · " + esc(controlled) : "") + "</span>";
  }
  function packChip(packId, long) {
    var p = L.getPack(state, packId);
    return '<span class="chip"><span class="dot" style="background:' + p.hex + '"></span>' + esc(p.colour) + (long ? " · " + esc(p.name) : "") + "</span>";
  }
  function flagTags(flags) { return flags.map(function (f) { return '<span class="tag ' + FLAG[f].cls + '">' + FLAG[f].label + "</span>"; }).join(""); }
  function lotTag(st) { var x = LOTSTATUS[st]; return '<span class="tag ' + x.cls + '">' + x.label + "</span>"; }
  function resultBadge(r) {
    if (r === "pass") return '<span class="badge ok">All checks pass</span>';
    if (r === "warn") return '<span class="badge warn">Warning</span>';
    return '<span class="badge bad">Blocked</span>';
  }
  function whereChips(loc) {
    return '<span class="w-chip">Locker ' + esc(loc.locker.label) + '</span><span class="w-chip" style="--zone:' + loc.pack.hex + '"><span class="zone-dot"></span>' +
      esc(loc.shelfName) + '</span><span class="w-chip">Bin ' + esc(loc.bin) + "</span>";
  }
  function warnChips(sf, it, forSleep) {
    var chips = [];
    sf.checks.forEach(function (c) {
      if (c.result !== "warn") return;
      if (c.name === "EVA") chips.push("Makes you sleepy: EVA soon");
      else if (c.name === "Same class") chips.push("Sleepy medicine taken recently");
      else if (c.name === "Duplicate ingredient") chips.push("Same ingredient earlier today");
      else if (c.name === "Expiry") chips.push("Older stock");
    });
    if (it.sedating && !forSleep && !chips.some(function (x) { return /sleepy/i.test(x); })) chips.unshift("May make you sleepy");
    return chips.length ? '<div class="chips">' + chips.map(function (x) { return '<span class="tag warn">' + esc(x) + "</span>"; }).join("") + "</div>" : "";
  }
  function blockReason(sf) {
    var c = sf.checks.filter(function (x) { return x.result === "block"; })[0];
    if (!c) return "";
    return {
      "Allergy": "Allergy", "Contraindication": "Not safe for you", "Daily maximum": "Daily limit reached",
      "Same class": "Too close to another dose", "Stock and reserve": "Kept in reserve", "Expiry": "Expired"
    }[c.name] || c.name;
  }

  // What this user may do with an item right now
  function optionFor(it, t) {
    var qty = it.doseUnits || 1;
    var sf = L.safetyChecks(state, me, it, qty, t);
    var gate = L.gateFor(state, me, it, qty, t, sf);
    return { item: it, qty: qty, safety: sf, gate: gate, needsCmo: gate.type === "cmo" || gate.type === "cmo+witness" };
  }
  function canRequest(it) { return it.kind === "medication" && it.tier !== "4" && (!it.ownerCrewId || it.ownerCrewId === me); }
  // Red tint: needs CMO approval for this user (prescription, controlled without a standing order,
  // or a self-care item blocked for them by a safety check)
  function needsCmoMap(t) {
    var m = {};
    state.items.forEach(function (it) {
      if (it.tier === "4" || it.kind === "equipment") return;
      if (canRequest(it)) m[it.id] = optionFor(it, t).needsCmo;
      else m[it.id] = it.tier === "2" || it.tier === "3";
    });
    return m;
  }

  // ---------- render ----------

  function render() {
    var active = document.activeElement;
    var focusId = active && active.id ? active.id : null;
    var sel = null;
    try { sel = active && typeof active.selectionStart === "number" ? active.selectionStart : null; } catch (e) { sel = null; }

    if (!isCMO() && ui.view !== "home") ui.view = "home";
    if (ui.qrActive && !(ui.view === "home" && ui.screen === "import")) qrStop();
    renderHeader();
    var html;
    if (ui.view === "stock") html = viewStock();
    else if (ui.view === "approvals") html = viewApprovals();
    else if (ui.view === "log") html = viewLog();
    else html = viewHome();
    document.getElementById("main").innerHTML = html;
    renderDrawer();
    renderDemo();
    updateTimer();
    attachQr();

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el && el !== document.activeElement) {
        el.focus();
        try { if (sel != null && el.setSelectionRange) el.setSelectionRange(sel, sel); } catch (e) { /* not a text input */ }
      }
    }
  }

  function renderHeader() {
    var c = meCrew(), p = player();
    document.getElementById("me").innerHTML =
      '<span class="avatar">' + esc(c.name.charAt(0)) + '</span><span class="me-text"><b>' + esc(firstName(me)) + '</b><span class="lv">Level ' + level(p.xp) +
      '</span></span><span class="xpbar" title="' + p.xp + ' XP"><span style="width:' + (p.xp % 100) + '%"></span></span>' +
      '<span class="streak" title="Answers to &quot;Did it help?&quot; in a row">🔥 ' + p.streak + "</span>";
    var nav = document.getElementById("tabs");
    nav.hidden = !isCMO();
    var tabs = nav.querySelectorAll("[data-view]");
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle("active", tabs[i].getAttribute("data-view") === ui.view);
    var a = L.alerts(state, now());
    var n = a.pending.length + a.urgentReports.length + a.docsDue.length + a.countIssues.length;
    var badge = document.getElementById("apprCount");
    badge.textContent = n ? String(n) : "";
    badge.hidden = !n;
  }

  function renderDemo() {
    document.getElementById("demo").innerHTML =
      '<span class="muted">Demo · symptoms (stand-in for the symptom page):</span> ' +
      state.demoSymptoms.map(function (d, i) { return '<button class="btn small" data-act="demo-symptoms" data-idx="' + i + '">' + esc(d.label) + "</button>"; }).join(" ") +
      ' <button class="btn small" data-act="demo-code">🌍 Test code from Earth</button>' +
      ' <span class="muted">· This device: ' + esc(meCrew().name) + ' (?user=c1 to c4)</span> <button class="btn small" data-act="reset">Reset demo</button>';
  }

  // ---------- home: one page, medicine panel + lockers ----------

  function activeReport() {
    return state.reports.filter(function (r) { return r.crewId === me && !r.handled; })[0] || null;
  }

  function viewHome() {
    var t = now(), left, focus = null, locating = false;
    if (ui.flow) {
      left = viewFlow(ui.flow);
      if (ui.flow.itemId) focus = { itemId: ui.flow.itemId, pulse: ui.flow.step === "locate" };
      locating = ui.flow.step === "locate";
    } else if (ui.screen === "request") left = viewRequest(t);
    else if (ui.screen === "confirm") { left = viewConfirm(t); focus = { itemId: ui.pick.itemId }; }
    else if (ui.screen === "emergency") { left = viewEmergency(t); if (ui.em.itemId) focus = { itemId: ui.em.itemId }; }
    else if (ui.screen === "import") left = viewImport();
    else left = viewMain(t);
    if (!focus && ui.lockerFocus) focus = { itemId: ui.lockerFocus, clearable: true };
    return '<div class="home-grid' + (locating ? " locating" : "") + '"><section class="col-left">' + left + '</section><section class="col-right" aria-label="Lockers">' +
      lockersPanel(focus, locating, t) + "</section></div>";
  }

  function viewMain(t) {
    var cards = "";
    if (ui.paused) {
      var pit = L.getItem(state, ui.paused.itemId);
      cards += '<div class="hcard muted"><div class="hc-kicker">⏸ Paused</div><div class="hc-title">' + esc(pit.name) + "</div>" +
        '<div class="hc-actions"><button class="btn primary big" data-act="resume">Resume</button><button class="link" data-act="drop-paused">Cancel</button></div></div>';
    }
    var rep = activeReport();
    if (rep) cards += reportCard(rep, t);
    cards += planCards(t);
    cards += myRequestCards();
    cards += followUpCards(t);
    var html = '<div class="stack">';
    html += cards || '<div class="calm"><div class="calm-icon">🙂</div><div>All good.</div></div>';
    html += '<button class="big-action" data-act="go-request"><span class="ba-icon">💊</span><span>Request a medicine</span></button>';
    html += '<button class="big-action alt" data-act="go-import"><span class="ba-icon">🌍</span><span>Import from Earth</span></button>';
    html += badgeShelf();
    return html + "</div>";
  }

  function reportCard(rep, t) {
    var res = L.suggest(state, rep, t);
    var forWhat = rep.symptoms.map(function (s) { return symLabel(s.code).toLowerCase(); }).join(" + ");
    if (res.escalate) {
      return '<div class="hcard danger"><div class="hc-kicker">🚨 ' + esc(res.reasons.join(" · ")) + '</div><div class="hc-title">Call the CMO now</div>' +
        '<div class="hc-actions"><button class="btn danger big" data-act="emergency">Emergency</button><button class="link" data-act="dismiss-report">Dismiss</button></div></div>';
    }
    var ok = res.suggestions.filter(function (s) { return s.safety.result !== "block" && s.safety.lot; });
    if (ok.length) {
      var s = ok[0], it = s.item, alt = ok.slice(1, 3);
      return '<div class="hcard ok"><div class="hc-kicker">For your ' + esc(forWhat) + '</div><div class="hc-title">' + esc(it.name) + '</div><div class="hc-sub">' +
        esc(doseText(it, s.qty)) + (it.strength ? " · " + esc(it.strength) : "") + "</div>" +
        warnChips(s.safety, it, rep.symptoms.some(function (x) { return x.code === "insomnia"; })) +
        '<div class="hc-actions"><button class="btn primary big" data-act="take" data-id="' + it.id + '" data-report="' + esc(rep.id) + '">Get it</button>' +
        '<button class="link" data-act="dismiss-report">Not now</button></div>' +
        (alt.length ? '<div class="hc-alt">Or: ' + alt.map(function (a) {
          return '<button class="link" data-act="pick" data-id="' + a.item.id + '" data-report="' + esc(rep.id) + '">' + esc(a.item.name) + "</button>";
        }).join(" ") + "</div>" : "") + "</div>";
    }
    var askItem = res.askCmo.length ? res.askCmo[0].item : (res.suggestions.filter(function (x) { return x.safety.lot; })[0] || {}).item;
    if (askItem) {
      return '<div class="hcard rx"><div class="hc-kicker">For your ' + esc(forWhat) + '</div><div class="hc-title">Ask the CMO</div><div class="hc-sub">🔒 ' + esc(askItem.name) + "</div>" +
        '<div class="hc-actions"><button class="btn primary big" data-act="ask" data-id="' + askItem.id + '" data-report="' + esc(rep.id) + '">Ask</button>' +
        '<button class="link" data-act="dismiss-report">Not now</button></div></div>';
    }
    return '<div class="hcard"><div class="hc-kicker">For your ' + esc(forWhat) + '</div><div class="hc-title">No match</div><div class="hc-sub">Request one below, or ask the CMO.</div>' +
      '<div class="hc-actions"><button class="link" data-act="dismiss-report">OK</button></div></div>';
  }

  function myPlans() { return state.plans.filter(function (p) { return p.patientId === me; }); }

  function planCards(t) {
    return myPlans().map(function (p) {
      var sts = p.items.map(function (x, i) { return L.planItemStatus(state, p, i, t); });
      if (sts.every(function (s) { return s.state === "finished"; })) {
        if (p.doneSeen) return "";
        return '<div class="hcard plan"><div class="hc-kicker">🌍 Plan from Earth</div><div class="hc-title">Plan complete 🏁</div>' +
          '<div class="hc-actions"><button class="link" data-act="plan-seen" data-id="' + p.id + '">OK</button></div></div>';
      }
      var total = 0, taken = 0, maxDays = 0;
      sts.forEach(function (s) { total += s.total; taken += Math.min(s.taken, s.total); maxDays = Math.max(maxDays, s.days); });
      var day = sts[0].day;
      var html = '<div class="hcard plan"><div class="hc-kicker">🌍 Plan from Earth · ' + (day < 1 ? "starts " + esc(fmtShort(p.start)) : "day " + Math.min(day, maxDays) + " of " + maxDays) +
        "</div>";
      p.items.forEach(function (x, i) {
        var it = L.getItem(state, x.itemId), s = sts[i], action;
        if (s.state === "due") action = '<button class="btn primary" data-act="plan-take" data-id="' + p.id + '" data-idx="' + i + '">Take now</button>';
        else if (s.state === "later") action = '<span class="plan-next">Next ' + pad(s.nextHour) + ":00</span>";
        else if (s.state === "done-today") action = '<span class="plan-next ok">✓ Today</span>';
        else if (s.state === "finished") action = '<span class="plan-next ok">✓ Done</span>';
        else action = '<span class="plan-next">' + esc(fmtShort(p.start)) + "</span>";
        var dots = s.state === "finished" || s.state === "not-started" ? "" : '<span class="dots">' + s.slots.map(function (h, k) {
          return '<i class="' + (k < s.today ? "on" : "") + '" title="' + pad(h) + ':00"></i>';
        }).join("") + "</span>";
        html += '<div class="plan-row"><div><b>' + esc(it.name) + '</b><div class="muted small">' + esc(doseText(it, x.units)) + " · " + esc(timesADay(x.perDay)) + " · " +
          x.days + " days</div>" + dots + "</div>" + action + "</div>";
      });
      html += '<div class="bar plan-bar"><span class="ok" style="width:' + (total ? Math.round(taken / total * 100) : 0) + '%"></span></div>';
      return html + "</div>";
    }).join("");
  }

  function myRequestCards() {
    return state.requests.filter(function (r) {
      return r.patientId === me && (r.status === "pending" || r.status === "approved" || (r.status === "denied" && !r.seen));
    }).map(function (r) {
      var it = L.getItem(state, r.itemId);
      if (r.status === "approved") {
        return '<div class="hcard ok"><div class="hc-kicker">✅ Approved</div><div class="hc-title">' + esc(it.name) + '</div><div class="hc-actions">' +
          '<button class="btn primary big" data-act="pickup" data-id="' + r.id + '">Get it</button></div></div>';
      }
      if (r.status === "denied") {
        return '<div class="hcard"><div class="hc-kicker">Not approved</div><div class="hc-title">' + esc(it.name) + '</div><div class="hc-sub">Talk to the CMO.</div>' +
          '<div class="hc-actions"><button class="link" data-act="seen" data-id="' + r.id + '">OK</button></div></div>';
      }
      return '<div class="hcard muted"><div class="hc-kicker">⏳ Waiting for the CMO</div><div class="hc-title">' + esc(it.name) + "</div></div>";
    }).join("");
  }

  function followUpCards(t) {
    return state.doseLog.filter(function (e) {
      var it = L.getItem(state, e.itemId), age = t - new Date(e.time);
      return e.patientId === me && !e.followUp && !e.planId && it && it.kind === "medication" && age > 30 * 60000 && age < 3 * L.DAY_MS;
    }).slice(0, 2).map(function (e) {
      var it = L.getItem(state, e.itemId);
      return '<div class="hcard"><div class="hc-kicker">Quick check <span class="xp-pill">+' + XP.followUp + ' XP</span></div><div class="hc-title">Did ' + esc(it.name) + " help?</div>" +
        '<div class="hc-actions"><button class="btn big" data-act="fu" data-id="' + e.id + '" data-eff="1">👍 Yes</button><button class="btn big" data-act="fu" data-id="' + e.id + '" data-eff="0">👎 No</button></div></div>';
    }).join("");
  }

  function badgeShelf() {
    var p = player();
    return '<div class="badges">' + Object.keys(BADGES).map(function (id) {
      var b = BADGES[id], got = p.badges.indexOf(id) >= 0;
      return '<span class="bdg' + (got ? " got" : "") + '" title="' + esc(b.label) + '"><span class="bdg-icon">' + b.icon + '</span><span class="bdg-label">' + esc(b.label) + "</span></span>";
    }).join("") + (p.bestTimeSec ? '<span class="best">Best find: ' + p.bestTimeSec + " s</span>" : "") + "</div>";
  }

  // ---------- request a medicine (own choice) ----------

  function viewRequest(t) {
    var q = ui.query.toLowerCase();
    var list = state.items.filter(function (it) {
      return canRequest(it) && (!q || (it.name + " " + it.indications.map(symLabel).join(" ")).toLowerCase().indexOf(q) >= 0);
    }).map(function (it) { return optionFor(it, t); });
    var self = list.filter(function (o) { return !o.needsCmo; }).sort(function (a, b) {
      return (a.item.ownerCrewId ? 0 : 1) - (b.item.ownerCrewId ? 0 : 1) || a.item.name.localeCompare(b.item.name);
    });
    var cmoList = list.filter(function (o) { return o.needsCmo; }).sort(function (a, b) { return a.item.name.localeCompare(b.item.name); });
    function tile(o) {
      var use = o.item.indications.slice(0, 2).map(symLabel).join(", ") || o.item.strength;
      return '<button class="tile' + (o.needsCmo ? " rx" : "") + (o.safety.lot ? "" : " off") + '" data-act="pick" data-id="' + o.item.id + '"><span class="tile-name">' +
        (o.needsCmo ? "🔒 " : "") + esc(o.item.name) + (o.item.ownerCrewId ? ' <span class="tag muted">Yours</span>' : "") + '</span><span class="tile-use">' + esc(use) + "</span></button>";
    }
    var html = '<div class="screen-head"><button class="back" data-act="go-home" aria-label="Back">←</button><h2>Request a medicine</h2></div>';
    html += '<input id="reqQ" class="search" type="search" placeholder="Search: headache, sleep…" aria-label="Search" value="' + esc(ui.query) + '" data-bind="query" data-live>';
    if (self.length) html += '<h3>You can take</h3><div class="tiles">' + self.map(tile).join("") + "</div>";
    if (cmoList.length) html += '<h3>Ask the CMO</h3><div class="tiles">' + cmoList.map(tile).join("") + "</div>";
    if (!list.length) html += '<p class="muted">Nothing found.</p>';
    return html;
  }

  function viewConfirm(t) {
    var it = L.getItem(state, ui.pick.itemId), o = optionFor(it, t), sf = o.safety;
    var html = '<div class="screen-head"><button class="back" data-act="' + (ui.pick.reportId ? "go-home" : "go-request") + '" aria-label="Back">←</button><h2>' +
      (o.needsCmo ? "🔒 " : "") + esc(it.name) + "</h2></div>";
    html += '<div class="hcard ' + (o.needsCmo ? "rx" : "ok") + '"><div class="hc-title">' + esc(doseText(it, o.qty)) + '</div><div class="hc-sub">' + esc(it.strength) + "</div>";
    html += sf.result === "block" ? '<div class="chips"><span class="tag bad">' + esc(blockReason(sf)) + "</span></div>" : warnChips(sf, it);
    if (!sf.lot) html += '<div class="hc-sub">None left. Ask the CMO.</div>';
    else {
      html += '<div class="hc-actions"><button class="btn primary big" data-act="' + (o.needsCmo ? "ask" : "take") + '" data-id="' + it.id + '"' +
        (ui.pick.reportId ? ' data-report="' + esc(ui.pick.reportId) + '"' : "") + ">" + (o.needsCmo ? "Ask the CMO" : "Get it") + "</button></div>";
    }
    return html + "</div>";
  }

  function reasonFrom(reportId) {
    var r = state.reports.filter(function (x) { return x.id === reportId; })[0];
    return r ? r.symptoms.map(function (s) { return symLabel(s.code); }).join(", ") : "Requested by crew member";
  }
  function markReport(reportId) {
    var r = state.reports.filter(function (x) { return x.id === reportId; })[0];
    if (r) r.handled = true;
  }

  function startFlow(f) {
    ui.flow = Object.assign({ step: "locate", patientId: me, start: Date.now(), wrong: 0, error: "", requestId: null, reportId: null, planId: null, planIdx: null }, f);
    ui.screen = "main";
    ui.pick = null;
    ui.lockerFocus = null;
  }

  function startTake(itemId, reportId) {
    var t = now(), it = L.getItem(state, itemId), o = optionFor(it, t);
    if (!o.safety.lot) { toast("None left. Ask the CMO."); return; }
    if (o.needsCmo) { askCmo(itemId, reportId); return; }
    startFlow({ itemId: it.id, qty: o.qty, lotId: o.safety.lot.id, authType: o.gate.type, signedBy: [me], reason: reasonFrom(reportId), reportId: reportId || null });
  }

  function askCmo(itemId, reportId) {
    var t = now(), it = L.getItem(state, itemId), o = optionFor(it, t);
    var gateType = o.needsCmo ? o.gate.type : (it.tier === "3" ? "cmo+witness" : "cmo");
    state.requests.unshift({
      id: "R" + state.seq++, time: t.toISOString(), patientId: me, itemId: it.id, qty: o.qty, reason: reasonFrom(reportId),
      tier: it.tier, gate: gateType, status: "pending", signatures: []
    });
    if (reportId) markReport(reportId);
    ui.screen = "main";
    ui.pick = null;
    save();
    toast("Sent to the CMO");
  }

  function pickup(requestId) {
    var r = state.requests.filter(function (x) { return x.id === requestId; })[0];
    var it = L.getItem(state, r.itemId), pick = L.pickLot(state, it, r.qty, now());
    if (!pick.lot) { toast("None left. Ask the CMO."); return; }
    startFlow({
      itemId: it.id, qty: r.qty, lotId: pick.lot.id, authType: r.gate || (r.tier === "3" ? "cmo+witness" : "cmo"),
      signedBy: r.signatures.map(function (s) { return s.crewId; }), reason: r.reason, requestId: r.id
    });
  }

  function planTake(planId, idx) {
    var t = now(), p = state.plans.filter(function (x) { return x.id === planId; })[0], x = p.items[idx], it = L.getItem(state, x.itemId);
    var sf = L.safetyChecks(state, me, it, x.units, t);
    if (!sf.lot) { toast("None left. Ask the CMO."); return; }
    if (sf.result === "block") { toast(blockReason(sf) + ". Ask the CMO first."); return; }
    startFlow({ itemId: it.id, qty: x.units, lotId: sf.lot.id, authType: "ground-plan", signedBy: ["ground"], reason: "Plan from Earth", planId: p.id, planIdx: idx, onSchedule: true });
  }

  // ---------- retrieval flow: locate → scan → (count) → done ----------

  function viewFlow(f) {
    if (f.step === "count") return viewCount(f);
    if (f.step === "done") return viewDone(f);
    return viewLocate(f);
  }

  function viewLocate(f) {
    var it = L.getItem(state, f.itemId), loc = L.locationOf(state, it);
    var html = '<div class="find' + (f.emergency ? " em" : "") + '"><div class="hc-kicker">' + (f.emergency ? "🚨 Emergency" : "Find it") + "</div>" +
      '<div class="where">' + whereChips(loc) + '</div><div class="what"><b>' + f.qty + " ×</b> " + esc(it.name) + ' <span class="muted">' + esc(it.strength) + "</span></div>";
    if (f.error) html += '<div class="find-error">' + esc(f.error) + "</div>";
    if (f.locateOnly) {
      html += '<div class="find-actions"><button class="btn primary big" data-act="flow-close">Done</button></div>';
    } else {
      html += '<div class="find-actions"><span class="timer" id="timer">0:00</span><button class="btn primary big" data-act="scan-ok">📷 Scan</button>' +
        (f.emergency ? '<button class="btn big" data-act="scan-skip">Skip scan</button>' : "") + "</div>" +
        '<div class="demo-line"><button class="link small" data-act="scan-wrong">Demo: scan the wrong box</button> · <button class="link small" data-act="flow-close">Cancel</button></div>';
    }
    return html + "</div>";
  }

  function doScan(tag) {
    var f = ui.flow, it = L.getItem(state, f.itemId);
    var lot = state.lots.filter(function (l) { return l.tag === tag; })[0];
    if (!lot || lot.itemId !== it.id) {
      f.wrong++;
      var other = lot ? L.getItem(state, lot.itemId) : null;
      f.error = "Wrong box" + (other ? " (" + other.name + ")" : "") + ". Try bin " + it.bin + ".";
      return;
    }
    if (L.lotStatus(state, it, lot, now()) === "expired" && !f.emergency) { f.error = "That box is expired. Take the other one."; return; }
    if (lot.qty < f.qty) { f.error = "That box is nearly empty. Take the other one."; return; }
    f.error = "";
    f.lotId = lot.id;
    f.seconds = Math.max(1, Math.round((Date.now() - f.start) / 1000));
    afterScan();
  }

  function afterScan() {
    var f = ui.flow, it = L.getItem(state, f.itemId);
    if (L.needsCountCheck(it)) { f.step = "count"; f.count = ""; f.error = ""; }
    else complete();
  }

  function counterOf(f) { return f.authType === "cmo+witness" ? (f.signedBy[1] || me) : me; }

  function viewCount(f) {
    var it = L.getItem(state, f.itemId);
    return '<div class="hcard"><div class="hc-kicker">Count check</div><div class="hc-title">How many are left in bin ' + esc(it.bin) + "?</div>" +
      '<div class="count-row"><input id="countInput" type="number" min="0" inputmode="numeric" aria-label="Number left" value="' + esc(f.count) + '" data-bind="flow.count">' +
      '<button class="btn primary big" data-act="count-done">Done</button></div>' + (f.error ? '<p class="error">' + esc(f.error) + "</p>" : "") + "</div>";
  }

  function complete(extra) {
    var f = ui.flow;
    try {
      f.entry = L.dispense(state, Object.assign({
        patientId: f.patientId, itemId: f.itemId, lotId: f.lotId, qty: f.qty, reason: f.reason, authType: f.authType, signedBy: f.signedBy,
        requestId: f.requestId, scanSkipped: !!f.scanSkipped, planId: f.planId, planIdx: f.planIdx, override: f.override || null
      }, extra || {}), now());
    } catch (err) { f.error = err.message; return; }
    if (f.reportId) markReport(f.reportId);

    f.gains = []; f.newBadges = []; f.levelUp = false; f.newBest = false;
    if (!f.emergency) {
      var p = player(), before = level(p.xp);
      p.retrievals++;
      if (!f.scanSkipped && f.wrong === 0) { f.gains.push(["Right box first try", XP.firstTry]); p.firstTryScans++; }
      f.gains.push(["Found it", XP.found]);
      if (f.seconds != null && f.seconds <= FAST_SEC) f.gains.push(["Quick find: " + f.seconds + " s", XP.fast]);
      if (f.onSchedule) f.gains.push(["On schedule", XP.onSchedule]);
      if (f.seconds != null && (p.bestTimeSec == null || f.seconds < p.bestTimeSec)) { p.bestTimeSec = f.seconds; f.newBest = true; }
      f.gains.forEach(function (g) { p.xp += g[1]; });
      unlock(p, "first-find", f.newBadges);
      if (p.firstTryScans >= 5) unlock(p, "sharp-eye", f.newBadges);
      if (f.seconds != null && f.seconds <= 20) unlock(p, "speedy", f.newBadges);
      if (f.planId) {
        var plan = state.plans.filter(function (x) { return x.id === f.planId; })[0], t = now();
        if (plan && plan.items.every(function (x, i) { return L.planItemStatus(state, plan, i, t).state === "finished"; })) unlock(p, "course-complete", f.newBadges);
      }
      f.levelUp = level(p.xp) > before;
    }
    f.step = "done";
    save();
  }

  function confetti() {
    var colors = ["#f5b700", "#3a6be0", "#2e9a5b", "#d64545", "#7b4fc9", "#00a6c8"], s = "";
    for (var i = 0; i < 28; i++) {
      s += '<i style="left:' + ((i * 37) % 100) + "%;background:" + colors[i % colors.length] + ";animation-delay:" + ((i % 7) * 0.08).toFixed(2) + "s;animation-duration:" +
        (1.4 + (i % 5) * 0.25).toFixed(2) + 's"></i>';
    }
    return '<div class="confetti" aria-hidden="true">' + s + "</div>";
  }

  function viewDone(f) {
    var e = f.entry, total = 0;
    (f.gains || []).forEach(function (g) { total += g[1]; });
    var html = '<div class="done">' + (f.emergency ? "" : confetti()) + '<div class="done-check">✓</div><div class="hc-title">' + (f.emergency ? "Logged" : "Done!") + "</div>";
    if (total) {
      html += '<div class="xp-gain">+' + total + ' XP</div><ul class="gains">' + f.gains.map(function (g) {
        return "<li><span>" + esc(g[0]) + "</span><b>+" + g[1] + "</b></li>";
      }).join("") + "</ul>";
    }
    if (f.levelUp) html += '<div class="levelup">⬆ Level ' + level(player().xp) + "!</div>";
    (f.newBadges || []).forEach(function (id) { html += '<div class="badge-new">' + BADGES[id].icon + " New badge: " + esc(BADGES[id].label) + "</div>"; });
    if (f.newBest) html += '<div class="hc-sub">New best: ' + f.seconds + " s</div>";
    if (e && e.countCheck && e.countCheck.counted !== e.countCheck.expected) html += '<div class="tag bad block">Count doesn\'t match. The CMO will check.</div>';
    if (e && e.override) html += '<div class="tag bad block">⚠ Given despite: ' + esc(e.override.join("; ")) + ". Flagged for the CMO and ground.</div>";
    if (e && e.docsDue) html += '<div class="tag bad block">CMO: write what happened by ' + clock(e.docsDue) + ".</div>";
    html += '<div class="hc-sub">Close the bin and the locker.</div><button class="btn primary big" data-act="flow-close">Back</button></div>';
    return html;
  }

  function updateTimer() {
    var el = document.getElementById("timer");
    if (!el || !ui.flow || ui.flow.step !== "locate") return;
    var s = Math.max(0, Math.floor((Date.now() - ui.flow.start) / 1000));
    el.textContent = Math.floor(s / 60) + ":" + pad(s % 60);
    el.classList.toggle("slow", s > FAST_SEC);
  }

  // ---------- lockers panel (front view of the three lockers) ----------

  function lockersPanel(focus, locating, t) {
    var it = focus ? L.getItem(state, focus.itemId) : null;
    var loc = it ? L.locationOf(state, it) : null;
    var rx = needsCmoMap(t);
    var html = '<div class="lockers-head"><span class="lh-title">Lockers</span>';
    if (focus && focus.clearable && it) html += '<span class="lh-focus">' + esc(it.name) + ' <button class="link small" data-act="locker-clear">Clear</button></span>';
    html += '<span class="legend-rx"><span class="rx-swatch"></span>🔒 Needs CMO approval</span></div>';
    if (locating && loc) {
      html += '<div class="bay-strip" aria-hidden="true">' + state.lockers.map(function (lk) {
        return '<div class="mini-locker' + (lk.id === loc.locker.id ? " on" : "") + (lk.emergency ? " em" : "") + '"><span>' + esc(lk.label) + "</span></div>";
      }).join("") + "</div>";
    }
    html += '<div class="locker-row">' + state.lockers.map(function (lk) {
      var isTarget = loc && loc.locker.id === lk.id;
      return lockerFront(lk, {
        target: isTarget ? { shelfId: loc.shelf.id, bin: loc.bin } : null,
        pulse: !!(focus && focus.pulse),
        dim: !!(locating && loc && !isTarget),
        focusShelf: !!(locating && isTarget),
        clickable: !ui.flow,
        rx: rx
      });
    }).join("") + "</div>";
    return html;
  }

  function lockerFront(lk, o) {
    var shelves = state.shelves.filter(function (s) { return s.lockerId === lk.id; }).sort(function (a, b) { return a.level - b.level; });
    var html = '<div class="locker' + (lk.emergency ? " locker-em" : "") + (o.dim ? " dim" : "") + (o.focusShelf ? " focus" : "") + '"><div class="locker-plate"><span class="locker-num">' +
      esc(lk.label) + '</span><span class="locker-name">' + esc(lk.name) + '</span></div><div class="locker-inside">';
    shelves.forEach(function (sh) {
      var pack = L.getPack(state, sh.packId), isT = !!(o.target && o.target.shelfId === sh.id);
      var byBin = {}, maxBin = 0;
      state.items.filter(function (i) { return i.shelfId === sh.id; }).forEach(function (i) { byBin[i.bin] = i; maxBin = Math.max(maxBin, i.bin); });
      var nBins = Math.max(sh.cols, Math.ceil(maxBin / sh.cols) * sh.cols);
      html += '<div class="shelf' + (isT ? " target" : "") + '" style="--zone:' + pack.hex + '"><div class="shelf-label"><span class="zone-dot"></span>' +
        esc(SHELF_SHORT[sh.level]) + " · " + esc(sh.zone) + '</div><div class="bins" style="grid-template-columns:repeat(' + sh.cols + ',minmax(0,1fr))">';
      for (var b = 1; b <= nBins; b++) {
        var it = byBin[b], tgt = isT && o.target.bin === b;
        if (it) {
          var tag = o.clickable ? "button" : "div", isRx = !!o.rx[it.id];
          html += "<" + tag + ' class="bin' + (isRx ? " rx" : "") + (tgt ? (o.pulse ? " target" : " preview") : "") + '"' +
            (o.clickable ? ' data-act="bin" data-id="' + it.id + '"' : "") + ' title="' + esc(itemLabel(it)) + (isRx ? " (needs CMO approval)" : "") +
            '"><span class="bin-num">' + b + (isRx ? " 🔒" : "") + '</span><span class="bin-name">' + esc(shortName(it)) + "</span></" + tag + ">";
        } else {
          html += '<div class="bin empty"><span class="bin-num">' + b + "</span></div>";
        }
      }
      html += '</div><div class="strap"></div></div>';
    });
    return html + '</div><div class="locker-foot"></div></div>';
  }

  // ---------- import a plan from Earth ----------

  function viewImport() {
    var html = '<div class="screen-head"><button class="back" data-act="go-home" aria-label="Back">←</button><h2>Import from Earth</h2></div><div class="stack">';
    html += '<div class="hcard"><div class="hc-kicker">A plan from your flight surgeon</div>';
    if (ui.qrActive) {
      html += '<video id="qrVideo" class="qr-video" autoplay playsinline muted></video><div class="hc-actions"><button class="btn" data-act="qr-stop">Stop camera</button></div>';
    } else {
      html += '<div class="hc-actions"><button class="btn big" data-act="qr-start">📷 Scan QR</button></div>';
    }
    html += '<div class="or">or type the code</div><div class="code-row"><input id="rxCode" class="code-input" type="text" spellcheck="false" autocomplete="off" placeholder="RX1-…" value="' +
      esc(ui.rxCode) + '" data-bind="rxCode"><button class="btn primary" data-act="rx-check">Check</button></div>';
    if (ui.rxError) html += '<p class="error">' + esc(ui.rxError) + "</p>";
    html += "</div>";
    if (ui.rxPreview) {
      var p = ui.rxPreview;
      html += '<div class="hcard plan"><div class="hc-kicker">🌍 From Earth · starts ' + esc(fmtShort(p.start)) + "</div>";
      p.items.forEach(function (x) {
        var it = L.getItem(state, x.itemId);
        html += '<div class="plan-row"><div><b>' + esc(it.name) + '</b> <span class="muted">' + esc(it.strength) + '</span><div class="muted small">' + esc(doseText(it, x.units)) +
          " · " + esc(timesADay(x.perDay)) + " · " + x.days + " days</div></div></div>";
      });
      html += '<div class="hc-actions"><button class="btn primary big" data-act="rx-add">Add to my plan</button></div></div>';
    }
    return html + "</div>";
  }

  function checkRx() {
    ui.rxError = ""; ui.rxPreview = null;
    var res = L.decodeRx(state, ui.rxCode);
    if (res.error) { ui.rxError = res.error; return; }
    if (res.plan.patientId !== me) { ui.rxError = "This plan is for " + firstName(res.plan.patientId) + "."; return; }
    if (state.plans.some(function (p) { return p.code === res.plan.code; })) { ui.rxError = "Already added."; return; }
    ui.rxPreview = res.plan;
  }

  function addRx() {
    var p = Object.assign({ id: "P" + state.seq++, importedAt: now().toISOString() }, ui.rxPreview);
    state.plans.unshift(p);
    ui.rxPreview = null; ui.rxCode = ""; ui.screen = "main";
    save();
    toast("Plan added");
  }

  function qrStart() {
    ui.rxError = "";
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ui.rxError = "This device can't scan QR codes here. Type the code instead.";
      return;
    }
    try { qr.detector = new window.BarcodeDetector({ formats: ["qr_code"] }); } catch (e) {
      ui.rxError = "This device can't scan QR codes here. Type the code instead.";
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then(function (stream) {
      qr.stream = stream;
      ui.qrActive = true;
      render();
      qr.timer = setInterval(function () {
        var v = document.getElementById("qrVideo");
        if (!v || v.readyState < 2) return;
        qr.detector.detect(v).then(function (codes) {
          if (codes && codes.length) { qrStop(); ui.rxCode = codes[0].rawValue; checkRx(); render(); }
        }).catch(function () { /* keep trying */ });
      }, 400);
    }).catch(function () { ui.rxError = "No camera access. Type the code instead."; render(); });
  }
  function attachQr() {
    var v = document.getElementById("qrVideo");
    if (v && qr.stream && v.srcObject !== qr.stream) {
      v.srcObject = qr.stream;
      var pr = v.play && v.play();
      if (pr && pr.catch) pr.catch(function () { /* autoplay blocked */ });
    }
  }
  function qrStop() {
    clearInterval(qr.timer);
    qr.timer = null;
    if (qr.stream) qr.stream.getTracks().forEach(function (tr) { tr.stop(); });
    qr.stream = null;
    ui.qrActive = false;
  }

  // ---------- emergency ----------

  var CONDITION_SHORT = { "gi-bleed-risk": "bleeding risk", "hypertension": "high blood pressure" };

  // Risks of an emergency medicine for this patient. Never a hard block in an emergency:
  // "block" level risks need a second deliberate tap and are logged as an override.
  function emRisks(patientId, it) {
    if (it.kind === "equipment") return [];
    var sf = L.safetyChecks(state, patientId, it, it.doseUnits || 1, now()), name = firstName(patientId), out = [];
    sf.checks.forEach(function (c) {
      if (c.result === "pass") return;
      if (c.name === "Allergy") {
        out.push({ level: "block", short: "Allergy", text: c.msg.replace(crewName(patientId), name) });
      } else if (c.name === "Contraindication") {
        out.push({ level: "block", short: "Not safe", text: name + ": " + c.msg.replace("Not suitable with: ", "not safe with ").toLowerCase() });
      } else if (c.name === "Daily maximum") {
        out.push({ level: "block", short: "Daily limit", text: name + ": daily limit reached (" + c.msg + ")" });
      } else if (c.name === "Same class") {
        out.push({ level: c.result, short: "Recent dose", text: name + ": " + c.msg.charAt(0).toLowerCase() + c.msg.slice(1) });
      } else if (c.name === "Duplicate ingredient") {
        out.push({ level: "warn", short: "Same ingredient", text: name + ": " + c.msg.charAt(0).toLowerCase() + c.msg.slice(1) });
      }
    });
    return out;
  }

  function viewEmergency(t) {
    var em = ui.em;
    var html = '<div class="screen-head"><button class="back" data-act="go-home" aria-label="Back">←</button><h2 class="danger-text">Emergency</h2></div>';
    var kept = state.requests.filter(function (r) { return r.patientId === me && (r.status === "pending" || r.status === "approved"); }).length +
      myPlans().length + (ui.paused ? 1 : 0);
    if (kept) html += '<p class="kept">↩ Your requests and plans are kept. They\'re back when you leave this screen.</p>';
    html += '<div class="em-who"><span class="muted">Who needs help?</span>' + state.crew.map(function (c) {
      var tags = c.allergies.map(function (a) { return '<span class="who-tag">🚫 ' + esc(a) + "</span>"; }).join("") +
        c.conditions.map(function (x) { return '<span class="who-tag">⚠ ' + esc(CONDITION_SHORT[x] || x) + "</span>"; }).join("");
      return '<button class="who' + (em.patientId === c.id ? " sel" : "") + '" data-act="em-who" data-id="' + c.id + '">' + esc(firstName(c.id)) + (c.id === me ? " (me)" : "") + tags + "</button>";
    }).join("") + "</div>";
    html += '<div class="tiles">' + state.items.filter(function (it) { return it.tier === "4"; }).map(function (it) {
      var s = L.stock(state, it, t), risks = emRisks(em.patientId, it), block = risks.some(function (r) { return r.level === "block"; });
      return '<button class="tile em' + (em.itemId === it.id ? " sel" : "") + (risks.length ? " risk" : "") + '" data-act="em-item" data-id="' + it.id + '"><span class="tile-name">' + esc(it.name) +
        '</span><span class="tile-use">' + (it.kind === "equipment" ? "Equipment" : esc(it.strength) + " · " + s.usable + " left") + "</span>" +
        (risks.length ? '<span class="tile-risk' + (block ? " block" : "") + '">⚠ ' + esc(risks[0].short) + "</span>" : "") + "</button>";
    }).join("") + "</div>";
    if (em.itemId) {
      var it = L.getItem(state, em.itemId), risks = emRisks(em.patientId, it), block = risks.some(function (r) { return r.level === "block"; });
      if (risks.length) {
        html += '<div class="em-warn' + (block ? " block" : "") + '"><b>⚠ ' + (block ? "Warning" : "Check") + "</b>" +
          risks.map(function (r) { return "<div>" + esc(r.text) + "</div>"; }).join("") +
          (block ? '<div class="em-warn-note">Only give it if there is no other option. It will be logged for the CMO and ground.</div>' : "") + "</div>";
      }
      html += '<div class="em-go">' + (it.kind === "equipment"
        ? '<button class="btn danger big" data-act="em-locate">Show me</button>'
        : '<input id="emReason" type="text" placeholder="What happened? (optional)" value="' + esc(em.reason) + '" data-bind="em.reason">' +
          '<button class="btn danger big' + (em.confirm ? " confirm" : "") + '" data-act="em-release">' +
          (block ? (em.confirm ? "Tap again to give anyway" : "Give anyway") : "Release now") + "</button>") + "</div>";
    }
    return html;
  }

  function emergencyRelease() {
    var em = ui.em, t = now(), it = L.getItem(state, em.itemId), qty = it.doseUnits || 1;
    var overrides = emRisks(em.patientId, it).filter(function (r) { return r.level === "block"; }).map(function (r) { return r.text; });
    if (overrides.length && !em.confirm) { em.confirm = true; return; }
    var lot = L.pickLot(state, it, qty, t).lot || L.fefoLots(state, it).filter(function (l) { return l.qty >= qty; })[0];
    if (!lot) { toast("None left."); return; }
    startFlow({
      emergency: true, patientId: em.patientId, itemId: it.id, qty: qty, lotId: lot.id, authType: "break-glass", signedBy: [me],
      reason: String(em.reason || "").trim() || "Emergency", override: overrides.length ? overrides : null
    });
    ui.em = null;
  }

  // ---------- stock (CMO) ----------

  function filteredItems(t) {
    var f = ui.filters, q = (f.q || "").toLowerCase();
    return state.items.filter(function (it) {
      if (f.pack && it.packId !== f.pack) return false;
      if (f.tier && it.tier !== f.tier) return false;
      if (q && (it.name + " " + it.strength + " " + it.form + " " + it.id).toLowerCase().indexOf(q) < 0) return false;
      if (f.flag) {
        var flags = L.itemFlags(state, it, t);
        if (flags.indexOf(f.flag) < 0 && !(f.flag === "below-reserve" && flags.indexOf("empty") >= 0)) return false;
      }
      return true;
    });
  }

  function viewStock() {
    var t = now(), a = L.alerts(state, t), m = L.missionInfo(state, t);
    var html = '<div class="mission-line"><b>' + esc(state.mission.name) + "</b> · Day " + m.day + " of " + m.total + " · " + m.daysLeft + " days left · Signal delay " +
      state.mission.commDelayMin + " min</div>";
    html += '<section class="alerts" aria-label="Alerts">';
    [
      ["expired", a.expired.length, "Items with an expired lot", "bad"],
      ["potency-risk", a.potencyRisk.length, "Potency at risk", "warn"],
      ["shortfall", a.shortfall.length, "Run out before mission end", "warn"],
      ["below-reserve", a.belowReserve.length, "Below reserve or empty", "warn"],
      ["before-end", a.beforeEnd.length, "Have lots expiring before mission end", "info"]
    ].forEach(function (c) {
      html += '<button class="alert-card ' + c[3] + (ui.filters.flag === c[0] ? " active" : "") + (c[1] ? "" : " zero") + '" data-act="filter-flag" data-flag="' + c[0] +
        '"><span class="n">' + c[1] + "</span><span>" + c[2] + "</span></button>";
    });
    html += "</section>";
    var f = ui.filters;
    function opt(v, label, cur) { return '<option value="' + v + '"' + (cur === v ? " selected" : "") + ">" + esc(label) + "</option>"; }
    html += '<section class="toolbar"><input id="q" type="search" placeholder="Search items" aria-label="Search items" value="' + esc(f.q) + '" data-bind="filters.q" data-live>' +
      '<select id="fPack" aria-label="Pack" data-bind="filters.pack" data-rerender>' + opt("", "All packs", f.pack) +
      state.packs.map(function (p) { return opt(p.id, p.colour + " · " + p.name, f.pack); }).join("") + "</select>" +
      '<select id="fTier" aria-label="Tier" data-bind="filters.tier" data-rerender>' + opt("", "All tiers", f.tier) +
      ["S", "1", "2", "3", "4"].map(function (k) { return opt(k, TIER[k].label, f.tier); }).join("") + "</select>" +
      '<select id="fFlag" aria-label="Status" data-bind="filters.flag" data-rerender>' + opt("", "Any status", f.flag) +
      Object.keys(FLAG).map(function (k) { return opt(k, FLAG[k].label, f.flag); }).join("") + "</select>" +
      (f.q || f.pack || f.tier || f.flag ? '<button class="btn small" data-act="clear-filters">Clear</button>' : "") + "</section>";
    var rows = filteredItems(t);
    html += '<div class="table-wrap"><table class="inv"><thead><tr><th>Item</th><th>Where</th><th>Tier</th><th>Usable / reserve</th><th>Lasts</th><th>Next expiry</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (it) { html += itemRow(it, t); });
    if (!rows.length) html += '<tr><td colspan="7" class="muted">No items match.</td></tr>';
    return html + "</tbody></table></div>";
  }

  function itemRow(it, t) {
    var s = L.stock(state, it, t), flags = L.itemFlags(state, it, t), nx = L.nextExpiry(state, it), loc = L.locationOf(state, it);
    var stockCell, covCell;
    if (it.kind === "equipment") {
      stockCell = s.onHand + " unit" + (s.onHand === 1 ? "" : "s");
      covCell = '<span class="muted">Equipment</span>';
    } else {
      var max = Math.max(s.usable, it.reserve * 2, 1);
      stockCell = '<div class="stock"><b>' + s.usable + '</b> <span class="muted">/ ' + it.reserve + '</span></div><div class="bar"><span class="' +
        (s.usable < it.reserve ? "warn" : "ok") + '" style="width:' + Math.min(100, s.usable / max * 100) + '%"></span>' +
        (it.reserve ? '<i style="left:' + Math.min(100, it.reserve / max * 100) + '%" title="Reserve"></i>' : "") + "</div>";
      var cov = L.coverage(state, it, t);
      if (cov.rate.perDay <= 0) covCell = '<span class="muted">No regular use</span>';
      else {
        covCell = "<div>" + (cov.limitedBy ? cov.days + " of " + cov.daysLeft + " days" : "Whole mission") + (cov.expiryGap ? ' <span class="muted small">(lots expire)</span>' : "") +
          '</div><div class="bar"><span class="' + (cov.shortfall ? "warn" : cov.expiryGap ? "info" : "ok") + '" style="width:' + Math.min(100, cov.days / Math.max(cov.daysLeft, 1) * 100) + '%"></span></div>';
      }
    }
    return '<tr data-act="open-item" data-id="' + it.id + '" tabindex="0"><td><b>' + esc(it.name) + '</b> <span class="muted">' + esc(it.strength) + '</span><div class="sub">' + esc(it.form) +
      (it.ownerCrewId ? " · for " + esc(crewName(it.ownerCrewId)) : "") + "</div></td><td>" + packChip(it.packId) + '<div class="sub">L' + esc(loc.locker.label) + " · " +
      esc(SHELF_SHORT[loc.shelf.level]) + " · bin " + esc(loc.bin) + "</div></td><td>" + tierBadge(it.tier, it.controlled) + "</td><td>" + stockCell + "</td><td>" + covCell + "</td><td>" +
      (nx ? fmtDate(nx.expiry) : '<span class="muted">–</span>') + "</td><td>" + (flags.length ? flagTags(flags) : '<span class="tag ok">OK</span>') + "</td></tr>";
  }

  // ---------- item drawer ----------

  function renderDrawer() {
    var d = document.getElementById("drawer"), bd = document.getElementById("backdrop");
    var it = ui.drawerItemId ? L.getItem(state, ui.drawerItemId) : null;
    if (!it) { ui.drawerItemId = null; d.hidden = true; bd.hidden = true; d.innerHTML = ""; return; }
    var t = now(), s = L.stock(state, it, t), loc = L.locationOf(state, it), flags = L.itemFlags(state, it, t);
    var html = '<div class="drawer-head"><div><h2>' + esc(it.name) + ' <span class="muted">' + esc(it.strength) + "</span></h2><div>" + tierBadge(it.tier, it.controlled) + " " +
      packChip(it.packId, true) + '</div></div><button class="icon" data-act="close-drawer" aria-label="Close">×</button></div>';
    html += '<div class="where">' + whereChips(loc) + "</div>";
    if (flags.length) html += "<p>" + flagTags(flags) + "</p>";
    if (it.ownerCrewId) html += '<p class="note">For ' + esc(crewName(it.ownerCrewId)) + " only.</p>";
    if (it.notes) html += '<p class="note">' + esc(it.notes) + "</p>";
    if (it.kind !== "equipment") {
      var cov = L.coverage(state, it, t);
      html += '<div class="stats">' + stat(s.usable, "Usable") + stat(it.reserve, "Reserve") + stat(L.unitsUsed(state, it.id, 30 * L.DAY_MS, t), "Used, 30 days") +
        stat(cov.rate.perDay > 0 ? (cov.limitedBy ? cov.days + " d" : "Whole mission") : "–", "Lasts" + (cov.limitedBy ? " (" + cov.limitedBy + ")" : "")) +
        stat(cov.waste, "Will expire unused") + "</div>";
    }
    html += '<h3>Lots</h3><div class="table-wrap"><table><thead><tr><th>Lot</th><th>Qty</th><th>Expiry</th><th>Planning expiry</th><th>Status</th></tr></thead><tbody>';
    L.fefoLots(state, it).forEach(function (l) {
      var pe = L.planningExpiry(state, it, l);
      html += "<tr><td>" + esc(l.lotNumber) + "</td><td>" + l.qty + "</td><td>" + fmtDate(l.expiry) + "</td><td>" + (pe ? fmtDate(pe) : "–") + "</td><td>" + lotTag(L.lotStatus(state, it, l, t)) + "</td></tr>";
    });
    html += '</tbody></table></div><div class="actions"><button class="btn" data-act="locate-item" data-id="' + it.id + '">Show in locker</button></div>';
    d.innerHTML = html;
    d.hidden = false;
    bd.hidden = false;
  }
  function stat(v, label) { return '<div class="stat"><b>' + esc(v) + "</b><span>" + esc(label) + "</span></div>"; }

  // ---------- approvals (CMO's screen) ----------

  function requestGate(r) { return r.gate || (r.tier === "3" ? "cmo+witness" : "cmo"); }
  function approverOptions(patientId) { return state.crew.filter(function (c) { return (c.isCMO || c.isBackupCMO) && c.id !== patientId; }); }

  function sigFields(path, label, options, cur, idp) {
    cur = cur || {};
    return '<div class="sig"><span class="sig-label">' + esc(label) + '</span><select id="' + idp + '-who" data-bind="' + path + '.crewId"><option value="">Choose…</option>' +
      options.map(function (c) { return '<option value="' + c.id + '"' + (cur.crewId === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") +
      '</select><input id="' + idp + '-pin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="PIN" value="' + esc(cur.pin || "") + '" data-bind="' + path + '.pin"></div>';
  }

  function requestCard(r, t) {
    var it = L.getItem(state, r.itemId), gate = requestGate(r);
    var approver = r.signatures.filter(function (s) { return s.role !== "Witness"; })[0];
    var need = !approver ? "approver" : "witness";
    var sf = L.safetyChecks(state, r.patientId, it, r.qty, t);
    var f = ui.appr[r.id] || {};
    var html = '<div class="card"><div class="row-between"><div><b>' + r.qty + " × " + esc(itemLabel(it)) + "</b> " + tierBadge(it.tier, it.controlled) + '</div><span class="muted small">' +
      ago(r.time) + "</span></div><div>For <b>" + esc(crewName(r.patientId)) + "</b>: " + esc(r.reason) + "</div>";
    html += '<div class="muted small">Needs ' + esc(AUTH[gate]) + ". Signed: " + (r.signatures.length ? r.signatures.map(function (s) {
      return esc(crewName(s.crewId)) + " (" + esc(s.role) + ")";
    }).join(", ") : "nobody yet") + "</div>";
    html += '<div class="small">Checks: ' + resultBadge(sf.result) + " " + esc(sf.checks.filter(function (c) { return c.result !== "pass"; }).map(function (c) { return c.name + ": " + c.msg; }).join("; ")) + "</div>";
    html += sigFields("appr." + r.id, need === "approver" ? "Approver (CMO or backup)" : "Witness", need === "approver" ? approverOptions(r.patientId) : state.crew, f, "ap-" + r.id);
    if (need === "approver") {
      if (sf.result === "block") html += '<label class="check"><input id="ack-' + r.id + '" type="checkbox" data-bind="appr.' + r.id + '.ack"' + (f.ack ? " checked" : "") + "> I reviewed the blocked checks</label>";
      var c = cmo();
      if (c && c.id !== r.patientId) html += '<label class="check"><input id="un-' + r.id + '" type="checkbox" data-bind="appr.' + r.id + '.cmoUnavailable"' + (f.cmoUnavailable ? " checked" : "") + "> " + esc(c.name) + " is unavailable</label>";
    }
    if (f.error) html += '<p class="error">' + esc(f.error) + "</p>";
    return html + '<div class="actions"><button class="btn" data-act="appr-deny" data-id="' + r.id + '">Deny</button><button class="btn primary" data-act="appr-sign" data-id="' + r.id + '">Sign as ' + need + "</button></div></div>";
  }

  function entrySummary(e) {
    var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null;
    return "<b>" + e.qty + " × " + esc(itemLabel(it)) + "</b> for " + esc(crewName(e.patientId)) + ' <span class="muted small">' + fmtTime(e.time) + (lot ? " · lot " + esc(lot.lotNumber) : "") +
      " · " + esc(AUTH[e.auth.type]) + (e.auth.signedBy.length ? " (" + e.auth.signedBy.map(crewName).map(esc).join(", ") + ")" : "") + "</span>" +
      (e.override ? '<div class="error small">⚠ Given despite: ' + esc(e.override.join("; ")) + "</div>" : "");
  }

  function viewApprovals() {
    var t = now(), a = L.alerts(state, t);
    var html = "<h2>Approvals</h2>";
    if (a.urgentReports.length) {
      html += "<h3>Urgent symptoms</h3>";
      a.urgentReports.forEach(function (r) {
        html += '<div class="card urgent-card"><div class="row-between"><b>' + esc(crewName(r.crewId)) + '</b><span class="muted small">' + ago(r.time) + "</span></div><div>" +
          esc(L.redFlags(state, r).join(" · ")) + '</div><div class="actions"><button class="btn" data-act="report-seen" data-id="' + esc(r.id) + '">Seen</button></div></div>';
      });
    }
    html += "<h3>Waiting for you (" + a.pending.length + ")</h3>";
    if (!a.pending.length) html += '<p class="muted">Nothing waiting.</p>';
    a.pending.forEach(function (r) { html += requestCard(r, t); });
    if (a.pending.length) html += '<p class="hint">Demo PINs: ' + state.crew.map(function (c) { return esc(firstName(c.id)) + " " + c.pin; }).join(", ") + "</p>";
    if (a.awaitingPickup.length) {
      html += "<h3>Approved, waiting for pickup</h3>";
      a.awaitingPickup.forEach(function (r) {
        html += '<div class="report"><div>' + r.qty + " × " + esc(itemLabel(L.getItem(state, r.itemId))) + " for " + esc(crewName(r.patientId)) + '</div><span class="tag ok">Approved</span></div>';
      });
    }
    if (state.plans.length) {
      html += "<h3>Plans from Earth</h3>";
      state.plans.forEach(function (p) {
        html += '<div class="report"><div><b>' + esc(crewName(p.patientId)) + "</b> · " + p.items.map(function (x) {
          var it = L.getItem(state, x.itemId);
          return esc(it.name) + " " + x.units + "×" + x.perDay + "/day, " + x.days + " d";
        }).join("; ") + '</div><span class="muted small">' + esc(p.code) + "</span></div>";
      });
    }
    html += "<h3>Emergency notes due (" + a.docsDue.length + ")</h3>";
    if (!a.docsDue.length) html += '<p class="muted">None.</p>';
    a.docsDue.forEach(function (e) {
      html += '<div class="card"><div>' + entrySummary(e) + '</div><div class="small ' + (new Date(e.docsDue) < t ? "error" : "muted") + '">Due ' + fmtTime(e.docsDue) + "</div>" +
        '<textarea id="doc-' + e.id + '" rows="3" placeholder="What happened, what was given, how the patient responded" data-bind="docs.' + e.id + '">' + esc(ui.docs[e.id] || "") +
        '</textarea><div class="actions"><button class="btn primary" data-act="doc-save" data-id="' + e.id + '">Save</button></div></div>';
    });
    html += "<h3>Count mismatches (" + a.countIssues.length + ")</h3>";
    if (!a.countIssues.length) html += '<p class="muted">None.</p>';
    a.countIssues.forEach(function (e) {
      html += '<div class="card"><div>' + entrySummary(e) + '</div><div class="error small">Expected ' + e.countCheck.expected + ", counted " + e.countCheck.counted + '.</div><div class="form-row">' +
        '<input id="cnt-' + e.id + '" type="text" placeholder="What you found" value="' + esc(ui.notes["cnt-" + e.id] || "") + '" data-bind="notes.cnt-' + e.id + '">' +
        '<button class="btn" data-act="count-resolve" data-id="' + e.id + '">Resolved</button></div></div>';
    });
    html += "<h3>Ground review (" + a.groundReview.length + ')</h3><p class="muted small">Answers arrive after the signal delay (' + state.mission.commDelayMin + " min each way).</p>";
    a.groundReview.forEach(function (e) {
      html += '<div class="report"><div>' + entrySummary(e) + '</div><button class="btn small" data-act="ground-done" data-id="' + e.id + '">Mark reviewed</button></div>';
    });
    return html;
  }

  function findRequest(id) { return state.requests.filter(function (r) { return r.id === id; })[0]; }
  function findEntry(id) { return state.doseLog.filter(function (e) { return e.id === id; })[0]; }

  function signRequest(id) {
    var r = findRequest(id), f = ui.appr[id] || (ui.appr[id] = {}), gate = requestGate(r);
    var approver = r.signatures.filter(function (s) { return s.role !== "Witness"; })[0];
    var role = !approver ? "approver" : "witness";
    var it = L.getItem(state, r.itemId), sf = L.safetyChecks(state, r.patientId, it, r.qty, now());
    var ctx = { patientId: r.patientId, approverId: approver ? approver.crewId : f.crewId, cmoUnavailable: !!f.cmoUnavailable };
    var err = role === "approver" && sf.result === "block" && !f.ack ? "Review the blocked checks first." : null;
    err = err || L.checkSignature(state, role, f.crewId, f.pin || "", ctx);
    if (err) { f.error = err; return; }
    var c = L.getCrew(state, f.crewId);
    r.signatures.push({ crewId: c.id, role: role === "approver" ? (c.isCMO ? "CMO" : "Backup CMO") : "Witness", time: now().toISOString() });
    var complete = gate === "cmo" || r.signatures.some(function (s) { return s.role === "Witness"; });
    if (complete) r.status = "approved";
    ui.appr[id] = {};
    save();
    toast(complete ? "Approved. " + firstName(r.patientId) + " can pick it up." : "Signed. A witness signs next.");
  }

  // ---------- dose log (CMO) ----------

  function viewLog() {
    var entries = state.doseLog.filter(function (e) { return !ui.logPatient || e.patientId === ui.logPatient; });
    var html = '<div class="row-between"><h2>Dose log</h2><div class="toolbar"><select id="logPatient" aria-label="Crew member" data-bind="logPatient" data-rerender><option value="">Everyone</option>' +
      state.crew.map(function (c) { return '<option value="' + c.id + '"' + (ui.logPatient === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") +
      '</select><button class="btn" data-act="export">Export JSON</button></div></div>';
    html += '<div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>What</th><th>Why</th><th>Authorised</th><th>Review</th><th>Helped?</th></tr></thead><tbody>';
    entries.forEach(function (e) { html += logRow(e); });
    if (!entries.length) html += '<tr><td colspan="7" class="muted">No entries.</td></tr>';
    return html + "</tbody></table></div>";
  }

  function logRow(e) {
    var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null, review = "";
    if (e.override) review += '<span class="tag bad" title="' + esc(e.override.join("; ")) + '">⚠ Given despite warning</span>';
    if (e.auth.type === "break-glass" && !e.documentation) review += '<span class="tag bad">Note due</span>';
    if (e.countCheck && e.countCheck.counted !== e.countCheck.expected) review += '<span class="tag ' + (e.countCheck.resolved ? "muted" : "bad") + '">Count mismatch</span>';
    if (e.scanSkipped) review += '<span class="tag warn">Scan skipped</span>';
    if (e.groundReview === "pending") review += '<span class="tag info">Ground review</span>';
    if (e.groundReview === "done") review += '<span class="tag ok">Ground reviewed</span>';
    var fu = it.kind !== "medication" ? '<span class="muted">–</span>' : e.followUp
      ? '<span class="tag ' + (e.followUp.effective ? "ok" : "warn") + '">' + (e.followUp.effective ? "Yes" : "No") + "</span>" + (e.followUp.sideEffects ? '<div class="small">' + esc(e.followUp.sideEffects) + "</div>" : "")
      : '<span class="muted">' + (e.planId ? "Plan" : "Not yet") + "</span>";
    return "<tr><td>" + fmtTime(e.time) + "</td><td>" + esc(crewName(e.patientId)) + "</td><td>" + e.qty + " × " + esc(itemLabel(it)) + (lot ? '<div class="sub">lot ' + esc(lot.lotNumber) + "</div>" : "") +
      "</td><td>" + esc(e.reason) + "</td><td>" + esc(AUTH[e.auth.type]) + (e.auth.signedBy.length ? '<div class="sub">' + e.auth.signedBy.map(crewName).map(esc).join(", ") + "</div>" : "") +
      "</td><td>" + (review || '<span class="muted">–</span>') + "</td><td>" + fu + "</td></tr>";
  }

  function exportLog() {
    var data = {
      type: "dose-log-export", exportedAt: now().toISOString(), mission: state.mission.name,
      entries: state.doseLog.map(function (e) {
        var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null;
        return Object.assign({}, e, { patient: crewName(e.patientId), item: itemLabel(it), lot: lot ? lot.lotNumber : null });
      })
    };
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url; a.download = "dose-log.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- symptom reports from the symptom page ----------

  function receiveSymptomReport(report) {
    var err = L.validateReport(state, report);
    if (!err && report.crewId !== me) err = "This report is for another crew member";
    if (err) { toast("Report not accepted: " + err); render(); return { ok: false, error: err }; }
    var r = JSON.parse(JSON.stringify(report));
    r.id = "S" + state.seq++;
    r.time = r.time || now().toISOString();
    r.handled = false;
    state.reports.unshift(r);
    save();
    if (!ui.flow) { ui.view = "home"; ui.screen = "main"; }
    render();
    return { ok: true };
  }

  // ---------- toast ----------

  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3000);
  }

  // ---------- actions ----------

  var actions = {
    nav: function (d) { ui.view = d.view; ui.drawerItemId = null; if (d.view === "home" && !ui.flow) ui.screen = "main"; },
    reset: function () { reset(); },
    "demo-symptoms": function (d) {
      var s = state.demoSymptoms[Number(d.idx)];
      receiveSymptomReport({ type: "symptom-report", version: 1, crewId: me, time: now().toISOString(), symptoms: s.symptoms, vitals: s.vitals });
    },
    "demo-code": function () {
      ui.view = "home"; ui.flow = null; ui.screen = "import";
      ui.rxCode = L.encodeRx(state, me, now(), state.demoPlan);
      ui.rxPreview = null; ui.rxError = "";
    },
    "go-home": function () { ui.view = "home"; ui.screen = "main"; ui.pick = null; ui.em = null; },
    "go-request": function () { ui.view = "home"; ui.screen = "request"; ui.pick = null; },
    "go-import": function () { ui.view = "home"; ui.screen = "import"; ui.rxError = ""; ui.rxPreview = null; },
    pick: function (d) { ui.pick = { itemId: d.id, reportId: d.report || null }; ui.screen = "confirm"; },
    bin: function (d) {
      var it = L.getItem(state, d.id);
      if (canRequest(it)) { ui.view = "home"; ui.pick = { itemId: it.id, reportId: null }; ui.screen = "confirm"; ui.lockerFocus = null; }
      else ui.drawerItemId = it.id;
    },
    take: function (d) { startTake(d.id, d.report || null); },
    ask: function (d) { askCmo(d.id, d.report || null); },
    pickup: function (d) { pickup(d.id); },
    seen: function (d) { findRequest(d.id).seen = true; save(); },
    "plan-take": function (d) { planTake(d.id, Number(d.idx)); },
    "plan-seen": function (d) { var p = state.plans.filter(function (x) { return x.id === d.id; })[0]; if (p) { p.doneSeen = true; save(); } },
    "rx-check": function () { checkRx(); },
    "rx-add": function () { addRx(); },
    "qr-start": function () { qrStart(); },
    "qr-stop": function () { qrStop(); },
    "dismiss-report": function () { var r = activeReport(); if (r) { r.handled = true; save(); } },
    fu: function (d) {
      var e = findEntry(d.id);
      e.followUp = { effective: d.eff === "1", sideEffects: "", time: now().toISOString() };
      if (e.patientId === me) {
        var p = player();
        p.xp += XP.followUp; p.followUps++; p.streak++;
        var got = [];
        if (p.followUps >= 5) unlock(p, "good-reporter", got);
        toast("+" + XP.followUp + " XP · 🔥 " + p.streak + (got.length ? " · New badge: " + BADGES[got[0]].label : ""));
      }
      save();
    },
    "scan-ok": function () { doScan(L.getLot(state, ui.flow.lotId).tag); },
    "scan-wrong": function () {
      var it = L.getItem(state, ui.flow.itemId);
      var other = state.items.filter(function (x) { return x.shelfId === it.shelfId && x.id !== it.id; })[0] || state.items.filter(function (x) { return x.id !== it.id; })[0];
      doScan(L.lotsOf(state, other.id)[0].tag);
    },
    "scan-skip": function () { ui.flow.scanSkipped = true; ui.flow.error = ""; afterScan(); },
    "count-done": function () {
      var f = ui.flow, lot = L.getLot(state, f.lotId);
      if (f.count === "" || f.count == null || isNaN(Number(f.count))) { f.error = "Type a number."; return; }
      complete({ countCheck: { expected: lot.qty - f.qty, counted: Number(f.count), by: counterOf(f) } });
    },
    "flow-close": function () { ui.flow = null; ui.screen = "main"; },
    emergency: function () {
      // Pause a normal retrieval instead of dropping it; it can be resumed afterwards
      if (ui.flow && !ui.flow.emergency && (ui.flow.step === "locate" || ui.flow.step === "count")) ui.paused = ui.flow;
      ui.view = "home"; ui.flow = null; ui.drawerItemId = null; ui.screen = "emergency"; ui.em = { patientId: me, itemId: null, reason: "", confirm: false };
    },
    resume: function () { if (ui.paused) { ui.flow = ui.paused; ui.flow.start = Date.now(); ui.flow.error = ""; ui.paused = null; ui.screen = "main"; } },
    "drop-paused": function () { ui.paused = null; },
    "em-who": function (d) { ui.em.patientId = d.id; ui.em.confirm = false; },
    "em-item": function (d) { ui.em.itemId = d.id; ui.em.confirm = false; },
    "em-release": function () { emergencyRelease(); },
    "em-locate": function () {
      var it = L.getItem(state, ui.em.itemId), lot = L.lotsOf(state, it.id)[0];
      startFlow({ locateOnly: true, emergency: true, patientId: ui.em.patientId, itemId: it.id, qty: 1, lotId: lot ? lot.id : null });
      ui.em = null;
    },
    "open-item": function (d) { ui.drawerItemId = d.id; },
    "close-drawer": function () { ui.drawerItemId = null; },
    "locate-item": function (d) { ui.lockerFocus = d.id; ui.view = "home"; ui.drawerItemId = null; },
    "locker-clear": function () { ui.lockerFocus = null; },
    "filter-flag": function (d) { ui.filters.flag = ui.filters.flag === d.flag ? "" : d.flag; },
    "clear-filters": function () { ui.filters = { q: "", pack: "", tier: "", flag: "" }; },
    "appr-sign": function (d) { signRequest(d.id); },
    "appr-deny": function (d) { findRequest(d.id).status = "denied"; save(); toast("Denied"); },
    "report-seen": function (d) { var r = state.reports.filter(function (x) { return x.id === d.id; })[0]; if (r) r.cmoSeen = true; save(); },
    "doc-save": function (d) {
      var e = findEntry(d.id), text = String(ui.docs[d.id] || "").trim();
      if (!text) { toast("Write what happened first."); return; }
      e.documentation = text; e.documentedAt = now().toISOString(); delete ui.docs[d.id]; save(); toast("Saved");
    },
    "count-resolve": function (d) {
      var e = findEntry(d.id);
      e.countCheck.resolved = true; e.countCheck.note = String(ui.notes["cnt-" + d.id] || "").trim(); save();
    },
    "ground-done": function (d) { findEntry(d.id).groundReview = "done"; save(); },
    "export": function () { exportLog(); }
  };

  // ---------- events ----------

  function setPath(root, path, value) {
    var parts = path.split("."), o = root;
    for (var i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null) o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = value;
  }
  function bindValue(t) { return t.type === "checkbox" ? t.checked : t.value; }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!t || t.disabled) return;
    var name = t.getAttribute("data-act"), fn = actions[name];
    if (!fn) return;
    var d = {};
    for (var i = 0; i < t.attributes.length; i++) {
      var a = t.attributes[i];
      if (a.name.indexOf("data-") === 0) d[a.name.slice(5)] = a.value;
    }
    var before = ui.view + ui.screen + (ui.flow ? ui.flow.step : "");
    fn(d, t, e);
    render();
    if (before !== ui.view + ui.screen + (ui.flow ? ui.flow.step : "")) window.scrollTo(0, 0);
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t.getAttribute || !t.getAttribute("data-bind")) return;
    setPath(ui, t.getAttribute("data-bind"), bindValue(t));
    if (t.hasAttribute("data-live")) render();
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t.getAttribute || !t.getAttribute("data-bind")) return;
    setPath(ui, t.getAttribute("data-bind"), bindValue(t));
    if (t.hasAttribute("data-rerender")) render();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && ui.drawerItemId) { ui.drawerItemId = null; render(); return; }
    if (e.key !== "Enter") return;
    var t = e.target;
    if (t.id === "countInput") { e.preventDefault(); setPath(ui, "flow.count", t.value); actions["count-done"](); render(); return; }
    if (t.id === "rxCode") { e.preventDefault(); ui.rxCode = t.value; checkRx(); render(); return; }
    if (t.tagName === "TR" && t.getAttribute("data-act")) { e.preventDefault(); t.click(); }
  });

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "symptom-report") receiveSymptomReport(e.data);
  });

  setInterval(updateTimer, 1000);

  // Public API for the other pieces of the team's app
  window.MedInventory = {
    receiveSymptomReport: receiveSymptomReport,
    currentUser: function () { return me; },
    makePlanCode: function (patientId, startDate, items) { return L.encodeRx(state, patientId, startDate, items); },
    getState: function () { return state; },
    reset: function () { reset(); render(); }
  };

  load();
  resolveUser();
  render();
})();
