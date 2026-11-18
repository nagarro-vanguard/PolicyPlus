// The pages' own script: search, copy, download a figure, and the capability filter of a screen. No framework.
(function () {
  var root = document.body.dataset.root || "./";
  var announce = document.getElementById("announce");
  var strings = JSON.parse(document.getElementById("copy-strings").textContent);
  function say(text) { if (announce) announce.textContent = text; }
  document.addEventListener("click", function (event) {
    var copy = event.target.closest("[data-copy-text]");
    if (copy) {
      var text = copy.dataset.copyText;
      var done = function () { var label = copy.querySelector("[data-label]"); var was = label.textContent; label.textContent = copy.dataset.copied || "Copied"; say(strings.copied); setTimeout(function () { label.textContent = was; }, 1800); };
      if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done, done); } else { var area = document.createElement("textarea"); area.value = text; document.body.append(area); area.select(); document.execCommand("copy"); area.remove(); done(); }
      return;
    }
    var down = event.target.closest("[data-download-svg]");
    if (down) {
      var svg = down.closest("figure").querySelector("svg.dg-svg");
      if (!svg) return;
      var style = getComputedStyle(document.documentElement);
      var markup = new XMLSerializer().serializeToString(svg).replace(/var\((--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi, function (_, name, fallback) { var v = style.getPropertyValue(name).trim(); return v || (fallback || "").trim(); });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
      link.download = (down.closest("figure").dataset.diagram || "diagram") + ".svg";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  });
  var input = document.getElementById("search"), box = document.getElementById("results"), index;
  function load() { return index ? Promise.resolve(index) : fetch(root + "search-index.json").then(function (r) { return r.json(); }).then(function (data) { index = data; return data; }); }
  function link(text, href) { var a = document.createElement("a"); a.textContent = text; a.href = root + href; return a; }
  if (input && box) input.addEventListener("input", function () {
    var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    box.replaceChildren();
    if (!words.length) { box.hidden = true; return; }
    load().then(function (entries) {
      var found = entries.filter(function (e) { return words.every(function (w) { return e.t.toLowerCase().indexOf(w) !== -1; }); });
      box.hidden = false;
      if (!found.length) { var none = document.createElement("div"); none.className = "none"; none.textContent = strings.noMatch; box.append(none); return; }
      ["Capabilities", "Screens", "Risks", "Actions", "Business rules", "Plan", "Epics", "Stories"].forEach(function (kind) {
        var of = found.filter(function (e) { return e.k === kind; });
        if (!of.length) return;
        var h = document.createElement("h4"); h.textContent = kind + " (" + of.length + ")"; box.append(h);
        of.slice(0, 7).forEach(function (e) { var d = document.createElement("div"); d.append(link(e.l, e.h)); box.append(d); });
        if (of.length > 7) { var more = document.createElement("div"); more.className = "none"; more.textContent = "…and " + (of.length - 7) + " more; narrow the search"; box.append(more); }
      });
    });
  });
  document.querySelectorAll("[data-needs-js]").forEach(function (el) { el.hidden = false; });
  var chips = document.querySelectorAll("[data-capability-chip]");
  function refilter() {
    var on = new Set(); chips.forEach(function (c) { if (c.classList.contains("on")) on.add(c.dataset.capabilityChip); });
    document.querySelectorAll("[data-capability]").forEach(function (el) { el.hidden = !on.has(el.dataset.capability); });
    document.querySelectorAll("[data-by-capability]").forEach(function (row) {
      var parts = JSON.parse(row.dataset.byCapability), actions = 0, rules = 0;
      Object.keys(parts).forEach(function (c) { if (on.has(c)) { actions += parts[c][0]; rules += parts[c][1]; } });
      row.querySelector("[data-actions]").textContent = actions; var cell = row.querySelector("[data-rules]"); cell.textContent = rules === 0 ? (cell.dataset.passes || "passes through") : rules;
      row.classList.toggle("dim", rules === 0); row.hidden = actions === 0 && rules === 0;
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var on = document.querySelectorAll("[data-capability-chip].on").length;
      if (chip.classList.contains("on") && on === 1) return;
      chip.classList.toggle("on"); chip.setAttribute("aria-pressed", String(chip.classList.contains("on"))); refilter();
    });
  });
})();
