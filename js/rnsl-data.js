/* ============================================
   RNSL — Live GitHub Data Fetcher
   Shared across all pages
   ============================================ */

const RNSL_ORG = "RX-Network-Security-Labs";
// Repos that are infrastructure, not products — never list these as "tools"
const RNSL_EXCLUDED_REPOS = ["website", "RX-Network-Security-Labs.github.io"];
const CACHE_KEY = "rnsl_gh_cache";
const TOPICS_CACHE_KEY = "rnsl_gh_topics_cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function rnslFetchRepos() {
  // Try cache first (sessionStorage — avoids stale data across visits but saves repeat calls within a session)
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch (e) { /* ignore cache errors */ }

  try {
    const res = await fetch(`https://api.github.com/users/${RNSL_ORG}/repos?per_page=100`, {
      headers: { "Accept": "application/vnd.github+json" }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const repos = await res.json();
    const filtered = Array.isArray(repos)
      ? repos.filter(r =>
          r.name !== RNSL_ORG &&
          !r.fork &&
          !RNSL_EXCLUDED_REPOS.some(ex => ex.toLowerCase() === r.name.toLowerCase())
        )
      : [];

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: filtered, ts: Date.now() }));
    } catch (e) { /* storage full or disabled, ignore */ }

    return filtered;
  } catch (err) {
    console.warn("RNSL: failed to fetch repos", err);
    return null; // signal failure distinctly from "zero repos"
  }
}

async function rnslFetchTopics(repoName) {
  // Check topics cache
  try {
    const cached = sessionStorage.getItem(TOPICS_CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL && data[repoName] !== undefined) {
        return data[repoName];
      }
    }
  } catch (e) { /* ignore */ }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${RNSL_ORG}/${repoName}/topics`,
      { headers: { "Accept": "application/vnd.github+json" } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const topics = json.names || [];

    // Merge into topics cache
    try {
      const cached = sessionStorage.getItem(TOPICS_CACHE_KEY);
      const store = cached ? JSON.parse(cached) : { data: {}, ts: Date.now() };
      store.data[repoName] = topics;
      store.ts = Date.now();
      sessionStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify(store));
    } catch (e) { /* ignore */ }

    return topics;
  } catch (e) {
    return [];
  }
}

function rnslLangColor(lang) {
  const colors = {
    Python: "#3776AB", JavaScript: "#F7DF1E", TypeScript: "#3178C6",
    Shell: "#89e051", Kotlin: "#7F52FF", Java: "#ED8B00",
    C: "#9b9b9b", "C++": "#f34b7d", Go: "#00ADD8", Rust: "#dea584",
    HTML: "#e34c26", CSS: "#563d7c",
  };
  return colors[lang] || "#2ecc71";
}

function rnslTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function rnslEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// Mobile nav toggle — shared across all pages
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  // Mark current page active in nav
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });
});
