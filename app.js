const sites = Array.isArray(window.SITES) ? window.SITES : [];
const queryEl = document.getElementById("query");
const clearBtn = document.getElementById("clearBtn");
const homeState = document.getElementById("homeState");
const resultsState = document.getElementById("resultsState");
const detailState = document.getElementById("detailState");
const siteCount = document.getElementById("siteCount");
const recentWrap = document.getElementById("recentWrap");
const recentList = document.getElementById("recentList");
const starterChips = document.getElementById("starterChips");
const themeBtn = document.getElementById("themeBtn");
const themeSheet = document.getElementById("themeSheet");
const themeGrid = document.getElementById("themeGrid");
const RECENT_KEY = "site-finder-recent";
const THEME_KEY = "site-finder-theme";
const THEMES = [
  { id: "midnight", name: "Midnight" },
  { id: "sand", name: "Sand" },
  { id: "forest", name: "Forest" },
  { id: "ocean", name: "Ocean" },
  { id: "rose", name: "Rose" },
  { id: "mono", name: "Mono" }
];

siteCount.textContent = sites.length.toLocaleString() + " sites";

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function mapsUrl(site) {
  return "https://www.google.com/maps/search/?api=1&query=" + site.lat + "," + site.lng;
}

function mapEmbedUrl(site) {
  const padLat = 0.006;
  const padLng = 0.008;
  return (
    "https://www.openstreetmap.org/export/embed.html?bbox=" +
    (site.lng - padLng) + "%2C" +
    (site.lat - padLat) + "%2C" +
    (site.lng + padLng) + "%2C" +
    (site.lat + padLat) +
    "&layer=mapnik&marker=" + site.lat + "%2C" + site.lng
  );
}

function shareMessage(site) {
  return [
    "Site " + site.id + " (" + site.cand + ")",
    "On air: " + (site.onAir || "Not recorded"),
    "Address: " + site.address,
    "Lat, long: " + site.lat + ", " + site.lng,
    "Map: " + mapsUrl(site)
  ].join("\n");
}

function whatsappUrl(site) {
  return "https://wa.me/?text=" + encodeURIComponent(shareMessage(site));
}

function statusClass(status) {
  return normalize(status) === "ON-AIR" ? "on-air" : "other";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecent(site) {
  const next = [site.id, ...loadRecent().filter((id) => id !== site.id)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  renderRecent();
}

function renderRecent() {
  const ids = loadRecent();
  if (!ids.length) {
    recentWrap.hidden = true;
    return;
  }
  recentWrap.hidden = false;
  recentList.innerHTML = ids
    .map((id) => `<button type="button" class="chip" data-q="${escapeHtml(id)}">${escapeHtml(id)}</button>`)
    .join("");
}

function searchSites(rawQuery) {
  const q = normalize(rawQuery);
  if (!q) return [];

  const exactId = [];
  const exactCand = [];
  const starts = [];
  const contains = [];

  for (const site of sites) {
    const id = normalize(site.id);
    const cand = normalize(site.cand);
    if (id === q) exactId.push(site);
    else if (cand === q) exactCand.push(site);
    else if (id.startsWith(q) || cand.startsWith(q)) starts.push(site);
    else if (id.includes(q) || cand.includes(q)) contains.push(site);
  }

  return exactId.concat(exactCand, starts, contains).slice(0, 40);
}

function showHome() {
  homeState.hidden = false;
  resultsState.hidden = true;
  detailState.hidden = true;
}

function showResults(items, query) {
  homeState.hidden = true;
  detailState.hidden = true;
  resultsState.hidden = false;

  if (!items.length) {
    resultsState.innerHTML =
      '<div class="empty">No site found for <strong>' +
      escapeHtml(query) +
      "</strong>. Try the numeric ID or the candidate ID.</div>";
    return;
  }

  resultsState.innerHTML =
    '<p class="list-label">' +
    items.length +
    " result" +
    (items.length === 1 ? "" : "s") +
    "</p>" +
    items
      .map(
        (site, index) =>
          '<button type="button" class="result" data-index="' +
          index +
          '">' +
          '<span class="result-mark ' +
          statusClass(site.status) +
          '"></span>' +
          '<span class="result-body">' +
          '<span class="result-top"><span class="id">' +
          escapeHtml(site.id) +
          '</span><span class="cand">' +
          escapeHtml(site.cand) +
          "</span></span>" +
          '<span class="meta">' +
          escapeHtml(site.status) +
          " · " +
          escapeHtml(site.onAir || "No on-air date") +
          "</span>" +
          '<span class="addr-preview">' +
          escapeHtml(site.address) +
          "</span></span>" +
          '<svg class="chevron" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 6l6 6-6 6"/></svg>' +
          "</button>"
      )
      .join("");

  resultsState.querySelectorAll(".result").forEach((btn, index) => {
    btn.addEventListener("click", () => openDetail(items[index], false));
  });
}

function openDetail(site, fromSearch) {
  saveRecent(site);
  homeState.hidden = true;
  resultsState.hidden = true;
  detailState.hidden = false;

  const onAir = site.onAir ? escapeHtml(site.onAir) : "Not recorded";
  const type = site.type ? escapeHtml(site.type) : "Unknown";

  detailState.innerHTML =
    '<article class="detail">' +
    '<a class="map-frame" target="_blank" rel="noopener" href="' +
    mapsUrl(site) +
    '">' +
    '<iframe title="Map preview" loading="lazy" src="' +
    mapEmbedUrl(site) +
    '"></iframe>' +
    '<span class="map-open">Open Google Maps</span></a>' +
    '<div class="detail-body">' +
    '<div class="detail-head">' +
    '<p class="detail-id">' +
    escapeHtml(site.id) +
    "</p>" +
    '<p class="detail-cand">' +
    escapeHtml(site.cand) +
    "</p></div>" +
    '<div class="pills">' +
    '<span class="pill ' +
    statusClass(site.status) +
    '">' +
    escapeHtml(site.status || "Unknown") +
    "</span>" +
    '<span class="pill neutral">' +
    type +
    "</span></div>" +
    '<div class="facts">' +
    '<div class="fact"><dt>On air date</dt><dd>' +
    onAir +
    "</dd></div>" +
    '<div class="fact"><dt>Site type</dt><dd>' +
    type +
    "</dd></div>" +
    '<div class="fact"><dt>Latitude</dt><dd class="coords">' +
    site.lat +
    "</dd></div>" +
    '<div class="fact"><dt>Longitude</dt><dd class="coords">' +
    site.lng +
    "</dd></div>" +
    '<div class="fact wide"><dt>Address</dt><dd>' +
    escapeHtml(site.address) +
    "</dd></div>" +
    "</div>" +
    '<div class="actions">' +
    '<a class="btn maps" target="_blank" rel="noopener" href="' +
    mapsUrl(site) +
    '">Google Maps</a>' +
    '<a class="btn whatsapp" target="_blank" rel="noopener" href="' +
    whatsappUrl(site) +
    '">WhatsApp</a>' +
    "</div>" +
    '<div class="actions-secondary">' +
    '<button type="button" class="btn ghost" id="copyShare">Copy share</button>' +
    '<button type="button" class="btn ghost" id="copyCoords">Copy coords</button>' +
    '<button type="button" class="btn ghost" id="copyAddress">Copy address</button>' +
    "</div></div></article>";

  document.getElementById("copyShare").addEventListener("click", () => {
    copyText(shareMessage(site), "Share text copied");
  });
  document.getElementById("copyCoords").addEventListener("click", () => {
    copyText(site.lat + ", " + site.lng, "Coordinates copied");
  });
  document.getElementById("copyAddress").addEventListener("click", () => {
    copyText(site.address, "Address copied");
  });

  if (fromSearch) queryEl.blur();
}

function copyText(text, message) {
  const done = () => toast(message);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
  done();
}

function toast(message) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

function runSearch(rawQuery, autoOpen) {
  const q = String(rawQuery || "").trim();
  clearBtn.hidden = !q;
  if (!q) {
    showHome();
    return;
  }

  const items = searchSites(q);
  const exact = items.filter(
    (site) => normalize(site.id) === normalize(q) || normalize(site.cand) === normalize(q)
  );

  if (autoOpen && exact.length === 1) {
    queryEl.value = exact[0].id;
    openDetail(exact[0], true);
    return;
  }

  showResults(items, q);
}

queryEl.addEventListener("input", () => runSearch(queryEl.value, false));
document.getElementById("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(queryEl.value, true);
});
clearBtn.addEventListener("click", () => {
  queryEl.value = "";
  runSearch("", false);
  queryEl.focus();
});

function onChipClick(event) {
  const chip = event.target.closest("[data-q]");
  if (!chip) return;
  queryEl.value = chip.getAttribute("data-q");
  runSearch(queryEl.value, true);
}

recentList.addEventListener("click", onChipClick);
if (starterChips) starterChips.addEventListener("click", onChipClick);

function currentTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "midnight";
  } catch {
    return "midnight";
  }
}

function applyTheme(id) {
  const theme = THEMES.some((item) => item.id === id) ? id : "midnight";
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--bg").trim());
  }
  themeGrid.querySelectorAll(".theme-option").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-theme-id") === theme);
  });
}

function renderThemes() {
  themeGrid.innerHTML = THEMES.map(
    (theme) =>
      '<button type="button" class="theme-option" data-theme-id="' +
      theme.id +
      '"><span class="theme-dot"></span>' +
      theme.name +
      "</button>"
  ).join("");
  applyTheme(currentTheme());
}

function closeThemeSheet() {
  themeSheet.hidden = true;
}

themeBtn.addEventListener("click", () => {
  themeSheet.hidden = !themeSheet.hidden;
});
themeSheet.addEventListener("click", (event) => {
  if (event.target === themeSheet) closeThemeSheet();
});
themeGrid.addEventListener("click", (event) => {
  const option = event.target.closest("[data-theme-id]");
  if (!option) return;
  applyTheme(option.getAttribute("data-theme-id"));
  closeThemeSheet();
});

renderThemes();
renderRecent();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
