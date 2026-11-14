// UI for the medical inventory prototype. Plain JS, no build step.
// Logic lives in logic.js (MedLogic); sample data in data.js.
// Health monitoring can send symptom reports with MedInventory.receiveSymptomReport(report)
// or window.postMessage(report) (format in spec.md, section 8).

(function () {
  "use strict";

  var L = window.MedLogic;
  var STORE_KEY = "medInventory.v1";
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
    "break-glass": "Emergency break-glass"
  };

  var state = null;
  var ui = {
    view: "dashboard",
    filters: { q: "", pack: "", tier: "", flag: "" },
    wiz: null,
    drawerItemId: null,
    map: { lockerId: null, packId: null, focus: null },
    appr: {},
    docs: {},
    notes: {},
    logPatient: "",
    pasteJson: ""
  };
  var toastTimer = null;

  function now() { return new Date(); }

  // ---------- storage (per-viewer demo state; works without it) ----------

  function load() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { saved = null; }
    if (saved) {
      try { state = JSON.parse(saved); return; } catch (e) { /* fall through */ }
    }
    state = L.buildState(window.INVENTORY_DATA, now());
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    state = L.buildState(window.INVENTORY_DATA, now());
    ui.wiz = null; ui.drawerItemId = null; ui.appr = {}; ui.docs = {}; ui.notes = {};
    ui.map = { lockerId: null, packId: null, focus: null };
    save();
    toast("Demo data reset");
  }

  // ---------- formatting ----------

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function fmtDate(v) {
    var d = L.parseDate(v);
    return d ? d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear() : "–";
  }
  function fmtTime(v) {
    var d = new Date(v);
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function clock(v) { var d = new Date(v); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function ago(v) {
    var m = Math.round((now() - new Date(v)) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    var h = Math.round(m / 60);
    if (h < 48) return h + " h ago";
    return Math.round(h / 24) + " days ago";
  }
  function crewName(id) { var c = L.getCrew(state, id); return c ? c.name : String(id); }
  function firstName(id) { return crewName(id).split(" ")[0]; }
  function itemLabel(it) { return it.name + (it.strength ? " " + it.strength : ""); }
  function symLabel(code) { var s = L.getSymptom(state, code); return s ? s.label : code; }
  function shortName(it) { var n = it.name.replace(/ \(.*\)$/, ""); return n.length > 16 ? n.slice(0, 15) + "…" : n; }
  function cmo() { return state.crew.filter(function (c) { return c.isCMO; })[0]; }
  function backupCmo() { return state.crew.filter(function (c) { return c.isBackupCMO; })[0]; }
  function textOn(hex) {
    var h = hex.replace("#", "");
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#111" : "#fff";
  }

  // ---------- small components ----------

  function tierBadge(t, controlled) {
    var x = TIER[t] || TIER.S;
    return '<span class="badge ' + x.cls + '">' + x.label + (controlled ? " · " + esc(controlled) : "") + "</span>";
  }
  function packChip(packId, long) {
    var p = L.getPack(state, packId);
    return '<span class="chip"><span class="dot" style="background:' + p.hex + '"></span>' + esc(p.colour) + (long ? " · " + esc(p.name) : "") + "</span>";
  }
  function flagTags(flags) {
    return flags.map(function (f) { return '<span class="tag ' + FLAG[f].cls + '">' + FLAG[f].label + "</span>"; }).join("");
  }
  function lotTag(st) { var x = LOTSTATUS[st]; return '<span class="tag ' + x.cls + '">' + x.label + "</span>"; }
  function resultBadge(r) {
    if (r === "pass") return '<span class="badge ok">All checks pass</span>';
    if (r === "warn") return '<span class="badge warn">Warning</span>';
    return '<span class="badge bad">Blocked</span>';
  }
  function checkResult(r) {
    return r === "pass" ? '<span class="badge ok">Pass</span>' : r === "warn" ? '<span class="badge warn">Warn</span>' : '<span class="badge bad">Block</span>';
  }
  function checksTable(sf) {
    return '<div class="table-wrap"><table><tbody>' + sf.checks.map(function (c) {
      return "<tr><td>" + esc(c.name) + "</td><td>" + checkResult(c.result) + "</td><td>" + esc(c.msg) + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  function locText(loc) {
    return "Locker <b>" + esc(loc.locker.label) + "</b> <span class=\"muted\">(" + esc(loc.locker.zone) + ")</span> → <b>" +
      esc(loc.pack.colour) + " pack</b> <span class=\"muted\">(" + esc(loc.pack.name) + ")</span> → slot <b>" + esc(loc.slot) + "</b>";
  }
  function locShort(loc) { return "Locker " + loc.locker.label + " · " + loc.pack.colour + " pack · slot " + loc.slot; }
  function crewTags(c) {
    var t = "";
    c.allergies.forEach(function (a) { t += '<span class="tag bad">Allergy: ' + esc(a) + "</span>"; });
    c.conditions.forEach(function (x) { t += '<span class="tag warn">' + esc(state.conditionLabels[x] || x) + "</span>"; });
    if (c.nextEVA) {
      var h = Math.round((new Date(c.nextEVA) - now()) / 3600000);
      if (h > -2) t += '<span class="tag info">EVA ' + (h <= 0 ? "now" : "in " + h + " h") + "</span>";
    }
    (c.standingOrders || []).forEach(function (o) {
      var it = L.getItem(state, o.itemId);
      t += '<span class="tag muted">Standing order: ' + esc(it ? it.name : o.itemId) + "</span>";
    });
    return t ? "<span>" + t + "</span>" : "";
  }
  function approverOptions(patientId) {
    return state.crew.filter(function (c) { return (c.isCMO || c.isBackupCMO) && c.id !== patientId; });
  }
  function sigFields(path, label, options, cur, idp) {
    cur = cur || {};
    return '<div class="sig"><span class="sig-label">' + esc(label) + '</span><select id="' + idp + '-who" data-bind="' + path + '.crewId"><option value="">Choose…</option>' +
      options.map(function (c) {
        return '<option value="' + c.id + '"' + (cur.crewId === c.id ? " selected" : "") + ">" + esc(c.name) + " (" + esc(c.role) + ")</option>";
      }).join("") +
      '</select><input id="' + idp + '-pin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="PIN" value="' + esc(cur.pin || "") + '" data-bind="' + path + '.pin"></div>';
  }
  function pinHint() {
    return '<p class="hint">Demo PINs: ' + state.crew.map(function (c) { return esc(c.name.split(" ")[0]) + " " + c.pin; }).join(", ") + "</p>";
  }

  // ---------- render ----------

  function render() {
    var active = document.activeElement;
    var focusId = active && active.id ? active.id : null;
    var sel = null;
    try { sel = active && typeof active.selectionStart === "number" ? active.selectionStart : null; } catch (e) { sel = null; }

    renderHeader();
    var main = document.getElementById("main");
    var html = "";
    if (ui.view === "dispense") html = viewDispense();
    else if (ui.view === "approvals") html = viewApprovals();
    else if (ui.view === "log") html = viewLog();
    else if (ui.view === "map") html = viewMap();
    else html = viewDashboard();
    main.innerHTML = html;
    renderDrawer();

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el && el !== document.activeElement) {
        el.focus();
        try { if (sel != null && el.setSelectionRange) el.setSelectionRange(sel, sel); } catch (e) { /* not a text input */ }
      }
    }
  }

  function renderHeader() {
    var m = L.missionInfo(state, now());
    document.getElementById("mission").innerHTML =
      "<strong>" + esc(state.mission.name) + "</strong><span>Day " + m.day + " of " + m.total + "</span><span>" +
      m.daysLeft + " days left</span><span>Signal delay " + state.mission.commDelayMin + " min one way</span>";
    var buttons = document.querySelectorAll("#tabs [data-view]");
    for (var i = 0; i < buttons.length; i++) buttons[i].classList.toggle("active", buttons[i].getAttribute("data-view") === ui.view);
    var a = L.alerts(state, now());
    var n = a.pending.length + a.docsDue.length + a.countIssues.length;
    var badge = document.getElementById("apprCount");
    badge.textContent = n ? String(n) : "";
    badge.hidden = !n;
  }

  // ---------- dashboard ----------

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

  function viewDashboard() {
    var t = now(), a = L.alerts(state, t);
    var html = '<section class="alerts" aria-label="Alerts">';
    [
      ["expired", a.expired.length, "Items with an expired lot", "bad"],
      ["potency-risk", a.potencyRisk.length, "Potency at risk", "warn"],
      ["shortfall", a.shortfall.length, "Run out before mission end", "warn"],
      ["below-reserve", a.belowReserve.length, "Below reserve or empty", "warn"],
      ["before-end", a.beforeEnd.length, "Have lots expiring before mission end", "info"]
    ].forEach(function (c) {
      html += '<button class="alert-card ' + c[3] + (ui.filters.flag === c[0] ? " active" : "") + (c[1] ? "" : " zero") +
        '" data-act="filter-flag" data-flag="' + c[0] + '"><span class="n">' + c[1] + "</span><span>" + c[2] + "</span></button>";
    });
    [
      ["approvals", a.pending.length, "Requests waiting for sign-off", "info"],
      ["approvals", a.docsDue.length + a.countIssues.length, "Documentation or count issues", "bad"],
      ["approvals", a.groundReview.length, "Waiting for ground review", "muted"],
      ["log", a.followUps.length, "Dose follow-ups due", "muted"]
    ].forEach(function (c) {
      html += '<button class="alert-card ' + c[3] + (c[1] ? "" : " zero") + '" data-act="nav" data-view="' + c[0] + '"><span class="n">' +
        c[1] + "</span><span>" + c[2] + "</span></button>";
    });
    html += "</section>";

    html += '<section class="packs" aria-label="Packs">';
    state.packs.forEach(function (p) {
      var items = state.items.filter(function (i) { return i.packId === p.id; });
      var units = 0, issues = 0;
      items.forEach(function (it) {
        units += L.stock(state, it, t).usable;
        if (L.itemFlags(state, it, t).filter(function (x) { return x !== "before-end"; }).length) issues++;
      });
      var lk = L.getLocker(state, p.lockerId);
      html += '<button class="pack-card' + (ui.filters.pack === p.id ? " active" : "") + '" data-act="filter-pack" data-id="' + p.id + '">' +
        '<span class="swatch" style="background:' + p.hex + '"></span><span class="pc-body"><b>' + esc(p.name) + '</b><span class="muted">' +
        esc(p.colour) + " · locker " + esc(lk.label) + "</span><span>" + items.length + " items · " + units + " units" +
        (issues ? ' · <em class="t-warn">' + issues + " need attention</em>" : "") + "</span></span></button>";
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
      (f.q || f.pack || f.tier || f.flag ? '<button class="btn small" data-act="clear-filters">Clear filters</button>' : "") + "</section>";

    var rows = filteredItems(t);
    html += '<div class="table-wrap"><table class="inv"><thead><tr><th>Item</th><th>Pack</th><th>Tier</th><th>Usable / reserve</th><th>Lasts</th><th>Next expiry</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (it) { html += itemRow(it, t); });
    if (!rows.length) html += '<tr><td colspan="7" class="muted">No items match.</td></tr>';
    html += "</tbody></table></div>";
    html += '<p class="hint">' + rows.length + " of " + state.items.length + " items. Click a row for lots, location and use. Planning expiry = labelled expiry minus a space-environment margin (assumption, see spec).</p>";
    return html;
  }

  function itemRow(it, t) {
    var s = L.stock(state, it, t), flags = L.itemFlags(state, it, t), nx = L.nextExpiry(state, it);
    var stockCell, covCell;
    if (it.kind === "equipment") {
      stockCell = s.onHand + " unit" + (s.onHand === 1 ? "" : "s");
      covCell = '<span class="muted">Equipment</span>';
    } else {
      var max = Math.max(s.usable, it.reserve * 2, 1);
      var pct = Math.min(100, s.usable / max * 100), rpct = Math.min(100, it.reserve / max * 100);
      stockCell = '<div class="stock"><b>' + s.usable + '</b> <span class="muted">/ ' + it.reserve + "</span></div>" +
        '<div class="bar"><span class="' + (s.usable < it.reserve ? "warn" : "ok") + '" style="width:' + pct + '%"></span>' +
        (it.reserve ? '<i style="left:' + rpct + '%" title="Reserve"></i>' : "") + "</div>";
      var cov = L.coverage(state, it, t);
      if (cov.rate.perDay <= 0) covCell = '<span class="muted">No regular use</span>';
      else {
        var cp = Math.min(100, cov.days / Math.max(cov.daysLeft, 1) * 100);
        covCell = "<div>" + (cov.limitedBy ? cov.days + " of " + cov.daysLeft + " days" : "Whole mission") +
          (cov.expiryGap ? ' <span class="muted small">(lots expire)</span>' : "") + "</div>" +
          '<div class="bar"><span class="' + (cov.shortfall ? "warn" : cov.expiryGap ? "info" : "ok") + '" style="width:' + cp + '%"></span></div>';
      }
    }
    return '<tr data-act="open-item" data-id="' + it.id + '" tabindex="0">' +
      "<td><b>" + esc(it.name) + '</b> <span class="muted">' + esc(it.strength) + '</span><div class="sub">' + esc(it.form) +
      (it.ownerCrewId ? " · for " + esc(crewName(it.ownerCrewId)) : "") + "</div></td>" +
      "<td>" + packChip(it.packId) + "</td><td>" + tierBadge(it.tier, it.controlled) + "</td>" +
      "<td>" + stockCell + "</td><td>" + covCell + "</td>" +
      "<td>" + (nx ? fmtDate(nx.expiry) : '<span class="muted">–</span>') + "</td>" +
      "<td>" + (flags.length ? flagTags(flags) : '<span class="tag ok">OK</span>') + "</td></tr>";
  }

  // ---------- item drawer ----------

  function renderDrawer() {
    var d = document.getElementById("drawer"), bd = document.getElementById("backdrop");
    if (!ui.drawerItemId) { d.hidden = true; bd.hidden = true; d.innerHTML = ""; return; }
    var t = now(), it = L.getItem(state, ui.drawerItemId);
    if (!it) { ui.drawerItemId = null; d.hidden = true; bd.hidden = true; return; }
    var s = L.stock(state, it, t), loc = L.locationOf(state, it), flags = L.itemFlags(state, it, t);
    var html = '<div class="drawer-head"><div><h2>' + esc(it.name) + ' <span class="muted">' + esc(it.strength) + "</span></h2><div>" +
      tierBadge(it.tier, it.controlled) + " " + packChip(it.packId, true) + '</div></div><button class="icon" data-act="close-drawer" aria-label="Close">×</button></div>';
    html += '<p class="loc">' + locText(loc) + "</p>";
    if (flags.length) html += "<p>" + flagTags(flags) + "</p>";
    if (it.ownerCrewId) html += '<p class="note">Crew-specific: for ' + esc(crewName(it.ownerCrewId)) + " only.</p>";
    if (it.notes) html += '<p class="note">' + esc(it.notes) + "</p>";

    if (it.kind !== "equipment") {
      var cov = L.coverage(state, it, t), used = L.unitsUsed(state, it.id, 30 * L.DAY_MS, t);
      html += '<div class="stats">' +
        stat(s.onHand, "On hand") + stat(s.usable, "Usable (not expired)") + stat(it.reserve, "Reserve") +
        stat(used, "Used, last 30 days") +
        stat(cov.rate.perDay > 0 ? cov.rate.perDay.toFixed(2) + "/day" : "–", "Use rate (" + cov.rate.basis + ")") +
        stat(cov.rate.perDay > 0 ? (cov.limitedBy ? cov.days + " d" : "Whole mission") : "–",
          "Lasts (" + cov.daysLeft + " days left)" + (cov.limitedBy ? ": limited by " + cov.limitedBy : "")) +
        stat(cov.waste, "Will expire unused") + "</div>";
      if (it.indications.length) html += "<p><b>Used for:</b> " + it.indications.map(symLabel).map(esc).join(", ") + "</p>";
      var info = [];
      if (it.doseUnits) info.push("Usual dose " + it.doseUnits + " × " + it.form);
      if (it.maxPerDay) info.push("max " + it.maxPerDay + " per 24 h");
      if (it.sedating) info.push("sedating");
      info.push("stability: " + it.stability);
      html += '<p class="muted small">' + esc(info.join(" · ")) + "</p>";
    }

    html += "<h3>Lots</h3><div class=\"table-wrap\"><table><thead><tr><th>Lot</th><th>Qty</th><th>Expiry</th><th>Planning expiry</th><th>Status</th><th>Tag</th></tr></thead><tbody>";
    L.fefoLots(state, it).forEach(function (l) {
      var pe = L.planningExpiry(state, it, l);
      html += "<tr><td>" + esc(l.lotNumber) + "</td><td>" + l.qty + "</td><td>" + fmtDate(l.expiry) + "</td><td>" +
        (pe ? fmtDate(pe) : "–") + "</td><td>" + lotTag(L.lotStatus(state, it, l, t)) + '</td><td class="muted small">' + esc(l.tag) + "</td></tr>";
    });
    html += "</tbody></table></div>";

    html += '<div class="actions"><button class="btn" data-act="locate-item" data-id="' + it.id + '">Locate on map</button>' +
      (it.kind !== "equipment" ? '<button class="btn primary" data-act="dispense-item" data-id="' + it.id + '">Dispense</button>' : "") + "</div>";
    d.innerHTML = html;
    d.hidden = false;
    bd.hidden = false;
  }
  function stat(v, label) { return '<div class="stat"><b>' + esc(v) + "</b><span>" + esc(label) + "</span></div>"; }

  // ---------- dispense wizard ----------

  function startWizard(opts) {
    var c = cmo();
    ui.wiz = Object.assign({
      step: "start", patientId: null, report: { symptoms: [], vitals: {} }, result: null,
      itemId: null, qty: 1, reason: "", preItem: false,
      sigs: { patient: {}, approver: {}, witness: {} }, ack: false, cmoUnavailable: false,
      authType: null, signedBy: [], lotId: null, scan: "", scanError: "", scanNote: "", scanSkipped: false,
      count: "", emergency: false, releasedBy: c ? c.id : "", locateOnly: false, requestId: null, entry: null, error: "", query: ""
    }, opts || {});
    ui.view = "dispense";
  }

  function viewDispense() {
    if (!ui.wiz) startWizard();
    var w = ui.wiz, body;
    switch (w.step) {
      case "symptoms": body = viewSymptoms(w); break;
      case "suggest": body = viewSuggest(w); break;
      case "pick": body = viewPick(w); break;
      case "auth": body = viewAuth(w); break;
      case "queued": body = viewQueued(w); break;
      case "locate": body = viewLocate(w); break;
      case "scan": body = viewScan(w); break;
      case "count": body = viewCount(w); break;
      case "done": body = viewDone(w); break;
      case "emergency": body = viewEmergency(w); break;
      default: body = viewStart(w);
    }
    return '<div class="wizard' + (w.emergency ? " em" : "") + '">' + wizProgress(w) + body + "</div>";
  }

  function wizProgress(w) {
    var steps = w.emergency ? ["Patient and item", "Locate", "Scan", "Done"] : ["Patient", "Need", "Authorise", "Locate", "Scan", "Done"];
    var idx = w.emergency ? { emergency: 0, locate: 1, scan: 2, count: 2, done: 3 }
      : { start: 0, symptoms: 1, suggest: 1, pick: 1, auth: 2, queued: 2, locate: 3, scan: 4, count: 4, done: 5 };
    var cur = idx[w.step] || 0;
    return '<ol class="progress">' + steps.map(function (s, i) {
      return '<li class="' + (i < cur ? "done" : i === cur ? "cur" : "") + '">' + s + "</li>";
    }).join("") + "</ol>";
  }

  function patientBar(w, allowChange) {
    if (w.emergency) return '<div class="em-banner">Emergency release' + (w.patientId ? " for " + esc(crewName(w.patientId)) : "") + "</div>";
    var c = L.getCrew(state, w.patientId);
    if (!c) return "";
    return '<div class="patient-bar">For <b>' + esc(c.name) + '</b> <span class="muted">' + esc(c.role) + "</span>" + crewTags(c) +
      (allowChange ? '<button class="link" data-act="wiz-go" data-step="start">Change</button>' : "") + "</div>";
  }

  function viewStart(w) {
    var html = "<h2>Who is it for?</h2><div class=\"crew-grid\">";
    state.crew.forEach(function (c) {
      html += '<button class="crew-card' + (w.patientId === c.id ? " sel" : "") + '" data-act="wiz-patient" data-id="' + c.id + '"><b>' +
        esc(c.name) + '</b><span class="muted">' + esc(c.role) + "</span>" + crewTags(c) + "</button>";
    });
    html += "</div>";
    var dis = w.patientId ? "" : " disabled";
    html += "<h3>What do you need?</h3><div class=\"choice-row\">";
    if (w.preItem && w.itemId) {
      html += '<button class="btn primary big" data-act="wiz-choose" data-id="' + w.itemId + '"' + dis + ">Continue with " + esc(itemLabel(L.getItem(state, w.itemId))) + "</button>";
    }
    html += '<button class="btn ' + (w.preItem ? "" : "primary ") + 'big" data-act="wiz-go" data-step="symptoms"' + dis + ">Describe symptoms</button>" +
      '<button class="btn big" data-act="wiz-go" data-step="pick"' + dis + ">I know which item</button></div>";
    if (!w.patientId) html += '<p class="hint">Choose a crew member first.</p>';

    html += "<h3>Reports from health monitoring</h3>";
    if (!state.reports.length) html += '<p class="muted">No reports yet.</p>';
    state.reports.forEach(function (r, i) {
      html += '<div class="report"><div><b>' + esc(crewName(r.crewId)) + '</b> <span class="muted">' + ago(r.time) +
        (r.source === "sample" ? " · sample" : "") + "</span><div>" +
        r.symptoms.map(function (s) { return esc(symLabel(s.code)) + " " + s.severity + "/10"; }).join(", ") +
        '</div></div><button class="btn" data-act="wiz-report" data-idx="' + i + '">Open</button></div>';
    });
    html += '<details class="paste"><summary>Paste a report as JSON (format in spec.md, section 8)</summary>' +
      '<textarea id="pasteJson" rows="7" data-bind="pasteJson" spellcheck="false">' + esc(ui.pasteJson) + "</textarea>" +
      '<button class="btn" data-act="paste-report">Load report</button></details>';
    return html;
  }

  function symRow(w, s) {
    var idx = -1;
    w.report.symptoms.forEach(function (x, i) { if (x.code === s.code) idx = i; });
    var on = idx >= 0;
    var html = '<div class="sym' + (on ? " on" : "") + (s.redFlag ? " red" : "") + '"><label><input type="checkbox" data-act="wiz-sym" data-code="' +
      s.code + '"' + (on ? " checked" : "") + "> " + esc(s.label) + "</label>";
    if (on && !s.redFlag) {
      var sev = w.report.symptoms[idx].severity;
      html += '<label class="sev">Severity <input id="sev-' + s.code + '" type="range" min="1" max="10" value="' + sev +
        '" data-bind="wiz.report.symptoms.' + idx + '.severity" data-rerender> <b>' + sev + "</b>/10</label>";
    }
    return html + "</div>";
  }

  function vitalInput(w, key, label, unit, step) {
    var v = w.report.vitals[key];
    return "<label>" + esc(label) + " (" + unit + ')<input id="v-' + key + '" type="number" step="' + (step || "1") + '" value="' +
      (v == null ? "" : esc(v)) + '" data-bind="wiz.report.vitals.' + key + '"></label>';
  }

  function viewSymptoms(w) {
    var html = patientBar(w, true) + "<h2>Symptoms</h2><div class=\"sym-grid\">";
    state.symptoms.filter(function (s) { return !s.redFlag; }).forEach(function (s) { html += symRow(w, s); });
    html += '</div><h3 class="urgent-h">Urgent symptoms</h3><div class="sym-grid">';
    state.symptoms.filter(function (s) { return s.redFlag; }).forEach(function (s) { html += symRow(w, s); });
    html += '</div><h3>Vitals <span class="muted">(optional, filled in by health monitoring when connected)</span></h3><div class="vitals">' +
      vitalInput(w, "heartRate", "Heart rate", "bpm") + vitalInput(w, "spo2", "SpO₂", "%") +
      vitalInput(w, "tempC", "Temperature", "°C", "0.1") + vitalInput(w, "systolic", "Systolic BP", "mmHg") + "</div>";
    html += '<div class="actions"><button class="btn" data-act="wiz-go" data-step="start">Back</button><button class="btn primary" data-act="wiz-check"' +
      (w.report.symptoms.length ? "" : " disabled") + ">Check options</button></div>";
    return html;
  }

  function symptomsText(w) {
    return w.report.symptoms.map(function (s) { return symLabel(s.code); }).join(", ");
  }

  function cleanVitals(v) {
    var out = {};
    Object.keys(v || {}).forEach(function (k) { if (v[k] !== "" && v[k] != null && !isNaN(Number(v[k]))) out[k] = Number(v[k]); });
    return out;
  }

  function runCheck() {
    var w = ui.wiz;
    w.result = L.suggest(state, { crewId: w.patientId, symptoms: w.report.symptoms, vitals: cleanVitals(w.report.vitals) }, now());
    w.step = "suggest";
  }

  function suggestionCard(s) {
    var it = s.item, sf = s.safety, loc = L.locationOf(state, it, sf.lot);
    var issues = sf.checks.filter(function (c) { return c.result !== "pass"; });
    var btn;
    if (!sf.lot) btn = '<span class="muted">No usable stock. Ask the CMO about an alternative.</span>';
    else if (sf.result === "block") btn = '<button class="btn" data-act="wiz-choose" data-id="' + it.id + '">Ask the CMO for this</button>';
    else btn = '<button class="btn primary" data-act="wiz-choose" data-id="' + it.id + '">Choose</button>';
    return '<div class="sugg r-' + sf.result + '"><div class="sugg-head"><div><b>' + esc(it.name) + '</b> <span class="muted">' + esc(it.strength) +
      " · " + s.qty + " × " + esc(it.form) + "</span></div><div>" +
      (it.ownerCrewId ? '<span class="badge muted">Your own</span> ' : "") +
      (it.tier === "3" ? '<span class="badge t-3">Standing order</span> ' : "") + resultBadge(sf.result) + "</div></div>" +
      '<div class="muted small">Matches: ' + s.matched.map(symLabel).map(esc).join(", ") + " · " + esc(locShort(loc)) + "</div>" +
      (issues.length ? '<ul class="checks">' + issues.map(function (c) {
        return '<li class="' + c.result + '"><b>' + esc(c.name) + ":</b> " + esc(c.msg) + "</li>";
      }).join("") + "</ul>" : "") +
      "<details><summary>" + (sf.checks.length - issues.length) + " of " + sf.checks.length + " checks passed</summary>" + checksTable(sf) + "</details>" +
      '<div class="sugg-actions">' + btn + "</div></div>";
  }

  function viewSuggest(w) {
    var r = w.result, html = patientBar(w, true);
    if (r.escalate) {
      var who = cmo() && cmo().id !== w.patientId ? cmo() : backupCmo();
      html += '<div class="panel urgent"><h2>Get the CMO now</h2><p>These need a person, not a suggestion:</p><ul>' +
        r.reasons.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul><p><b>" + esc(who.name) + "</b> (" + esc(who.role) +
        ") decides. Ground is " + state.mission.commDelayMin + " minutes away one way, so don't wait for them.</p>" +
        '<div class="actions"><button class="btn danger" data-act="emergency">Open emergency items</button>' +
        '<button class="btn" data-act="wiz-go" data-step="symptoms">Back to symptoms</button></div></div>';
      return html;
    }
    html += "<h2>Options</h2><p class=\"muted\">For: " + esc(symptomsText(w)) +
      ". Suggestions are advice: you choose, and you can always ask the CMO instead.</p>";
    if (!r.suggestions.length) html += "<p>No self-care item matches. Ask the CMO.</p>";
    r.suggestions.forEach(function (s) { html += suggestionCard(s); });
    if (r.askCmo.length) {
      html += '<h3>Options that need the CMO</h3><div class="ask-list">';
      r.askCmo.forEach(function (a) {
        html += '<div class="ask"><span><b>' + esc(a.item.name) + "</b> " + esc(a.item.strength) + " " + tierBadge(a.item.tier, a.item.controlled) +
          ' <span class="muted">for ' + a.matched.map(symLabel).map(esc).join(", ") + '</span></span><button class="btn" data-act="wiz-choose" data-id="' +
          a.item.id + '">Request</button></div>';
      });
      html += "</div>";
    }
    html += '<div class="actions"><button class="btn" data-act="wiz-go" data-step="symptoms">Back</button>' +
      '<button class="btn" data-act="wiz-go" data-step="pick">Choose another item</button></div>';
    return html;
  }

  function viewPick(w) {
    var t = now(), q = (w.query || "").toLowerCase();
    var list = state.items.filter(function (it) {
      return it.kind !== "equipment" && (!q || (it.name + " " + it.strength + " " + it.form).toLowerCase().indexOf(q) >= 0);
    });
    var html = patientBar(w, true) + '<h2>Choose an item</h2><input id="pickQ" type="search" placeholder="Search medicines and supplies" aria-label="Search" value="' +
      esc(w.query || "") + '" data-bind="wiz.query" data-live><div class="pick-list">';
    list.forEach(function (it) {
      var s = L.stock(state, it, t);
      html += '<div class="pick"><span><b>' + esc(it.name) + '</b> <span class="muted">' + esc(it.strength) + " · " + esc(it.form) +
        (it.ownerCrewId ? " · for " + esc(crewName(it.ownerCrewId)) : "") + "</span></span><span>" + packChip(it.packId) + " " +
        tierBadge(it.tier, it.controlled) + ' <span class="muted">' + s.usable + ' usable</span></span><button class="btn" data-act="wiz-choose" data-id="' +
        it.id + '"' + (s.usable ? "" : " disabled") + ">Select</button></div>";
    });
    html += '</div><div class="actions"><button class="btn" data-act="wiz-go" data-step="start">Back</button></div>';
    return html;
  }

  function currentAuth(w, t) {
    var it = L.getItem(state, w.itemId), qty = Math.max(1, Number(w.qty) || 1);
    var sf = L.safetyChecks(state, w.patientId, it, qty, t);
    var gate = L.gateFor(state, w.patientId, it, qty, t, sf);
    return { item: it, qty: qty, safety: sf, gate: gate };
  }

  function viewAuth(w) {
    var t = now(), a = currentAuth(w, t), it = a.item, sf = a.safety, gate = a.gate, loc = L.locationOf(state, it, sf.lot);
    var html = patientBar(w, false) + "<h2>Authorise</h2>";
    html += '<div class="card"><div class="row-between"><div><b>' + esc(it.name) + "</b> " + esc(it.strength) + " · " + esc(it.form) + "</div><div>" +
      tierBadge(it.tier, it.controlled) + " " + packChip(it.packId) + '</div></div><div class="muted small">' + esc(locShort(loc)) + "</div>" +
      '<div class="form-row"><label>Quantity<input id="wizQty" type="number" min="1" value="' + a.qty + '" data-bind="wiz.qty" data-rerender></label>' +
      '<label class="grow">Reason<input id="wizReason" type="text" value="' + esc(w.reason) + '" data-bind="wiz.reason"></label></div></div>';
    html += "<h3>Safety checks " + resultBadge(sf.result) + "</h3>" + checksTable(sf);
    if (!sf.lot) {
      return html + '<div class="panel bad">No usable lot with ' + a.qty + ' left. Ask the CMO about an alternative.</div>' +
        '<div class="actions"><button class="btn" data-act="wiz-back-from-auth">Back</button></div>';
    }
    html += '<div class="gate"><h3>' + esc(AUTH[gate.type]) + '</h3><p class="muted">' + esc(gate.why) + "</p>";
    if (gate.type === "self" || gate.type === "standing-order") {
      html += '<div class="sig"><span class="sig-label">PIN of ' + esc(crewName(w.patientId)) + '</span><input id="pinPatient" type="password" inputmode="numeric" autocomplete="new-password" placeholder="PIN" value="' +
        esc(w.sigs.patient.pin || "") + '" data-bind="wiz.sigs.patient.pin"></div>';
    }
    if (gate.type === "cmo" || gate.type === "cmo+witness") {
      if (sf.result === "block") {
        html += '<label class="check"><input id="wizAck" type="checkbox" data-bind="wiz.ack"' + (w.ack ? " checked" : "") +
          "> Approver: I have reviewed the blocked checks above and still approve</label>";
      }
      html += sigFields("wiz.sigs.approver", "Approver (CMO, or backup CMO)", approverOptions(w.patientId), w.sigs.approver, "apr");
      var c = cmo();
      if (c && c.id !== w.patientId) {
        html += '<label class="check"><input id="wizCmoUn" type="checkbox" data-bind="wiz.cmoUnavailable"' + (w.cmoUnavailable ? " checked" : "") +
          "> " + esc(c.name) + " (CMO) is unavailable, so the backup CMO signs</label>";
      }
      if (gate.type === "cmo+witness") html += sigFields("wiz.sigs.witness", "Witness (another crew member)", state.crew, w.sigs.witness, "wit");
    }
    if (gate.type !== "none") html += pinHint();
    if (w.error) html += '<p class="error">' + esc(w.error) + "</p>";
    html += '<div class="actions"><button class="btn" data-act="wiz-back-from-auth">Back</button>' +
      (gate.type === "cmo" || gate.type === "cmo+witness" ? '<button class="btn" data-act="wiz-queue">CMO not here: send to approvals</button>' : "") +
      '<button class="btn primary" data-act="wiz-authorise">' + (gate.type === "none" ? "Continue" : "Sign and continue") + "</button></div></div>";
    return html;
  }

  function authorise() {
    var w = ui.wiz, t = now(), a = currentAuth(w, t), err = null, signedBy = [];
    if (!a.safety.lot) { w.error = "No usable stock"; return; }
    var ctx = { patientId: w.patientId, approverId: w.sigs.approver.crewId, cmoUnavailable: w.cmoUnavailable };
    switch (a.gate.type) {
      case "none":
        signedBy = [w.patientId];
        break;
      case "self":
      case "standing-order":
        err = L.checkSignature(state, "patient", w.patientId, w.sigs.patient.pin || "", ctx);
        signedBy = [w.patientId];
        break;
      case "cmo":
      case "cmo+witness":
        if (a.safety.result === "block" && !w.ack) err = "The approver has to review the blocked checks first (tick the box).";
        err = err || L.checkSignature(state, "approver", w.sigs.approver.crewId, w.sigs.approver.pin || "", ctx);
        signedBy = [w.sigs.approver.crewId];
        if (!err && a.gate.type === "cmo+witness") {
          err = L.checkSignature(state, "witness", w.sigs.witness.crewId, w.sigs.witness.pin || "", ctx);
          signedBy.push(w.sigs.witness.crewId);
        }
        break;
      default:
        err = "Use the emergency release for this item";
    }
    if (err) { w.error = err; return; }
    w.error = "";
    w.qty = a.qty;
    w.authType = a.gate.type;
    w.signedBy = signedBy;
    w.lotId = a.safety.lot.id;
    w.sigs = { patient: {}, approver: {}, witness: {} };
    w.step = "locate";
  }

  function queueRequest() {
    var w = ui.wiz, t = now(), a = currentAuth(w, t);
    var r = {
      id: "R" + state.seq++, time: t.toISOString(), patientId: w.patientId, itemId: a.item.id, qty: a.qty,
      reason: w.reason, tier: a.item.tier, gate: a.gate.type, status: "pending", signatures: []
    };
    state.requests.unshift(r);
    w.requestId = r.id;
    w.step = "queued";
    save();
  }

  function viewQueued(w) {
    var it = L.getItem(state, w.itemId);
    return patientBar(w, false) + '<div class="panel"><h2>Sent to approvals</h2><p>' + esc(Number(w.qty) || 1) + " × " + esc(itemLabel(it)) +
      " is waiting for sign-off. Once it's signed, " + esc(firstName(w.patientId)) + " continues from retrieval on the Approvals page.</p>" +
      '<div class="actions"><button class="btn primary" data-act="nav" data-view="approvals">Go to approvals</button><button class="btn" data-act="wiz-new">New dispense</button></div></div>';
  }

  function retrievalSteps(it, lot, qty, loc) {
    return "<li>Open locker <b>" + esc(loc.locker.label) + "</b> (" + esc(loc.locker.zone) + ").</li>" +
      "<li>Release the retention strap and pull the <b>" + esc(loc.pack.colour) + " pack</b> (" + esc(loc.pack.name) + "). Keep it tethered.</li>" +
      "<li>Open slot <b>" + esc(loc.slot) + "</b>. Take <b>" + qty + " × " + esc(itemLabel(it)) + "</b>" +
      (lot ? " from lot <b>" + esc(lot.lotNumber) + "</b>" + (lot.expiry ? " (expires " + fmtDate(lot.expiry) + ")" : "") : "") + ".</li>" +
      "<li>Close the slot, put the pack back and fasten the strap before you let go of anything.</li>";
  }

  function viewLocate(w) {
    var it = L.getItem(state, w.itemId), lot = w.lotId ? L.getLot(state, w.lotId) : null, loc = L.locationOf(state, it, lot);
    var html = patientBar(w, false) + "<h2>Get it</h2><div class=\"locate\"><div><div class=\"target-line\">" + locText(loc) + "</div>" +
      '<ol class="steps">' + retrievalSteps(it, lot, Number(w.qty) || 1, loc) + "</ol>";
    if (w.locateOnly) html += '<button class="btn primary" data-act="wiz-em-back">Back to emergency items</button>';
    else html += '<button class="btn primary big" data-act="wiz-go" data-step="scan">I have it: scan</button>';
    html += "</div><div>" + mapSvg({ itemId: it.id, lotId: w.lotId }, loc.locker.id, true) + slotGrid(loc.pack, loc.slot) + "</div></div>";
    return html;
  }

  function viewScan(w) {
    var it = L.getItem(state, w.itemId), lot = L.getLot(state, w.lotId);
    var html = patientBar(w, false) + "<h2>Scan to confirm</h2><p>Scan the tag on the package, or type it. Expected: <b>" + esc(itemLabel(it)) +
      "</b>, lot " + esc(lot.lotNumber) + ".</p>";
    html += '<div class="form-row"><input id="scanInput" type="text" placeholder="TAG-…" aria-label="Tag" autocomplete="off" value="' + esc(w.scan) +
      '" data-bind="wiz.scan"><button class="btn primary" data-act="wiz-scan">Confirm</button></div>';
    html += '<div class="demo-row"><span class="muted small">Demo:</span><button class="btn small" data-act="wiz-sim" data-kind="right">Simulate correct scan</button>' +
      '<button class="btn small" data-act="wiz-sim" data-kind="wrong">Simulate wrong item</button>' +
      (w.emergency ? '<button class="btn small danger-outline" data-act="wiz-skip-scan">Skip scan (emergency)</button>' : "") + "</div>";
    if (w.scanError) html += '<p class="error">' + esc(w.scanError) + "</p>";
    html += '<div class="actions"><button class="btn" data-act="wiz-go" data-step="locate">Back to location</button></div>';
    return html;
  }

  function doScan() {
    var w = ui.wiz, t = now(), it = L.getItem(state, w.itemId), qty = Number(w.qty) || 1, expected = L.getLot(state, w.lotId);
    var tag = String(w.scan || "").trim().toUpperCase();
    w.scanError = ""; w.scanNote = "";
    if (!tag) { w.scanError = "Scan or type the tag first."; return; }
    var lot = state.lots.filter(function (l) { return l.tag.toUpperCase() === tag; })[0];
    if (!lot) { w.scanError = "Unknown tag " + tag + ". Check the label."; return; }
    if (lot.itemId !== it.id) {
      var other = L.getItem(state, lot.itemId);
      w.scanError = "Wrong item: that's " + itemLabel(other) + ". Put it back in slot " + lot.slot + " and take " + itemLabel(it) + " from slot " + expected.slot + ".";
      return;
    }
    if (L.lotStatus(state, it, lot, t) === "expired" && !w.emergency) {
      w.scanError = "Lot " + lot.lotNumber + " is expired. Put it back and use lot " + expected.lotNumber + ".";
      return;
    }
    if (lot.qty < qty) { w.scanError = "Lot " + lot.lotNumber + " has only " + lot.qty + " left."; return; }
    if (lot.id !== expected.id) {
      w.scanNote = "You took lot " + lot.lotNumber + " instead of the suggested " + expected.lotNumber + " (first to expire). Logged as " + lot.lotNumber + ".";
    }
    w.lotId = lot.id;
    afterScan();
  }

  function afterScan() {
    var w = ui.wiz, it = L.getItem(state, w.itemId);
    if (L.needsCountCheck(it)) { w.step = "count"; w.count = ""; w.error = ""; }
    else finish();
  }

  function counterOf(w) {
    if (w.authType === "cmo+witness") return w.signedBy[1] || null;
    if (w.authType === "standing-order") return w.patientId;
    if (w.authType === "break-glass") return w.releasedBy;
    return w.patientId;
  }

  function viewCount(w) {
    var it = L.getItem(state, w.itemId), lot = L.getLot(state, w.lotId), loc = L.locationOf(state, it, lot), who = counterOf(w);
    var html = patientBar(w, false) + "<h2>Count check</h2><p><b>" + esc(who ? crewName(who) : "A second crew member") +
      "</b>: count the units left in slot " + esc(loc.slot) + " (lot " + esc(lot.lotNumber) + ") after taking " + (Number(w.qty) || 1) +
      ". Type the number you see, without looking anything up.</p>";
    html += '<div class="form-row"><label>Units left<input id="countInput" type="number" min="0" value="' + esc(w.count) + '" data-bind="wiz.count"></label>' +
      '<button class="btn primary" data-act="wiz-count">Record count</button></div>';
    html += '<p class="hint">Controlled medicines are counted at every release. A mismatch is flagged for the CMO and ground.</p>';
    if (w.error) html += '<p class="error">' + esc(w.error) + "</p>";
    return html;
  }

  function finish(extra) {
    var w = ui.wiz;
    try {
      w.entry = L.dispense(state, Object.assign({
        patientId: w.patientId, itemId: w.itemId, lotId: w.lotId, qty: Number(w.qty) || 1, reason: w.reason,
        authType: w.authType, signedBy: w.signedBy, requestId: w.requestId, scanSkipped: w.scanSkipped
      }, extra || {}), now());
      save();
      w.step = "done";
    } catch (err) {
      w.scanError = err.message;
      w.error = err.message;
    }
  }

  function viewDone(w) {
    var e = w.entry, it = L.getItem(state, e.itemId), lot = L.getLot(state, e.lotId), t = now();
    var notes = [];
    if (w.scanNote) notes.push(["info", w.scanNote]);
    if (e.scanSkipped) notes.push(["warn", "Scan skipped (emergency). Check the item against the log when things are calm."]);
    if (e.countCheck) {
      if (e.countCheck.counted !== e.countCheck.expected) notes.push(["bad", "Count mismatch: expected " + e.countCheck.expected + ", counted " + e.countCheck.counted + ". Flagged on the Approvals page."]);
      else notes.push(["ok", "Count matches: " + e.countCheck.counted + " left in the slot."]);
    }
    if (e.docsDue) notes.push(["bad", "Write what happened by " + clock(e.docsDue) + " (Approvals page)."]);
    if (e.groundReview === "pending") notes.push(["info", "Sent for ground review. The answer arrives after the signal delay."]);
    if (L.lotStatus(state, it, lot, t) === "potency-risk") notes.push(["warn", "This lot is past its planning expiry. If it doesn't help, tell the CMO: potency may be low."]);
    var s = L.stock(state, it, t);
    if (it.reserve && s.usable < it.reserve) notes.push(["warn", "Stock is now below the reserve (" + s.usable + " usable, reserve " + it.reserve + "). The CMO decides the next releases."]);
    if (it.kind === "medication") notes.push(["muted", "In about an hour, record whether it helped (Dose log)."]);

    var html = '<div class="panel ok"><h2>Logged</h2><p><b>' + e.qty + " × " + esc(itemLabel(it)) + "</b> for " + esc(crewName(e.patientId)) +
      " at " + clock(e.time) + ". Lot " + esc(lot.lotNumber) + ". " + esc(AUTH[e.auth.type]) +
      (e.auth.signedBy.length ? " (" + e.auth.signedBy.map(crewName).map(esc).join(", ") + ")" : "") + ".</p>";
    html += "<div>" + notes.map(function (n) { return '<div class="tag ' + n[0] + '" style="display:block;border-radius:6px;padding:6px 10px;margin:6px 0">' + esc(n[1]) + "</div>"; }).join("") + "</div>";
    html += '<div class="actions"><button class="btn primary" data-act="wiz-new">New dispense</button>' +
      (e.docsDue ? '<button class="btn" data-act="nav" data-view="approvals">Write documentation</button>' : "") +
      '<button class="btn" data-act="nav" data-view="dashboard">Dashboard</button></div></div>';
    return html;
  }

  // ---------- emergency ----------

  function viewEmergency(w) {
    var t = now();
    var html = '<div class="panel urgent"><h2>Emergency release</h2><p>No sign-off needed. Everything is logged, and documentation is due within 2 hours.</p></div>';
    html += '<h3>Patient</h3><div class="crew-grid">';
    state.crew.forEach(function (c) {
      html += '<button class="crew-card' + (w.patientId === c.id ? " sel" : "") + '" data-act="wiz-patient" data-id="' + c.id + '"><b>' +
        esc(c.name) + '</b><span class="muted">' + esc(c.role) + "</span>" + crewTags(c) + "</button>";
    });
    html += '</div><h3>Item <span class="muted">(Red pack, locker M1 by the hatch)</span></h3><div class="crew-grid">';
    state.items.filter(function (it) { return it.tier === "4"; }).forEach(function (it) {
      var s = L.stock(state, it, t);
      html += '<button class="em-item' + (w.itemId === it.id ? " sel" : "") + '" data-act="wiz-em-item" data-id="' + it.id + '"><b>' + esc(it.name) +
        "</b><span>" + esc(it.strength) + '</span><span class="muted">' + (it.kind === "equipment" ? "Equipment" : s.usable + " left") +
        (it.controlled ? " · " + esc(it.controlled) : "") + "</span></button>";
    });
    html += "</div>";
    if (w.itemId) {
      var it = L.getItem(state, w.itemId);
      if (it.kind === "equipment") {
        html += '<div class="actions"><button class="btn danger big" data-act="wiz-em-locate">Show where it is</button></div>';
      } else {
        html += '<div class="form-row"><label>Quantity<input id="emQty" type="number" min="1" value="' + esc(w.qty) + '" data-bind="wiz.qty"></label>' +
          '<label class="grow">What is happening (required)<input id="emReason" type="text" value="' + esc(w.reason) + '" data-bind="wiz.reason"></label>' +
          '<label>Released by<select id="emBy" data-bind="wiz.releasedBy">' + state.crew.map(function (c) {
            return '<option value="' + c.id + '"' + (w.releasedBy === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>";
          }).join("") + "</select></label></div>";
        html += '<label class="check"><input id="emAck" type="checkbox" data-bind="wiz.ack"' + (w.ack ? " checked" : "") + "> This is an emergency</label>";
        html += '<div class="actions"><button class="btn danger big" data-act="wiz-em-release">Release now</button></div>';
      }
    }
    if (w.error) html += '<p class="error">' + esc(w.error) + "</p>";
    return html;
  }

  function emergencyRelease() {
    var w = ui.wiz, t = now(), it = L.getItem(state, w.itemId), qty = Math.max(1, Number(w.qty) || 1);
    if (!w.patientId) { w.error = "Choose the patient."; return; }
    if (!String(w.reason || "").trim()) { w.error = "Say in a few words what is happening."; return; }
    if (!w.ack) { w.error = "Tick \"This is an emergency\"."; return; }
    var lot = L.pickLot(state, it, qty, t).lot || L.fefoLots(state, it).filter(function (l) { return l.qty >= qty; })[0];
    if (!lot) { w.error = "None left. Ask the CMO for an alternative."; return; }
    w.error = "";
    w.qty = qty;
    w.lotId = lot.id;
    w.authType = "break-glass";
    w.signedBy = [w.releasedBy];
    w.step = "locate";
  }

  // ---------- approvals ----------

  function requestGate(r) { return r.gate || (r.tier === "3" ? "cmo+witness" : "cmo"); }

  function requestCard(r, t) {
    var it = L.getItem(state, r.itemId), gate = requestGate(r);
    var approver = r.signatures.filter(function (s) { return s.role !== "Witness"; })[0];
    var witness = r.signatures.filter(function (s) { return s.role === "Witness"; })[0];
    var need = !approver ? "approver" : (gate === "cmo+witness" && !witness ? "witness" : null);
    var sf = L.safetyChecks(state, r.patientId, it, r.qty, t);
    var f = ui.appr[r.id] || {};
    var html = '<div class="card"><div class="row-between"><div><b>' + r.qty + " × " + esc(itemLabel(it)) + "</b> " + tierBadge(it.tier, it.controlled) +
      '</div><span class="muted small">' + ago(r.time) + "</span></div>";
    html += "<div>For <b>" + esc(crewName(r.patientId)) + "</b>: " + esc(r.reason || "no reason given") + "</div>";
    html += '<div class="muted small">Needs ' + esc(AUTH[gate]) + ". Signed: " + (r.signatures.length ? r.signatures.map(function (s) {
      return esc(crewName(s.crewId)) + " (" + esc(s.role) + ")";
    }).join(", ") : "nobody yet") + "</div>";
    html += '<div class="small">Safety checks: ' + resultBadge(sf.result) + " " +
      esc(sf.checks.filter(function (c) { return c.result !== "pass"; }).map(function (c) { return c.name + ": " + c.msg; }).join("; ")) + "</div>";
    if (!need) {
      html += '<div class="actions"><button class="btn primary" data-act="appr-retrieve" data-id="' + r.id + '">Signed: retrieve now</button></div>';
    } else {
      var opts = need === "approver" ? approverOptions(r.patientId) : state.crew;
      html += sigFields("appr." + r.id, need === "approver" ? "Approver (CMO, or backup CMO)" : "Witness (not the patient or approver)", opts, f, "ap-" + r.id);
      if (need === "approver") {
        if (sf.result === "block") {
          html += '<label class="check"><input id="ack-' + r.id + '" type="checkbox" data-bind="appr.' + r.id + '.ack"' + (f.ack ? " checked" : "") +
            "> I have reviewed the blocked checks and still approve</label>";
        }
        var c = cmo();
        if (c && c.id !== r.patientId) {
          html += '<label class="check"><input id="un-' + r.id + '" type="checkbox" data-bind="appr.' + r.id + '.cmoUnavailable"' + (f.cmoUnavailable ? " checked" : "") +
            "> " + esc(c.name) + " (CMO) is unavailable</label>";
        }
      }
      if (f.error) html += '<p class="error">' + esc(f.error) + "</p>";
      html += '<div class="actions"><button class="btn" data-act="appr-deny" data-id="' + r.id + '">Deny</button><button class="btn primary" data-act="appr-sign" data-id="' +
        r.id + '">Sign as ' + need + "</button></div>";
    }
    return html + "</div>";
  }

  function entrySummary(e) {
    var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null;
    return "<b>" + e.qty + " × " + esc(itemLabel(it)) + "</b> for " + esc(crewName(e.patientId)) + ' <span class="muted small">' + fmtTime(e.time) +
      (lot ? " · lot " + esc(lot.lotNumber) : "") + " · " + esc(AUTH[e.auth.type]) +
      (e.auth.signedBy.length ? " (" + e.auth.signedBy.map(crewName).map(esc).join(", ") + ")" : "") + "</span>";
  }

  function viewApprovals() {
    var t = now(), a = L.alerts(state, t);
    var html = "<h2>Approvals and reviews</h2>";

    html += "<h3>Requests waiting (" + a.pending.length + ")</h3>";
    if (!a.pending.length) html += '<p class="muted">Nothing waiting.</p>';
    a.pending.forEach(function (r) { html += requestCard(r, t); });
    if (a.pending.length) html += pinHint();

    html += "<h3>Emergency documentation due (" + a.docsDue.length + ")</h3>";
    if (!a.docsDue.length) html += '<p class="muted">All emergency releases are documented.</p>';
    a.docsDue.forEach(function (e) {
      var late = new Date(e.docsDue) < t;
      html += '<div class="card"><div>' + entrySummary(e) + '</div><div class="small ' + (late ? "error" : "muted") + '">Due ' + fmtTime(e.docsDue) +
        (late ? " (overdue)" : "") + "</div><p class=\"small\">Reason given: " + esc(e.reason) + '</p><textarea id="doc-' + e.id + '" rows="3" placeholder="What happened, what was given, how the patient responded" data-bind="docs.' +
        e.id + '">' + esc(ui.docs[e.id] || "") + '</textarea><div class="actions"><button class="btn primary" data-act="doc-save" data-id="' + e.id + '">Save documentation</button></div></div>';
    });

    html += "<h3>Count discrepancies (" + a.countIssues.length + ")</h3>";
    if (!a.countIssues.length) html += '<p class="muted">No open discrepancies.</p>';
    a.countIssues.forEach(function (e) {
      html += '<div class="card"><div>' + entrySummary(e) + '</div><div class="error small">Expected ' + e.countCheck.expected + " left, counted " + e.countCheck.counted +
        (e.countCheck.by ? " (by " + esc(crewName(e.countCheck.by)) + ")" : "") + '.</div><div class="form-row"><label class="grow">Resolution<input id="cnt-' + e.id +
        '" type="text" placeholder="For example: recounted, one tablet found in the next slot" value="' + esc(ui.notes["cnt-" + e.id] || "") + '" data-bind="notes.cnt-' + e.id +
        '"></label><button class="btn" data-act="count-resolve" data-id="' + e.id + '">Mark resolved</button></div></div>';
    });

    html += "<h3>Waiting for ground review (" + a.groundReview.length + ")</h3><p class=\"muted small\">Controlled and emergency releases are reviewed by flight surgeons on the ground. Answers arrive after the signal delay (" +
      state.mission.commDelayMin + " min each way). In this prototype you can mark them reviewed.</p>";
    a.groundReview.forEach(function (e) {
      html += '<div class="report"><div>' + entrySummary(e) + '</div><button class="btn small" data-act="ground-done" data-id="' + e.id + '">Mark reviewed by ground</button></div>';
    });

    var closed = state.requests.filter(function (r) { return r.status === "denied" || r.status === "dispensed"; }).slice(0, 5);
    if (closed.length) {
      html += "<h3>Recently closed requests</h3>";
      closed.forEach(function (r) {
        var it = L.getItem(state, r.itemId);
        html += '<div class="report"><div>' + r.qty + " × " + esc(itemLabel(it)) + " for " + esc(crewName(r.patientId)) + '</div><span class="tag ' +
          (r.status === "denied" ? "bad" : "ok") + '">' + (r.status === "denied" ? "Denied" : "Dispensed") + "</span></div>";
      });
    }
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
    var err = null;
    if (role === "approver" && sf.result === "block" && !f.ack) err = "Review the blocked checks first (tick the box).";
    err = err || L.checkSignature(state, role, f.crewId, f.pin || "", ctx);
    if (err) { f.error = err; return; }
    var c = L.getCrew(state, f.crewId);
    r.signatures.push({ crewId: c.id, role: role === "approver" ? (c.isCMO ? "CMO" : "Backup CMO") : "Witness", time: now().toISOString() });
    var complete = gate === "cmo" || r.signatures.some(function (s) { return s.role === "Witness"; });
    if (complete) r.status = "approved";
    ui.appr[id] = {};
    save();
    toast(complete ? "Signed. " + firstName(r.patientId) + " can retrieve it now." : "Signed. A witness signs next.");
  }

  function retrieveRequest(id) {
    var r = findRequest(id), it = L.getItem(state, r.itemId), t = now();
    var pick = L.pickLot(state, it, r.qty, t);
    if (!pick.lot) { toast("No usable lot left for " + it.name); return; }
    startWizard({
      patientId: r.patientId, itemId: r.itemId, qty: r.qty, reason: r.reason, requestId: r.id,
      authType: requestGate(r), signedBy: r.signatures.map(function (s) { return s.crewId; }), lotId: pick.lot.id, step: "locate"
    });
  }

  // ---------- dose log ----------

  function viewLog() {
    var t = now();
    var entries = state.doseLog.filter(function (e) { return !ui.logPatient || e.patientId === ui.logPatient; });
    var html = '<div class="row-between"><h2>Dose log</h2><div class="toolbar"><select id="logPatient" aria-label="Crew member" data-bind="logPatient" data-rerender><option value="">Everyone</option>' +
      state.crew.map(function (c) { return '<option value="' + c.id + '"' + (ui.logPatient === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") +
      '</select><button class="btn" data-act="export">Export JSON for ground</button></div></div>';
    html += '<p class="hint">Every release is logged, including over-the-counter use, which is rarely recorded today. Follow-ups say whether it helped.</p>';
    html += '<div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>What</th><th>Why</th><th>Authorised</th><th>Review</th><th>Did it help?</th></tr></thead><tbody>';
    entries.forEach(function (e) { html += logRow(e, t); });
    if (!entries.length) html += '<tr><td colspan="7" class="muted">No entries.</td></tr>';
    return html + "</tbody></table></div>";
  }

  function logRow(e, t) {
    var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null;
    var review = "";
    if (e.auth.type === "break-glass" && !e.documentation) review += '<span class="tag bad">Documentation due</span>';
    if (e.countCheck && e.countCheck.counted !== e.countCheck.expected) review += '<span class="tag ' + (e.countCheck.resolved ? "muted" : "bad") + '">Count mismatch' + (e.countCheck.resolved ? " (resolved)" : "") + "</span>";
    if (e.scanSkipped) review += '<span class="tag warn">Scan skipped</span>';
    if (e.groundReview === "pending") review += '<span class="tag info">Ground review pending</span>';
    if (e.groundReview === "done") review += '<span class="tag ok">Ground reviewed</span>';
    var fu;
    if (it.kind !== "medication") fu = '<span class="muted">–</span>';
    else if (e.followUp) {
      fu = '<span class="tag ' + (e.followUp.effective ? "ok" : "warn") + '">' + (e.followUp.effective ? "Helped" : "Didn't help") + "</span>" +
        (e.followUp.sideEffects ? '<div class="small">Side effects: ' + esc(e.followUp.sideEffects) + "</div>" : "");
    } else {
      fu = '<div class="fu"><input id="fx-' + e.id + '" type="text" placeholder="Side effects (optional)" value="' + esc(ui.notes["fx-" + e.id] || "") + '" data-bind="notes.fx-' + e.id + '">' +
        '<button class="btn small" data-act="fu" data-id="' + e.id + '" data-eff="1">Helped</button><button class="btn small" data-act="fu" data-id="' + e.id + '" data-eff="0">Didn\'t help</button></div>';
    }
    return "<tr><td>" + fmtTime(e.time) + "</td><td>" + esc(crewName(e.patientId)) + "</td><td>" + e.qty + " × " + esc(itemLabel(it)) +
      (lot ? '<div class="sub">lot ' + esc(lot.lotNumber) + "</div>" : "") + "</td><td>" + esc(e.reason) + "</td><td>" + esc(AUTH[e.auth.type]) +
      (e.auth.signedBy.length ? '<div class="sub">' + e.auth.signedBy.map(crewName).map(esc).join(", ") + "</div>" : "") + "</td><td>" + (review || '<span class="muted">–</span>') +
      "</td><td>" + fu + "</td></tr>";
  }

  function exportLog() {
    var data = {
      type: "dose-log-export",
      exportedAt: now().toISOString(),
      mission: state.mission.name,
      entries: state.doseLog.map(function (e) {
        var it = L.getItem(state, e.itemId), lot = e.lotId ? L.getLot(state, e.lotId) : null;
        return Object.assign({}, e, { patient: crewName(e.patientId), item: itemLabel(it), lot: lot ? lot.lotNumber : null });
      })
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "dose-log.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ---------- bay map ----------

  function focusLoc(focus) {
    if (!focus) return null;
    var it = L.getItem(state, focus.itemId);
    if (!it) return null;
    var lot = focus.lotId ? L.getLot(state, focus.lotId) : null;
    var loc = L.locationOf(state, it, lot);
    return { lockerId: loc.locker.id, packId: loc.pack.id, slot: loc.slot };
  }

  function mapSvg(focus, selLocker, compact) {
    var f = focusLoc(focus);
    var s = '<svg class="bay' + (compact ? " compact" : "") + '" viewBox="0 0 1000 420" role="img" aria-label="Plan of the medical bay">';
    s += '<rect class="hull" x="10" y="10" width="980" height="400" rx="40"/>';
    s += '<rect class="hatch" x="0" y="175" width="26" height="70" rx="6"/><text class="lbl sm" x="36" y="215">Hatch</text>';
    s += '<rect class="zone" x="620" y="250" width="330" height="130" rx="14"/><text class="lbl sm" x="785" y="320" text-anchor="middle">Restraint and treatment area</text>';
    state.lockers.forEach(function (lk) {
      var target = f && f.lockerId === lk.id, sel = selLocker === lk.id;
      var packs = state.packs.filter(function (p) { return p.lockerId === lk.id; });
      s += '<g class="locker' + (target ? " target" : "") + (sel ? " sel" : "") + '"' + (compact ? "" : ' data-act="map-locker" data-id="' + lk.id + '"') + ">";
      s += '<rect class="lk" x="' + lk.x + '" y="' + lk.y + '" width="' + lk.w + '" height="' + lk.h + '" rx="10"/>';
      s += '<text class="lbl big" x="' + (lk.x + 14) + '" y="' + (lk.y + 42) + '">' + esc(lk.label) + "</text>";
      var bw = (lk.w - 28 - (packs.length - 1) * 8) / packs.length;
      packs.forEach(function (p, i) {
        var x = lk.x + 14 + i * (bw + 8), y = lk.y + lk.h - 44;
        s += '<rect class="pk' + (f && f.packId === p.id ? " target" : "") + '" x="' + x + '" y="' + y + '" width="' + bw + '" height="30" rx="6" fill="' + p.hex + '"/>';
        s += '<text class="pk-lbl" x="' + (x + bw / 2) + '" y="' + (y + 20) + '" text-anchor="middle" fill="' + textOn(p.hex) + '">' + esc(p.colour) + "</text>";
      });
      s += "</g>";
    });
    if (f) {
      var lk = L.getLocker(state, f.lockerId);
      s += '<text class="lbl you" x="' + (lk.x + lk.w / 2) + '" y="' + (lk.y + lk.h + 24) + '" text-anchor="middle">▲ Here</text>';
    }
    return s + "</svg>";
  }

  function slotGrid(pack, hlSlot) {
    var bySlot = {};
    state.items.filter(function (i) { return i.packId === pack.id; }).forEach(function (i) { bySlot[i.slot] = i; });
    var rows = "ABCDEFGH".slice(0, pack.rows).split("");
    var html = '<div class="slots-wrap"><div class="slots-title"><span class="dot" style="background:' + pack.hex + '"></span>' + esc(pack.colour) +
      " pack · " + esc(pack.name) + '</div><div class="slots" style="grid-template-columns:22px repeat(' + pack.cols + ',minmax(0,1fr))"><span></span>';
    for (var c = 1; c <= pack.cols; c++) html += '<span class="sh">' + c + "</span>";
    rows.forEach(function (r) {
      html += '<span class="sh">' + r + "</span>";
      for (var c2 = 1; c2 <= pack.cols; c2++) {
        var code = r + c2, it = bySlot[code];
        html += it
          ? '<button class="slot filled' + (hlSlot === code ? " target" : "") + '" data-act="open-item" data-id="' + it.id + '" title="' + esc(itemLabel(it)) + '"><span class="code">' +
            code + "</span>" + esc(shortName(it)) + "</button>"
          : '<span class="slot empty"><span class="code">' + code + "</span></span>";
      }
    });
    return html + "</div></div>";
  }

  function viewMap() {
    var f = focusLoc(ui.map.focus);
    var html = '<h2>Medical bay</h2><p class="muted">2D plan (our layout, not NASA\'s). Click a locker, then a pack, then a slot.</p>';
    if (f) {
      var it = L.getItem(state, ui.map.focus.itemId);
      html += '<div class="target-line" style="margin-bottom:12px">' + esc(itemLabel(it)) + ": " + locText(L.locationOf(state, it)) +
        ' <button class="link" data-act="map-clear">Clear</button></div>';
    }
    html += '<div class="map-layout"><div>' + mapSvg(ui.map.focus, ui.map.lockerId, false) + '</div><div>';
    if (!ui.map.lockerId) {
      html += '<p class="muted">Select a locker.</p><ul class="legend">' + state.packs.map(function (p) {
        return '<li><span class="dot" style="background:' + p.hex + '"></span>' + esc(p.colour) + " · " + esc(p.name) + ' <span class="muted">(locker ' +
          esc(p.lockerId) + ", " + esc(p.source) + ")</span></li>";
      }).join("") + "</ul>";
    } else {
      var lk = L.getLocker(state, ui.map.lockerId);
      html += "<h3>Locker " + esc(lk.label) + '</h3><p class="muted">' + esc(lk.zone) + '</p><div class="pack-tabs">';
      state.packs.filter(function (p) { return p.lockerId === lk.id; }).forEach(function (p) {
        html += '<button class="pack-tab' + (ui.map.packId === p.id ? " sel" : "") + '" data-act="map-pack" data-id="' + p.id + '"><span class="dot" style="background:' +
          p.hex + '"></span>' + esc(p.colour) + " · " + esc(p.name) + "</button>";
      });
      html += "</div>";
      if (ui.map.packId) {
        var p = L.getPack(state, ui.map.packId);
        if (p && p.lockerId === lk.id) html += slotGrid(p, f && f.packId === p.id ? f.slot : null);
      }
    }
    return html + "</div></div>";
  }

  // ---------- reports from health monitoring ----------

  function openReport(r) {
    startWizard({
      patientId: r.crewId,
      report: { symptoms: JSON.parse(JSON.stringify(r.symptoms || [])), vitals: JSON.parse(JSON.stringify(r.vitals || {})) }
    });
    ui.wiz.reason = symptomsText(ui.wiz);
    runCheck();
  }

  function receiveSymptomReport(report) {
    var err = L.validateReport(state, report);
    if (err) { toast("Report rejected: " + err); render(); return { ok: false, error: err }; }
    var r = JSON.parse(JSON.stringify(report));
    r.time = r.time || now().toISOString();
    r.source = r.source || "health-monitoring";
    state.reports.unshift(r);
    save();
    openReport(r);
    render();
    return { ok: true };
  }

  // ---------- toast ----------

  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3500);
  }

  // ---------- actions ----------

  var actions = {
    nav: function (d) { ui.view = d.view; ui.drawerItemId = null; if (d.view === "dispense" && !ui.wiz) startWizard(); },
    reset: function () { reset(); },
    "filter-flag": function (d) { ui.filters.flag = ui.filters.flag === d.flag ? "" : d.flag; ui.view = "dashboard"; },
    "filter-pack": function (d) { ui.filters.pack = ui.filters.pack === d.id ? "" : d.id; },
    "clear-filters": function () { ui.filters = { q: "", pack: "", tier: "", flag: "" }; },
    "open-item": function (d) { ui.drawerItemId = d.id; },
    "close-drawer": function () { ui.drawerItemId = null; },
    "locate-item": function (d) {
      var f = focusLoc({ itemId: d.id });
      ui.map = { focus: { itemId: d.id }, lockerId: f.lockerId, packId: f.packId };
      ui.view = "map";
      ui.drawerItemId = null;
    },
    "map-locker": function (d) { ui.map.lockerId = d.id; var f = focusLoc(ui.map.focus); ui.map.packId = f && f.lockerId === d.id ? f.packId : null; },
    "map-pack": function (d) { ui.map.packId = d.id; },
    "map-clear": function () { ui.map.focus = null; },
    "dispense-item": function (d) {
      var it = L.getItem(state, d.id);
      ui.drawerItemId = null;
      if (it.tier === "4") { startWizard({ emergency: true, step: "emergency", itemId: it.id, qty: it.doseUnits || 1 }); return; }
      startWizard({ itemId: it.id, qty: it.doseUnits || 1, preItem: true });
    },
    emergency: function () { ui.drawerItemId = null; startWizard({ emergency: true, step: "emergency" }); },
    "wiz-new": function () { startWizard(); },
    "wiz-patient": function (d) { ui.wiz.patientId = d.id; ui.wiz.error = ""; },
    "wiz-go": function (d) { ui.wiz.step = d.step; ui.wiz.error = ""; ui.wiz.scanError = ""; },
    "wiz-sym": function (d) {
      var w = ui.wiz, list = w.report.symptoms, idx = -1;
      list.forEach(function (x, i) { if (x.code === d.code) idx = i; });
      if (idx >= 0) list.splice(idx, 1);
      else list.push({ code: d.code, severity: 3 });
    },
    "wiz-check": function () { ui.wiz.reason = symptomsText(ui.wiz); runCheck(); },
    "wiz-report": function (d) { var r = state.reports[Number(d.idx)]; if (r) openReport(r); },
    "paste-report": function () {
      var r;
      try { r = JSON.parse(ui.pasteJson || ""); } catch (e) { toast("That isn't valid JSON."); return; }
      receiveSymptomReport(r);
    },
    "wiz-choose": function (d) {
      var w = ui.wiz, it = L.getItem(state, d.id);
      w.itemId = it.id;
      w.qty = it.doseUnits || 1;
      w.error = "";
      w.ack = false;
      w.cmoUnavailable = false;
      w.sigs = { patient: {}, approver: {}, witness: {} };
      if (!w.reason) w.reason = w.report.symptoms.length ? symptomsText(w) : "";
      if (it.tier === "4") { w.emergency = true; w.step = "emergency"; return; }
      w.step = "auth";
    },
    "wiz-back-from-auth": function () { var w = ui.wiz; w.error = ""; w.step = w.result ? "suggest" : (w.preItem ? "start" : "pick"); },
    "wiz-authorise": function () { authorise(); },
    "wiz-queue": function () { queueRequest(); },
    "wiz-scan": function () { doScan(); },
    "wiz-sim": function (d) {
      var w = ui.wiz, it = L.getItem(state, w.itemId);
      if (d.kind === "right") w.scan = L.getLot(state, w.lotId).tag;
      else {
        var other = state.lots.filter(function (l) {
          var o = L.getItem(state, l.itemId);
          return l.itemId !== it.id && o.packId === it.packId;
        })[0] || state.lots.filter(function (l) { return l.itemId !== it.id; })[0];
        w.scan = other.tag;
      }
      doScan();
    },
    "wiz-skip-scan": function () { ui.wiz.scanSkipped = true; ui.wiz.scanError = ""; afterScan(); },
    "wiz-count": function () {
      var w = ui.wiz, lot = L.getLot(state, w.lotId), qty = Number(w.qty) || 1;
      if (w.count === "" || w.count == null || isNaN(Number(w.count))) { w.error = "Type the number you counted."; return; }
      finish({ countCheck: { expected: lot.qty - qty, counted: Number(w.count), by: counterOf(w) } });
    },
    "wiz-em-item": function (d) { var it = L.getItem(state, d.id); ui.wiz.itemId = it.id; ui.wiz.qty = it.doseUnits || 1; ui.wiz.error = ""; },
    "wiz-em-locate": function () {
      var w = ui.wiz, lot = L.lotsOf(state, w.itemId)[0];
      w.lotId = lot ? lot.id : null;
      w.locateOnly = true;
      w.step = "locate";
    },
    "wiz-em-back": function () { ui.wiz.locateOnly = false; ui.wiz.step = "emergency"; },
    "wiz-em-release": function () { emergencyRelease(); },
    "appr-sign": function (d) { signRequest(d.id); },
    "appr-deny": function (d) { var r = findRequest(d.id); r.status = "denied"; save(); toast("Request denied"); },
    "appr-retrieve": function (d) { retrieveRequest(d.id); },
    "doc-save": function (d) {
      var e = findEntry(d.id), text = String(ui.docs[d.id] || "").trim();
      if (!text) { toast("Write what happened first."); return; }
      e.documentation = text;
      e.documentedAt = now().toISOString();
      delete ui.docs[d.id];
      save();
      toast("Documentation saved");
    },
    "count-resolve": function (d) {
      var e = findEntry(d.id);
      e.countCheck.resolved = true;
      e.countCheck.note = String(ui.notes["cnt-" + d.id] || "").trim();
      save();
      toast("Discrepancy marked resolved");
    },
    "ground-done": function (d) { var e = findEntry(d.id); e.groundReview = "done"; save(); },
    fu: function (d) {
      var e = findEntry(d.id);
      e.followUp = { effective: d.eff === "1", sideEffects: String(ui.notes["fx-" + d.id] || "").trim(), time: now().toISOString() };
      save();
    },
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

  function bindValue(t) {
    if (t.type === "checkbox") return t.checked;
    if (t.type === "range") return Number(t.value);
    return t.value;
  }

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
    fn(d, t, e);
    render();
    if (name === "nav" || name === "wiz-go" || name === "wiz-choose" || name === "wiz-check" || name === "wiz-authorise" || name === "wiz-em-release" ||
        name === "emergency" || name === "appr-retrieve" || name === "wiz-report" || name === "locate-item" || name === "dispense-item") {
      window.scrollTo(0, 0);
    }
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
    if (t.id === "scanInput") { e.preventDefault(); setPath(ui, "wiz.scan", t.value); doScan(); render(); return; }
    if (t.tagName === "TR" && t.getAttribute("data-act")) { e.preventDefault(); t.click(); }
  });

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "symptom-report") receiveSymptomReport(e.data);
  });

  // Public API for other pieces of the team's app
  window.MedInventory = {
    receiveSymptomReport: receiveSymptomReport,
    getState: function () { return state; },
    reset: function () { reset(); render(); }
  };

  load();
  render();
})();
