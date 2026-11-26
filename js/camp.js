// 코코 로그방 · 캠페인·캠프
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- 캠페인: 세션 여러 개를 순서대로 엮는 묶음 ----------
// camps/{gid}: {name, system(캠페인 룰), intro, done, doneAt, eps:[세션 id… 오래된 편부터]}
// 세션(scenarios/{id})에는 camp:gid, gaiden(외전) 표시. 캠페인 비밀번호(secrets/{gid}) 하나로 모든 편이 열려요
S.camps=[];S.campMore={};
const campById=id=>S.camps.find(c=>c.id===id)||null;
const campOf=sc=>sc&&sc.camp?campById(sc.camp):null;
// 캠프(kind:"camp"): 여러 탁이 같은 때 돈 모임 · 편 번호·자동 완주·이어받기 없이 탁만 묶어요
const isCamp=c=>!!c&&c.kind==="camp";
const campWord=c=>isCamp(c)?"캠프":"캠페인";
function campEps(c){const pos=new Map((c.eps||[]).map((id,i)=>[id,i]));
  // 캠프는 넣은 순서가 아니라 플레이한 날짜 순서
  if(c.kind==="camp")return S.scens.filter(s=>s.camp===c.id).sort((a,b)=>(a.lastDay||"").localeCompare(b.lastDay||"")||(pos.has(a.id)?pos.get(a.id):1e9)-(pos.has(b.id)?pos.get(b.id):1e9));
  return S.scens.filter(s=>s.camp===c.id).sort((a,b)=>(pos.has(a.id)?pos.get(a.id):1e9)-(pos.has(b.id)?pos.get(b.id):1e9)||(a.lastDay||"").localeCompare(b.lastDay||""));}
function epLabel(c,sc){if(isCamp(c))return "";if(sc.gaiden)return "외전";let n=0;for(const e of campEps(c)){if(!e.gaiden)n++;if(e.id===sc.id)return n+"편";}return "";}
function campCount(c){if(isCamp(c))return `탁 ${campEps(c).length}개`;const es=campEps(c),g=es.filter(e=>e.gaiden).length;return `${es.length-g}편${g?` + 외전 ${g}`:""}`;}
function campLast(c){return campEps(c).map(e=>e.lastDay||"").sort().pop()||"";}
function effSys(sc){return (sc&&(sc.system||campOf(sc)?.system))||"";}
function campOpen(c){return S.canAdmin||_unlockIds.includes(c.id)||campEps(c).some(e=>!!SUB.sessData[e.id]);}
function epStatus(sc){const n=groups().find(g=>g.scen===sc.name)?.days.length||sc.nDays||0;return sc.done||campOf(sc)?.done?`<span class="st">완주</span>`:`<span class="st now">진행 중${n?` · ${n}회차`:""}</span>`;}
function epRowHTML(c,sc){const cm=isCamp(c),diff=sc.system&&(cm||sysLabel(sc.system)!==sysLabel(c.system||""));
  return `<div class="cep"><span class="en${sc.gaiden&&!cm?" gai":""}">${cm?esc((sc.lastDay||"").slice(5).replace("-","/")):esc(epLabel(c,sc))}</span><a href="#c-${esc(sc.id)}" class="et">${esc(sc.name)}</a>${diff?`<span class="sys" data-th="${themeOf(sc)}">${esc(sysLabel(sc.system))}</span>`:""}${epStatus(sc)}</div>`;}
// 고정탁: 같은 인선으로 쭉 이어가는 탁에 붙이는 이름 (시나리오·캠페인에 붙여요) · 누르면 첫 화면에서 그 고정탁만
function fixLineHTML(f,cls="fixline"){return `<div class="${cls}"><a href="#f-${encodeURIComponent(f)}" title="고정탁 ${esc(f)}">${esc(f)}</a></div>`;}
function allFixes(){return [...new Set([...S.scens.map(x=>x.fix),...S.camps.map(x=>x.fix)].map(x=>(x||"").trim()).filter(Boolean))];}
function fixListHTML(){return `<datalist id="fixlist">${allFixes().map(x=>`<option value="${esc(x)}">`).join("")}</datalist>`;}
// 아카이브 카드 안의 고정탁 태그(카드 링크 안이라 따로 잡아요) → 고정탁 페이지
document.addEventListener("click",ev=>{const a=ev.target.closest("[data-fix]");if(!a)return;ev.preventDefault();ev.stopPropagation();location.hash="f-"+encodeURIComponent(a.dataset.fix);},true);
// 고정탁 페이지: 이 고정탁의 시나리오·캠페인 카드(첫 화면과 같은 카드)와 멤버·기간
// 고정탁 비밀번호: secrets/fx_이름 하나 · 고정탁 안의 모든 세션·캠페인 비밀번호를 이걸로 맞춰요 (주인 브라우저가 자동으로)
function fixKey(f){return "fx_"+encodeURIComponent(f);}
function fixOfScen(sc){return (sc&&(sc.fix||(campOf(sc)&&campOf(sc).fix)))||"";}
function fixPwIds(f){return [...new Set([...S.scens.filter(x=>(x.fix||"")===f).map(pwOf),...S.camps.filter(c=>(c.fix||"")===f).map(c=>c.id)].filter(Boolean))];}
function fixCount(f){return S.scens.filter(x=>(x.fix||"")===f&&!(x.camp&&campById(x.camp)&&campById(x.camp).fix===f)).length+S.camps.filter(c=>(c.fix||"")===f).length;}
function fixOpen(f){if(S.canAdmin)return true;const ids=fixPwIds(f);return ids.length>0&&ids.every(id=>campById(id)?campOpen(campById(id)):isOpen(id));}
function fixTagsHTML(){const fs=allFixes().sort((a,b)=>a.localeCompare(b,"ko"));return fs.length?`<div class="fxtags">${fs.map(f=>`<a href="#f-${encodeURIComponent(f)}">${esc(f)}<small>${fixCount(f)}</small></a>`).join("")}</div>`:"";}
// 멤버가 2명이면 자관(1:1 자캐 관계)으로 불러요
function fixPeople(f){const ns=new Set();S.scens.filter(x=>fixOfScen(x)===f).forEach(sc=>(sc.sp||[]).forEach(p=>{if(p.chr&&!p.ch||isAnon(p)||/&/.test(p.name||""))return;ns.add(pcSplit(p.name).name);}));return ns;}
function fixPeopleList(f){const m={};S.scens.filter(x=>fixOfScen(x)===f).forEach(sc=>(sc.sp||[]).forEach(p=>{if(p.chr&&!p.ch||isAnon(p)||/&/.test(p.name||""))return;const n=pcSplit(p.name).name;const o=m[n]=m[n]||{n,c:p.c,ch:new Set()};if(p.ch)o.ch.add(p.ch);}));return Object.values(m);}
// 고정탁에서 고른 '나'를 안에 든 모든 세션에 (세션마다 그 사람의 화자로)
function fixSetMe(f,who){S.scens.filter(x=>fixOfScen(x)===f).forEach(sc=>{if(who==="ext"){setMe(sc.id,"ext");return;}const p=(sc.sp||[]).find(x=>pcSplit(x.name||"").name===who);if(p)setMe(sc.id,p.k);});}
function fixMe(f){for(const sc of S.scens.filter(x=>fixOfScen(x)===f)){const k=myK(sc.id);if(k==="ext")return "ext";const p=(sc.sp||[]).find(x=>x.k===k);if(p)return pcSplit(p.name).name;}return "";}
// 자관: 둘 중 내 닉네임이 아닌 쪽 = 비밀번호를 받은 상대
function fixOther(f){const ns=(site().nicks||[]).map(rnorm);const o=fixPeopleList(f).filter(p=>!ns.includes(rnorm(p.n)));return o.length===1?o[0].n:"";}
function fixWord(f){return fixPeople(f).size===2?"자관":"고정탁";}
function fixLockHTML(f){const W=fixWord(f);
  const ns=[...S.scens.filter(x=>(x.fix||"")===f&&!x.camp).map(x=>x.name),...S.camps.filter(c=>(c.fix||"")===f).map(c=>c.name)];
  const other=W==="자관"?fixOther(f):"",pick=other||S.fxPick||"",P=fixPeopleList(f),po=P.find(p=>p.n===pick);
  return `<div class="sc-page lockpage"><div class="lkwrap"><div class="lkbox">
    <div class="lockicon">🔒</div><div class="tip fxk">${W}</div><h2>${esc(f)}</h2>${ns.length?`<div class="tip">${ns.map(esc).join(" · ")}</div>`:""}
    ${other?"":`<div class="q">누구로 들어갈까요?</div><div class="lklist">${P.map(p=>`<button type="button" class="lkc${p.n===pick?" mine":""}" data-fxpick="${esc(p.n)}" style="--c:${fixC(p.c)}"><i></i><span class="nm">${esc([...p.ch].join(" · ")||p.n)}</span><span class="pl">${p.ch.size?esc(p.n):""}</span></button>`).join("")}</div>
      <button type="button" class="lkout${pick==="ext"?" on":""}" data-fxpick="ext">외부인으로 보기</button>`}
    ${pick?`<div class="lkpw"><div class="who">${pick==="ext"?`외부인은 로그를 <span class="me">읽기만</span> 할 수 있어요`:`<span class="me">${esc(pick)}</span>${po&&po.ch.size?` · ${esc([...po.ch].join(" · "))}`:""} (으)로 들어가요`}</div>
      <form id="fxunlock"><input type="text" id="fxpw" placeholder="${W} 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form>
      <div class="tip" id="fxmsg" style="margin-top:8px">이 비밀번호 하나로 ${W} 안의 모든 세션이 열려요</div></div>`:`<div class="guest">같이 플레이한 친구에게 받은 비밀번호가 필요해요</div>`}
    <div class="homefoot"><a class="ghost ownonly" href="#" style="text-decoration:none">← 목록</a><span style="flex:1"></span><span class="authbox"></span></div></div></div></div>`;}
function bindFixLock(){const f=S.fix;
  document.querySelectorAll("[data-fxpick]").forEach(b=>b.onclick=()=>{S.fxPick=b.dataset.fxpick;render();});
  const form=$("#fxunlock");if(!form)return;const inp=$("#fxpw");setTimeout(()=>inp.focus(),0);
  form.onsubmit=async ev=>{ev.preventDefault();const pw=inp.value.trim();if(!pw)return;const m=$("#fxmsg");m.textContent="확인하는 중…";const ids=fixPwIds(f);
    try{await unlockScen(ids[0],pw);await Promise.all(ids.slice(1).map(id=>unlockScen(id,pw).catch(()=>{})));
      try{await S.db.doc(`unlocks/${fixKey(f)}_${S.auth.currentUser.uid}`).set({scid:fixKey(f),uid:S.auth.currentUser.uid,pw,at:Date.now()});}catch(e){}const who=fixWord(f)==="자관"&&fixOther(f)||S.fxPick;if(who)fixSetMe(f,who);S.fxPick=null;
      m.textContent="열렸어요!";refreshCanWrite();render();}
    catch(err){m.textContent=err&&err.code==="permission-denied"?"비밀번호가 틀렸어요.":"열지 못했어요: "+(err.code||err.message);}};}
// 타임라인: 고정탁 안의 모든 세션을 날짜순(최근이 위)으로 · 시나리오 첫 세션에 갤러리 사진 하나
function fixTimelineHTML(f,allG,cs){
  const E=[];allG.forEach(g=>{const sc=g.sc,n=g.days.length;g.days.forEach((d,i)=>E.push({day:d.day||"",sc,i:i+1,n,sid:d.parts[0]?.id,camp:sc.camp&&campById(sc.camp)}));
    (sc.plays||[]).filter(x=>!g.days.some(d=>d.day===x)).forEach(x=>E.push({day:x,sc,nolog:1,n}));});
  if(!E.length)return "";
  E.sort((a,b)=>b.day.localeCompare(a.day));
  const firstOf={};E.slice().reverse().forEach(e=>{if(!firstOf[e.sc.id])firstOf[e.sc.id]=e;});
  const lastOf={};E.forEach(e=>{if(!lastOf[e.sc.id])lastOf[e.sc.id]=e;});
  const dot=d=>d.replace(/-/g,".");let ym="";
  return `<div class="sc-sec fxtl"><h4 data-en="TIMELINE">타임라인<span class="gcnt">${String(E.length).padStart(2,"0")}</span></h4><ol class="tl">${E.map(e=>{
    const sc=e.sc,open=isOpen(sc.id),th=galImgs((sc.gal||[]).slice().sort((a,b)=>(a.at||0)-(b.at||0))[0])[0],m=e.day.slice(0,7),mh=m!==ym?(ym=m,`<li class="tlm">${esc(dot(m))}</li>`):"";
    const done=lastOf[sc.id]===e&&(sc.done||e.camp&&e.camp.done),first=firstOf[sc.id]===e;
    const body=`<b>${esc(sc.name)}</b><small>${e.nolog?"녹음 없이 플레이":(e.n>1?`${e.i}회차 / ${e.n}`:"1회차")}${effSys(sc)?" · "+esc(sysLabel(effSys(sc))):""}${e.camp?" · "+esc(e.camp.name):""}</small>${first&&e.n>1?`<em class="st">시작</em>`:""}${done?`<em class="dn">완주</em>`:""}`;
    return mh+`<li style="--c:${typeof hxCol==="function"?hxCol(sc):"var(--acc)"}"><span class="d">${esc(e.day.slice(8))}</span><i class="dot"></i>${open&&e.sid?`<a class="b" href="#s-${esc(e.sid)}">${body}</a>`:`<span class="b">${body}</span>`}${first&&th?`<img src="${esc(th.u||th.o)}" alt="" loading="lazy">`:""}</li>`;}).join("")}</ol></div>`;}
function fixPageHTML(f){
  const gs=groups().filter(g=>g.sc&&(g.sc.fix||"")===f&&!(g.sc.camp&&campById(g.sc.camp)&&campById(g.sc.camp).fix===f)),cs=S.camps.filter(c=>!isCamp(c)&&(c.fix||"")===f);
  const hx=isHX();
  const items=[...gs.map(g=>({k:g.last||"",h:hx?hxScCard(g):scenSecHTML(g)})),...cs.map(c=>({k:campKey(c),h:hx?hxCampCard(c):campCardHTML(c)}))].sort((a,b)=>b.k.localeCompare(a.k));
  const allG=[...gs,...cs.flatMap(c=>campEps(c).map(e=>groups().find(g=>g.sc&&g.sc.id===e.id)).filter(Boolean))];
  const days=allG.flatMap(g=>g.days.map(d=>d.day)).filter(Boolean).sort();
  const ppl={};allG.forEach(g=>(g.sc.sp||[]).forEach(p=>{if(p.chr&&!p.ch||isAnon(p)||/&/.test(p.name||""))return;const n=pcSplit(p.name).name;const o=ppl[n]=ppl[n]||{n,c:p.c,ch:new Set(),cnt:new Set()};o.cnt.add(g.sc.id);if(p.ch)o.ch.add(p.ch);}));
  const P=Object.values(ppl).sort((a,b)=>b.cnt.size-a.cnt.size);
  const intro=(site().fixes||{})[f]||"";
  const dot=d=>d.replace(/-/g,".");
  const fk=fixKey(f);fixDocWatch(fk);const cv=(S.fixDocs[fk]||{}).cover;
  const head=`<div class="fxk">${fixWord(f)}</div><h2 class="fxh">${esc(f)}</h2>`;
  return `<div class="home hmain fxpage${hx?" hx":""}${cv?" hascv":""}"><a class="ghost ownonly" href="#" style="font-size:13px">← 첫 화면</a>
    ${cv?`<div class="fxcover cv${S.fxCvDrag?" drag":""}" id="fxcover"><img src="${esc(cv.u)}" alt="" draggable="false" style="object-position:50% ${+cv.y>=0?+cv.y:50}%"><div class="fxct">${head}</div>
      ${S.canAdmin?`<button type="button" class="fxcvpos" id="fxcvpos">${S.fxCvDrag?"✓ 위치 저장":"↕ 위치"}</button>`:""}</div>`:head}
    <div class="fxmeta">${days.length?`${esc(dot(days[0]))} – ${esc(dot(days.at(-1)))} · `:""}<b>${gs.length+cs.reduce((a,c)=>a+campEps(c).length,0)}</b>시나리오 · <b>${days.length}</b>세션${cs.length?` · <b>${cs.length}</b>캠페인`:""}</div>
    ${P.length?`<div class="fxppl">${P.map(p=>`<span class="fxp${fixMe(f)===p.n?" me":""}"${!S.canAdmin&&fixWord(f)!=="자관"?` data-fxme="${esc(p.n)}" title="나로 고르기"`:""} style="--c:${fixC(p.c)}"><i></i><b>${esc(p.n)}</b><small>${[...p.ch].map(esc).join(" · ")}${p.ch.size?" · ":""}${p.cnt.size}탁</small></span>`).join("")}</div>`:""}
    ${intro||S.canAdmin?`<div class="fxintro${intro?"":" empty"}" id="fxintro">${intro?esc(intro).replace(/\n/g,"<br>"):`${fixWord(f)} 소개 (선택) — ${fixWord(f)==="자관"?"두 캐릭터가 어떤 사이인지":"언제부터 어떤 멤버로 굴리는 탁인지"} 적어 둘 수 있어요`}${S.canAdmin?` <button class="ghost" id="fxedit" type="button">✎</button>`:""}</div>`:""}
    ${fixTimelineHTML(f,allG,cs)}
    <div id="sesslist" class="fxlist">${items.map(x=>x.h).join("")||`<div class="notice">아직 이 고정탁으로 묶인 세션이 없어요</div>`}</div>
    ${S.db?galHTML(galSrcFix(f),{newest:1,title:"전체 갤러리"}):""}
    ${S.canAdmin?`<div class="sc-sec fxacc"><h4 data-en="ACCESS">${fixWord(f)} 비밀번호 <span class="tip" style="letter-spacing:0">· 주인만 보여요</span></h4>
      <div class="tip">이 비밀번호 하나로 고정탁 안의 모든 세션·캠페인이 열려요. 고정탁을 붙인 세션은 자동으로 이 비밀번호를 따라가요. 새로 만들면 예전 비밀번호로 연 사람은 다시 잠겨요.</div>
      <div class="pwrow"><code class="pw">${esc(S.secrets?.[fixKey(f)]||"만드는 중…")}</code><button class="pri" id="fxcopy">링크+비밀번호 복사</button><button class="ghost" id="fxnewpw">새로 만들기</button></div></div>`:""}</div>`;}
function bindFixPage(){homeMasonry();
  {const b=$("#fxcvpos"),box=$("#fxcover"),im=box&&box.querySelector("img");if(b&&im){const fk=fixKey(S.fix);
    b.onclick=async()=>{if(!S.fxCvDrag){S.fxCvDrag=true;render();return;}S.fxCvDrag=false;const y=parseFloat(im.style.objectPosition.split(" ")[1])||50;
      const cv={...(S.fixDocs[fk]||{}).cover,y:Math.round(y)};S.fixDocs[fk]={...(S.fixDocs[fk]||{}),cover:cv};render();try{await S.db.doc("fixes/"+fk).set({cover:cv},{merge:true});toast("커버 위치를 저장했어요");}catch(e){toast("저장하지 못했어요");}};
    if(S.fxCvDrag){let sy=null,y0=50;box.onpointerdown=e=>{if(e.target===b)return;sy=e.clientY;y0=parseFloat(im.style.objectPosition.split(" ")[1])||50;box.setPointerCapture(e.pointerId);};
      box.onpointermove=e=>{if(sy==null)return;const ex=im.naturalWidth?im.clientWidth*im.naturalHeight/im.naturalWidth-im.clientHeight:0;if(ex<=0)return;const v=Math.max(0,Math.min(100,y0-(e.clientY-sy)/ex*100));im.style.objectPosition=`50% ${v}%`;};
      box.onpointerup=box.onpointercancel=()=>{sy=null;};}}}
  document.querySelectorAll("[data-fxme]").forEach(b=>b.onclick=()=>{fixSetMe(S.fix,b.dataset.fxme);toast(`${b.dataset.fxme}(으)로 골랐어요 · 안의 모든 세션에 적용돼요`);render();});if(S.db)bindGal(galSrcFix(S.fix));
  const fc=$("#fxcopy");if(fc)fc.onclick=()=>copyText(`[고정탁 ${S.fix}] TRPG 로그\n${location.origin+location.pathname}#f-${encodeURIComponent(S.fix)}\n비밀번호: ${S.secrets?.[fixKey(S.fix)]||""}`,"링크와 비밀번호를 복사했어요");
  const fn=$("#fxnewpw");if(fn)fn.onclick=()=>confirmBox("고정탁 비밀번호를 새로 만들까요? 고정탁 안의 모든 세션 비밀번호가 같이 바뀌고, 예전 비밀번호로 연 사람은 다시 잠겨요.","새로 만들기",async()=>{try{await S.db.doc("secrets/"+fixKey(S.fix)).set({pw:genPw()});ownerMaintain();toast("새 비밀번호를 만들었어요");}catch(err){writeFail(err);}});bindPartEdit&&bindPartEdit();if(isHX())bindHX();
  document.querySelectorAll(".fxpage [data-scen]").forEach(a=>a.onclick=ev=>{ev.preventDefault();gotoScen(a.dataset.scen);});
  const e=$("#fxedit");if(e)e.onclick=()=>{const f=S.fix,cur=(site().fixes||{})[f]||"";const box=$("#fxintro");
    box.innerHTML=`<textarea id="fxta" rows="3" style="width:100%">${esc(cur)}</textarea><div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px"><button class="ghost" id="fxx" type="button">취소</button><button class="pri" id="fxok" type="button">저장</button></div>`;
    $("#fxx").onclick=()=>render();
    $("#fxok").onclick=async()=>{const v=$("#fxta").value.trim();const fx={...(site().fixes||{})};if(v)fx[f]=v;else delete fx[f];
      try{await S.db.doc("scenarios/_site").update({fixes:fx});S.site={...S.site,fixes:fx};toast("저장했어요");}catch(err){toast("저장하지 못했어요");}render();};};}
function campTagHTML(c){return c.system?`<span class="sys" data-th="${themeOf({system:c.system})}">${esc(sysLabel(c.system))}</span>`:"";}
function campCardHTML(c){
  const es=campEps(c).slice().reverse(),last=campLast(c);
  // 일반 세션 카드와 같은 머리 모양: 제목 · 오른쪽에 룰 태그와 편 수 (캠페인인 건 '진행 중인 캠페인' 칸과 굵은 테두리로 보여요)
  const head=(!isCamp(c)&&c.fix?fixLineHTML(c.fix):"")+`<div class="scen-h"><h3><a href="#g-${esc(c.id)}">${esc(c.name)} ›</a>${c.orig&&!isCamp(c)?`<span class="orig">${esc(c.orig)}</span>`:""}</h3>${campTagHTML(c)}<span class="d${c.done&&!isCamp(c)||isCamp(c)&&campEnded(c)?" dstamp":""}">${isCamp(c)?`캠프 · ${campWhen(c)?esc(campWhen(c).replace(/ · 당일치기$/,"")):""}${campWhen(c)?" · ":""}${campCount(c)}`:`${campCount(c)}${last?` · 마지막 ${esc(fmtDay(last))}`:""}`}${isCamp(c)?(campEnded(c)?stampHTML(c,"종료"):""):stampHTML(c)}</span></div>`;
  const more=!!S.campMore[c.id],shown=more?es:es.slice(0,3);
  return `<section class="scen camp${c.done&&!isCamp(c)?" done":""}">${coverHTML(c,"ogtop")}${head}${shown.map(e=>epRowHTML(c,e)).join("")||`<div class="tip" style="margin-top:8px">아직 ${isCamp(c)?"탁이":"편이"} 없어요</div>`}
    ${es.length>3?`<button class="cmore" data-cmore="${esc(c.id)}">${more?"▴ 접기":`▾ ${isCamp(c)?"탁":"이전 편"} ${es.length-3}개 더 보기`}</button>`:""}</section>`;
}
// 플레이어별 캐릭터: 같은 캐릭터로 이어진 편을 한 줄로
function campRuns(c){
  const es=campEps(c),labs=es.map(e=>epLabel(c,e)),P=new Map();
  es.forEach((e,i)=>{const gk=gmKey(e);(e.sp||[]).forEach(p=>{if(isAnon(p)&&!p.ch&&p.k!==gk)return;if(/&/.test(p.name||""))return;
    const gm=p.k===gk,q=pcSplit(p.name||""),who=gm?"GM":q.name;if(!who)return;
    if(!P.has(who))P.set(who,[]);P.get(who).push({i,ch:gm?q.name:(p.ch||""),pc:q.n||"",c:fixC(p.c)});});});
  const rng=ix=>{const out=[];let s=null,prev=null;const flush=()=>{if(s==null)return;const a=labs[s],b=labs[prev];out.push(s===prev?a:(/편$/.test(a)&&/편$/.test(b)?`${a.replace("편","")}–${b}`:`${a}–${b}`));};
    ix.forEach(i=>{if(s!=null&&i===prev+1){prev=i;return;}flush();s=i;prev=i;});flush();return out.join(", ");};
  const rows=[...P.entries()].map(([who,list])=>{
    const byCh=new Map();list.forEach(x=>{const k=x.ch||"";if(!byCh.has(k))byCh.set(k,[]);byCh.get(k).push(x);});
    const runs=[...byCh.entries()].map(([ch,xs])=>({ch,c:xs[xs.length-1].c,last:xs[xs.length-1].i,r:rng(xs.map(x=>x.i)),pc:xs.some(x=>x.pc)?"PC "+xs.filter(x=>x.pc).map(x=>x.pc).join("·"):""})).sort((a,b)=>b.last-a.last);
    const seen=new Set(list.map(x=>x.i)),miss=es.map((_,i)=>i).filter(i=>!seen.has(i)&&i>Math.min(...seen));
    return {who,runs,miss:miss.length?rng(miss):"",first:Math.min(...seen)};
  }).sort((a,b)=>(a.who==="GM")-(b.who==="GM")||a.first-b.first||a.who.localeCompare(b.who,"ko"));
  return rows;
}
function campPageHTML(){
  const c=campById(S.gid);
  if(c&&isCamp(c))return campPgHTML(c);
  if(!c)return S.loaded?`<div class="sc-page"><div class="notice">캠페인·캠프를 찾을 수 없어요.</div><button class="ghost ownonly" onclick="location.hash=''">← 목록</button></div>`:`<div class="sc-page">${loaderHTML()}</div>`;
  const cm=isCamp(c),W=campWord(c),es=campEps(c),open=campOpen(c),ed=S.campEdit&&S.canAdmin;
  const rows=cm?[]:campRuns(c);
  // 캠프 목록은 날짜 최신순 (같은 날이면 이름순)
  const list=cm?es.slice().sort((a,b)=>(b.lastDay||"").localeCompare(a.lastDay||"")||a.name.localeCompare(b.name,"ko")):es.slice().reverse();
  return `<div class="sc-page campage">
    ${ed?`<div class="sc-top"><h2>${W} 수정</h2><button class="ghost" id="g-x">취소</button><button class="pri" id="g-save">저장</button></div>
      <div class="sc-sec"><div class="fields" style="margin:0">
        <label>${W} 이름<input type="text" id="g-name" value="${esc(c.name)}"></label>
        <label>원어 제목 <span class="tip" style="display:inline">· 선택</span><input type="text" id="g-orig" value="${esc(c.orig||"")}" placeholder="해외 캠페인이면 원래 제목 (없으면 비워 두세요)"></label>
        <div class="g-cponly fields" style="margin:0${cm?";display:none":""}"><label>캠페인 룰 <span class="tip" style="display:inline">· 각 편은 룰을 비워 두면 이 룰을 따라가요</span><input type="text" id="g-sys" value="${esc(c.system||"")}" placeholder="예: 더블크로스 3rd, 인세인, D&D 5.5e" list="g-syslist"></label>
        <label>고정탁 <span class="tip" style="display:inline">· 같은 인선으로 이어가는 탁이면 이름을 붙여요 (예: ㄹㅈㅅ)</span><input type="text" id="g-fix" value="${esc(c.fix||"")}" placeholder="비워 두면 없음" list="fixlist"></label>${fixListHTML()}
        <datalist id="g-syslist">${[...new Set(S.scens.map(x=>(x.system||"").trim()).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
        <div class="donerow"><label class="chk"><input type="checkbox" id="g-done"${c.done?" checked":""}> 캠페인 완주</label><span class="tip">첫 화면에 캠페인 완주 도장이 찍히고, 진행 중인 캠페인 칸에서 빠져요</span></div></div>
      </div></div>
      <div class="sc-sec"><h4 data-en="INTRO">소개</h4><textarea id="g-intro" placeholder="${cm?"언제 어디서 모인 캠프인지 적어 주세요 (선택)":"어떤 캠페인인지 적어 주세요 (선택)"}">${esc(c.intro||"")}</textarea></div>
      ${es.length?"":`<div class="sc-sec"><h4 data-en="DELETE">${W} 지우기</h4><div class="tip" style="margin-bottom:8px">${cm?"탁이":"편이"} 하나도 없을 때만 지울 수 있어요.</div><button class="ghost" id="g-del">이 ${W} 지우기</button></div>`}`
      :`<div class="ckick"><span class="cbadge">${W}</span></div>
      ${c.fix?fixLineHTML(c.fix,"campline"):""}<div class="sc-top"><h2>${esc(c.name)}${c.orig?`<span class="orig">${esc(c.orig)}</span>`:""}</h2><span class="scmeta">${campTagHTML(c)}${S.canAdmin?`<button id="g-edit" title="${W} 수정" aria-label="${W} 수정">✎<span class="lbl"> 수정</span></button>`:""}</span></div>`}
    ${!ed&&c.intro?`<div class="sc-sec"><h4 data-en="INTRO">소개</h4><div class="sc-text">${emoize(esc(c.intro)).replace(/\n/g,"<br>")}</div></div>`:""}
    ${ed?"":`<div class="sc-sec"><h4 data-en="${cm?"TABLES":"EPISODES"}">${cm?"탁 목록":"시나리오 목록"}</h4>${list.map(e=>epRowHTML(c,e)).join("")||`<div class="sc-text empty">아직 ${cm?"탁이":"편이"} 없어요.</div>`}
      ${S.canAdmin&&S.db?(()=>{const free=S.scens.filter(x=>!x.camp||!campById(x.camp)).sort((a,b)=>(b.lastDay||"").localeCompare(a.lastDay||""));
        return `<div class="gadd">${c.done&&!cm?"":`<a class="btnlike pri" href="#up-${esc(c.id)}">${cm?"＋ 탁 올리기":"＋ 다음 시나리오 올리기"}</a>`}
          ${free.length?`<span class="gadd-ex"><select id="g-addsel"><option value="">이미 있는 세션 넣기…</option>${free.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.system?` · ${esc(sysLabel(x.system))}`:""}</option>`).join("")}</select>${cm?"":`<label class="chk"><input type="checkbox" id="g-addgai"> 외전</label>`}<button class="ghost" id="g-addgo">넣기</button></span>`:""}</div>
          <div class="tip" style="margin-top:6px">${cm?"넣은 탁은 플레이 날짜 순서로 보여요.":"넣은 세션은 마지막 플레이 날짜 순서에 맞춰 들어가요. 순서는 그 세션의 ✎ 수정 → 캠페인 칸에서 바꿔요."}</div>`;})():""}</div>
    ${rows.length?`<div class="sc-sec"><h4 data-en="CAST">플레이어별 캐릭터</h4>${rows.map(r=>`<div class="prow"><b>${esc(r.who)}</b><div class="runs">${r.runs.map(x=>`<div class="run"><span class="rc" style="--c:${x.c}">${x.ch?esc(x.ch):`<span class="tip">캐릭터 미정</span>`}</span><span class="rr">${esc(x.r)}</span>${x.pc&&r.who!=="GM"?`<span class="rp">${esc(x.pc)}</span>`:""}</div>`).join("")}${r.miss?`<div class="run off"><span class="rr">${esc(r.miss)} 불참</span></div>`:""}</div></div>`).join("")}</div>`:""}
    ${S.canAdmin?`<div class="sc-sec"><h4 data-en="ACCESS">${W} 비밀번호 <span class="tip" style="letter-spacing:0">· 주인만 보여요</span></h4>
      <div class="tip">이 비밀번호 하나로 ${cm?"캠프의 모든 탁이":"캠페인의 모든 편이"} 열려요. 새로 만들면 예전 비밀번호로 연 사람은 다시 잠겨요.</div>
      <div class="pwrow"><code class="pw">${esc(S.secrets?.[c.id]||"…")}</code><button class="pri" id="g-copy">링크+비밀번호 복사</button><button class="ghost" id="g-newpw">새로 만들기</button></div></div>`
      :!open?`<div class="sc-sec"><h4 data-en="ACCESS">${W} 열기</h4><div class="tip">같이 플레이한 친구에게 받은 ${W} 비밀번호를 넣으면 모든 ${cm?"탁":"편"}의 로그가 열려요.</div>
      <form id="g-unlock" class="pwrow"><input type="text" id="g-pw" placeholder="${W} 비밀번호" autocomplete="off"><button class="pri">열기</button></form><div class="tip" id="g-msg"></div></div>`:""}`}
    <div class="homefoot"><button class="ghost ownonly" onclick="location.hash=''">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div>
  </div>`;
}
// ---------- 캠프: 날짜가 정해진 모임 (당일치기·며칠) · 여러 탁 · 캠프 후기 ----------
// camps/{gid} 중 kind:"camp" · {name, place, start, end, intro, eps:[탁 세션 id]}
function campWhen(c){const a=c.start||"",b=c.end||a;if(!a)return "";
  const [y1,m1,d1]=a.split("-").map(Number),[y2,m2,d2]=b.split("-").map(Number);
  const n=Math.round((new Date(y2,m2-1,d2)-new Date(y1,m1-1,d1))/864e5);
  if(n<=0)return `${fmtDay(a)} · 당일치기`;
  const tail=y1!==y2?`${y2}년 ${m2}월 ${d2}일`:m1!==m2?`${m2}월 ${d2}일`:`${d2}일`;
  return `${fmtDay(a).replace(/ \(.\)$/,"")} – ${tail} · ${n}박 ${n+1}일`;}
function campEnded(c){const e=c.end||c.start;if(!e)return false;return e<new Date(Date.now()+9*3600e3).toISOString().slice(0,10);}
function campKey(c){return isCamp(c)?(c.end||c.start||campLast(c)):campLast(c);}
function campDays(c){const es=campEps(c);if(!c.start)return [{lab:"",eps:es.slice().sort((a,b)=>(a.lastDay||"").localeCompare(b.lastDay||""))}];
  const a=c.start,b=c.end||a,out=[];const [y,m,d]=a.split("-").map(Number);
  for(let i=0;;i++){const dt=new Date(y,m-1,d+i);const ds=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;if(ds>b||i>30)break;
    out.push({lab:`${i+1}일차`,day:ds,eps:es.filter(e=>(e.plays||[]).includes(ds)||groups().find(g=>g.scen===e.name)?.days.some(x=>x.day===ds)||e.lastDay===ds)});}
  const placed=new Set(out.flatMap(x=>x.eps.map(e=>e.id))),rest=es.filter(e=>!placed.has(e.id));
  if(rest.length)out.push({lab:"그 밖의 탁",eps:rest});return out.filter(x=>x.eps.length||out.length<=4);}
// 캠프 후기용: 모든 탁의 참가자를 이름으로 한 번씩
function campSc(c){const sp=[],by=new Map();
  campEps(c).forEach(e=>{const g=gmKey(e);(e.sp||[]).forEach(p=>{if(/&/.test(p.name||"")||(isAnon(p)&&!p.ch&&p.k!==g))return;const q=pcSplit(p.name||""),n=q.name;if(!n)return;
    const role=p.k===g?(themeOf(e)==="deco"?"DM":"GM"):q.n?"PC"+q.n:"PL";
    if(!by.has(n)){const o={k:"n_"+n,name:n,c:p.c,rl:[]};by.set(n,o);sp.push(o);}by.get(n).rl.push(`${e.name} ${role}`);});});
  sp.forEach(o=>{o.roles=o.rl.join(" · ");delete o.rl;});
  return {id:c.id,name:c.name,sp,isCampSc:true,place:c.place||"",when:campWhen(c)};}
function campScById(id){const c=campById(id);return c&&isCamp(c)?campSc(c):null;}
function campSelfK(id){const c=campById(id);if(!c||!isCamp(c))return "";for(const e of campEps(c)){const p=meSp(e.id);if(p)return "n_"+pcSplit(p.name||"").name;}return "";}
// 캠프는 들어올 때부터 잠겨 있어요: 이름을 고르고 캠프 비밀번호 → 모든 탁 로그가 열려요
function campLockHTML(c){
  return `<div class="sc-page lockpage"><div class="lkwrap"><div class="lkbox">
    <div class="lockicon">🔒</div><h2>${esc(c.name)}</h2><div class="tip">잠긴 캠프예요${campWhen(c)?` · ${esc(campWhen(c))}`:""}</div>
    <div class="lkpw"><form id="g-unlock"><input type="text" id="g-pw" placeholder="캠프 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form>
      <div class="tip" id="g-msg" style="margin-top:8px">같이 간 사람에게 받은 캠프 비밀번호를 넣어 주세요</div></div>
    <div class="homefoot"><button class="ghost ownonly" onclick="location.hash=''">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div>
  </div></div></div>`;}
function campPgHTML(c){
  if(!campOpen(c))return campLockHTML(c);
  const ed=S.campEdit&&S.canAdmin,es=campEps(c),open=campOpen(c),when=campWhen(c);
  if(ed)return `<div class="sc-page campage"><div class="sc-top"><h2>캠프 수정</h2><button class="ghost" id="g-x">취소</button><button class="pri" id="g-save">저장</button></div>
    <div class="sc-sec"><div class="fields" style="margin:0">
      <label>캠프 이름<input type="text" id="g-name" value="${esc(c.name)}"></label>
      <label>장소 (선택)<input type="text" id="g-place" value="${esc(c.place||"")}" placeholder="예: 가평 펜션"></label>
      <div class="gdates"><label>시작일<input type="date" id="g-start" value="${esc(c.start||"")}"></label><span>–</span><label>끝나는 날<input type="date" id="g-end" value="${esc(c.end&&c.end!==c.start?c.end:"")}"></label></div><div class="tip" style="margin-top:-4px">당일치기면 끝나는 날은 비워 두세요</div>
    </div></div>
    <div class="sc-sec"><h4 data-en="SHARE IMAGE">대표 이미지 <span class="tip" style="letter-spacing:0">· 세션 페이지처럼 캠프 페이지 맨 위에 크게 나와요 (1200×630으로 맞춰져요)</span></h4>
      ${(()=>{const og=S.campOg!==undefined?S.campOg:c.og||"";return `<div class="ogcard${og?"":" empty"}" id="g-ogprev">${og?`<img src="${og}" alt="">`:`<span>아직 이미지가 없어요</span>`}</div>
      <div style="display:flex;gap:6px;margin-top:8px"><button type="button" id="g-ogup">이미지 올리기</button><button type="button" class="ghost" id="g-ogdel"${og?"":' style="display:none"'}>지우기</button><input type="file" id="g-ogfile" accept="image/*" style="display:none"></div>`;})()}</div>
    ${es.length?"":`<div class="sc-sec"><h4 data-en="DELETE">캠프 지우기</h4><div class="tip" style="margin-bottom:8px">탁이 하나도 없을 때만 지울 수 있어요.</div><button class="ghost" id="g-del">이 캠프 지우기</button></div>`}
    <div class="homefoot"><button class="ghost ownonly" onclick="location.hash=''">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div></div>`;
  const days=campDays(c).filter(d=>d.eps.length),sc=campSc(c);
  const sub=[when,c.place,`탁 ${es.length}개`].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('<i class="dot">·</i>');
  const row=e=>`<div class="ctab"><div class="ct-h"><a href="#c-${esc(e.id)}">${esc(e.name)}</a>${effSys(e)?`<span class="sys" data-th="${themeOf(e)}">${esc(sysLabel(effSys(e)))}</span>`:""}</div>${e.summary?`<div class="sum">${esc(e.summary)}</div>`:""}${castHTML(e)||`<div class="tip">참가자를 아직 안 적었어요</div>`}</div>`;
  const edb=S.canAdmin?`<button id="g-edit" title="캠프 수정" aria-label="캠프 수정">✎<span class="lbl"> 수정</span></button>`:"";
  const add=S.canAdmin&&S.db?(()=>{const free=S.scens.filter(x=>!x.camp||!campById(x.camp)).sort((a,b)=>(b.lastDay||"").localeCompare(a.lastDay||""));
    return `<div class="cadd"><a class="btnlike${es.length?"":" pri"}" href="#up-${esc(c.id)}">＋ 탁 올리기</a>
      ${free.length?`<span class="gadd-ex"><select id="g-addsel"><option value="">이미 있는 세션 넣기…</option>${free.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}${x.system?` · ${esc(sysLabel(x.system))}`:""}</option>`).join("")}</select><button class="ghost" id="g-addgo">넣기</button></span>`:""}</div>`;})():"";
  return `<div class="sc-page campage camp-k">
    ${c.og?`<div class="campline">캠프</div><div class="schero"><img src="${c.og}" alt=""><div class="schero-t"><h2>${esc(c.name)}<small class="hsub">${sub}</small></h2><span class="scmeta">${edb}</span></div></div>`
      :`<div class="ckick"><span class="cbadge">캠프</span></div><div class="sc-top"><h2>${esc(c.name)}<small class="hsub">${sub}</small></h2><span class="scmeta">${edb}</span></div>`}
    ${!when&&S.canAdmin?`<div class="notice" style="margin:12px 0">✎ 수정에서 캠프 날짜를 넣으면 탁이 일차별로 나뉘어요.</div>`:""}
    ${days.length?days.map((d,i)=>`<div class="sc-sec cday-sec"><h4 data-en="${d.day?`DAY ${i+1}`:"ETC"}">${esc(d.lab||"탁")}${d.day?` <span class="tip" style="letter-spacing:0">${esc(fmtDay(d.day))}</span>`:""}</h4>${d.eps.map(row).join("")}</div>`).join("")
      :`<div class="sc-sec"><h4 data-en="TABLES">탁</h4><div class="sc-text empty">아직 탁이 없어요.</div></div>`}
    ${add}
    ${S.db?revSectionHTML(sc):""}
    ${S.canAdmin?`<div class="sc-sec"><h4 data-en="ACCESS">캠프 비밀번호 <span class="tip" style="letter-spacing:0">· 주인만 보여요</span></h4>
      <div class="tip">이 비밀번호 하나로 캠프의 모든 탁 로그가 열리고, 캠프 후기를 쓸 수 있어요. 새로 만들면 예전 비밀번호로 연 사람은 다시 잠겨요.</div>
      <div class="pwrow"><code class="pw">${esc(S.secrets?.[c.id]||"…")}</code><button class="pri" id="g-copy">링크+비밀번호 복사</button><button class="ghost" id="g-newpw">새로 만들기</button></div></div>`
      :""}
    <div class="homefoot"><button class="ghost ownonly" onclick="location.hash=''">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div>
  </div>`;
}
// 배포 때 만드는 미리보기 페이지(p/{id}.html)로 보내야 카톡·디스코드에 대표 이미지가 떠요
function campLink(c){return shareUrl(c.id);}
function bindCamp(){
  const c=campById(S.gid);renderAuth&&renderAuth();if(!c)return;
  if(isCamp(c)&&!campOpen(c)){const inp=$("#g-pw");if(inp)setTimeout(()=>inp.focus(),0);}
  if(isCamp(c)&&!S.campEdit&&campOpen(c))bindRevs(campSc(c));
  const e=$("#g-edit");if(e)e.onclick=()=>{S.campEdit=true;render();};
  const x=$("#g-x");if(x)x.onclick=()=>{S.campEdit=false;S.campOg=undefined;render();};
  {const up=$("#g-ogup"),fi=$("#g-ogfile"),pv=$("#g-ogprev"),dl=$("#g-ogdel");
    const show=og=>{pv.className="ogcard"+(og?"":" empty");pv.innerHTML=og?`<img src="${og}" alt="">`:`<span>아직 이미지가 없어요</span>`;dl.style.display=og?"":"none";};
    if(up&&fi){up.onclick=()=>fi.click();fi.onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{S.campOg=await shrinkImage(f,1200,"image/jpeg",1200,630);show(S.campOg);toast("저장을 눌러야 적용돼요");}catch(e){toast("이미지를 읽지 못했어요");}fi.value="";};}
    if(dl)dl.onclick=()=>{S.campOg="";show("");};}
  const sv=$("#g-save");if(sv)sv.onclick=async()=>{const name=$("#g-name").value.trim();if(!name){toast("이름을 넣어 주세요");return;}
    const cm=isCamp(c);let v;
    if(cm){const a=$("#g-start").value,b=$("#g-end").value||a;if(a&&b<a){toast("끝나는 날이 시작일보다 빨라요");return;}v={name,place:$("#g-place").value.trim(),start:a,end:b};if(S.campOg!==undefined)v.og=S.campOg||firebase.firestore.FieldValue.delete();}
    else{v={name,orig:$("#g-orig").value.trim(),system:$("#g-sys").value.trim(),fix:($("#g-fix")?.value||"").trim(),intro:$("#g-intro").value.trim(),done:$("#g-done").checked};}const done=!cm&&v.done;if(done&&!c.done)v.doneAt=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
    try{await S.db.doc("camps/"+c.id).update(v);S.campEdit=false;const og=S.campOg;S.campOg=undefined;Object.assign(c,v);if(og==="")delete c.og;
      if(done){const es=campEps(c);if(es.length)await closePrevEps(c.id,"__all");}
      render();toast("저장했어요");}catch(err){writeFail(err);}};
  const dl=$("#g-del");if(dl)dl.onclick=()=>confirmBox(`'${c.name}' ${campWord(c)}을(를) 지울까요?`,"삭제",async()=>{try{await S.db.doc("camps/"+c.id).delete();S.db.doc("secrets/"+c.id).delete().catch(()=>{});location.hash="";}catch(err){writeFail(err);}});
  const cp=$("#g-copy");if(cp)cp.onclick=()=>copyText(`${c.name}\n${campLink(c)}\n비밀번호: ${S.secrets?.[c.id]||""}`,"링크와 비밀번호를 복사했어요");
  const np=$("#g-newpw");if(np)np.onclick=()=>confirmBox(campWord(c)+" 비밀번호를 새로 만들까요? 예전 비밀번호로 연 사람은 다시 잠겨요.","새로 만들기",async()=>{try{await S.db.doc("secrets/"+(c.fix?fixKey(c.fix):c.id)).set({pw:genPw()});if(c.fix)ownerMaintain();}catch(err){writeFail(err);}});
  const ag=$("#g-addgo");if(ag)ag.onclick=async()=>{const id=$("#g-addsel").value;if(!id){toast("넣을 세션을 골라 주세요");return;}
    ag.disabled=true;try{await setEpCamp(id,c.id,"",!!$("#g-addgai")?.checked);toast(isCamp(c)?"캠프에 넣었어요":"캠페인에 넣었어요");}catch(err){ag.disabled=false;writeFail(err);}};
  const uf=$("#g-unlock");if(uf)uf.onsubmit=async ev=>{ev.preventDefault();const pw=$("#g-pw").value.trim();if(!pw)return;const m=$("#g-msg");m.textContent="확인하는 중…";
    try{await unlockScen(c.id,pw);const who=fixWord(f)==="자관"&&fixOther(f)||S.fxPick;if(who)fixSetMe(f,who);S.fxPick=null;
      m.textContent="열렸어요!";refreshCanWrite();render();}catch(err){m.textContent=err&&err.code==="permission-denied"?"비밀번호가 틀렸어요.":"열지 못했어요: "+(err.code||err.message);}};
}
// 세션을 캠페인에 넣기·빼기·순서 (주인)
async function setEpCamp(scid,gid,afterId,gaiden){
  const sc=scenById(scid);if(!sc)return;const old=sc.camp||"";const FV=firebase.firestore.FieldValue;
  await S.db.doc("scenarios/"+scid).update(gid?{camp:gid,gaiden:!!gaiden}:{camp:FV.delete(),gaiden:FV.delete()});
  if(old&&old!==gid){const oc=campById(old);if(oc)await S.db.doc("camps/"+old).update({eps:(oc.eps||[]).filter(x=>x!==scid)});}
  if(gid){const nc=campById(gid);const cur=campEps(nc).map(e=>e.id).filter(x=>x!==scid);
    // 자리를 정하지 않으면 마지막 플레이 날짜 순서에 맞는 자리로 넣어요
    const byDay=()=>{const d=sc.lastDay||"";if(!d)return cur.length;let k=0;cur.forEach((id,i)=>{const x=scenById(id);if(x&&(x.lastDay||"")<=d)k=i+1;});return k;};
    let at=afterId==="__first"?0:afterId?cur.indexOf(afterId)+1:byDay();if(at<0)at=cur.length;cur.splice(at,0,scid);
    await S.db.doc("camps/"+gid).update({eps:cur});}
}
// 캠페인에 새 편(외전 말고)이 올라오면 그 앞의 편은 자동으로 완주 처리 (완주한 날 = 그 편 마지막 플레이 날)
async function closePrevEps(gid,newId){
  const c=campById(gid);if(!c||isCamp(c))return;const es=campEps(c),i=newId==="__all"?es.length:es.findIndex(e=>e.id===newId);if(i<=0)return;
  const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  for(const e of es.slice(0,i)){if(e.done)continue;try{await S.db.doc("scenarios/"+e.id).update({done:true,doneAt:e.lastDay||today});}catch(err){}}
}
async function newCamp(name,system,kind){const id="g"+Date.now().toString(36)+rid4();
  await S.db.doc("camps/"+id).set({name,system:kind==="camp"?"":(system||""),intro:"",done:false,eps:[],created:Date.now(),...(kind==="camp"?{kind:"camp",place:"",start:"",end:""}:{})});
  try{await S.db.doc("secrets/"+id).set({pw:genPw()});}catch(e){}
  return id;}
// 같은 캠페인의 다른 편에서 고른 '나'와 같은 플레이어를 자동으로
function campMeK(id){const sc=scenById(id),c=campOf(sc);if(!c)return "";
  for(const e of campEps(c)){if(e.id===id)continue;const k=_me[e.id];if(!k||k==="ext")continue;const p=(e.sp||[]).find(x=>x.k===k);if(!p)continue;
    const nm=pcSplit(p.name||"").name;const q=(sc.sp||[]).find(x=>pcSplit(x.name||"").name===nm);if(q)return q.k;}
  return "";}
