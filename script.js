async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Cannot load ${path}`);
  return await res.json();
}

function renderLinks(item, fields) {
  const links = fields
    .filter(([_, key]) => item[key])
    .map(([label, key]) => `<a href="${item[key]}" target="_blank" rel="noopener">${label}</a>`)
    .join("");
  return links ? `<div class="links">${links}</div>` : "";
}

function renderEmpty(containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<p class="empty">Content will appear here soon.</p>`;
}

function renderNews(items) {
  const container = document.getElementById("news-list");
  if (!items.length) return renderEmpty("news-list");
  container.innerHTML = items.map(item => `
    <div class="item">
      ${item.url
        ? `<a href="${item.url}" target="_blank" rel="noopener">${item.text}</a>`
        : `<span>${item.text}</span>`}
    </div>
  `).join("");
}

function renderEntries(items, targetId) {
  const container = document.getElementById(targetId);
  if (!items.length) return renderEmpty(targetId);
  container.innerHTML = items.map(item => `
    <div class="item">
      <div class="item-title">${item.title || ""}</div>
      <div>${item.authors ? item.authors + (item.year ? " (" + item.year + ")." : ".") : ""}</div>
      <div>${item.venue || item.description || ""}</div>
      <div class="item-meta">${item.date || ""} ${item.place ? "— " + item.place : ""}</div>
      ${renderLinks(item, [["PDF", "pdf"], ["DOI", "doi"], ["Slides", "slides"], ["Video", "video"], ["Link", "url"]])}
    </div>
  `).join("");
}

async function init() {
  try {
    const [news, publications, preprints, talks, teaching] = await Promise.all([
      loadJSON("data/news.json"),
      loadJSON("data/publications.json"),
      loadJSON("data/preprints.json"),
      loadJSON("data/talks.json"),
      loadJSON("data/teaching.json")
    ]);

    renderNews(news);
    renderEntries(publications, "publications-list");
    renderEntries(preprints, "preprints-list");
    renderEntries(talks, "talks-list");
    renderEntries(teaching, "teaching-list");
  } catch (err) {
    console.error(err);
    renderEmpty("news-list");
    renderEmpty("publications-list");
    renderEmpty("preprints-list");
    renderEmpty("talks-list");
    renderEmpty("teaching-list");
  }
}

init();