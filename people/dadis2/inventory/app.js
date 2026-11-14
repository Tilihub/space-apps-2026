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
  var STORE_KEY = "medInventory.v4";
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
    grant: "Grant",
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
    if (id === "ground" || id === L.EARTH) return "Flight surgeon (Earth)";
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
    // needsCmo: needs approval (from the onboard doctor, or from Earth for controlled medicines)
    return { item: it, qty: qty, safety: sf, gate: gate, needsCmo: gate.type === "cmo" || gate.type === "earth", needsEarth: gate.type === "earth" };
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
      if (ui.flow.kind === "collect") {
        focus = { targets: ui.flow.items.map(function (x) { return { itemId: x.itemId, done: x.done }; }), pulse: ui.flow.step === "locate" };
      } else if (ui.flow.itemId) focus = { itemId: ui.flow.itemId, pulse: ui.flow.step === "locate" };
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
    cards += grantCards(t);
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

  function myGrants() { return state.grants.filter(function (g) { return g.patientId === me; }); }
  function issuerLabel(g) { return g.issuerId === L.EARTH ? "🌍 From Earth" : "🩺 From " + firstName(g.issuerId) + " (doctor)"; }

  // One card per grant (from Earth or the onboard doctor). At each dose time, "Collect now" opens all
  // of its due compartments together.
  function grantCards(t) {
    return myGrants().map(function (p) {
      if (p.status === "revoked") {
        if (p.doneSeen) return "";
        return '<div class="hcard"><div class="hc-kicker">' + issuerLabel(p) + '</div><div class="hc-title">Cancelled</div><div class="hc-sub">' +
          esc(p.items.map(function (x) { return L.getItem(state, x.itemId).name; }).join(", ")) + " · by " + esc(firstName(p.revokedBy)) + "</div>" +
          '<div class="hc-actions"><button class="link" data-act="grant-seen" data-id="' + p.id + '">OK</button></div></div>';
      }
      var sts = p.items.map(function (x, i) { return L.grantItemStatus(state, p, i, t); });
      if (sts.every(function (s) { return s.state === "replaced"; })) return ""; // fully replaced by a newer grant
      if (sts.every(function (s) { return s.state === "finished" || s.state === "replaced"; })) {
        if (p.doneSeen) return "";
        return '<div class="hcard plan"><div class="hc-kicker">' + issuerLabel(p) + '</div><div class="hc-title">Course complete</div>' +
          '<div class="hc-actions"><button class="link" data-act="grant-seen" data-id="' + p.id + '">OK</button></div></div>';
      }
      var total = 0, taken = 0, maxDays = 0, due = collectable(p, t);
      sts.forEach(function (s) { if (s.state !== "replaced") { total += s.total; taken += Math.min(s.taken, s.total); maxDays = Math.max(maxDays, s.days); } });
      var day = sts[0].day;
      var html = '<div class="hcard plan"><div class="hc-kicker">' + issuerLabel(p) + " · " + (day < 1 ? "starts " + esc(fmtShort(p.start)) : "day " + Math.min(day, maxDays) + " of " + maxDays) +
        "</div>";
      p.items.forEach(function (x, i) {
        var it = L.getItem(state, x.itemId), s = sts[i], action, hold = s.state === "due" ? doseHold(it, x.units, t) : "";
        if (s.state === "replaced") action = '<span class="plan-next">Replaced</span>';
        else if (hold) action = '<span class="plan-next hold">' + esc(hold) + "</span>";
        else if (s.state === "due") action = '<span class="plan-next due">Due now</span>';
        else if (s.state === "later") action = '<span class="plan-next">Next ' + pad(s.nextHour) + ":00</span>";
        else if (s.state === "done-today") action = '<span class="plan-next ok">✓ Today</span>';
        else if (s.state === "finished") action = '<span class="plan-next ok">✓ Done</span>';
        else action = '<span class="plan-next">' + esc(fmtShort(p.start)) + "</span>";
        var dots = s.state === "finished" || s.state === "not-started" || s.state === "replaced" ? "" : '<span class="dots">' + s.slots.map(function (h, k) {
          return '<i class="' + (k < s.today ? "on" : "") + '" title="' + pad(h) + ':00"></i>';
        }).join("") + "</span>";
        html += '<div class="plan-row"><div><b>' + esc(it.name) + '</b><div class="muted small">' + esc(doseText(it, x.units)) + " · " + esc(timesADay(x.perDay)) + " · " +
          x.days + (x.days === 1 ? " day" : " days") + "</div>" + dots + "</div>" + action + "</div>";
      });
      html += '<div class="bar plan-bar"><span class="ok" style="width:' + (total ? Math.round(taken / total * 100) : 0) + '%"></span></div>';
      if (due.length) {
        html += '<div class="hc-actions"><button class="btn primary big" data-act="collect" data-id="' + p.id + '">Collect now' +
          (due.length > 1 ? " (" + due.length + " bins)" : "") + "</button></div>";
      }
      return html + "</div>";
    }).join("");
  }

  // A due dose that safety checks hold back (allergy, daily limit counting every source, too close to
  // another dose). Shown on the card instead of "Due now"; the stock reserve never holds a granted dose.
  function doseHold(it, units, t) {
    var sf = L.safetyChecks(state, me, it, units, t);
    var hard = sf.checks.filter(function (c) { return c.result === "block" && c.name !== "Stock and reserve"; });
    if (hard.length) return blockReason({ checks: hard });
    if (!sf.lot && !L.pickLot(state, it, units, t).lot) return "None left";
    return "";
  }
  function collectable(g, t) {
    return L.grantDue(state, g, t).filter(function (d) { return !doseHold(L.getItem(state, d.itemId), d.units, t); });
  }

  // Requests that are still waiting. Once granted, the grant card takes over.
  function myRequestCards() {
    return state.requests.filter(function (r) {
      return r.patientId === me && (r.status === "pending" || (r.status === "denied" && !r.seen));
    }).map(function (r) {
      var it = L.getItem(state, r.itemId);
      if (r.status === "denied") {
        return '<div class="hcard"><div class="hc-kicker">Not approved</div><div class="hc-title">' + esc(it.name) + '</div><div class="hc-sub">Talk to the CMO.</div>' +
          '<div class="hc-actions"><button class="link" data-act="seen" data-id="' + r.id + '">OK</button></div></div>';
      }
      return '<div class="hcard muted"><div class="hc-kicker">⏳ Waiting for ' + (r.gate === "earth" ? "Earth" : "the CMO") + '</div><div class="hc-title">' + esc(it.name) + "</div>" +
        '<div class="hc-actions"><button class="link" data-act="em-for" data-id="' + it.id + '">Can\'t wait? Emergency</button></div></div>';
    }).join("");
  }

  function followUpCards(t) {
    return state.doseLog.filter(function (e) {
      var it = L.getItem(state, e.itemId), age = t - new Date(e.time);
      return e.patientId === me && !e.followUp && !e.grantId && it && it.kind === "medication" && age > 30 * 60000 && age < 3 * L.DAY_MS;
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
        (o.needsCmo ? "🔒 " : "") + esc(o.item.name) + (o.item.ownerCrewId ? ' <span class="tag muted">Yours</span>' : "") + '</span><span class="tile-use">' + esc(use) +
        (o.needsEarth ? " · 🌍 Earth" : "") + "</span></button>";
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
        (ui.pick.reportId ? ' data-report="' + esc(ui.pick.reportId) + '"' : "") + ">" + (o.needsEarth ? "Ask Earth" : o.needsCmo ? "Ask the CMO" : "Get it") + "</button>" +
        (o.needsCmo ? '<button class="link" data-act="em-for" data-id="' + it.id + '">Can\'t wait? Emergency</button>' : "") + "</div>";
      if (o.needsEarth) html += '<div class="hc-sub small">Earth decides on controlled medicines. A reply takes about 24 minutes.</div>';
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
    ui.flow = Object.assign({ step: "locate", patientId: me, start: Date.now(), wrong: 0, error: "", requestId: null, reportId: null }, f);
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
    // Controlled medicines go to Earth (final say); everything else to the onboard doctor.
    // If it can't wait, the Emergency button is always there.
    var gateType = o.gate.type === "earth" || it.tier === "3" || it.controlled ? "earth" : "cmo";
    state.requests.unshift({
      id: "R" + state.seq++, time: t.toISOString(), patientId: me, itemId: it.id, qty: o.qty, reason: reasonFrom(reportId),
      tier: it.tier, gate: gateType, status: "pending", signatures: []
    });
    if (reportId) markReport(reportId);
    ui.screen = "main";
    ui.pick = null;
    save();
    toast(gateType === "earth" ? "Sent to Earth (about 24 min for a reply). Can't wait? Use Emergency." : "Sent to the CMO");
  }

  // ---------- collecting under a grant: all due bins open together, dose by dose ----------

  // Tells the main app and a future hardware bridge which compartments to open or close.
  // Listen with window.addEventListener("medinventory", e => e.detail); also posted to a parent page.
  function emit(detail) {
    detail.at = now().toISOString();
    try { window.dispatchEvent(new CustomEvent("medinventory", { detail: detail })); } catch (e) { /* old browser */ }
    try { if (window.parent && window.parent !== window) window.parent.postMessage(detail, "*"); } catch (e) { /* not embedded */ }
  }

  function startCollect(grantId) {
    var t = now(), g = L.getGrant(state, grantId);
    if (!g || g.patientId !== me) { toast("This grant isn't yours."); return; }
    var due = L.grantDue(state, g, t), items = [], blocked = [];
    due.forEach(function (d) {
      var it = L.getItem(state, d.itemId), sf = L.safetyChecks(state, me, it, d.units, t);
      // Safety checks still run. Reserve is not a reason to stop a granted dose; allergies and limits are.
      var hard = sf.checks.filter(function (c) { return c.result === "block" && c.name !== "Stock and reserve"; });
      var lot = sf.lot || L.pickLot(state, it, d.units, t).lot;
      if (hard.length || !lot) { blocked.push(it.name + ": " + (hard.length ? blockReason({ checks: hard }) : "none left")); return; }
      items.push(Object.assign({ lotId: lot.id, done: false }, d));
    });
    if (!items.length) { toast(blocked.length ? blocked.join(" · ") + ". Ask the CMO." : "Nothing to collect now."); return; }
    startFlow({ kind: "collect", grantId: g.id, items: items, blocked: blocked });
    emit({ type: "compartments-open", grantId: g.id, crewId: me, compartments: items.map(function (x) {
      return { compartmentId: x.compartmentId, lockerId: x.lockerId, shelfId: x.shelfId, bin: x.bin, itemId: x.itemId, units: x.units, slot: x.slot };
    }) });
  }

  function viewCollect(f) {
    var g = L.getGrant(state, f.grantId), left = f.items.filter(function (x) { return !x.done; }).length;
    var html = '<div class="find"><div class="hc-kicker">' + issuerLabel(g) + " · Collect</div>" +
      '<div class="what"><b>' + f.items.length + " bin" + (f.items.length > 1 ? "s" : "") + "</b> open together</div><div class=\"collect-list\">";
    f.items.forEach(function (x) {
      var it = L.getItem(state, x.itemId), loc = L.locationOf(state, it);
      html += '<div class="collect-row' + (x.done ? " done" : "") + '"><div class="where">' + whereChips(loc) + '</div><div class="collect-what">' + (x.done ? "✓ " : "") +
        "<b>" + x.units + " ×</b> " + esc(it.name) + "</div></div>";
    });
    html += "</div>";
    if (f.blocked && f.blocked.length) html += '<div class="tag warn block">Not opened: ' + esc(f.blocked.join(" · ")) + ". Ask the CMO.</div>";
    if (f.error) html += '<div class="find-error">' + esc(f.error) + "</div>";
    html += '<div class="find-actions"><span class="timer" id="timer">0:00</span><button class="btn primary big" data-act="collect-scan">📷 Scan (' + left + " left)</button></div>" +
      '<div class="demo-line"><button class="link small" data-act="collect-wrong">Demo: scan a box not in this grant</button> · <button class="link small" data-act="collect-cancel">Cancel</button></div>';
    return html + "</div>";
  }

  // Each scanned box is checked against the open compartments and recorded once, right away.
  function collectScan(tag) {
    var f = ui.flow, t = now();
    var lot = state.lots.filter(function (l) { return l.tag === tag; })[0];
    var x = lot ? f.items.filter(function (y) { return y.itemId === lot.itemId; })[0] : null;
    if (!x) { f.wrong++; f.error = "That box isn't part of this collection. Put it back."; return; }
    if (x.done) { f.error = "Already collected."; return; }
    var it = L.getItem(state, x.itemId);
    if (L.lotStatus(state, it, lot, t) === "expired") { f.error = "That box is expired. Take the other one."; return; }
    if (lot.qty < x.units) { f.error = "That box is nearly empty. Take the other one."; return; }
    var g = L.getGrant(state, f.grantId);
    x.entry = L.dispense(state, {
      patientId: me, itemId: x.itemId, lotId: lot.id, qty: x.units, reason: g.issuerId === L.EARTH ? "Grant from Earth" : "Grant from the onboard doctor",
      authType: "grant", signedBy: [g.issuerId], grantId: g.id, grantIdx: x.grantIdx, slot: x.slot, groundReview: !!g.selfGranted
    }, t);
    x.done = true;
    f.error = "";
    emit({ type: "compartment-collected", grantId: g.id, crewId: me, compartmentId: x.compartmentId, itemId: x.itemId, units: x.units, slot: x.slot });
    save();
    if (L.needsCountCheck(it)) { f.counting = x.itemId; f.count = ""; f.step = "count"; return; }
    collectNext();
  }

  function collectNext() {
    var f = ui.flow;
    f.step = "locate";
    if (f.items.every(function (x) { return x.done; })) {
      f.step = "done";
      emit({ type: "collection-complete", grantId: f.grantId, crewId: me, slot: f.items[0].slot });
    }
  }

  function viewCollectDone(f) {
    var g = L.getGrant(state, f.grantId);
    var html = '<div class="done"><div class="done-check">✓</div><div class="hc-title">Collected</div><ul class="gains">' + f.items.map(function (x) {
      var it = L.getItem(state, x.itemId);
      return "<li><span>" + x.units + " × " + esc(it.name) + "</span><b>Bin " + x.bin + "</b></li>";
    }).join("") + "</ul>";
    f.items.forEach(function (x) {
      if (x.entry && x.entry.countCheck && x.entry.countCheck.counted !== x.entry.countCheck.expected) html += '<div class="tag bad block">Count doesn\'t match. The CMO will check.</div>';
    });
    if (g && L.grantFinished(state, g, now())) html += '<div class="hc-sub">That was the last dose of this course.</div>';
    html += '<div class="hc-sub">Close the bins and the locker.</div><button class="btn primary big" data-act="flow-close">Back</button></div>';
    return html;
  }

  // ---------- retrieval flow: locate → scan → (count) → done ----------

  function viewFlow(f) {
    if (f.kind === "collect") return f.step === "done" ? viewCollectDone(f) : f.step === "count" ? viewCount(f) : viewCollect(f);
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

  function counterOf() { return me; }

  function viewCount(f) {
    var it = L.getItem(state, f.counting || f.itemId);
    return '<div class="hcard"><div class="hc-kicker">Count check</div><div class="hc-title">How many are left in bin ' + esc(it.bin) + "?</div>" +
      '<div class="count-row"><input id="countInput" type="number" min="0" inputmode="numeric" aria-label="Number left" value="' + esc(f.count) + '" data-bind="flow.count">' +
      '<button class="btn primary big" data-act="count-done">Done</button></div>' + (f.error ? '<p class="error">' + esc(f.error) + "</p>" : "") + "</div>";
  }

  function complete(extra) {
    var f = ui.flow;
    try {
      f.entry = L.dispense(state, Object.assign({
        patientId: f.patientId, itemId: f.itemId, lotId: f.lotId, qty: f.qty, reason: f.reason, authType: f.authType, signedBy: f.signedBy,
        requestId: f.requestId, scanSkipped: !!f.scanSkipped, override: f.override || null,
        approvalBypassed: !!f.approvalBypassed, groundReview: !!f.approvalBypassed
      }, extra || {}), now());
    } catch (err) { f.error = err.message; return; }
    if (f.reportId) markReport(f.reportId);
    // A request for the same medicine is answered by the emergency release (Earth still reviews it)
    if (f.approvalBypassed) {
      state.requests.forEach(function (r) {
        if (r.status === "pending" && r.patientId === f.patientId && r.itemId === f.itemId) { r.status = "released-emergency"; r.entryId = f.entry.id; }
      });
    }

    f.gains = []; f.newBadges = []; f.levelUp = false; f.newBest = false;
    if (!f.emergency) {
      var p = player(), before = level(p.xp);
      p.retrievals++;
      if (!f.scanSkipped && f.wrong === 0) { f.gains.push(["Right box first try", XP.firstTry]); p.firstTryScans++; }
      f.gains.push(["Found it", XP.found]);
      if (f.seconds != null && f.seconds <= FAST_SEC) f.gains.push(["Quick find: " + f.seconds + " s", XP.fast]);
      if (f.seconds != null && (p.bestTimeSec == null || f.seconds < p.bestTimeSec)) { p.bestTimeSec = f.seconds; f.newBest = true; }
      f.gains.forEach(function (g) { p.xp += g[1]; });
      unlock(p, "first-find", f.newBadges);
      if (p.firstTryScans >= 5) unlock(p, "sharp-eye", f.newBadges);
      if (f.seconds != null && f.seconds <= 20) unlock(p, "speedy", f.newBadges);
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
    if (e && e.approvalBypassed) html += '<div class="tag bad block">Released without approval. The CMO and Earth review it.</div>';
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

  // focus: { itemId } for one item, or { targets: [{ itemId, done }] } for a grant collection
  function lockersPanel(focus, locating, t) {
    var targets = !focus ? [] : focus.targets || [{ itemId: focus.itemId, done: false }];
    var byShelf = {}, lockersHit = {}, firstItem = null;
    targets.forEach(function (x) {
      var it = L.getItem(state, x.itemId);
      if (!it) return;
      var loc = L.locationOf(state, it);
      firstItem = firstItem || it;
      (byShelf[loc.shelf.id] = byShelf[loc.shelf.id] || {})[loc.bin] = x.done ? "done" : "open";
      lockersHit[loc.locker.id] = true;
    });
    var any = Object.keys(lockersHit).length > 0;
    var rx = needsCmoMap(t);
    var html = '<div class="lockers-head"><span class="lh-title">Lockers</span>';
    if (focus && focus.clearable && firstItem) html += '<span class="lh-focus">' + esc(firstItem.name) + ' <button class="link small" data-act="locker-clear">Clear</button></span>';
    html += '<span class="legend-rx"><span class="rx-swatch"></span>🔒 Needs approval</span></div>';
    if (locating && any) {
      html += '<div class="bay-strip" aria-hidden="true">' + state.lockers.map(function (lk) {
        return '<div class="mini-locker' + (lockersHit[lk.id] ? " on" : "") + (lk.emergency ? " em" : "") + '"><span>' + esc(lk.label) + "</span></div>";
      }).join("") + "</div>";
    }
    html += '<div class="locker-row">' + state.lockers.map(function (lk) {
      var isTarget = !!lockersHit[lk.id];
      return lockerFront(lk, {
        targets: isTarget ? byShelf : null,
        pulse: !!(focus && focus.pulse),
        dim: !!(locating && any && !isTarget),
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
      var pack = L.getPack(state, sh.packId), shelfT = o.targets ? o.targets[sh.id] : null, isT = !!shelfT;
      var byBin = {}, maxBin = 0;
      state.items.filter(function (i) { return i.shelfId === sh.id; }).forEach(function (i) { byBin[i.bin] = i; maxBin = Math.max(maxBin, i.bin); });
      var nBins = Math.max(sh.cols, Math.ceil(maxBin / sh.cols) * sh.cols);
      html += '<div class="shelf' + (isT ? " target" : "") + '" style="--zone:' + pack.hex + '"><div class="shelf-label"><span class="zone-dot"></span>' +
        esc(SHELF_SHORT[sh.level]) + " · " + esc(sh.zone) + '</div><div class="bins" style="grid-template-columns:repeat(' + sh.cols + ',minmax(0,1fr))">';
      for (var b = 1; b <= nBins; b++) {
        var it = byBin[b], mark = shelfT ? shelfT[b] : null;
        if (it) {
          var tag = o.clickable ? "button" : "div", isRx = !!o.rx[it.id];
          html += "<" + tag + ' class="bin' + (isRx ? " rx" : "") + (mark === "done" ? " got" : mark ? (o.pulse ? " target" : " preview") : "") + '"' +
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

  // ---------- import a grant (code or QR from Earth or the onboard doctor) ----------

  function viewImport() {
    var html = '<div class="screen-head"><button class="back" data-act="go-home" aria-label="Back">←</button><h2>Import from Earth</h2></div><div class="stack">';
    html += '<div class="hcard"><div class="hc-kicker">A grant from your flight surgeon</div>';
    if (ui.qrActive) {
      html += '<video id="qrVideo" class="qr-video" autoplay playsinline muted></video><div class="hc-actions"><button class="btn" data-act="qr-stop">Stop camera</button></div>';
    } else {
      html += '<div class="hc-actions"><button class="btn big" data-act="qr-start">📷 Scan QR</button></div>';
    }
    html += '<div class="or">or type the code</div><div class="code-row"><input id="rxCode" class="code-input" type="text" spellcheck="false" autocomplete="off" placeholder="RX2-…" value="' +
      esc(ui.rxCode) + '" data-bind="rxCode"><button class="btn primary" data-act="rx-check">Check</button></div>';
    if (ui.rxError) html += '<p class="error">' + esc(ui.rxError) + "</p>";
    html += "</div>";
    if (ui.rxPreview) {
      var p = ui.rxPreview;
      html += '<div class="hcard plan"><div class="hc-kicker">' + issuerLabel(p) + " · starts " + esc(fmtShort(p.start)) + "</div>";
      p.items.forEach(function (x) {
        var it = L.getItem(state, x.itemId);
        html += '<div class="plan-row"><div><b>' + esc(it.name) + '</b> <span class="muted">' + esc(it.strength) + '</span><div class="muted small">' + esc(doseText(it, x.units)) +
          " · " + esc(timesADay(x.perDay)) + " · " + x.days + (x.days === 1 ? " day" : " days") + "</div></div></div>";
      });
      L.grantConflicts(state, p, now()).replaces.forEach(function (r) {
        var old = L.getGrant(state, r.grantId);
        html += '<div class="tag warn block">Replaces ' + esc(L.getItem(state, r.itemId).name) + " from " + esc(old ? issuerLabel(old).replace(/^\S+ From /, "") : "an earlier grant") +
          ": one course per medicine.</div>";
      });
      html += '<div class="hc-sub small">Valid until ' + esc(fmtShort(L.grantLastDay(p))) + " · Sender not verified yet (demo)</div>";
      html += '<div class="hc-actions"><button class="btn primary big" data-act="rx-add">Add</button></div></div>';
    }
    return html + "</div>";
  }

  function checkRx() {
    ui.rxError = ""; ui.rxPreview = null;
    var res = L.decodeGrant(state, ui.rxCode);
    if (res.error) { ui.rxError = res.error; return; }
    var why = L.acceptGrant(state, res.grant, me, now());
    if (why) { ui.rxError = why; return; }
    ui.rxPreview = res.grant;
  }

  function addRx() {
    var why = L.acceptGrant(state, ui.rxPreview, me, now());
    if (why) { ui.rxError = why; return; }
    L.addGrant(state, ui.rxPreview, now());
    ui.rxPreview = null; ui.rxCode = ""; ui.screen = "main";
    save();
    toast("Added");
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
      myGrants().length + (ui.paused ? 1 : 0);
    if (kept) html += '<p class="kept">↩ Your requests and grants are kept. They\'re back when you leave this screen.</p>';
    html += '<div class="em-who"><span class="muted">Who needs help?</span>' + state.crew.map(function (c) {
      var tags = c.allergies.map(function (a) { return '<span class="who-tag">🚫 ' + esc(a) + "</span>"; }).join("") +
        c.conditions.map(function (x) { return '<span class="who-tag">⚠ ' + esc(CONDITION_SHORT[x] || x) + "</span>"; }).join("");
      return '<button class="who' + (em.patientId === c.id ? " sel" : "") + '" data-act="em-who" data-id="' + c.id + '">' + esc(firstName(c.id)) + (c.id === me ? " (me)" : "") + tags + "</button>";
    }).join("") + "</div>";
    function emTile(it) {
      var s = L.stock(state, it, t), risks = emRisks(em.patientId, it), block = risks.some(function (r) { return r.level === "block"; });
      return '<button class="tile em' + (it.tier !== "4" ? " wait" : "") + (em.itemId === it.id ? " sel" : "") + (risks.length ? " risk" : "") + '" data-act="em-item" data-id="' + it.id +
        '"><span class="tile-name">' + esc(it.name) + '</span><span class="tile-use">' + (it.kind === "equipment" ? "Equipment" : esc(it.strength) + " · " + s.usable + " left") +
        (it.tier === "3" ? " · Earth decides normally" : it.tier === "2" ? " · CMO decides normally" : "") + "</span>" +
        (risks.length ? '<span class="tile-risk' + (block ? " block" : "") + '">⚠ ' + esc(risks[0].short) + "</span>" : "") + "</button>";
    }
    html += '<div class="tiles">' + state.items.filter(function (it) { return it.tier === "4"; }).map(emTile).join("") + "</div>";
    // Medicines that normally need the CMO or Earth, for when it truly can't wait
    var waitable = state.items.filter(function (it) {
      return it.kind === "medication" && (it.tier === "2" || it.tier === "3") && (!it.ownerCrewId || it.ownerCrewId === em.patientId);
    });
    html += '<details class="cant-wait"' + (em.cantWait ? " open" : "") + '><summary data-act="em-cantwait">Can\'t wait for approval?</summary>' +
      '<p class="hint">Only if it truly can\'t wait for the CMO or Earth. A reason is required. It\'s logged as released without approval, the paperwork is due in 2 hours, and Earth reviews it.</p>' +
      '<div class="tiles">' + waitable.map(emTile).join("") + "</div></details>";
    if (em.itemId) {
      var it = L.getItem(state, em.itemId), risks = emRisks(em.patientId, it), block = risks.some(function (r) { return r.level === "block"; });
      var needsReason = it.tier !== "4";
      if (risks.length) {
        html += '<div class="em-warn' + (block ? " block" : "") + '"><b>⚠ ' + (block ? "Warning" : "Check") + "</b>" +
          risks.map(function (r) { return "<div>" + esc(r.text) + "</div>"; }).join("") +
          (block ? '<div class="em-warn-note">Only give it if there is no other option. It will be logged for the CMO and ground.</div>' : "") + "</div>";
      }
      if (needsReason) html += '<div class="em-warn"><b>Without approval</b><div>' + esc(it.name) + " normally needs " + (it.tier === "3" ? "Earth" : "the CMO") + ". Say why it can't wait.</div></div>";
      html += '<div class="em-go">' + (it.kind === "equipment"
        ? '<button class="btn danger big" data-act="em-locate">Show me</button>'
        : '<input id="emReason" type="text" placeholder="' + (needsReason ? "Why it can't wait (required)" : "What happened? (optional)") + '" value="' + esc(em.reason) + '" data-bind="em.reason">' +
          '<button class="btn danger big' + (em.confirm ? " confirm" : "") + '" data-act="em-release">' +
          (block ? (em.confirm ? "Tap again to give anyway" : "Give anyway") : "Release now") + "</button>") + "</div>";
      if (em.error) html += '<p class="error">' + esc(em.error) + "</p>";
    }
    return html;
  }

  function emergencyRelease() {
    var em = ui.em, t = now(), it = L.getItem(state, em.itemId), qty = it.doseUnits || 1;
    var bypass = it.tier !== "4", reason = String(em.reason || "").trim();
    if (bypass && !reason) { em.error = "Say why it can't wait for approval."; return; }
    em.error = "";
    var overrides = emRisks(em.patientId, it).filter(function (r) { return r.level === "block"; }).map(function (r) { return r.text; });
    if (overrides.length && !em.confirm) { em.confirm = true; return; }
    var lot = L.pickLot(state, it, qty, t).lot || L.fefoLots(state, it).filter(function (l) { return l.qty >= qty; })[0];
    if (!lot) { toast("None left."); return; }
    startFlow({
      emergency: true, patientId: em.patientId, itemId: it.id, qty: qty, lotId: lot.id, authType: "break-glass", signedBy: [me],
      reason: reason || "Emergency", override: overrides.length ? overrides : null, approvalBypassed: bypass
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

  function requestGate(r) { return r.gate || (r.tier === "3" ? "earth" : "cmo"); }
  // A doctor never approves their own medicine: the backup doctor or Earth does
  function approverOptions(patientId) { return state.crew.filter(function (c) { return (c.isCMO || c.isBackupCMO) && c.id !== patientId; }); }

  function sigFields(path, label, options, cur, idp) {
    cur = cur || {};
    return '<div class="sig"><span class="sig-label">' + esc(label) + '</span><select id="' + idp + '-who" data-bind="' + path + '.crewId"><option value="">Choose…</option>' +
      options.map(function (c) { return '<option value="' + c.id + '"' + (cur.crewId === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") +
      '</select><input id="' + idp + '-pin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="PIN" value="' + esc(cur.pin || "") + '" data-bind="' + path + '.pin"></div>';
  }

  function requestHead(r, t) {
    var it = L.getItem(state, r.itemId), sf = L.safetyChecks(state, r.patientId, it, r.qty, t);
    return '<div class="row-between"><div><b>' + r.qty + " × " + esc(itemLabel(it)) + "</b> " + tierBadge(it.tier, it.controlled) + '</div><span class="muted small">' +
      ago(r.time) + "</span></div><div>For <b>" + esc(crewName(r.patientId)) + "</b>: " + esc(r.reason) + "</div>" +
      '<div class="small">Checks: ' + resultBadge(sf.result) + " " + esc(sf.checks.filter(function (c) { return c.result !== "pass"; }).map(function (c) { return c.name + ": " + c.msg; }).join("; ")) + "</div>";
  }

  // The onboard doctor answers a request by issuing a grant (same format as a grant from Earth)
  function requestCard(r, t) {
    var it = L.getItem(state, r.itemId), sf = L.safetyChecks(state, r.patientId, it, r.qty, t);
    var f = ui.appr[r.id] || {};
    function opts(values, cur, label) {
      return values.map(function (v) { return '<option value="' + v + '"' + (String(cur || values[0]) === String(v) ? " selected" : "") + ">" + v + " " + label + "</option>"; }).join("");
    }
    var html = '<div class="card">' + requestHead(r, t);
    html += '<div class="sig"><span class="sig-label">Course</span><select id="pd-' + r.id + '" aria-label="Times a day" data-bind="appr.' + r.id + '.perDay">' +
      opts([1, 2, 3, 4], f.perDay, "× a day") + '</select><select id="dy-' + r.id + '" aria-label="Days" data-bind="appr.' + r.id + '.days">' + opts([1, 2, 3, 5, 7, 10, 14], f.days, "days") + "</select></div>";
    html += sigFields("appr." + r.id, "Doctor (CMO or backup)", approverOptions(r.patientId), f, "ap-" + r.id);
    if (sf.result === "block") html += '<label class="check"><input id="ack-' + r.id + '" type="checkbox" data-bind="appr.' + r.id + '.ack"' + (f.ack ? " checked" : "") + "> I reviewed the blocked checks</label>";
    var c = cmo();
    if (c && c.id !== r.patientId) html += '<label class="check"><input id="un-' + r.id + '" type="checkbox" data-bind="appr.' + r.id + '.cmoUnavailable"' + (f.cmoUnavailable ? " checked" : "") + "> " + esc(c.name) + " is unavailable</label>";
    if (f.error) html += '<p class="error">' + esc(f.error) + "</p>";
    return html + '<div class="actions"><button class="btn" data-act="appr-deny" data-id="' + r.id + '">Deny</button><button class="btn primary" data-act="appr-grant" data-id="' + r.id + '">Grant</button></div></div>';
  }

  // Controlled medicines (and the CMO's own medicines when there's no backup): Earth has the final say.
  // It goes with the next report; a reply takes about 24 minutes. If it can't wait: Emergency.
  function earthRequestCard(r, t) {
    return '<div class="card">' + requestHead(r, t) + '<div class="muted small">Earth decides on this. It goes with the next report; a reply takes about ' +
      (state.mission.commDelayMin * 2) + " minutes. If it can't wait, use Emergency (logged, Earth reviews it).</div>" +
      '<div class="actions"><button class="btn" data-act="earth-reply" data-id="' + r.id + '">Demo: Earth grants it</button></div></div>';
  }

  // One active grant on the CMO's screen: its code, QR on request, and a two-tap Cancel
  function grantRow(g) {
    var confirming = ui.cancelConfirm === g.id, showing = ui.showQr === g.id, qrHtml = "";
    if (showing) {
      try { qrHtml = '<div class="qr-box">' + window.MedQR.svg(g.code).svg + "</div>"; } catch (e) { qrHtml = '<p class="error">' + esc(e.message) + "</p>"; }
    }
    return '<div class="card grant-row"><div class="row-between"><div><b>' + esc(crewName(g.patientId)) + "</b> · " + esc(issuerLabel(g)) + " · " + g.items.map(function (x) {
      var it = L.getItem(state, x.itemId);
      var line = esc(it.name) + " " + x.units + "×" + x.perDay + "/day, " + x.days + " d";
      return x.replacedBy ? "<s>" + line + "</s> (replaced)" : line;
    }).join("; ") + (g.selfGranted ? ' <span class="tag warn">Self-granted · Earth reviews</span>' : "") +
      '</div><span class="muted small">until ' + esc(fmtShort(L.grantLastDay(g))) + '</span></div><div class="muted small code">' + esc(g.code) + "</div>" + qrHtml +
      '<div class="actions"><button class="btn small" data-act="grant-qr" data-id="' + g.id + '">' + (showing ? "Hide QR" : "Show QR") + "</button>" +
      '<button class="btn small' + (confirming ? " danger" : "") + '" data-act="grant-cancel" data-id="' + g.id + '">' + (confirming ? "Tap again to cancel" : "Cancel grant") + "</button></div></div>";
  }

  function entrySummary(e) {
    var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null;
    return "<b>" + e.qty + " × " + esc(itemLabel(it)) + "</b> for " + esc(crewName(e.patientId)) + ' <span class="muted small">' + fmtTime(e.time) + (lot ? " · lot " + esc(lot.lotNumber) : "") +
      " · " + esc(AUTH[e.auth.type]) + (e.auth.signedBy.length ? " (" + e.auth.signedBy.map(crewName).map(esc).join(", ") + ")" : "") + "</span>" +
      (e.override ? '<div class="error small">⚠ Given despite: ' + esc(e.override.join("; ")) + "</div>" : "") +
      (e.approvalBypassed ? '<div class="error small">Released without approval (Emergency): ' + esc(e.reason) + "</div>" : "");
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
    if (a.waitingEarth.length) {
      html += "<h3>Waiting for Earth (" + a.waitingEarth.length + ")</h3>";
      a.waitingEarth.forEach(function (r) { html += earthRequestCard(r, t); });
    }
    var active = state.grants.filter(function (g) { return g.status === "active" && !L.grantFinished(state, g, t); });
    if (active.length) {
      html += "<h3>Active grants (" + active.length + ")</h3>";
      active.forEach(function (g) { html += grantRow(g); });
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

  // Builds a grant through the same code format as Earth (encode, then decode with all its checks)
  function issueGrant(r, issuerId, perDay, days, verification) {
    var t = now(), code;
    try {
      code = L.encodeGrant(state, { issuerId: issuerId, patientId: r.patientId, start: t, items: [{ itemId: r.itemId, units: r.qty, perDay: perDay, days: days }] });
    } catch (e) { return { error: e.message }; }
    var res = L.decodeGrant(state, code);
    if (res.error) return res;
    var why = L.acceptGrant(state, res.grant, r.patientId, t);
    if (why) return { error: why };
    res.grant.requestId = r.id;
    res.grant.verification = verification;
    var g = L.addGrant(state, res.grant, t);
    r.status = "granted";
    r.grantId = g.id;
    return { grant: g };
  }

  function grantRequest(id) {
    var r = findRequest(id), f = ui.appr[id] || (ui.appr[id] = {});
    var it = L.getItem(state, r.itemId), sf = L.safetyChecks(state, r.patientId, it, r.qty, now());
    var ctx = { patientId: r.patientId, approverId: f.crewId, cmoUnavailable: !!f.cmoUnavailable };
    var err = sf.result === "block" && !f.ack ? "Review the blocked checks first." : null;
    err = err || L.checkSignature(state, "approver", f.crewId, f.pin || "", ctx);
    if (err) { f.error = err; return; }
    var res = issueGrant(r, f.crewId, Number(f.perDay || 1), Number(f.days || 1), "onboard doctor PIN");
    if (res.error) { f.error = res.error; return; }
    r.signatures.push({ crewId: f.crewId, role: L.getCrew(state, f.crewId).isCMO ? "CMO" : "Backup CMO", time: now().toISOString() });
    ui.appr[id] = {};
    save();
    var rep = res.grant.replaced.length ? " It replaces the earlier " + L.getItem(state, r.itemId).name + " course." : "";
    toast("Granted. " + firstName(r.patientId) + " can collect it now." + rep);
  }

  // Demo stand-in for Earth's answer (the Earth console comes later; earth.html makes real codes)
  function earthReply(id) {
    var r = findRequest(id), res = issueGrant(r, L.EARTH, 1, 1, "simulated");
    if (res.error) { toast(res.error); return; }
    save();
    toast("Earth granted it (demo). " + firstName(r.patientId) + " can collect it.");
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
    if (e.approvalBypassed) review += '<span class="tag bad">Without approval (Emergency)</span>';
    if (e.auth.type === "break-glass" && !e.documentation) review += '<span class="tag bad">Note due</span>';
    if (e.countCheck && e.countCheck.counted !== e.countCheck.expected) review += '<span class="tag ' + (e.countCheck.resolved ? "muted" : "bad") + '">Count mismatch</span>';
    if (e.scanSkipped) review += '<span class="tag warn">Scan skipped</span>';
    if (e.groundReview === "pending") review += '<span class="tag info">Ground review</span>';
    if (e.groundReview === "done") review += '<span class="tag ok">Ground reviewed</span>';
    var fu = it.kind !== "medication" ? '<span class="muted">–</span>' : e.followUp
      ? '<span class="tag ' + (e.followUp.effective ? "ok" : "warn") + '">' + (e.followUp.effective ? "Yes" : "No") + "</span>" + (e.followUp.sideEffects ? '<div class="small">' + esc(e.followUp.sideEffects) + "</div>" : "")
      : '<span class="muted">' + (e.grantId ? "Grant" : "Not yet") + "</span>";
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
      ui.rxCode = L.encodeGrant(state, { issuerId: L.EARTH, patientId: me, start: now(), items: state.demoPlan });
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
    collect: function (d) { startCollect(d.id); },
    "collect-scan": function () {
      var x = ui.flow.items.filter(function (y) { return !y.done; })[0];
      if (x) collectScan(L.getLot(state, x.lotId).tag);
    },
    "collect-wrong": function () {
      var f = ui.flow, inGrant = f.items.map(function (y) { return y.itemId; }), first = L.getItem(state, f.items[0].itemId);
      var other = state.items.filter(function (it) { return it.shelfId === first.shelfId && inGrant.indexOf(it.id) < 0; })[0] ||
        state.items.filter(function (it) { return inGrant.indexOf(it.id) < 0; })[0];
      collectScan(L.lotsOf(state, other.id)[0].tag);
    },
    "collect-cancel": function () {
      var f = ui.flow;
      emit({ type: "compartments-closed", grantId: f.grantId, crewId: me, compartments: f.items.filter(function (y) { return !y.done; }).map(function (y) { return y.compartmentId; }) });
      ui.flow = null; ui.screen = "main";
    },
    seen: function (d) { findRequest(d.id).seen = true; save(); },
    "grant-seen": function (d) { var g = L.getGrant(state, d.id); if (g) { g.doneSeen = true; save(); } },
    "grant-qr": function (d) { ui.showQr = ui.showQr === d.id ? null : d.id; },
    "grant-cancel": function (d) {
      if (ui.cancelConfirm !== d.id) { ui.cancelConfirm = d.id; return; }
      ui.cancelConfirm = null;
      var err = L.revokeGrant(state, d.id, me, now());
      if (err) { toast(err); return; }
      var g = L.getGrant(state, d.id);
      emit({ type: "grant-cancelled", grantId: g.id, crewId: g.patientId, by: me });
      save();
      toast("Grant cancelled");
    },
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
      var f = ui.flow;
      if (f.count === "" || f.count == null || isNaN(Number(f.count))) { f.error = "Type a number."; return; }
      if (f.kind === "collect") {
        // The dose was already recorded when scanned; the count is added to that record
        var x = f.items.filter(function (y) { return y.itemId === f.counting; })[0], cl = L.getLot(state, x.entry.lotId);
        x.entry.countCheck = { expected: cl.qty, counted: Number(f.count), by: counterOf() };
        f.counting = null; f.error = ""; save(); collectNext();
        return;
      }
      var lot = L.getLot(state, f.lotId);
      complete({ countCheck: { expected: lot.qty - f.qty, counted: Number(f.count), by: counterOf() } });
    },
    "flow-close": function () { ui.flow = null; ui.screen = "main"; },
    emergency: function () {
      // Pause a normal retrieval instead of dropping it; it can be resumed afterwards
      if (ui.flow && !ui.flow.emergency && (ui.flow.step === "locate" || ui.flow.step === "count")) ui.paused = ui.flow;
      ui.view = "home"; ui.flow = null; ui.drawerItemId = null; ui.screen = "emergency"; ui.em = { patientId: me, itemId: null, reason: "", confirm: false };
    },
    resume: function () { if (ui.paused) { ui.flow = ui.paused; ui.flow.start = Date.now(); ui.flow.error = ""; ui.paused = null; ui.screen = "main"; } },
    "drop-paused": function () { ui.paused = null; },
    "em-who": function (d) { ui.em.patientId = d.id; ui.em.confirm = false; ui.em.error = ""; },
    "em-item": function (d) { ui.em.itemId = d.id; ui.em.confirm = false; ui.em.error = ""; },
    "em-cantwait": function () { ui.em.cantWait = !ui.em.cantWait; },
    // "Can't wait? Emergency" from a request or a medicine: opens Emergency with it ready to release
    "em-for": function (d) {
      ui.view = "home"; ui.flow = null; ui.drawerItemId = null; ui.screen = "emergency";
      ui.em = { patientId: me, itemId: d.id, reason: "", confirm: false, cantWait: true, error: "" };
    },
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
    "appr-grant": function (d) { grantRequest(d.id); },
    "earth-reply": function (d) { earthReply(d.id); },
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
    // Grants (see CONTRACT.md)
    makeGrantCode: function (g) { return L.encodeGrant(state, g); },
    importGrant: function (code) {
      var res = L.decodeGrant(state, code);
      if (res.error) return { ok: false, error: res.error };
      var why = L.acceptGrant(state, res.grant, me, now());
      if (why) return { ok: false, error: why };
      var g = L.addGrant(state, res.grant, now());
      save(); render();
      return { ok: true, grantId: g.id };
    },
    grants: function () { return JSON.parse(JSON.stringify(myGrants())); },
    dueCompartments: function (grantId) { return L.grantDue(state, L.getGrant(state, grantId), now()); },
    getState: function () { return state; },
    reset: function () { reset(); render(); }
  };

  load();
  resolveUser();
  // A link from the Earth tool (…index.html#grant=<code>) opens Import with the code filled in.
  // Nothing is added until the crew member presses Add.
  function openGrantFromHash() {
    var m = /^#grant=(.+)$/.exec(window.location.hash || "");
    if (!m) return;
    try { ui.rxCode = decodeURIComponent(m[1]); } catch (e) { return; }
    ui.view = "home"; ui.flow = null; ui.screen = "import";
    checkRx();
    try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) { /* file:// may refuse */ }
  }
  window.addEventListener("hashchange", function () { openGrantFromHash(); render(); });
  openGrantFromHash();
  render();
})();
