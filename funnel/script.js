// Faryearny Design & Build funnel: UTM capture, sticky CTA, FAQ accordion.
// No dependencies. Loaded with `defer` on every page.
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  // ---------------------------------------------------------------------------
  // 1. Attribution (UTM + click IDs)
  // Captured from the landing URL, kept in sessionStorage for the visit, and
  // re-applied to internal links and the form embed.
  // ---------------------------------------------------------------------------
  var KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "ttclid", "msclkid"
  ];
  var STORE_KEY = "fdb_attribution";

  function readStore() {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(data) {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* storage blocked: links still carry the params */ }
  }

  var params = new URLSearchParams(window.location.search);
  var attribution = readStore();
  var foundNew = false;

  KEYS.forEach(function (key) {
    var value = params.get(key);
    if (value) {
      attribution[key] = value;
      foundNew = true;
    }
  });

  if (foundNew) {
    attribution.landing_page = window.location.pathname;
    attribution.captured_at = new Date().toISOString();
    writeStore(attribution);
  }

  // Exposed for tracking scripts added later (e.g. pass to Meta CAPI / GTM).
  window.FDB_ATTRIBUTION = attribution;

  function attributionQuery() {
    var q = new URLSearchParams();
    KEYS.forEach(function (key) {
      if (attribution[key]) q.set(key, attribution[key]);
    });
    return q;
  }

  // Add stored params to a URL without overwriting ones already present.
  function withAttribution(href) {
    var q = attributionQuery();
    if (!q.toString()) return href;
    var url = new URL(href, window.location.href);
    q.forEach(function (value, key) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    return url.toString();
  }

  // Internal page links (thank-you, privacy, terms) keep the attribution.
  document.querySelectorAll("a[href$='.html'], a[href*='.html?']").forEach(function (link) {
    var href = link.getAttribute("href");
    if (/^https?:/i.test(href)) return;
    var url = new URL(withAttribution(href), window.location.href);
    // Keep the link relative so the funnel works from any folder or domain.
    link.setAttribute("href", url.pathname.split("/").pop() + url.search + url.hash);
  });

  // Pass attribution into the LeadConnector (GoHighLevel) form.
  // GHL pre-fills form fields from matching query params on the iframe URL.
  // For this to land in the CRM, add HIDDEN fields to the GHL form with these
  // exact query keys: utm_source, utm_medium, utm_campaign, utm_content,
  // utm_term, fbclid, gclid, ttclid, msclkid
  // (GHL form builder → Hidden field → "Query key").
  document.querySelectorAll("iframe[data-form-id]").forEach(function (frame) {
    var src = frame.getAttribute("src");
    if (!src) return;
    var next = withAttribution(src);
    if (next !== new URL(src, window.location.href).toString()) {
      frame.setAttribute("src", next);
    }
  });

  // Thank-you redirect helper. The redirect itself is set inside GHL:
  // Form → Settings → On submit → "Redirect to URL" → https://YOURDOMAIN/thank-you.html
  // Use this to build the URL with attribution when testing.
  window.FDB_thankYouUrl = function () {
    return withAttribution("thank-you.html");
  };

  // ---------------------------------------------------------------------------
  // 2. Smooth scroll to the form for every #form CTA
  // ---------------------------------------------------------------------------
  var form = document.getElementById("form");

  document.querySelectorAll("a[href='#form']").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (!form) return;
      event.preventDefault();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      if (history.replaceState) history.replaceState(null, "", "#form");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Sticky CTA: visible from page load, steps aside only while the form
  //    fields are on screen (so it never covers them on mobile)
  // ---------------------------------------------------------------------------
  var sticky = document.querySelector(".sticky-cta");
  var formEmbed = document.querySelector(".form-embed");

  if (sticky) {
    var formVisible = false;

    function update() {
      var show = !formVisible;
      sticky.classList.toggle("is-visible", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      sticky.querySelectorAll("a").forEach(function (a) {
        a.tabIndex = show ? 0 : -1;
      });
    }

    if (formEmbed && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        formVisible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.3 }).observe(formEmbed);
    }

    update();
  }

  // ---------------------------------------------------------------------------
  // 4. FAQ accordion
  // ---------------------------------------------------------------------------
  document.querySelectorAll(".faq__q").forEach(function (button) {
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Footer year
  // ---------------------------------------------------------------------------
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
