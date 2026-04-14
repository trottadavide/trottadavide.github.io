import json
import re
import shutil
from pathlib import Path

BASE = Path("content/publication")
OUT = Path("data/publications.json")
PDF_OUT = Path("static_assets/pdf")
BIB_OUT = Path("static_assets/bib")

PDF_OUT.mkdir(parents=True, exist_ok=True)
BIB_OUT.mkdir(parents=True, exist_ok=True)


def extract_front_matter(text: str):
    m = re.search(r"^---\s*\n(.*?)\n---", text, re.DOTALL | re.MULTILINE)
    if not m:
        return {}

    front = m.group(1)
    data = {}
    current_key = None
    current_value = []

    for line in front.splitlines():
        if re.match(r"^[A-Za-z0-9_]+:", line):
            if current_key is not None:
                data[current_key] = "\n".join(current_value).strip()
            key, value = line.split(":", 1)
            current_key = key.strip()
            current_value = [value.strip()]
        else:
            if current_key is not None:
                current_value.append(line)

    if current_key is not None:
        data[current_key] = "\n".join(current_value).strip()

    return data


def strip_quotes(s: str) -> str:
    s = s.strip()
    if len(s) >= 2 and ((s[0] == '"' and s[-1] == '"') or (s[0] == "'" and s[-1] == "'")):
        return s[1:-1]
    return s


def clean_bibtex_text(s: str) -> str:
    s = s.strip()

    while len(s) >= 2 and s[0] == "{" and s[-1] == "}":
        s = s[1:-1].strip()

    replacements = {
        r'\"{o}': 'ö',
        r'\"o': 'ö',
        r"\'{e}": "é",
        r"\'e": "é",
        r'\`{e}': 'è',
        r'\`e': 'è',
        r'\~{n}': 'ñ',
        r'\~n': 'ñ',
        r'\&': '&',
    }
    for old, new in replacements.items():
        s = s.replace(old, new)

    s = s.replace("{", "").replace("}", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_bib_entry(text: str):
    fields = {}
    i = 0
    n = len(text)

    while i < n:
        m = re.search(r'([A-Za-z]+)\s*=', text[i:])
        if not m:
            break

        key = m.group(1).lower()
        i += m.end()

        while i < n and text[i].isspace():
            i += 1

        if i >= n:
            break

        if text[i] == "{":
            depth = 0
            start = i
            while i < n:
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        i += 1
                        break
                i += 1
            value = text[start:i]
        elif text[i] == '"':
            i += 1
            start = i
            while i < n:
                if text[i] == '"' and text[i - 1] != "\\":
                    break
                i += 1
            value = text[start:i]
            i += 1
        else:
            start = i
            while i < n and text[i] not in ",\n":
                i += 1
            value = text[start:i]

        fields[key] = clean_bibtex_text(value)

    return fields


def parse_index_md(path: Path):
    text = path.read_text(encoding="utf-8")
    front = extract_front_matter(text)

    return {
        "date": strip_quotes(front.get("date", "")),
        "doi": strip_quotes(front.get("doi", "")),
        "venue_raw": strip_quotes(front.get("publication", "")),
        "abstract": strip_quotes(front.get("abstract", "")),
        "pdf": strip_quotes(front.get("url_pdf", "")),
        "slides": strip_quotes(front.get("url_slides", "")),
        "video": strip_quotes(front.get("url_video", "")),
    }


def parse_bib(path: Path):
    text = path.read_text(encoding="utf-8")
    fields = parse_bib_entry(text)

    authors = fields.get("author", "").replace(" and ", ", ")
    title = fields.get("title", "")
    venue = fields.get("journal", "") or fields.get("booktitle", "")

    return {
        "title": title,
        "authors": authors,
        "year": fields.get("year", ""),
        "venue": venue,
    }


def clean_venue(v: str) -> str:
    v = v.strip()
    if v.startswith("In *") and v.endswith("*"):
        v = v[4:-1]
    return v.strip()


items = []

for folder in sorted(BASE.glob("Pubb_*")):
    index_path = folder / "index.md"
    bib_path = folder / "cite.bib"

    if not index_path.exists() or not bib_path.exists():
        continue

    idx = parse_index_md(index_path)
    bib = parse_bib(bib_path)

    venue = bib["venue"] or clean_venue(idx.get("venue_raw", ""))

    pdf = idx.get("pdf", "").strip()
    if not pdf:
        local_pdfs = list(folder.glob("*.pdf"))
        if local_pdfs:
            source_pdf = local_pdfs[0]
            target_pdf = PDF_OUT / f"{folder.name}.pdf"
            shutil.copy2(source_pdf, target_pdf)
            pdf = f"static_assets/pdf/{folder.name}.pdf"

    bib_link = ""
    if bib_path.exists():
        target_bib = BIB_OUT / f"{folder.name}.bib"
        shutil.copy2(bib_path, target_bib)
        bib_link = f"static_assets/bib/{folder.name}.bib"

    item = {
        "title": bib["title"],
        "authors": bib["authors"],
        "year": bib["year"] or idx.get("date", ""),
        "venue": venue,
        "pdf": pdf,
        "bib": bib_link,
        "doi": idx.get("doi", ""),
        "slides": idx.get("slides", ""),
        "video": idx.get("video", ""),
        "abstract": idx.get("abstract", ""),
    }

    items.append(item)

items.sort(key=lambda x: int(x["year"]) if str(x["year"]).isdigit() else 0, reverse=True)

OUT.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Wrote {len(items)} publications to {OUT}")