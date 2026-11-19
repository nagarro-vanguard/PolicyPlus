// The pages' own script: the theme control and copy of a sentence to the clipboard. The shell (sidebar, palette) is
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
  // Every address in a page is relative to it (the folder opens from any place), so a page the view transition router
  // reads would name its stylesheets and scripts against the wrong page. The router's reading of the next page is
  // replaced by the same reading that makes those addresses absolute before anything is loaded; the current page's own
  // are made absolute once, so the router sees the same stylesheet on both sides and keeps it. A page that cannot be
  // read (opened from a file, or the network failed) is loaded the plain way.
  var absolute = function (doc, base) {
    doc.querySelectorAll("link[href], script[src]").forEach(function (el) {
      var name = el.hasAttribute("href") ? "href" : "src";
      try { el.setAttribute(name, new URL(el.getAttribute(name), base).href); } catch (e) {}
    });
  };
  absolute(document.head, location.href);
  document.addEventListener("astro:before-preparation", function (event) {
    if (event.formData) return;
    event.loader = function () {
      return fetch(event.to.href, { signal: event.signal }).then(function (response) {
        var type = (response.headers.get("content-type") || "").split(";")[0].trim();
        if (type !== "text/html") { event.preventDefault(); return; }
        return response.text().then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          doc.querySelectorAll("noscript").forEach(function (el) { el.remove(); });
          if (!doc.querySelector('[name="astro-view-transitions-enabled"]')) { event.preventDefault(); return; }
          absolute(doc, event.to);
          event.newDocument = doc;
        });
      }, function () { event.preventDefault(); });
    };
  });
  // A page swapped in keeps the theme the reader chose.
  document.addEventListener("astro:before-swap", function (event) {
    var chosen = document.documentElement.dataset.theme;
    if (chosen) event.newDocument.documentElement.dataset.theme = chosen; else delete event.newDocument.documentElement.dataset.theme;
  });
  // A sentence to copy (`data-copy-text`): the clipboard first, then the older copy command; "Copied" is said only when
  // one of them worked, and the failure is said otherwise.
  document.addEventListener("click", function (event) {
    var copy = event.target.closest("[data-copy-text]");
    if (!copy) return;
    var text = copy.dataset.copyText;
    var done = function () { var label = copy.querySelector("[data-label]"); if (!label) { say(strings().copied); return; } var was = label.textContent; label.textContent = copy.dataset.copied || ""; say(strings().copied); setTimeout(function () { label.textContent = was; }, 1800); };
    var older = function () {
      var area = document.createElement("textarea"); area.value = text; area.setAttribute("readonly", ""); area.className = "sr-only"; document.body.append(area); area.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      area.remove();
      if (ok) done(); else say(strings().copyFailed);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, older); else older();
  });
})();
