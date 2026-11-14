// Earth grant tool: a flight surgeon on Earth picks a crew member and medicines and gets the grant
// code and its QR image. Uses ground.js (no UI) so zt can put the same thing on the Earth clinician
// screen. Sample data; who sent a grant is not verified (simulated).

(function () {
  "use strict";

  var L = window.MedLogic, G = window.MedGround;
  var state = L.buildState(window.INVENTORY_DATA, new Date());
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function fmt(s) { var d = L.parseDate(s); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function crew(id) { return L.getCrew(state, id); }
  function firstName(id) { return crew(id).name.split(" ")[0]; }
  function unitWord(it, n) {
    var f = { cream: "tube", ointment: "tube", "orally disintegrating tablet": "dissolving tablet" }[it.form] || it.form || "unit";
    return n === 1 || /s$/.test(f) ? f : f + "s";
  }
  function timesADay(n) { return n === 1 ? "once a day" : n === 2 ? "twice a day" : n + " times a day"; }

  var form = { patientId: "c4", start: ymd(new Date()), rows: [{ itemId: "ondansetron-4", units: 1, perDay: 2, days: 3 }] };

  // Medicines Earth may grant to this crew member (self-care, prescription, controlled; never emergency)
  function grantable(patientId) {
    return state.items.filter(function (it) { return it.kind === "medication" && !L.canGrant(state, L.EARTH, patientId, it); })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function request() {
    return {
      patientId: form.patientId, start: form.start,
      items: form.rows.map(function (r) { return { itemId: r.itemId, units: Number(r.units), perDay: Number(r.perDay), days: Number(r.days) }; })
    };
  }

  function formHtml() {
    var meds = grantable(form.patientId);
    var html = "<h2>New grant</h2><div class=\"row2\"><label class=\"field\">Crew member<select id=\"f-crew\" data-f=\"patientId\" data-full>" +
      state.crew.map(function (c) { return '<option value="' + c.id + '"' + (c.id === form.patientId ? " selected" : "") + ">" + esc(c.name) + " (" + esc(c.role) + ")</option>"; }).join("") +
      '</select></label><label class="field">Start<input id="f-start" type="date" value="' + esc(form.start) + '" data-f="start"></label></div><h3>Medicines</h3>';
    form.rows.forEach(function (r, i) {
      html += '<div class="med-row"><label class="field">Medicine<select id="r' + i + '-item" data-r="' + i + '" data-k="itemId">' +
        meds.map(function (it) {
          return '<option value="' + it.id + '"' + (it.id === r.itemId ? " selected" : "") + ">" + esc(it.name + (it.strength ? " " + it.strength : "")) +
            (it.controlled ? " · " + esc(it.controlled) : "") + "</option>";
        }).join("") + "</select></label>" +
        '<label class="field">Units per dose<input id="r' + i + '-units" type="number" min="1" max="9" value="' + esc(r.units) + '" data-r="' + i + '" data-k="units"></label>' +
        '<label class="field">Times a day<select id="r' + i + '-per" data-r="' + i + '" data-k="perDay">' + [1, 2, 3, 4].map(function (n) {
          return '<option value="' + n + '"' + (Number(r.perDay) === n ? " selected" : "") + ">" + n + "</option>";
        }).join("") + "</select></label>" +
        '<label class="field">Days<input id="r' + i + '-days" type="number" min="1" max="30" value="' + esc(r.days) + '" data-r="' + i + '" data-k="days"></label>' +
        '<button class="btn small" data-act="remove" data-i="' + i + '" aria-label="Remove this medicine"' + (form.rows.length === 1 ? " disabled" : "") + ">✕</button></div>";
    });
    html += '<div class="actions"><button class="btn" data-act="add">+ Add medicine</button></div>' +
      '<p class="hint">Earth can grant self-care, prescription and controlled medicines. Emergency items are never granted. ' +
      "Dose times: once 08:00 · twice 08/20 · 3 times 08/14/20 · 4 times 08/12/16/20.</p>";
    return html;
  }

  function outHtml() {
    var r = G.makeGrant(state, request());
    if (!r.ok) return '<h2>Grant</h2><p class="error">' + esc(r.error) + "</p>";
    var name = firstName(form.patientId);
    return "<h2>Grant for " + esc(crew(form.patientId).name) + "</h2>" +
      (r.qrSvg ? '<div class="out-qr">' + r.qrSvg + "</div>" : '<p class="error">QR library missing.</p>') +
      '<div class="out-code" id="outCode">' + esc(r.code) + "</div>" +
      '<div class="actions"><button class="btn primary" data-act="copy">Copy code</button>' +
      '<a class="btn" href="index.html?user=' + encodeURIComponent(form.patientId) + "#grant=" + encodeURIComponent(r.code) + '" target="_blank" rel="noopener">Open on ' +
      esc(name) + "'s device (demo)</a></div>" +
      '<ul class="out-list">' + r.grant.items.map(function (x) {
        var it = L.getItem(state, x.itemId);
        return "<li><b>" + esc(it.name) + "</b> " + esc(it.strength) + ": " + x.units + " " + esc(unitWord(it, x.units)) + ", " + esc(timesADay(x.perDay)) + ", " +
          x.days + (x.days === 1 ? " day" : " days") + "</li>";
      }).join("") + "</ul>" +
      '<p class="muted small">Starts ' + esc(fmt(r.grant.start)) + " · valid until " + esc(fmt(r.validUntil)) + " · can be added once, on " + esc(name) + "'s device only.</p>" +
      '<div class="sim">⚠ Sender not verified (simulated). The last two characters only catch typos.</div>';
  }

  function render() {
    document.getElementById("main").innerHTML = '<div class="earth-grid"><section class="card" id="formCard">' + formHtml() +
      '</section><section class="card" id="outCard" aria-live="polite">' + outHtml() + "</section></div>";
  }
  function renderOut() { document.getElementById("outCard").innerHTML = outHtml(); }

  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 2500);
  }

  function onField(e) {
    var t = e.target;
    if (t.hasAttribute("data-f")) {
      form[t.getAttribute("data-f")] = t.value;
      if (t.hasAttribute("data-full")) {
        // Keep only medicines this crew member can be granted
        var ok = grantable(form.patientId).map(function (it) { return it.id; });
        form.rows.forEach(function (r) { if (ok.indexOf(r.itemId) < 0) r.itemId = ok[0]; });
        render();
        return;
      }
    } else if (t.hasAttribute("data-r")) {
      form.rows[Number(t.getAttribute("data-r"))][t.getAttribute("data-k")] = t.value;
    } else return;
    renderOut();
  }
  document.addEventListener("input", onField);
  document.addEventListener("change", onField);

  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!b || b.disabled) return;
    var act = b.getAttribute("data-act");
    if (act === "add") {
      var used = form.rows.map(function (r) { return r.itemId; });
      var next = grantable(form.patientId).filter(function (it) { return used.indexOf(it.id) < 0; })[0];
      if (!next) { toast("No more medicines to add."); return; }
      form.rows.push({ itemId: next.id, units: next.doseUnits || 1, perDay: 1, days: 3 });
      render();
    } else if (act === "remove") {
      form.rows.splice(Number(b.getAttribute("data-i")), 1);
      render();
    } else if (act === "copy") {
      var code = document.getElementById("outCode").textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { toast("Code copied"); }, function () { toast("Copy failed: select the code instead"); });
      } else toast("Select the code to copy it");
    }
  });

  render();
})();
