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
async function list() {
  const out = []; let token = "";
  do {
    const u = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/scenarios?pageSize=100&key=${cfg.apiKey}${token ? "&pageToken=" + token : ""}`;
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
    for (const { id, f } of docs) {
      if (id.startsWith("_")) continue;
      const name = val(f.name) || "시나리오", system = val(f.system) || "", og = val(f.og) || "";
      let img = "";
      if (og.startsWith("data:image/")) {
        const buf = Buffer.from(og.split(",")[1], "base64");
        const file = `p/${id}.${og.startsWith("data:image/png") ? "png" : "jpg"}`;
        fs.writeFileSync(path.join(OUT, file), buf);
        img = `${BASE}${file}?v=${crypto.createHash("md5").update(buf).digest("hex").slice(0, 8)}`;
      }
      const target = `../#c-${id}`;
      fs.writeFileSync(path.join(OUT, `p/${id}.html`), `<!DOCTYPE html>
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
