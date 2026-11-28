// 페어·고정탁 페이지 · 넷플릭스식 (시안 미리보기: #nf-코드)
// 어두운 바탕 고정 · 첫 화면 그림 + 왼쪽 큰 제목 + 출연 · 아래로 프로필 / 이야기 / 타임라인 / 포스트
// 타임라인·포스트·수정·비밀번호는 지금 페어·고정탁 부품을 그대로 써요
const NF_BG="#141414";
function nfStories(f,data){const out=[],seen=new Set();
  data.gs.slice().sort((a,b)=>(b.last||b.days.at(-1)?.day||"").localeCompare(a.last||a.days.at(-1)?.day||"")).forEach(g=>{const c=g.sc.camp&&campById(g.sc.camp);
    if(c){if(seen.has(c.id))return;seen.add(c.id);const es=campEps(c),gs=data.gs.filter(x=>x.sc.camp===c.id),ds=gs.flatMap(x=>x.days.map(d=>d.day)).filter(Boolean).sort(),cm=isCamp(c),done=!cm&&!!c.done;
      const fin=es.filter(e=>e.done||done).length;out.push({href:"#g-"+c.id,name:c.name,cv:(campCover(c,es)||{}).u||"",tag:cm?"캠프":`캠페인 · ${done?"완주":"진행 중"}`,sub:`${es.filter(e=>!e.gaiden).length}편${ds.length?" · "+jgDot(ds[0].slice(5))+(ds.length>1?" – "+jgDot(ds.at(-1).slice(5)):""):""}`,pg:es.length?Math.round(fin/es.length*100):0,k:ds[0]||""});}
    else{const d0=g.days[0]?.day||"",dl=g.last||d0;out.push({href:"#c-"+g.sc.id,name:g.sc.name,cv:(coverOf(g.sc)||{}).u||"",tag:"",sub:`${g.days.length}세션${d0?" · "+jgDot(d0.slice(5))+(dl&&dl!==d0?" – "+jgDot(dl.slice(5)):""):""}`,pg:g.sc.done||g.days.length?100:0,k:d0});}});
  return out;}
function nfPageHTML(f){const pair=jgPair(f),d=jgDoc(f),fields=d.fields&&d.fields.length?d.fields:JG_F0,data=jgFixData(f),ban=d.banner,W=fixWord(f);
  const srcs=jgSrcs(f),items=galAll(srcs,1),postsH=S.db?galHTML(srcs,{newest:1,title:"포스트",en:"POSTS"}):"";
  const sys=(()=>{const c={};data.gs.forEach(g=>{const x=sysLabel(effSys(g.sc)||"");if(x)c[x]=(c[x]||0)+1;});return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||"";})();
  let mem=[];if(pair){const [A,B]=jgSides(f);mem=[A,B].map(s=>({nm:s.nm,en:s.en,q:s.pr,own:s.own,c:s.key==="a"?"var(--ja)":"var(--jb)",n:s.own}));}
  else mem=fxMembers(f).map(m=>({...m,own:m.n}));
  const last=data.days.at(-1),lastG=last?data.gs.find(g=>g.days.some(x=>x.day===last)):null,code=fixCode(f)||encodeURIComponent(f);
  const meta=[last?`<span class="new">최근 세션 ${esc(jgDot(last.slice(5)))}</span>`:"",data.days.length?`<span>${esc(jgDot(data.days[0]).slice(0,7))} –</span>`:"",sys?`<span class="bx">${esc(sys)}</span>`:"",`<span>이야기 ${data.stories}</span>`,`<span>세션 ${data.days.length}</span>`,data.days.length?`<span>함께한 날 ${jgDaysSince(data.days[0])}</span>`:""].join("");
  const line=pair?d.rel:d.tag;
  const right=`<div class="nfcast">${mem.map(m=>`<button type="button" data-nfprof="${esc(m.n)}" style="--c:${cssC(m.c)}">${m.q.icon?.u?`<img src="${esc(m.q.icon.u)}" alt="">`:`<i>${esc(m.nm.slice(0,1))}</i>`}<b>${esc(m.nm)}</b><small>${esc(m.n)}</small><em>프로필 ›</em></button>`).join("")}</div>`;
  const st=nfStories(f,data);
  return `<div class="jgp nfx${pair?" pair":""}">
    <section class="nfhero">${ban?.u?`<img class="bg" src="${esc(ban.u)}" alt="" style="object-position:50% ${+ban.y>=0?+ban.y:40}%">`:`<div class="bg empty"></div>`}
      <div class="nfin"><div class="tag">${pair?`페어 · ${esc(mem[0].en)} × ${esc(mem[1].en)}`:`고정탁 · ${mem.length}명`}</div><h1>${esc(f)}</h1>
        <div class="meta">${meta}</div>${line?`<p>${esc(line)}</p>`:""}
        <div class="btns">${lastG?`<a class="b1" href="#c-${esc(lastG.sc.id)}">▶ 최근 로그</a>`:""}<button type="button" class="b2" data-nfup>＋ 포스트 올리기</button></div></div>
      ${right}</section>
    <div class="nfrow nfcastrow"><h3>출연</h3><div class="nfcastr">${mem.map(m=>`<button type="button" data-nfprof="${esc(m.n)}" style="--c:${cssC(m.c)}">${m.q.icon?.u?`<img src="${esc(m.q.icon.u)}" alt="">`:`<i>${esc([...m.nm][0])}</i>`}<span><b>${esc(m.nm)}</b><small>${esc([m.en&&m.en!==m.nm?m.en:"",m.own].filter(Boolean).join(" · "))}</small></span><em>›</em></button>`).join("")}</div></div>
    <div class="nfrow"><h3>${pair?"함께한 이야기":"이야기"} <small>${st.length} · 최신순</small><span class="nfh">${st.length>4?`<button type="button" data-nfall="st">${(S.nfAll||{}).st?"접기 ▴":"모두 보기 ›"}</button>`:""}${st.length?`<a href="#mb-f-${esc(code)}">📖 리플레이북 합본</a>`:""}</span></h3>
      ${st.length?`<div class="nfscr${(S.nfAll||{}).st?" all":""}"><button type="button" class="nfarw l" data-nfarw="-1" aria-label="이전">‹</button><div class="nfcards">${st.map(s=>`<a class="nfcd" href="${esc(s.href)}">${s.cv?`<img src="${esc(s.cv)}" alt="" loading="lazy">`:""}${s.tag?`<span class="tp">${esc(s.tag)}</span>`:""}<b>${esc(s.name)}</b><small>${esc(s.sub)}</small><span class="pg"><i style="width:${s.pg}%"></i></span></a>`).join("")}</div><button type="button" class="nfarw r" data-nfarw="1" aria-label="다음">›</button></div>`:`<div class="empty">아직 세션이 없어요</div>`}</div>
    <div class="nfrow nftl wide">${jgTimelineHTML(f,data,items).replace("<h4>TIMELINE","<h4>타임라인")}</div>
    <div class="nfrow nfposts${(S.nfAll||{}).po?" all":""}">${postsH}</div>
    <div class="nfrow nfend">
      ${jgCanEdit(f)?`<div class="jgtop jgbot"><a class="ghost ownonly" href="#">← 첫 화면</a>${isNF()||isAX()?"":`<a class="ghost" href="#f-${esc(code)}">지금 디자인으로 보기</a>`}<span style="flex:1"></span><button type="button" class="jged" id="jgedit">${S.jgEdit?"✕ 수정 닫기":`✎ ${W} 수정`}</button></div>`:""}
      ${S.jgEdit&&jgCanEdit(f)?jgEditHTML(f):""}
      ${fixAccHTML(f)}${jgRO(f)?(pair?`<div class="sc-sec fxacc jgacc"><h4 data-en="ACCESS">페어 비밀번호</h4><div class="tip">페어 비밀번호를 넣으면 글을 올리고, 기록을 더하고, 댓글을 달 수 있어요.</div><form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="페어 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`
        :`<div class="sc-sec fxacc jgacc"><h4 data-en="ACCESS">고정탁 비밀번호</h4><div class="tip">누구로 들어갈지 고르고 비밀번호를 넣어요.</div><div class="fxpk">${mem.map(m=>`<button type="button" class="${S.fxPick===m.n?"on":""}" data-fxpick="${esc(m.n)}" style="--c:${cssC(m.c)}"><i></i>${esc(m.nm)} · ${esc(m.n)}</button>`).join("")}<button type="button" class="${S.fxPick==="ext"?"on":""}" data-fxpick="ext">외부인으로</button></div><form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="고정탁 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`):""}
    </div></div>`;}
// 포스트 카드의 세션 이름: 그림 위 딱지 → 캡션 맨 위 줄 (좁아도 안 잘리게)
function nfFromToCap(){document.querySelectorAll(".nfposts .galg figure,.axposts .galg figure").forEach(fg=>{const fr=fg.querySelector(".im>.from"),cap=fg.querySelector("figcaption");if(fr&&cap)cap.prepend(fr);});}
// 프로필 모달 (첫 화면 아이콘을 누르면)
function nfMem(f){if(jgPair(f)){const [A,B]=jgSides(f);return [A,B].map(s=>({n:s.own||s.key,nm:s.nm,en:s.en,q:s.pr,own:s.own,c:s.key==="a"?"var(--ja)":"var(--jb)"}));}return fxMembers(f).map(m=>({...m,own:m.n}));}
function nfModalOpen(f,n){const d=jgDoc(f),fields=d.fields&&d.fields.length?d.fields:JG_F0,M=nfMem(f),i=Math.max(0,M.findIndex(m=>m.n===n)),m=M[i],q=m.q||{};
  document.querySelector(".nfmodal")?.remove();
  // 전신은 여러 장일 수 있어요 (cut + cuts) · 흉상·두상은 오른쪽에 같이
  const fulls=[q.cut,...(q.cuts||[])].filter(x=>x&&x.u),main=fulls[0]||q.bust||q.icon||null,dl=[q.age&&(/\D/.test(q.age)?q.age:q.age+"세"),q.ht&&(/\D/.test(q.ht)?q.ht:q.ht+"cm"),q.sex,q.mbti].filter(Boolean);
  const side=[[q.bust,"흉상","bust"],[q.icon,"두상","face"]].filter(x=>x[0]&&x[0].u&&x[0]!==main);
  const el=document.createElement("div");el.className="nfmodal";el.style.setProperty("--c",m.c);
  el.innerHTML=`<div class="box" role="dialog" aria-label="${esc(m.nm)} 프로필"><button type="button" class="x" aria-label="닫기">✕</button>
    <div class="pic${fulls.length?" cut":""}">${main?`<img src="${esc(main.u)}" alt="">`:`<i>${esc([...(m.nm||"?")][0])}</i>`}${fulls.length>1?`<div class="shots">${fulls.map((x,j)=>`<button type="button" class="${j?"":"on"}" data-shot="${j}" data-u="${esc(x.u)}" title="전신 ${j+1}"><img src="${esc(x.u)}" alt=""><span>전신 ${j+1}</span></button>`).join("")}</div>`:""}</div>
    <div class="info">${side.length?`<div class="busts">${side.map(([x,lab,k])=>`<figure class="${k}"><img src="${esc(x.u)}" alt=""><figcaption>${lab}</figcaption></figure>`).join("")}</div>`:""}
      <div class="tag">${esc(m.en||"")}</div><h2>${esc(m.nm)}</h2>${q.rn||q.ren?`<div class="rn">${[q.rn,q.ren].filter(Boolean).map(esc).join(" · ")}</div>`:""}
      <div class="meta">${dl.map(x=>`<span>${esc(x)}</span>`).join("")}${m.own?`<span class="own">플레이어 ${esc(m.own)}</span>`:""}</div>
      ${(q.tags||[]).length?`<div class="tags">${q.tags.slice(0,5).map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}
      ${fields.filter(k=>(q.sec||{})[k]).map(k=>`<h4>${esc(k)}</h4><p>${esc(q.sec[k]).replace(/\n/g,"<br>")}</p>`).join("")}</div>
    ${M.length>1?`<div class="nav">${M.map((x,j)=>`<button type="button" class="${j===i?"on":""}" data-nfp="${esc(x.n)}" style="--c:${cssC(x.c)}">${esc(x.nm)}</button>`).join("")}</div>`:""}</div>`;
  document.body.appendChild(el);document.body.classList.add("nfmodal-on");
  const close=()=>{el.remove();document.body.classList.remove("nfmodal-on");document.removeEventListener("keydown",esc_);};const esc_=e=>{if(e.key==="Escape")close();};
  el.onclick=e=>{const sb=e.target.closest("[data-shot]");if(sb){const im=el.querySelector(".pic>img");if(im)im.src=sb.dataset.u;el.querySelectorAll("[data-shot]").forEach(b=>b.classList.toggle("on",b===sb));return;}
    if(e.target===el||e.target.closest(".x"))close();const b=e.target.closest("[data-nfp]");if(b){close();nfModalOpen(f,b.dataset.nfp);}};document.addEventListener("keydown",esc_);}
function bindNfPage(f){if(jgPair(f))bindJgPage(f);else bindFxPage(f);
  nfFromToCap();
  // 포스트: 6×2 격자를 가로로 넘기기 (양옆 화살표 · 폰은 밀기)
  {const gg=document.querySelector(".nfposts .galsec .galg");if(gg&&!gg.parentElement.classList.contains("nfscr")){const w=document.createElement("div");w.className="nfscr nfpscr";gg.before(w);
    w.append(Object.assign(document.createElement("button"),{type:"button",className:"nfarw l",textContent:"‹"}),gg,Object.assign(document.createElement("button"),{type:"button",className:"nfarw r",textContent:"›"}));
    const up=()=>{w.classList.toggle("atl",gg.scrollLeft<4);w.classList.toggle("atr",gg.scrollLeft+gg.clientWidth>=gg.scrollWidth-4);};gg.addEventListener("scroll",up,{passive:true});up();
    w.querySelector(".l").onclick=()=>gg.scrollBy({left:-gg.clientWidth-8,behavior:"smooth"});w.querySelector(".r").onclick=()=>gg.scrollBy({left:gg.clientWidth+8,behavior:"smooth"});}}
  // 타임라인은 왼쪽 멤버 칸 높이만큼 보여 주고 더 보기 (모바일은 520px)
  {const tl=document.querySelector(".nftl .jgtl"),pf=document.querySelector(".nfsplit>div:first-child"),key=S.jgTl||"main";
    if(tl&&pf&&!(S.jgAll||{})[key]){const two=getComputedStyle(tl.closest(".nfsplit")).gridTemplateColumns.split(" ").length>1,cap=two?Math.max(pf.offsetHeight,420):520;
      if(tl.scrollHeight>cap+60){tl.style.maxHeight=cap+"px";tl.classList.add("clamp");tl.querySelector(".jgmore")?.remove();
        const b=document.createElement("button");b.type="button";b.className="jgmore";b.textContent="타임라인 더 보기 ▾";b.onclick=()=>{S.jgAll={...(S.jgAll||{}),[key]:true};render();};tl.appendChild(b);}}}
  document.querySelectorAll("[data-nfall]").forEach(b=>b.onclick=()=>{S.nfAll={...(S.nfAll||{}),[b.dataset.nfall]:!(S.nfAll||{})[b.dataset.nfall]};render();});
  document.querySelectorAll(".nfscr").forEach(w=>{const sc=w.querySelector(".nfcards,.galg");if(!sc)return;const up=()=>{w.classList.toggle("atl",sc.scrollLeft<4);w.classList.toggle("atr",sc.scrollLeft+sc.clientWidth>=sc.scrollWidth-4);};
    sc.addEventListener("scroll",up,{passive:true});up();w.querySelectorAll("[data-nfarw]").forEach(b=>b.onclick=()=>sc.scrollBy({left:+b.dataset.nfarw*sc.clientWidth*.9,behavior:"smooth"}));});
  document.querySelectorAll("[data-nfprof]").forEach(b=>b.onclick=()=>nfModalOpen(f,b.dataset.nfprof));
  // 첫 화면 두 번째 버튼: 올릴 수 있으면 포스트 올리기, 아니면 프로필
  {const b=document.querySelector("[data-nfup]");if(b){const up=document.querySelector(".nfposts .galup");
    if(up)b.onclick=()=>{document.querySelector(".nfposts").scrollIntoView({block:"start",behavior:"smooth"});setTimeout(()=>up.click(),350);};
    else{const m=document.querySelector("[data-nfprof]");if(m){b.textContent="ⓘ 프로필";b.onclick=()=>nfModalOpen(f,m.dataset.nfprof);}else b.remove();}}}
  // 가로 타임라인: 양옆 화살표로 넘겨요 (포스트 줄과 같은 방식)
  {const tw=document.querySelector(".nftl.wide .tl");if(tw&&!tw.parentElement.classList.contains("nfscr")){const w=document.createElement("div");w.className="nfscr nftlscr";tw.before(w);
    w.append(Object.assign(document.createElement("button"),{type:"button",className:"nfarw l",textContent:"‹"}),tw,Object.assign(document.createElement("button"),{type:"button",className:"nfarw r",textContent:"›"}));
    const up=()=>{w.classList.toggle("atl",tw.scrollLeft<4);w.classList.toggle("atr",tw.scrollLeft+tw.clientWidth>=tw.scrollWidth-4);};tw.addEventListener("scroll",up,{passive:true});up();
    w.querySelector(".l").onclick=()=>tw.scrollBy({left:-tw.clientWidth*.85,behavior:"smooth"});w.querySelector(".r").onclick=()=>tw.scrollBy({left:tw.clientWidth*.85,behavior:"smooth"});}}}
// ===== 짭플릭스: 사이트 전체 테마 (관리 → 사이트 테마) · 끄면 원래 테마 그대로 =====
function isNF(){return site().skin==="nf";}
function nfGCard(g,o={}){const sc=g.sc||{name:g.scen},open=!g.sc||isOpen(g.sc.id),cv=coverOf(sc),d0=g.days[0]?.day||sc.lastDay||"",dl=g.last||d0;
  const fx=g.sc?fixOfScen(g.sc):"",cm=g.sc?campOf(g.sc):null,ep=cm&&!isCamp(cm)?epLabel(cm,g.sc):"";
  return `<a class="nfcd" href="${g.sc?"#c-"+esc(g.sc.id):"#"}">${cv?`<img src="${esc(cv.u)}" alt="" loading="lazy" style="object-position:50% ${+cv.y>=0?cv.y:50}%">`:`<span class="ph">${esc([...(sc.name||"?")][0])}</span>`}
    ${o.isNew?`<span class="tp r">NEW</span>`:!open?`<span class="tp">🔒 잠김</span>`:""}${cm?`<em class="cmn${o.isNew||!open?" low":""}">${esc(cm.name)}${ep?" · "+esc(ep):""}</em>`:""}<b>${esc(sc.name)}</b><small>${esc([g.sc&&effSys(g.sc)?sysLabel(effSys(g.sc)):"",dl?jgDot(dl.slice(2)):"",`${g.days.length||sc.nDays||1}회차`,fx?"◆ "+fx:""].filter(Boolean).join(" · "))}</small><span class="pg"><i style="width:${sc.done?100:g.days.length?60:0}%"></i></span></a>`;}
function nfCCard(c){const es=campEps(c),cm=isCamp(c),done=cm?campEnded(c):!!c.done,cv=campCover(c,es),fin=es.filter(e=>e.done||done).length;
  return `<a class="nfcd" href="#g-${esc(c.id)}">${cv?`<img src="${esc(cv.u)}" alt="" loading="lazy">`:`<span class="ph">${esc([...(c.name||"?")][0])}</span>`}
    <span class="tp">${cm?"캠프":"캠페인"} · ${cm?(done?"종료":esc(c.place||"진행")):(done?"완주":"진행 중")}</span><b>${esc(c.name)}</b><small>${es.length}${cm?"탁":"편"}${c.system?" · "+esc(sysLabel(c.system)):""}</small><span class="pg"><i style="width:${es.length?Math.round(fin/es.length*100):0}%"></i></span></a>`;}
function nfRow(title,cards,o={}){if(!cards.length)return "";return `<div class="nfrow nfhrow"${o.id?` id="${o.id}"`:""}><h3>${title}${o.sub?` <small>${o.sub}</small>`:""}</h3><div class="nfscr"><button type="button" class="nfarw l" data-nfarw="-1" aria-label="이전">‹</button><div class="nfcards${o.cls?" "+o.cls:""}">${cards.join("")}</div><button type="button" class="nfarw r" data-nfarw="1" aria-label="다음">›</button></div></div>`;}
function nfHomeHTML(o){const all=o.all.filter(g=>g.sc),byLast=all.slice().sort((a,b)=>(b.last||b.sc.lastDay||"").localeCompare(a.last||a.sc.lastDay||""));
  const top=byLast[0],t=homeStats(o.all),pad=n=>String(n).padStart(2,"0");
  let hero="";if(top){const sc=top.sc,cv=coverOf(sc),open=isOpen(sc.id),ld=top.days.at(-1),sid=ld&&ld.parts[0]?.id,gm=(sc.sp||[]).find(p=>p.k===gmKey(sc));
    hero=`<section class="nfhero nfhome">${cv?`<img class="bg" src="${esc(cv.u)}" alt="" style="object-position:50% ${+cv.y>=0?cv.y:40}%">`:`<div class="bg empty"></div>`}
      <div class="nfin"><div class="tag">최근 세션${effSys(sc)?" · "+esc(sysLabel(effSys(sc))):""}${fixOfScen(sc)?" · ◆ "+esc(fixOfScen(sc)):""}</div><h1>${esc(sc.name)}</h1>${sc.orig?`<div class="orig">${esc(sc.orig)}</div>`:""}
        <div class="meta">${top.last?`<span class="new">새 세션 ${esc(jgDot(top.last.slice(5)))}</span>`:""}<span>${top.days.length||sc.nDays||1}회차</span>${effSys(sc)?`<span class="bx">${esc(sysLabel(effSys(sc)))}</span>`:""}${gm?`<span>${gmAb(sc)} ${esc(pcSplit(gm.name).name)}</span>`:""}${sc.done?"<span>완주</span>":""}</div>
        ${sc.summary?`<p class="sum">${esc(sc.summary)}</p>`:""}
        <div class="btns">${open&&sid?`<a class="b1" href="#s-${esc(sid)}">▶ 로그 보기</a>`:""}<a class="b2" href="#c-${esc(sc.id)}">ⓘ 상세 정보</a></div></div>
      <div class="nfstat"><div><b>${pad(t.scen)}</b><small>시나리오</small></div><div><b>${pad(t.ses)}</b><small>세션</small></div><div><b>${pad(t.cpn)}</b><small>캠페인</small></div><div><b>${pad(t.ppl)}</b><small>함께한 사람</small></div></div></section>`;}
  const newIds=new Set(byLast.slice(0,1).map(g=>g.sc.id));
  const recent=byLast.slice(0,15).map(g=>nfGCard(g,{isNew:newIds.has(g.sc.id)}));
  const topN=all.slice().sort((a,b)=>(b.days.length||b.sc.nDays||0)-(a.days.length||a.sc.nDays||0)).slice(0,5);
  const top5=topN.map((g,i)=>{const cv=coverOf(g.sc);return `<a class="nftop" href="#c-${esc(g.sc.id)}"><span class="n">${i+1}</span><span class="pt">${cv?`<img src="${esc(cv.u)}" alt="" loading="lazy">`:`<i>${esc(g.sc.name)}</i>`}</span>${campOf(g.sc)?`<em>${esc(campOf(g.sc).name)}</em>`:""}</a>`;});
  const camps=S.camps.slice().sort((a,b)=>(campLast(b)||"").localeCompare(campLast(a)||"")).map(nfCCard);
  const fixes=[...new Set(all.map(g=>fixOfScen(g.sc)).filter(Boolean))].map(f=>{const gs=all.filter(g=>fixOfScen(g.sc)===f),lg=gs.slice().sort((a,b)=>(b.last||"").localeCompare(a.last||""))[0],cv=lg&&coverOf(lg.sc),n=fixPeopleList(f).filter(p=>!/^(GM|KP|DM|수호자|키퍼)$/i.test(p.n)).length;
    return {k:lg?.last||"",h:`<a class="nfcd" href="${esc(fixHref(f))}">${cv?`<img src="${esc(cv.u)}" alt="" loading="lazy">`:`<span class="ph">${esc([...f][0])}</span>`}<span class="tp">${esc(fixWord(f))}${fixWord(f)==="페어"?"":` · ${n}명`}</span><b>${esc(f)}</b><small>이야기 ${gs.length}</small></a>`};}).sort((a,b)=>b.k.localeCompare(a.k)).map(x=>x.h);
  const sysm={};all.forEach(g=>{const s=effSys(g.sc)?sysLabel(effSys(g.sc)):"기타";(sysm[s]=sysm[s]||[]).push(g);});
  const sysRows=Object.entries(sysm).sort((a,b)=>b[1].length-a[1].length).map(([s,gs])=>nfRow(esc(s),gs.sort((a,b)=>(b.last||"").localeCompare(a.last||"")).map(g=>nfGCard(g)),{sub:`${gs.length}`})).join("");
  // 함께한 사람: 세션 수 순
  const ns=new Set((site().nicks||[]).map(x=>String(x).trim().toLowerCase())),P={};
  all.forEach(g=>(g.sc.sp||[]).forEach(p=>{if(p.chr&&!p.ch||/&/.test(p.name||"")||isAnon(p))return;const n=pcSplit(p.name||"").name;if(!n||ns.has(n.toLowerCase()))return;const q=P[n]=P[n]||{n,c:fixC(p.c),s:0,gm:0};q.s+=g.days.length||1;if(p.k===gmKey(g.sc))q.gm++;}));
  const ppl=Object.values(P).sort((a,b)=>b.s-a.s);
  return `<div class="nfx nfsite">
    <nav class="nfnav"><a class="logo" href="#">${esc(site().title)}</a><a href="#nfr-recent">세션</a>${camps.length?`<a href="#nfr-camp">캠페인</a>`:""}${fixes.length?`<a href="#nfr-fix">페어 · 고정탁</a>`:""}<span class="sp"></span>
      ${o.search?`<button type="button" class="nfsrchbtn" data-nfsrch aria-label="검색"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>`:""}
      ${o.can?`<a class="up" href="#up">＋ 세션 올리기</a>`:""}</nav>
    ${o.search?`<div class="nfsrch${S.nfSrch?" on":""}" role="dialog" aria-label="검색"><button type="button" class="x" data-nfsrchx aria-label="닫기">✕</button><div class="in"><div class="lb">무엇을 찾으세요?</div><div class="nfsearchw">${o.search}</div><div class="hint">제목 · 룰 · 플레이어 · 캐릭터 · 캠페인 · Enter로 결과 전체 보기</div></div></div>`:""}
    ${o.q?"":hero}
    <div class="nfnotice">${o.notices}</div>
    ${o.q?`<div class="nfrow nfres"><h3>${S.homeQc&&S.homeQc.trim()?`'${esc(S.homeQc.trim())}' `:""}${S.homePerson?`👤 ${esc(S.homePerson)} `:""}검색 결과 <small>${(o.gs||[]).length+(o.cs||[]).length}</small><button type="button" class="clr" data-nfclr>✕ 검색 지우기</button></h3><div id="sesslist" class="nfresg">${[...(o.gs||[]).map(g=>({k:g.last||"",h:nfGCard(g)})),...(o.cs||[]).map(c=>({k:campKey(c),h:nfCCard(c)}))].sort((a,b)=>b.k.localeCompare(a.k)).map(x=>x.h).join("")||o.emptyMsg}</div></div>`:`<div id="sesslist" hidden></div>`}
    <div class="nfhrows"${o.q?" hidden":""}>
    ${nfRow("최근 올라온 세션",recent,{id:"nfr-recent"})}
    ${top5.length>=3?`<div class="nfrow nfhrow"><h3>세션 수 TOP ${top5.length} <small>회차가 많은 이야기</small></h3><div class="nftops">${top5.join("")}</div></div>`:""}
    ${nfRow("캠페인 · 캠프",camps,{id:"nfr-camp"})}
    ${nfRow("페어 · 고정탁",fixes,{id:"nfr-fix"})}
    ${sysRows}
    ${ppl.length?`<div class="nfrow nfhrow nfppl"><h3>함께한 사람 <small>${ppl.length}</small></h3><div class="nfpplw">${ppl.map(p=>`<button type="button" data-nfwho="${esc(p.n)}" style="--c:${cssC(p.c)}"><i>${esc([...p.n][0])}</i><b>${esc(p.n)}</b><small>${p.s}세션${p.gm?` · GM ${p.gm}`:""}</small></button>`).join("")}</div></div>`:""}
    </div>
    <div class="nfrow nffoot"><span>${esc(site().title)} © ${new Date().getFullYear()}</span><span class="sp"></span>${o.adminBtn}<span class="authbox"></span></div>
  </div>`;}
function nfScrollBind(){document.querySelectorAll(".nfscr").forEach(w=>{const sc=w.querySelector(".nfcards,.galg");if(!sc||w.dataset.b)return;w.dataset.b=1;const up=()=>{w.classList.toggle("atl",sc.scrollLeft<4);w.classList.toggle("atr",sc.scrollLeft+sc.clientWidth>=sc.scrollWidth-4);};
  sc.addEventListener("scroll",up,{passive:true});up();w.querySelectorAll("[data-nfarw]").forEach(b=>b.onclick=()=>sc.scrollBy({left:+b.dataset.nfarw*sc.clientWidth*.9,behavior:"smooth"}));});}
function bindNfHome(){nfScrollBind();
  // 검색: 구석 돋보기 → 풀페이지 검색 창 (입력·추천은 기본 테마와 같은 부품)
  const ov=document.querySelector(".nfsrch");
  const open=()=>{S.nfSrch=true;ov?.classList.add("on");document.body.classList.add("nfsrch-on");setTimeout(()=>{const i=$("#hq");if(i){i.focus();try{i.setSelectionRange(i.value.length,i.value.length);}catch(e){}}},30);};
  const close=()=>{S.nfSrch=false;S.hqOpen=false;ov?.classList.remove("on");document.body.classList.remove("nfsrch-on");};
  document.body.classList.toggle("nfsrch-on",!!S.nfSrch);
  document.querySelectorAll("[data-nfsrch]").forEach(b=>b.onclick=open);
  document.querySelectorAll("[data-nfsrchx]").forEach(b=>b.onclick=close);
  if(ov)ov.onclick=e=>{if(e.target===ov)close();};
  document.querySelectorAll("[data-nfclr]").forEach(b=>b.onclick=()=>{S.homeQ="";S.homeQc="";S.homePerson="";render();});
  if(!window._nfSrchKey){window._nfSrchKey=1;
    // Enter로 결과 보기·추천 고르기·Esc로 닫기 (입력칸 자체 처리보다 먼저)
    document.addEventListener("keydown",e=>{if(!S.nfSrch||!document.querySelector(".nfsrch.on"))return;
      if(e.key==="Escape"&&!S.hqOpen){e.preventDefault();S.nfSrch=false;document.querySelector(".nfsrch")?.classList.remove("on");document.body.classList.remove("nfsrch-on");}
      else if(e.key==="Enter"&&e.target.id==="hq"&&!e.isComposing)S.nfSrch=false;},true);
    window.addEventListener("hashchange",()=>{S.nfSrch=false;document.body.classList.remove("nfsrch-on");});}
  // 검색은 기본 테마와 같은 부품(.hsearch · 드롭다운 · Enter로 결과 · 사람 칩) · 결과만 넷플릭스 카드로
  document.querySelectorAll("[data-nfwho]").forEach(b=>b.onclick=()=>{S.homePerson=b.dataset.nfwho;S.homeQ="";S.homeQc="";render();window.scrollTo({top:0,behavior:"smooth"});});
  document.querySelectorAll('.nfnav a[href^="#nfr-"]').forEach(a=>a.onclick=ev=>{ev.preventDefault();document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({behavior:"smooth",block:"start"});});}
