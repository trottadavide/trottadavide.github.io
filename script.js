async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Cannot load ${path}`);
  return await res.json();
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

function buildInlineLinks(item, targetId, index) {
  return [
    item.pdf ? `<a href="${item.pdf}" target="_blank" rel="noopener">PDF</a>` : "",
    item.bib ? `<a href="${item.bib}" target="_blank" rel="noopener">Bib</a>` : "",
    item.doi ? `<a href="${item.doi}" target="_blank" rel="noopener">DOI</a>` : "",
    item.slides ? `<a href="${item.slides}" target="_blank" rel="noopener">Slides</a>` : "",
    item.video ? `<a href="${item.video}" target="_blank" rel="noopener">Video</a>` : "",
    item.url ? `<a href="${item.url}" target="_blank" rel="noopener">Link</a>` : "",
    item.abstract
      ? `<a href="javascript:void(0)" onclick="toggleAbstract('${targetId}-abstract-${index}')">Abstract</a>`
      : ""
  ].filter(Boolean).join(" | ");
}

function renderEntries(items, targetId) {
  const container = document.getElementById(targetId);
  if (!items.length) return renderEmpty(targetId);

  container.innerHTML = items.map((item, index) => `
    <div class="item">
      <div class="item-title">${item.title || ""}</div>
      <div>${item.authors? item.authors.replaceAll("Davide Trotta", "<strong>Davide Trotta</strong>")
        + (item.year ? " (" + item.year + ")." : "."): ""}</div>
      <div>${item.venue || item.description || ""}</div>
      <div class="item-meta">${item.date || ""} ${item.place ? "— " + item.place : ""}</div>

      ${buildInlineLinks(item, targetId, index) ? `<div class="links">${buildInlineLinks(item, targetId, index)}</div>` : ""}

      ${item.abstract ? `
        <div id="${targetId}-abstract-${index}" class="abstract hidden">${item.abstract}</div>
      ` : ""}
    </div>
  `).join("");
}

function toggleAbstract(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.toggle("hidden");
  }
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

    publications.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
    preprints.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));

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