// 시나리오마다 공유용 페이지(p/<id>.html)와 미리보기 그림(p/<id>.jpg)을 만들어요.
// GitHub Actions가 30분마다 실행해요. 시나리오 기본 정보는 원래 공개라 열쇠 없이 읽을 수 있어요.
import fs from "node:fs";
import crypto from "node:crypto";

const cfg = fs.readFileSync("firebase-config.js", "utf8");
const apiKey = cfg.match(/apiKey:\s*"([^"]+)"/)[1];
const projectId = cfg.match(/projectId:\s*"([^"]+)"/)[1];
const [owner, repo] = (process.env.GITHUB_REPOSITORY || "tw1nkl3n1n3-pacoco/coco-trpg").split("/");
const BASE = `https://${owner}.github.io/${repo}/`;

const val = v => v == null ? undefined : v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function list() {
  const out = [];
  let token = "";
  do {
    const u = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/scenarios?pageSize=100&key=${apiKey}${token ? "&pageToken=" + token : ""}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error("Firestore " + r.status + " " + (await r.text()));
    const j = await r.json();
    (j.documents || []).forEach(d => out.push({ id: d.name.split("/").pop(), f: d.fields || {} }));
    token = j.nextPageToken || "";
  } while (token);
  return out;
}

const docs = await list();
const site = docs.find(d => d.id === "_site");
const siteTitle = (site && val(site.f.title)) || "코코네 로그방";
fs.mkdirSync("p", { recursive: true });
const keep = new Set();
for (const { id, f } of docs) {
  if (id.startsWith("_")) continue;
  const name = val(f.name) || "시나리오";
  const system = val(f.system) || "";
  const og = val(f.og) || "";
  let img = "";
  if (og.startsWith("data:image/")) {
    const buf = Buffer.from(og.split(",")[1], "base64");
    const ext = og.startsWith("data:image/png") ? "png" : "jpg";
    const file = `p/${id}.${ext}`;
    fs.writeFileSync(file, buf);
    keep.add(file);
    img = `${BASE}${file}?v=${crypto.createHash("md5").update(buf).digest("hex").slice(0, 8)}`;
  }
  const target = `../#c-${id}`;
  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(name)} · ${esc(siteTitle)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteTitle)}">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(siteTitle)}${system ? " · " + esc(system) : ""}">
<meta property="og:url" content="${BASE}p/${id}.html">
${img ? `<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${img}">` : `<meta name="twitter:card" content="summary">`}
<meta http-equiv="refresh" content="0;url=${target}">
<script>location.replace(${JSON.stringify(target)}+(location.hash||""));</script>
</head><body><a href="${target}">${esc(name)} 열기</a></body></html>
`;
  fs.writeFileSync(`p/${id}.html`, html);
  keep.add(`p/${id}.html`);
}
for (const f of fs.readdirSync("p")) if (!keep.has(`p/${f}`)) fs.unlinkSync(`p/${f}`);
console.log(`공유 페이지 ${[...keep].filter(f => f.endsWith(".html")).length}개 갱신`);
