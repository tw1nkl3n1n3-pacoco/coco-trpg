// ---------- HTML로 내보내기 (회차 단위, 코코포리아 로그 형식) ----------
async function buildDayHTML(scen,day){
  const sc=findScen(scen);
  const ss=S.sessions.filter(s=>{const i=info(s);return i.scen===scen&&i.day===day;}).map(s=>({...s,...info(s)})).sort((a,b)=>a.part-b.part);
  const days=[...new Set(S.sessions.map(info).filter(i=>i.scen===scen).map(i=>i.day))].sort();
  const nth=days.indexOf(day)+1;
  const g=gmKey(sc);
  const base=(sc?.sp||[]).filter(x=>x.k!==ALL).concat(ALLSP);
  const parts=[];
  for(const s of ss){
    const snap=await S.db.collection(`sessions/${s.id}/chunks`).get();
    const bl=snap.docs.map(d=>d.data()).sort((a,b)=>a.i-b.i).flatMap(c=>c.b||[]);
    parts.push({part:s.part,bl,sp:base.concat((s.sp||[]).filter(o=>!base.some(x=>x.k===o.k)))});
  }
  const title=`${scen} ${nth}회차`;
  // 같은 사람이 이어서 말하면 이름은 한 번만, 대사는 줄바꿈으로 붙여요
  const lines=(bl,sp)=>{
    const out=[];let i=0;
    while(i<bl.length){
      const b=bl[i];
      if(b.s===NOTE){out.push(`<p class="note">${esc(b.x).replace(/\n/g,"<br>")}</p>`);i++;continue;}
      if(b.s===SEC){const l=secLv(b);out.push(l===1?`<h3 class="sec">${esc(b.x)}</h3>`:l===2?`<h4 class="sub">${esc(b.x)}</h4>`:`<h5 class="sub3">${esc(b.x)}</h5>`);i++;continue;}
      if(b.s===HAND){out.push(`<div class="hand"><div class="hlab">핸드아웃${b.ti?" · "+esc(b.ti):""}</div>${esc(b.x).replace(/\n/g,"<br>")}</div>`);i++;continue;}
      if(b.s===DICE){
        const p=b.w?(sp.find(z=>z.k===b.w)||{name:"?",c:"#888"}):null,c=p?fixC(p.c):"#8a8178";
        out.push(`<p class="dice" style="color:${c};--c:${c}">🎲 ${p?`<span class="nm"><b>${esc(p.ch||p.name)}</b></span> : `:""}<span class="tx">${b.x?esc(b.x)+" ":""}${b.r?`<span class="dr">${esc(b.r)}</span>`:""}</span>${b.sec?` <span class="res secret">Secret Dice</span>`:""}${b.o&&OUT[b.o]?` <span class="res ${b.o}">${OUT[b.o]}</span>`:""}</p>`);
        i++;continue;}
      const run=[];while(i<bl.length&&bl[i].s===b.s){run.push(bl[i].x);i++;}
      const p=sp.find(z=>z.k===b.s)||{name:"?",c:"#888"};
      const c=fixC(p.c),gm=b.s===g;
      const nm=`<b>${esc(p.name)}</b>${p.ch?`<small> ${esc(p.ch)}</small>`:""}`;
      const x=run.map(t=>esc(t).replace(/\n/g,"<br>")).join("<br>");
      out.push(`<p${gm?' class="gm"':""} style="color:${c};--c:${c}"><span class="nm">${gm?'<span class="gmt">GM</span>':""}${nm}</span> : <span class="tx">${x}</span></p>`);
    }
    return out.join("\n");
  };
  const body=parts.map(p=>(parts.length>1?`<h2>${p.part}부</h2>`:"")+lines(p.bl,p.sp)).join("\n");
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet">
<title>${esc(title)}</title>
<style>
body{margin:0;background:#fff;color:#222;font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:1.7}
main{max-width:860px;margin:0 auto;padding:28px 20px 60px}
header{border-bottom:1px solid #ddd;margin-bottom:18px;padding-bottom:10px}
header h1{font-size:20px;margin:0}header div{color:#888;font-size:13px}
h2{font-size:14px;color:#999;font-weight:600;text-align:center;margin:28px 0 12px;display:flex;align-items:center;gap:10px}
h2:before,h2:after{content:"";flex:1;border-top:1px solid #e3e3e3}
p{margin:0;padding:6px 2px;border-bottom:1px solid #ece7df;word-break:keep-all;overflow-wrap:anywhere}
.nm b{font-weight:700}.nm small{font-size:12px;font-weight:400;opacity:.85}
.gm{background:#faf6ee;border-left:3px solid currentColor;padding:6px 8px}
.gm .tx{color:#3a2e22}
.gmt{display:inline-block;font-size:10px;font-weight:800;color:#fff;background:var(--c);border-radius:3px;padding:0 4px;margin-right:5px;vertical-align:2px;line-height:15px}
.note{color:#8a8178;font-style:italic;text-align:center;padding:10px 2px}
.sec{font-family:"Gowun Batang",serif;font-size:18px;color:#5a3a1a;margin:34px 0 10px;padding-bottom:6px;border-bottom:2px solid #c9a46a}
.sub{font-family:"Gowun Batang",serif;font-size:16px;color:#6a4a26;margin:24px 0 8px 2px;padding-left:9px;border-left:4px solid #c9a46a}
.sub3{font-family:"Gowun Batang",serif;font-size:14px;color:#8a6a42;margin:16px 0 6px 14px;padding-bottom:3px;border-bottom:1px dashed #e0cfa8}
.hand{font-family:"Gowun Batang",serif;background:#fbf5e6;border:1px solid #e2d3b0;border-radius:6px;padding:12px 18px 14px;margin:12px 0;color:#3a2e22;font-size:15.5px;line-height:1.85}
.hand .hlab{font-family:sans-serif;font-size:10.5px;letter-spacing:1.5px;color:#a08660;margin-bottom:4px}
.dice{background:#f7f5f0;border-left:3px solid var(--c);padding:6px 8px}
.dice .tx{color:#3a2e22}.dice .dr{font-family:ui-monospace,Menlo,Consolas,monospace;font-weight:700}
.res{display:inline-block;font-size:11px;font-weight:800;color:#fff;border-radius:4px;padding:0 7px;margin-left:4px;line-height:18px;vertical-align:1px}
.res.secret{background:#3a2e4a}.res.success{background:#3f7a3a}.res.failure{background:#8a8178}.res.critical{background:#c08a14}.res.fumble{background:#a83a2a}
body{font-family:"Noto Sans KR","Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
main{box-sizing:border-box}
${EXPORT_CSS[sc&&EXPORT_CSS[sc.theme]?sc.theme:""]}
/* 바깥 배경 없이, 로그가 페이지 폭을 꽉 채우게 (글에 복사해 붙이기 좋게) */
html,body{background:transparent!important}
main{max-width:none!important;margin:0!important;border:0!important;box-shadow:none!important;border-radius:0!important;background:transparent!important;padding:20px 20px 40px!important}
</style></head><body class="t-${esc(sc&&sc.theme||"base")}"><main>
<header><h1>${esc(title)}</h1><div>${esc(fmtDay(day))}${sc?.system?" · "+esc(sc.system):""}</div></header>
${body}
</main></body></html>`;
}
// HTML로 받을 때도 시나리오 테마를 입혀요 (사람 대사는 늘 고딕)
const EXPORT_CSS={
"":`body{background:#efe3cc}
main{background:#fffdf9;border:1px solid #d9c4a3;border-radius:14px;margin:28px auto;box-shadow:0 2px 12px rgba(80,50,20,.08)}
header{border-bottom:2px solid #c9a46a}header h1{font-family:"Gowun Batang",serif;color:#5a3a1a;font-size:22px}
.sec{text-align:center;font-size:20px;border-bottom:1px solid #d9c4a3}
.sec:before{content:"❧ ";color:#b8935a;font-weight:400}.sec:after{content:" ☙";color:#b8935a;font-weight:400}
.gm{background:#fbf3e3}p{border-bottom-color:#f0e8da}`,
wa:`body{background:#dcdcdc;color:#111}
main{background:#fcfcfb;border:2px solid #0d0d0d;margin:28px auto;box-shadow:6px 6px 0 #b0101a;padding-top:0}
header{background:#0a0a0a;color:#ece6da;margin:0 -20px 20px;padding:16px 20px;border-bottom:2px solid #b0101a}
header h1{font-family:"Noto Serif KR",serif;letter-spacing:.08em;color:#ece6da}header div{color:#bcb3a6}
h2{color:#0d0d0d}h2:before,h2:after{border-top-color:#0d0d0d}
p{border-bottom-color:#e6e6e3}
.nm b{font-family:"Noto Serif KR",serif}
.gm{background:#efefed;border-left:4px solid #0d0d0d}.gm .tx{color:#0d0d0d}
.gmt{background:#d0141f!important;color:#fff;border-radius:1px}
.note{font-family:"Noto Serif KR",serif;color:#333}
.sec{font-family:"Noto Serif KR",serif;color:#0d0d0d;text-align:center;letter-spacing:.35em;border-bottom:0;padding-bottom:14px;background:linear-gradient(#b0101a,#b0101a) bottom center/70% 3px no-repeat}
.sub{font-family:"Noto Serif KR",serif;color:#0d0d0d;border-left:4px solid #b0101a}
.sub3{font-family:"Noto Serif KR",serif;color:#444;border-bottom:0}.sub3:before{content:"‥ ";color:#b0101a}
.dice{background:#fff;border:1px solid #0d0d0d;border-left:3px solid #b0101a}
.hand{font-family:"Noto Serif KR",serif;background:#fff;border:1px solid #0d0d0d;border-radius:0;box-shadow:4px 4px 0 #0d0d0d;color:#111}.hand .hlab{color:#b0101a}`,
deco:`body{background:repeating-linear-gradient(45deg,rgba(176,138,62,.08) 0 1px,transparent 1px 16px),repeating-linear-gradient(-45deg,rgba(176,138,62,.08) 0 1px,transparent 1px 16px),#1f4a3d;color:#1c2a25}
main{background:#fbf8ef;border:1px solid #b08a3e;border-radius:3px;margin:34px auto;box-shadow:0 0 0 5px #f3edda,0 0 0 6px #b08a3e;padding-top:0}
header{background:#1f4a3d;color:#f3ead2;margin:0 -20px 20px;padding:16px 20px;border-bottom:3px double #b08a3e}
header h1{letter-spacing:.12em;color:#f3ead2}header div{color:#d8ceb2}
h2{color:#8a6420}h2:before,h2:after{border-top-color:#b08a3e}
p{border-bottom-color:#ece4cf}
.gm{background:#f2ebd6;border-left:4px solid #b08a3e}
.gmt{background:#1f4a3d!important;color:#e3c98a;border-radius:0;letter-spacing:.12em}
.note{color:#5a5a48;font-style:normal;letter-spacing:.04em}.note:before{content:"◇ ";color:#b08a3e}.note:after{content:" ◇";color:#b08a3e}
.sec{font-family:"Noto Sans KR",sans-serif;font-weight:700;color:#1f4a3d;text-align:center;letter-spacing:.3em;border-bottom:3px double #b08a3e}
.sec:before{content:"◆ ";color:#b08a3e;letter-spacing:0}.sec:after{content:" ◆";color:#b08a3e;letter-spacing:0}
.sub{font-family:"Noto Sans KR",sans-serif;color:#1f4a3d;border-left:0;padding-left:0;letter-spacing:.14em}.sub:before{content:"▸ ";color:#b08a3e}
.sub3{font-family:"Noto Sans KR",sans-serif;color:#5a6a5e;border-bottom:1px dotted #c9b88a}
.dice{background:#f6f0de;border:1px solid #b08a3e;border-left:3px solid #1f4a3d}
.hand{background:#f6f0dc;border:1px solid #b08a3e;border-radius:2px;box-shadow:inset 0 0 0 4px #fbf8f0,inset 0 0 0 5px #b08a3e}.hand .hlab{color:#1f4a3d;letter-spacing:.2em}`,
blue:`body{background:#eef3f9;color:#142033}
main{background:#fff;border:1px solid #dfe7f2;border-radius:18px;margin:28px auto;box-shadow:0 10px 30px rgba(20,32,51,.06)}
header{border-bottom:1px solid #e2e9f3}header h1{font-weight:800;color:#0f1b2d}header div{color:#8494ab}
h2{color:#2563eb}h2:before,h2:after{border-top-color:#dbe6f6}
p{border-bottom-color:#eef2f8}
.gm{background:#eef4ff;border-left:4px solid #2563eb}
.gmt{background:#2563eb!important;color:#fff;border-radius:999px;padding:0 7px}
.note{color:#4a5a72;font-style:normal}
.sec{font-family:"Noto Sans KR",sans-serif;font-weight:800;color:#0f1b2d;border-bottom:0;border-left:6px solid #2563eb;padding:0 0 0 10px}
.sub{font-family:"Noto Sans KR",sans-serif;font-weight:700;color:#1d4ed8;border-left:0;padding:3px 12px;background:#e8f0ff;border-radius:999px;display:inline-block}
.sub3{font-family:"Noto Sans KR",sans-serif;color:#4a5a72;border-bottom:0}.sub3:before{content:"• ";color:#38bdf8}
.dice{background:#f4f8ff;border:1px solid #d6e3fb;border-left:3px solid #2563eb;border-radius:10px}
.hand{font-family:"Noto Sans KR",sans-serif;background:#fff;border:1px solid #d6e3fb;border-radius:14px;color:#142033}.hand .hlab{color:#2563eb;font-weight:700}`};
async function exportDay(scen,day){
  toast("HTML 만드는 중…");
  try{
    const html=await buildDayHTML(scen,day);
    const days=[...new Set(S.sessions.map(info).filter(i=>i.scen===scen).map(i=>i.day))].sort();
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));
    a.download=`${scen} ${days.indexOf(day)+1}회차.html`.replace(/[\\/:*?"<>|]/g,"_");
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  }catch(e){toast("내보내기에 실패했어요: "+(e.code||e.message||e),3500);}
}
document.addEventListener("click",ev=>{const b=ev.target.closest("[data-exps]");if(!b)return;ev.preventDefault();ev.stopPropagation();exportDay(b.dataset.exps,b.dataset.expd);},true);
