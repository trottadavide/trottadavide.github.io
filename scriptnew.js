async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Cannot load ${path}`);
  return await res.json();
}

function cleanValue(value) {
  if (!value) return "";
  return String(value).trim().replace(/^["']+|["']+$/g, "");
}

function normalizeLink(key, value) {
  const v = cleanValue(value);
  if (!v) return "";

  if (key === "doi") {
    let doi = v;
    doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    doi = doi.replace(/^doi:\s*/i, "");
    doi = doi.trim();
    return `https://doi.org/${doi}`;
  }

  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) {
    return v;
  }

  return `/${v}`;
}
function renderEmpty(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<p class="empty">Content will appear here soon.</p>`;
}

function renderNews(items) {
  const container = document.getElementById("news-list");
  if (!container) return;
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
    item.pdf ? `<a href="${normalizeLink("pdf", item.pdf)}" target="_blank" rel="noopener">PDF</a>` : "",
    item.bib ? `<a href="${normalizeLink("bib", item.bib)}" target="_blank" rel="noopener">Bib</a>` : "",
    item.doi ? `<a href="${normalizeLink("doi", item.doi)}" target="_blank" rel="noopener">DOI</a>` : "",
    item.slides ? `<a href="${normalizeLink("slides", item.slides)}" target="_blank" rel="noopener">Slides</a>` : "",
    item.video ? `<a href="${normalizeLink("video", item.video)}" target="_blank" rel="noopener">Video</a>` : "",
    item.url ? `<a href="${normalizeLink("url", item.url)}" target="_blank" rel="noopener">Link</a>` : "",
    item.abstract
      ? `<a href="javascript:void(0)" onclick="toggleAbstract('${targetId}-abstract-${index}')">Abstract</a>`
      : ""
  ].filter(Boolean).join(" ");
}

function renderEntries(items, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  if (!items.length) return renderEmpty(targetId);

  container.innerHTML = items.map((item, index) => `
    <div class="item">
      <div class="item-title">${index + 1}. ${item.title || ""}</div>

      ${
        targetId === "talks-list"
          ? `<div>${item.venue || ""}${item.date ? " (" + item.date.slice(-4) + ")" : ""}${item.place ? " — " + item.place : ""}</div>`
          : `<div>${
              item.authors
                ? item.authors
                    .replaceAll("Davide Trotta", "<strong>Davide Trotta</strong>")
                    + (item.year ? " (" + item.year + "). " : ". ")
                : ""
            }${item.venue || item.description || ""}</div>
             <div class="item-meta">${item.date || ""} ${item.place ? "— " + item.place : ""}</div>`
      }

      ${buildInlineLinks(item, targetId, index)
        ? `<div class="links">${buildInlineLinks(item, targetId, index)}</div>`
        : ""}

      ${item.abstract
        ? `<div id="${targetId}-abstract-${index}" class="abstract hidden">${item.abstract}</div>`
        : ""}
    </div>
  `).join("");
}

function toggleAbstract(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("hidden");
}

async function init() {
  try {
    const tasks = [];

    if (document.getElementById("news-list")) {
      tasks.push(
        loadJSON("/data/news.json").then(renderNews)
      );
    }

    if (document.getElementById("publications-list")) {
      tasks.push(
        loadJSON("/data/publications.json").then(publications => {
          publications.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
          renderEntries(publications, "publications-list");
        })
      );
    }

    if (document.getElementById("preprints-list")) {
      tasks.push(
        loadJSON("/data/preprints.json").then(preprints => {
          preprints.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
          renderEntries(preprints, "preprints-list");
        })
      );
    }

    if (document.getElementById("talks-list")) {
      tasks.push(
        loadJSON("/data/talks.json").then(talks => {
          renderEntries(talks, "talks-list");
        })
      );
    }

    if (document.getElementById("teaching-list")) {
      tasks.push(
        loadJSON("/data/teaching.json").then(teaching => {
          renderEntries(teaching, "teaching-list");
        })
      );
    }

    await Promise.all(tasks);
  } catch (err) {
    console.error(err);
  }
}

init();