const scanBtn = document.getElementById("scanBtn");
const copyBtn = document.getElementById("copyBtn");
const copyUrlsBtn = document.getElementById("copyUrlsBtn");
const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const resultsEl = document.getElementById("results");
const actionsEl = document.getElementById("actions");

let latestResults = [];

scanBtn.addEventListener("click", async () => {
  setStatus("Scanning current page...");
  clearResults();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      setStatus("Could not find the active tab.");
      return;
    }

    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanPageForPlugins,
    });

    const payload = injectionResults?.[0]?.result;

    if (!payload) {
      setStatus("No scan results returned.");
      return;
    }

    latestResults = payload.plugins || [];
    renderResults(payload);
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error.message}`);
  }
});

copyBtn.addEventListener("click", async () => {
  if (!latestResults.length) return;
  const text = latestResults.map(item => item.name).join("\n");
  await navigator.clipboard.writeText(text);
  setStatus("Plugin names copied.");
});

copyUrlsBtn.addEventListener("click", async () => {
  if (!latestResults.length) return;
  const text = latestResults
    .map(item => `${item.name}\n${item.urls.join("\n")}`)
    .join("\n\n");
  await navigator.clipboard.writeText(text);
  setStatus("Plugin URLs copied.");
});

function setStatus(message) {
  statusEl.textContent = message;
}

function clearResults() {
  resultsEl.innerHTML = "";
  metaEl.textContent = "";
  actionsEl.classList.add("hidden");
}

function renderResults(payload) {
  const plugins = payload.plugins || [];
  const totalUrls = payload.totalUrls || 0;
  const pageUrl = payload.pageUrl || "";

  metaEl.textContent = `Detected ${plugins.length} plugin folder(s) from ${totalUrls} matching asset URL(s).`;

  if (!plugins.length) {
    setStatus("No WordPress plugin assets found on this page.");
    return;
  }

  actionsEl.classList.remove("hidden");
  setStatus(`Scan complete for ${pageUrl}`);

  for (const plugin of plugins) {
    const li = document.createElement("li");

    const name = document.createElement("div");
    name.className = "plugin-name";
    name.textContent = plugin.name;

    const count = document.createElement("div");
    count.className = "plugin-count";
    count.textContent = `${plugin.urls.length} asset URL(s)`;

    const urlList = document.createElement("ul");
    urlList.className = "url-list";

    plugin.urls.forEach(url => {
      const item = document.createElement("li");
      item.textContent = url;
      urlList.appendChild(item);
    });

    li.appendChild(name);
    li.appendChild(count);
    li.appendChild(urlList);
    resultsEl.appendChild(li);
  }
}

function scanPageForPlugins() {
  const pluginRegex = /(https?:\/\/[^\s"'<>]+\/wp-content\/plugins\/([^\/\?#]+)\/[^\s"'<>]*)/ig;
  const foundTexts = new Set();
  const grouped = new Map();

  function addText(raw) {
    if (!raw) return;
    const value = String(raw);
    if (!value.trim()) return;
    foundTexts.add(value);
  }

  function extractFromText(text) {
    if (!text) return;
    let match;
    while ((match = pluginRegex.exec(text)) !== null) {
      const fullUrl = match[1];
      const pluginSlug = match[2];

      if (!grouped.has(pluginSlug)) {
        grouped.set(pluginSlug, new Set());
      }

      grouped.get(pluginSlug).add(fullUrl);
    }
  }

  document.querySelectorAll("*").forEach((el) => {
    for (const attr of el.attributes || []) {
      addText(attr.value);
    }
  });

  for (const entry of performance.getEntriesByType("resource")) {
    if (entry && entry.name) {
      addText(entry.name);
    }
  }

  addText(document.documentElement.outerHTML);

  for (const text of foundTexts) {
    extractFromText(text);
  }

  const plugins = Array.from(grouped.entries())
    .map(([name, urlSet]) => ({
      name,
      urls: Array.from(urlSet).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    pageUrl: location.href,
    totalUrls: plugins.reduce((sum, item) => sum + item.urls.length, 0),
    plugins,
  };
}