// The pages' own script: the theme control, copy to the clipboard and download of a figure. The shell (sidebar, palette) is
// src/scripts/shell.ts. No framework. Pages are swapped by the view transition router, so this file runs again for each page
// shown (`data-astro-rerun`): what belongs to the page is set up each time, what belongs to the document only once.
(function () {
  function say(text) { var box = document.getElementById("announce"); if (box) box.textContent = text; }
  function strings() { var node = document.getElementById("copy-strings"); return node ? JSON.parse(node.textContent) : {}; }
  // The theme control: Auto follows the system; Light and Dark are kept in localStorage when the browser allows it.
  var choices = document.querySelectorAll("[data-theme-choice]");
  function showTheme(choice) {
    if (choice === "light" || choice === "dark") document.documentElement.dataset.theme = choice; else delete document.documentElement.dataset.theme;
    choices.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themeChoice === choice)); });
  }
  var stored = "auto";
  try { var saved = localStorage.getItem("theme"); if (saved === "light" || saved === "dark") stored = saved; } catch (e) {}
  showTheme(stored);
  choices.forEach(function (b) {
    b.addEventListener("click", function () {
      var choice = b.dataset.themeChoice;
      showTheme(choice);
      try { if (choice === "auto") localStorage.removeItem("theme"); else localStorage.setItem("theme", choice); } catch (e) {}
    });
  });
  document.querySelectorAll("[data-needs-js]").forEach(function (el) { el.hidden = false; });
  if (window.__siteBound) return;
  window.__siteBound = true;
  // A page swapped in keeps the theme the reader chose. Its stylesheets and scripts are named relative to that page, but they are
  // inserted while the address is still the old page's, so each is made absolute against the page that is coming first.
  document.addEventListener("astro:before-swap", function (event) {
    event.newDocument.querySelectorAll("link[href], script[src]").forEach(function (el) {
      var name = el.hasAttribute("href") ? "href" : "src";
      try { el.setAttribute(name, new URL(el.getAttribute(name), event.to).href); } catch (e) {}
    });
    var chosen = document.documentElement.dataset.theme;
    if (chosen) event.newDocument.documentElement.dataset.theme = chosen; else delete event.newDocument.documentElement.dataset.theme;
  });
  document.addEventListener("click", function (event) {
    var copy = event.target.closest("[data-copy-text]");
    if (copy) {
      var text = copy.dataset.copyText;
      var done = function () { var label = copy.querySelector("[data-label]"); var was = label.textContent; label.textContent = copy.dataset.copied || "Copied"; say(strings().copied); setTimeout(function () { label.textContent = was; }, 1800); };
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
})();
