// 사이트 조립: 코드 + 이 저장소의 설정(GitHub Variables) + DB에서 만든 공유 페이지 → _site/
// GitHub Actions(deploy.yml)가 실행해요. 저장소에는 개인 설정이 남지 않아요.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = "_site";
const env = process.env;
const repoFull = env.GITHUB_REPOSITORY || "";
const [owner, repo] = repoFull.split("/");
const BASE = owner ? `https://${owner}.github.io/${repo}/` : "./";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const copy = (src) => { if (!fs.existsSync(src)) return; fs.cpSync(src, path.join(OUT, src), { recursive: true }); };
["index.html", "404.html", "css", "js", "firebase"].forEach(copy);

// 1) 설정 파일
let cfg = null;
try { cfg = env.FIREBASE_CONFIG ? JSON.parse(env.FIREBASE_CONFIG) : null; } catch (e) { console.log("::warning::FIREBASE_CONFIG가 올바른 JSON이 아니에요"); }
const ownerEmail = (env.OWNER_EMAIL || "").trim();
if (!cfg) console.log("::warning::FIREBASE_CONFIG가 비어 있어요. 저장소 Settings → Secrets and variables → Actions → Variables에 넣어 주세요.");
if (!ownerEmail) console.log("::warning::OWNER_EMAIL이 비어 있어요.");
fs.writeFileSync(path.join(OUT, "firebase-config.js"),
  `// 배포할 때 자동으로 만들어지는 파일이에요 (저장소 Variables에서 가져와요)\nwindow.FIREBASE_CONFIG = ${JSON.stringify(cfg || {}, null, 2)};\nwindow.OWNER_EMAIL = ${JSON.stringify(ownerEmail)};\n`);

// 3) DB에서 시나리오를 읽어 공유 페이지(p/) + 메인 탭 제목
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const val = v => v == null ? undefined : v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue;
async function list(col = "scenarios") {
  const out = []; let token = "";
  do {
    const u = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/${col}?pageSize=100&key=${cfg.apiKey}${token ? "&pageToken=" + token : ""}`;
    const r = await fetch(u);
    if (!r.ok) throw new Error("Firestore " + r.status + " " + (await r.text()).slice(0, 200));
    const j = await r.json();
    (j.documents || []).forEach(d => out.push({ id: d.name.split("/").pop(), f: d.fields || {} }));
    token = j.nextPageToken || "";
  } while (token);
  return out;
}
let siteTitle = "사이트 이름을 정해주세요", dbOk = false;
if (cfg && cfg.projectId && cfg.apiKey) {
  try {
    const docs = await list();
    const site = docs.find(d => d.id === "_site");
    siteTitle = (site && val(site.f.title)) || siteTitle;
    fs.mkdirSync(path.join(OUT, "p"), { recursive: true });
    let n = 0;
    const pages = docs.filter(d => !d.id.startsWith("_")).map(({ id, f }) => ({ id, f, name: val(f.name) || "시나리오", desc: val(f.system) || "", target: `../#c-${id}` }));
    // 캠페인·캠프 페이지도 (camps는 누구나 읽을 수 있어요)
    let camps = [];
    try { camps = await list("camps"); } catch (e) { console.log("::warning::캠페인·캠프를 읽지 못했어요: " + e.message); }
    const md = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? `${+m[2]}월 ${+m[3]}일` : ""; };
    for (const { id, f } of camps) {
      const camp = val(f.kind) === "camp", eps = (f.eps && f.eps.arrayValue && f.eps.arrayValue.values || []).length;
      const a = val(f.start), b = val(f.end) || a;
      const when = camp && a ? (a === b ? md(a) : `${md(a)} – ${md(b).replace(a.slice(0, 7) === b.slice(0, 7) ? /^\d+월 / : /^$/, "")}`) : "";
      const desc = camp ? ["캠프", when, val(f.place), eps ? `탁 ${eps}개` : ""].filter(Boolean).join(" · ") : ["캠페인", val(f.system), eps ? `${eps}편` : ""].filter(Boolean).join(" · ");
      pages.push({ id, f, name: val(f.name) || (camp ? "캠프" : "캠페인"), desc, target: `../#g-${id}` });
    }
    // 페어·고정탁 페이지도 (fixes는 누구나 읽을 수 있어요) · 공유 이미지 = 맨 위 배너
    let fixes = [];
    try { fixes = await list("fixes"); } catch (e) { console.log("::warning::페어·고정탁을 읽지 못했어요: " + e.message); }
    const fixIds = site && site.f.fixIds && site.f.fixIds.mapValue && site.f.fixIds.mapValue.fields || {};
    for (const { id, f } of fixes) {
      if (!id.startsWith("fx_")) continue;
      let nm = ""; try { nm = decodeURIComponent(id.slice(3)); } catch (e) { continue; }
      const code = val(fixIds[nm]) || encodeURIComponent(nm);
      const ban = f.banner && f.banner.mapValue && f.banner.mapValue.fields || null, bu = ban ? val(ban.u) || "" : "";
      const pair = !!(f.prof && f.prof.mapValue) && !(f.mems && f.mems.mapValue);
      pages.push({ id: "f-" + code, f: { cover: bu ? { mapValue: { fields: { u: { stringValue: bu } } } } : null }, name: nm, desc: [pair ? "페어" : "고정탁", val(f.rel) || val(f.tag) || ""].filter(Boolean).join(" · "), target: `../#f-${code}` });
    }
    for (const { id, f, name, desc, target } of pages) {
      const system = desc, og = val(f.og) || "";
      // 공유 이미지 = 카드 이미지: 갤러리 사진을 카드로 골랐으면 그 사진, 아니면 올린 그림(og)
      const cv = f.cover && f.cover.mapValue && f.cover.mapValue.fields || null, cvU = cv && !val(cv.og) ? val(cv.u) || "" : "";
      let img = "", buf = null, ext = "jpg";
      if (cvU.startsWith("https://")) {
        try { const r = await fetch(cvU); if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); ext = /png/.test(r.headers.get("content-type") || "") ? "png" : "jpg"; } } catch (e) {}
      }
      if (!buf && og.startsWith("data:image/")) { buf = Buffer.from(og.split(",")[1], "base64"); ext = og.startsWith("data:image/png") ? "png" : "jpg"; }
      if (buf) {
        const file = `p/${id}.${ext}`;
        fs.writeFileSync(path.join(OUT, file), buf);
        img = `${BASE}${file}?v=${crypto.createHash("md5").update(buf).digest("hex").slice(0, 8)}`;
      }
      fs.writeFileSync(path.join(OUT, `p/${id}.html`), `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(name)} · ${esc(siteTitle)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(siteTitle)}">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(siteTitle)}${system ? " · " + esc(system) : ""}">
<meta property="og:url" content="${BASE}p/${id}.html">
${img ? `<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${img}">` : `<meta name="twitter:card" content="summary">`}
<meta http-equiv="refresh" content="0;url=${target}">
<script>location.replace(${JSON.stringify(target)}+(location.hash||""));</script>
</head><body><a href="${target}">${esc(name)} 열기</a></body></html>
`);
      n++;
    }
    console.log(`공유 페이지 ${n}개 만듦`);
    dbOk = true;
  } catch (e) { console.log("::warning::공유 페이지를 만들지 못했어요: " + e.message); }
}
const ip = path.join(OUT, "index.html");
const ih = fs.readFileSync(ip, "utf8")
  .replace(/<title>[^<]*<\/title>/, `<title>${esc(siteTitle)}</title>`)
  .replace(/<!--site-meta-->[\s\S]*?<!--\/site-meta-->/, `<!--site-meta--><meta property="og:type" content="website"><meta property="og:title" content="${esc(siteTitle)}"><meta property="og:site_name" content="${esc(siteTitle)}"><!--/site-meta-->`);
fs.writeFileSync(ip, ih);
// 4) 내용 지문: 바뀐 게 없으면 정기 배포를 건너뛰는 데 써요
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : files.push(f); } })(OUT);
const h = crypto.createHash("sha256");
for (const f of files) { h.update(f); h.update(fs.readFileSync(f)); }
const hash = h.digest("hex").slice(0, 16);

// 5) 버전 정보 (관리자 페이지의 업데이트 확인에 써요)
fs.writeFileSync(path.join(OUT, "build.json"), JSON.stringify({
  sha: env.GITHUB_SHA || "", time: new Date().toISOString(), repo: repoFull, upstream: env.UPSTREAM || "", hash
}, null, 2));
if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `hash=${hash}\ndb=${dbOk ? "ok" : "fail"}\n`);
console.log("조립 완료:", OUT, "·", siteTitle, "·", hash, dbOk ? "" : "(DB 못 읽음)");
