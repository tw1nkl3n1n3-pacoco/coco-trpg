// 코코 로그방 · 홈 '아카이브' 테마 (관리 → 홈 테마에서 고름 · 기본 홈과 검색·데이터는 같고 모양만 달라요)
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
function isHX(){return site().skin==="ax"||(site().home==="x"&&site().skin!=="nf");}
function isAX(){return site().skin==="ax";}
const HX_COL={wa:"#e8484b",dx:"#e6336f",deco:"#f09a1a",coc:"#14b48a"};
function hxCol(sc){return HX_COL[themeOf(sc)]||"#8892a0";}
function hxDot(d){return d?d.replace(/-/g,"."):"";}
function hxRng(a,b){return !a?"":a===b||!b?hxDot(a):hxDot(a)+" — "+(a.slice(0,4)===b.slice(0,4)?b.slice(5).replace("-","."):hxDot(b));}
function hxCast(sc){const gk=gmKey(sc);const sp=(sc.sp||[]).filter(p=>!/&/.test(p.name||"")&&!isAnon(p));
  // 타이만: 메인 캐릭터만, 캐릭터 이름을 굵게 · 맡은 사람은 회색
  if(sp.some(p=>p.chr)){const m=gmFirst(sp.filter(p=>p.chr&&p.ch),gk);return m.length?`<div class="hx-cast">${m.map(p=>`<span class="hx-pc"><i style="--a:${fixC(p.c)}">${esc([...p.ch][0])}</i><b>${esc(p.ch)}</b><small>${esc(pcSplit(p.name).name)}</small></span>`).join("")}</div>`:"";}
  const gm=sp.find(p=>p.k===gk),pcs=sp.filter(p=>p.k!==gk);if(!sp.length)return "";
  const one=(p,g)=>{const q=pcSplit(p.name||""),n=q.name||"?";return `<span class="hx-pc">${g?`<i class="gm">${gmAb(sc)}</i>`:q.n?`<i class="no" style="--a:${fixC(p.c)}">PC${esc(q.n)}</i>`:`<i style="--a:${fixC(p.c)}">${esc([...n][0])}</i>`}<b>${esc(n)}</b>${!g&&p.ch?`<small>${esc(p.ch)}</small>`:""}</span>`;};
  return `<div class="hx-cast">${gm?one(gm,true):""}${pcs.map(p=>one(p,false)).join("")}</div>`;}
function hxImg(x){return coverOf(x)?coverHTML(x,"hx-img"):`<div class="hx-band"></div>`;}
// 시나리오 카드
function hxScCard(g){const sc=g.sc||{name:g.scen};const open=!g.sc||isOpen(g.sc.id);
  const d0=g.days[0]?.day||sc.lastDay||"",d1=g.days[g.days.length-1]?.day||sc.lastDay||"";
  const on=g.days.some(d=>d.parts.some(p=>p.src==="ccfolia"||p.src==="roll20")),nolog=g.days.length&&g.days.every(d=>d.nolog);
  const lines=g.days.reduce((a,d)=>a+d.parts.reduce((x,p)=>x+(p.n||0),0),0);
  return `<a class="hxc" href="${g.sc?"#c-"+esc(g.sc.id):"#"}" style="--c:${cssC(hxCol(sc))}">${hxImg(sc)}
   <div class="hx-b">${sc.system||sc.fix?`<div class="hx-r1">${sc.system?`<span class="hx-tag">${esc(sysLabel(effSys(sc)))}</span>`:""}${sc.fix?`<span class="hx-tag o hx-fix" data-fix="${esc(sc.fix)}">◆ ${esc(sc.fix)}</span>`:""}</div>`:""}
   <h4>${esc(sc.name)}</h4>${sc.orig?`<div class="hx-orig">${esc(sc.orig)}</div>`:""}
   <span class="hx-when">${esc(hxRng(d0,d1))}${d0?` · ${g.days.length||sc.nDays||1}회차`:""}${on?" · ONLINE":nolog?" · 녹음 없음":""}${!open?" · 🔒":""}</span>
   ${sc.summary?`<div class="hx-sum">${esc(sc.summary)}</div>`:""}
   <div class="hx-nights">${(g.days.length?g.days:[{}]).map((d,i)=>{const tip=d.day?`${i+1}회차 · ${hxDot(d.day).slice(5)}${d.nolog?" · 녹음 없음":""}`:"";
     return d.parts&&d.parts.length&&open?`<i data-hxs="${esc(d.parts[0].id)}" data-tip="${esc(tip)}"></i>`:`<i class="e"${tip?` data-tip="${esc(tip)}"`:""}></i>`;}).join("")}</div>
   ${hxCast(sc)}<div class="hx-ft"><span class="sp"></span>${!open?`<span class="hx-m hx-lock">■ LOCKED</span>`:lines?`<span class="hx-m">${lines.toLocaleString()} lines</span>`:""}${sc.done?`<span class="hx-stp">✓ 완주</span>`:""}</div></div></a>`;}
// 캠프·캠페인 카드
function hxCampCard(c){const es=campEps(c),cm=isCamp(c),cc=c.system?hxCol({system:c.system}):"#1fa8e0",shown=S.campMore[c.id]?es.slice().reverse():es.slice().reverse().slice(0,5);
  return `<a class="hxc" href="#g-${esc(c.id)}" style="--c:${cm?"#1fa8e0":cssC(cc)}">${hxImg(c)}
   <div class="hx-b"><div class="hx-r1"><span class="hx-tag" style="--c:#1fa8e0">${cm?"CAMP":"CAMPAIGN"}</span>${c.system?`<span class="hx-tag o" style="--c:${cssC(cc)}">${esc(sysLabel(c.system))}</span>`:""}${c.place?`<span class="hx-tag o">${esc(c.place)}</span>`:""}${!cm&&c.fix?`<span class="hx-tag o hx-fix" data-fix="${esc(c.fix)}">◆ ${esc(c.fix)}</span>`:""}</div>
   <h4>${esc(c.name)}</h4>${c.orig&&!cm?`<div class="hx-orig">${esc(c.orig)}</div>`:""}
   <span class="hx-when">${cm?esc(campWhen(c)||""):esc(hxRng(es[0]?.lastDay,campLast(c)))} · ${es.length}${cm?"탁":"편"}</span>
   <ul class="hx-eps">${shown.map(e=>`<li style="--c:${cssC(hxCol(e))}"><b>${esc(e.name)}</b><small>${cm?esc((e.lastDay||"").slice(5).replace("-","/")):esc(epLabel(c,e))}</small></li>`).join("")}</ul>
   ${es.length>5?`<button class="hx-more" data-cmore="${esc(c.id)}">${S.campMore[c.id]?"▴ 접기":`▾ ${es.length-5}개 더 보기`}</button>`:""}<div class="hx-ft"><span class="sp"></span>${(cm?campEnded(c):c.done)?`<span class="hx-stp">✓ ${cm?"종료":"완주"}</span>`:""}</div></div></a>`;}
// 진행 중인 캠페인: 편을 잇는 선
function hxLive(c){const es=campEps(c),cc=c.system?hxCol({system:c.system}):"#f09a1a",show=es.slice(-5);
  return `<a class="hx-live" href="#g-${esc(c.id)}"><div class="hx-r1"><span class="hx-tag" style="--c:#f09a1a">CAMPAIGN</span>${c.system?`<span class="hx-tag o" style="--c:${cssC(cc)}">${esc(sysLabel(c.system))}</span>`:""}</div>
  <h3>${esc(c.name)}</h3><div class="hx-when">${esc(c.orig||"")}${c.orig?" · ":""}${es.length}편 · 마지막 ${esc(hxDot(campLast(c)))}</div>
  <div class="hx-track">${show.map((e,i)=>`<div class="hx-node${i===show.length-1?" n":""}"><i></i><b>${esc(epLabel(c,e)||"")}${i===show.length-1?" · LATEST":""}</b><span>${esc(e.name)}</span></div>`).join("")}</div></a>`;}
// 홈 숫자 (두 테마 같이 써요) · 같은 시나리오를 다시 돌려도 한 번 · 캠프의 탁은 시나리오·세션에 들어가 있어서 캠페인만 따로 · 함께한 사람에서 내 닉네임은 빼요
function homeStats(all){
  const ns=new Set((site().nicks||[]).map(x=>String(x).trim().toLowerCase()).filter(Boolean)),P=new Set();
  S.scens.forEach(sc=>(sc.sp||[]).forEach(p=>{if(p.chr&&!p.ch||/&/.test(p.name||"")||isAnon(p))return;const n=pcSplit(p.name||"").name;if(n&&!ns.has(n.toLowerCase()))P.add(n);}));
  const cps=S.camps.filter(c=>!isCamp(c));
  return {scen:new Set(S.scens.map(sc=>String(sc.name||"").toLowerCase().replace(/\s+/g,"")).filter(Boolean)).size,
    ses:all.reduce((a,g)=>a+(g.days.length||(g.sc?.nDays||0)),0),cpn:cps.length,live:cps.filter(c=>!c.done).length,ppl:P.size};}
function hxStats(all){const t=homeStats(all);
  const pad=n=>String(n).padStart(2,"0"),st=(n,en,ko)=>`<div class="hx-stat"><b>${pad(n)}</b><div><span class="hx-m">${en}</span><small>${ko}</small></div></div>`;
  return st(t.scen,"Scenarios","시나리오")+st(t.ses,"Sessions","세션")+st(t.cpn,"Campaigns",`캠페인${t.live?` · 진행 중 ${t.live}`:""}`)+st(t.ppl,"Players","함께한 사람");}
// 홈 전체 (검색칸·목록은 기본 홈과 같은 것을 받아서 모양만 바꿔요)
function hxHomeHTML(o){
  const y=new Date(Date.now()+9*3600e3).getUTCFullYear();
  return `<div class="hx"><div class="hx-wrap">
  <div class="hx-bar"><span class="hx-logo"></span><span class="hx-m" style="color:var(--hx-tx)">${esc(site().title)}</span><span class="hx-m hx-hide">// TRPG SESSION ARCHIVE</span></div>
  <section class="hx-hero"><div class="hx-hl"><div class="hx-dots"></div><span class="hx-m hx-k">▲ ARCHIVE — ${y}</span><h1>${esc(site().title)}<span></span></h1><div class="hx-ko">${esc(site().sub)}</div></div>
  <div class="hx-hr">${hxStats(o.all)}</div></section>
  ${o.notices}
  <div class="hx-cmd">${o.search||"<div></div>"}${o.can?`<a class="hx-go" href="#up"><span>세션 올리기</span></a>`:""}</div>
  ${o.live.length?`<div class="hx-sh"><span class="hx-m hx-idx">01</span><h2>진행 중<small>Ongoing</small></h2><span class="hx-ln"></span><span class="hx-m">${o.live.length} active</span></div><div class="hx-og">${o.live.map(hxLive).join("")}</div>`:""}
  <div class="hx-sh"><span class="hx-m hx-idx">${o.live.length?"02":"01"}</span><h2>세션 기록<small>Archive</small></h2><span class="hx-ln"></span><span class="hx-m hx-cnt">${o.n} records</span></div>
  <div id="sesslist">${o.list}</div>
  ${fixTagsHTML()}
  <div class="homefoot hx-foot"><span class="hx-m">${esc(site().title)} © ${y}</span><span class="sp"></span><span class="hright">${o.adminBtn}<span class="authbox"></span></span></div>
  </div></div>`;}
function bindHX(){document.querySelectorAll("[data-hxs]").forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();location.hash="s-"+b.dataset.hxs;});
  document.querySelectorAll(".hxc [data-cmore]").forEach(b=>b.addEventListener("click",ev=>{ev.preventDefault();ev.stopPropagation();},true));}
