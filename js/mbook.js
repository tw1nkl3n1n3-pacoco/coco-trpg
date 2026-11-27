// 코코 로그방 · 리플레이북 합본 (#mb-f-고정탁코드 · #mb-g-캠페인id)
// 고르기 화면(시나리오 고르기·빼기·순서) → 책: 표지 1 · 차례 1 · 시나리오마다 속표지 → 등장인물 → 본문 → 후기 · 쪽 번호는 책 전체로
// 캠페인은 한 덩어리(부)로 묶고, 안의 편은 편 순서 그대로 · 본문은 각 세션 리플레이북에서 고친 그대로(빼기·잡담·장)
function mbDate(sc){return (sc.pdays&&sc.pdays[0])||sc.lastDay||"";}
// 출처: 고정탁·페어 또는 캠페인
function mbSource(key){
  if(key.startsWith("f-")){const f=fixFromHash(key.slice(2));const scs=S.scens.filter(x=>fixOfScen(x)===f);if(!scs.length&&!S.loaded)return null;
    const units=[],seen=new Set();
    scs.slice().sort((a,b)=>mbDate(a).localeCompare(mbDate(b))).forEach(sc=>{const c=sc.camp&&campById(sc.camp);
      if(c&&!isCamp(c)){if(seen.has(c.id))return;seen.add(c.id);const eps=campEps(c).filter(e=>fixOfScen(e)===f);units.push({t:"cp",id:c.id,on:true,eps:eps.map(e=>({id:e.id,on:true}))});}
      else units.push({t:"sc",id:sc.id,on:true});});
    const d=jgDoc(f);return {kind:"f",name:f,back:fixHref(f),units,cover:(d.bookCv&&d.bookCv.u)||(d.banner&&d.banner.u)||"",sub:jgPair(f)?jgSides(f).map(x=>x.en).join(" × "):fixWord(f)};}
  if(key.startsWith("g-")){const c=campById(key.slice(2));if(!c)return null;const es=campEps(c);
    return {kind:"g",name:c.name,back:"#g-"+c.id,camp:c.id,units:es.map(e=>({t:"sc",id:e.id,on:true})),cover:(c.bookCv&&c.bookCv.u)||(campCover(c,es)||{}).u||"",sub:"캠페인"+(c.system?" · "+sysLabel(c.system):"")};}
  return null;}
function mbInit(key){S.mbook={key,step:"pick",src:null,size:(()=>{try{return localStorage.getItem("trpg-booksize")||"a5";}catch(e){return "a5";}})(),opt:{cast:true,rev:true},cover:null,prog:"",err:""};}
function mbEnsure(){const M=S.mbook;if(M&&!M.src){M.src=mbSource(M.key);if(M.src){M.cover=M.src.cover;mbScens().forEach(sc=>watchRevs(sc.id));}}return M&&M.src;}
// 고른 순서대로 펼친 목록: [{sc, unit, ep?}]
function mbFlat(onlyOn){const M=S.mbook,out=[];(M.src?M.src.units:[]).forEach(u=>{if(onlyOn&&!u.on)return;
  if(u.t==="cp"){const c=campById(u.id);u.eps.forEach(e=>{if(onlyOn&&!e.on)return;const sc=scenById(e.id);if(sc)out.push({sc,u,c,ep:e});});}
  else{const sc=scenById(u.id);if(sc)out.push({sc,u});}});return out;}
function mbScens(){return mbFlat(false).map(x=>x.sc);}
function mbHTML(){const M=S.mbook;if(!mbEnsure())return `<div class="bookwrap">${S.loaded?`<div class="notice">합본으로 묶을 시나리오를 찾을 수 없어요.</div>`:loaderHTML()}</div>`;
  const src=M.src,Z=BOOK_SIZES[M.size]||BOOK_SIZES.a5;
  const bar=`<div class="bkbar"><a class="ghost" href="${esc(src.back)}">← 돌아가기</a><b>📖 ${esc(src.name)} 리플레이북 합본</b>
    ${M.step==="view"?`<button class="ghost" id="mbpick">← 시나리오 다시 고르기</button>`:`<span class="tip">· 시나리오를 고르고 순서를 정해요</span>`}
    <select id="bksize">${Object.entries(BOOK_SIZES).map(([k,v])=>`<option value="${k}"${k===M.size?" selected":""}>${v.lab}</option>`).join("")}</select>
    <span class="sp"></span><span class="cnt" id="bkcnt">${esc(M.prog||"")}</span>${M.step==="view"?`<button class="pri" id="bkprint">PDF로 저장 · 인쇄</button>`:M.step==="pick"?`<button class="pri" id="mbgo">📖 책 만들기</button>`:""}</div>`;
  if(M.step==="view")return `<div class="bookwrap mode-view mbook" style="--acc:${BOOK_ACC.plain};--pw:${Z.w}px;--ph:${Z.h}px" data-size="${M.size}" data-th="plain">${bar}<div class="bkpages" id="bkpages"></div><div class="bkmeasure" id="bkmeasure"></div></div>`;
  if(M.step==="build")return `<div class="bookwrap">${bar}<div class="mbbuild">${loaderHTML()}<div class="tip">${esc(M.prog||"로그를 불러오는 중…")}</div></div></div>`;
  const row=(sc,meta,ext,on,ok)=>`<span class="t"><b>${ext||""}${esc(sc.name)}</b><small>${esc(meta)}${ok?"":" · 🔒 잠겨 있어서 넣을 수 없어요"}${on?"":" · 빼기"}</small></span>`;
  const meta=sc=>{const n=sc.nDays||(sc.pdays||[]).length||0;return [jgDot(mbDate(sc)),n?`${n}세션`:""].filter(Boolean).join(" · ");};
  const th=sc=>{const v=coverOf(sc);return `<span class="th"${v?` style="background-image:url('${esc(v.u)}')"`:""}></span>`;};
  const U=src.units;
  const list=U.map((u,i)=>{const mv=`<span class="mv"><button type="button" data-mbmv="${i}|-1"${i?"":" disabled"}>↑</button><button type="button" data-mbmv="${i}|1"${i<U.length-1?"":" disabled"}>↓</button></span>`;
    if(u.t==="cp"){const c=campById(u.id);if(!c)return "";const es=u.eps.map(e=>scenById(e.id)).filter(Boolean);const v=campCover(c,es);
      return `<li class="${u.on?"":"off"}"><button type="button" class="ck" data-mbon="${i}">✓</button><span class="th"${v?` style="background-image:url('${esc(v.u)}')"`:""}></span><span class="t"><b><em class="tg">CAMPAIGN</em>${esc(c.name)}</b><small>${es.length}편${c.done?" · 완주":" · 진행 중"}${u.on?"":" · 빼기"}</small></span>${mv}</li>
        ${u.eps.map((e,j)=>{const sc=scenById(e.id);if(!sc)return "";const ok=bookCan(sc);return `<li class="ep${e.on&&u.on&&ok?"":" off"}"><button type="button" class="ck" data-mbep="${i}|${j}"${ok?"":" disabled"}>✓</button>${row(sc,meta(sc),`${esc(epLabel(c,sc)||"")} `,e.on,ok)}<span></span></li>`;}).join("")}`;}
    const sc=scenById(u.id);if(!sc)return "";const ok=bookCan(sc);
    return `<li class="${u.on&&ok?"":"off"}"><button type="button" class="ck" data-mbon="${i}"${ok?"":" disabled"}>✓</button>${th(sc)}${row(sc,meta(sc),"",u.on,ok)}${mv}</li>`;}).join("");
  const sel=mbFlat(true).filter(x=>bookCan(x.sc)),nS=sel.reduce((a,x)=>a+(x.sc.nDays||0),0),nU=new Set(sel.map(x=>x.u)).size;
  return `<div class="bookwrap mbpick">${bar}
    <div class="mbgrid"><div class="mbcard"><h4>시나리오</h4><div class="tip">처음엔 전부 골라져 있어요 · 체크를 풀면 빠지고, ↑↓ 로 순서를 바꿔요 · 캠페인은 한 덩어리로 움직이고 안의 편은 편 순서 그대로예요</div><ul class="mbsel">${list}</ul></div>
      <div class="mbcard"><h4>책 구성</h4><div class="tip">각 시나리오는 그 세션 페이지의 리플레이북에서 고친 그대로(빼기·잡담·장 나누기) 들어가요</div>
        <div class="mbcov"><span class="cv"${M.cover?` style="background-image:url('${esc(M.cover)}')"`:""}>${M.cover?"":"표지 그림 없음"}</span><div><b>표지 그림</b><div class="tip">${src.kind==="f"?"기본은 첫 화면 그림":"기본은 캠페인 커버"} · 다른 그림을 올릴 수 있어요</div>
          <label class="btnlike">그림 올리기<input type="file" accept="image/*" hidden id="mbcvf"></label>${M.cover&&M.cover!==src.cover?`<button type="button" class="ghost" id="mbcvx">기본으로</button>`:""}<span class="tip" id="mbcvmsg"></span></div></div>
        <label class="chk"><input type="checkbox" id="mbo-cast"${M.opt.cast?" checked":""}> 시나리오마다 등장인물 쪽</label>
        <label class="chk"><input type="checkbox" id="mbo-rev"${M.opt.rev?" checked":""}> 시나리오마다 플레이어 후기</label>
        <ul class="mbord"><li><span>1쪽</span>표지</li><li><span>2쪽~</span>차례 — 처음 하나뿐</li><li><span>그다음</span>부마다 속표지 → ${M.opt.cast?"등장인물 → ":""}본문${M.opt.rev?" → 후기":""} · 캠페인은 편마다 편 속표지</li><li><span></span>쪽 번호는 책 전체로 이어져요</li></ul>
        <div class="mbsum"><div><b>${nU}</b>이야기</div><div><b>${sel.length}</b>시나리오</div><div><b>${nS}</b>세션</div></div></div></div></div>`;}
function bindMbook(){const M=S.mbook;renderAuth&&renderAuth();if(!M||!M.src)return;
  const sz=$("#bksize");if(sz)sz.onchange=()=>{M.size=sz.value;try{localStorage.setItem("trpg-booksize",M.size);}catch(e){}render();};
  document.querySelectorAll("[data-mbmv]").forEach(b=>b.onclick=()=>{const [i,d]=b.dataset.mbmv.split("|").map(Number),U=M.src.units,j=i+d;if(j<0||j>=U.length)return;[U[i],U[j]]=[U[j],U[i]];render();});
  document.querySelectorAll("[data-mbon]").forEach(b=>b.onclick=()=>{const u=M.src.units[+b.dataset.mbon];u.on=!u.on;render();});
  document.querySelectorAll("[data-mbep]").forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.mbep.split("|").map(Number),u=M.src.units[i];u.eps[j].on=!u.eps[j].on;if(u.eps[j].on)u.on=true;render();});
  const oc=$("#mbo-cast");if(oc)oc.onchange=()=>{M.opt.cast=oc.checked;render();};
  const or=$("#mbo-rev");if(or)or.onchange=()=>{M.opt.rev=or.checked;render();};
  const cx=$("#mbcvx");if(cx)cx.onclick=()=>{M.cover=M.src.cover;render();};
  const cf=$("#mbcvf");if(cf)cf.onchange=async()=>{const file=cf.files[0];cf.value="";if(!file)return;const msg=$("#mbcvmsg");if(msg)msg.textContent="올리는 중…";
    // 고정탁·캠페인 문서에 남겨 두면 다음에도 이 그림으로 · 저장 권한이 없으면 이번만
    try{const key=M.src.kind==="f"?fixKey(M.src.name):M.src.camp;if(!S.authUser)await S.auth.signInAnonymously();const q=await galPut(key,file,"bk"+Date.now().toString(36)+rid4());M.cover=q.o;
      try{if(M.src.kind==="f")await jgPut(M.src.name,{bookCv:{u:q.o}});else await S.db.doc("camps/"+M.src.camp).update({bookCv:{u:q.o}});M.src.cover=q.o;}catch(e){}}
    catch(e){M.cover=await new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(file);});}
    render();};
  const go=$("#mbgo");if(go)go.onclick=()=>{if(!mbFlat(true).filter(x=>bookCan(x.sc)).length){toast("넣을 시나리오를 골라 주세요");return;}mbBuild();};
  const pk=$("#mbpick");if(pk)pk.onclick=()=>{M.step="pick";M.prog="";render();};
  const pr=$("#bkprint");if(pr)pr.onclick=()=>{const st=document.getElementById("bkpage-style")||document.head.appendChild(Object.assign(document.createElement("style"),{id:"bkpage-style"}));const Z=BOOK_SIZES[M.size];st.textContent=`@page{size:${Z.w/559*148}mm ${Z.h/794*210}mm;margin:0}`;window.print();};
  if(M.step==="view"&&M.data)setTimeout(mbRender,0);}
// 시나리오마다 모든 회차·부 로그를 불러와요 (bookLoad와 같은 방식)
async function mbLoadParts(sc){const g=groups().find(x=>x.scen===sc.name),parts=[];
  for(const d of g?g.days:[])for(const s of d.parts){const snap=await S.db.collection(`sessions/${s.id}/chunks`).get();const chunks={};snap.docs.forEach(x=>{chunks[x.data().i]=x.data().b||[];});parts.push({sid:s.id,day:d.day,part:s.part,chunks});}
  return parts;}
async function mbBuild(){const M=S.mbook,list=mbFlat(true).filter(x=>bookCan(x.sc));M.step="build";M.err="";render();
  const data=[];
  try{for(let i=0;i<list.length;i++){const x=list[i];M.prog=`로그를 불러오는 중… ${i+1} / ${list.length} · ${x.sc.name}`;const n=document.querySelector(".mbbuild .tip");if(n)n.textContent=M.prog;
    data.push({...x,parts:await mbLoadParts(x.sc)});}}
  catch(e){M.step="pick";M.prog="";render();toast(e.code==="permission-denied"?"잠긴 로그가 있어요. 비밀번호로 먼저 열어 주세요.":"로그를 불러오지 못했어요");return;}
  if(S.mbook!==M)return;M.data=data;M.step="view";M.prog="";render();}
// 책 그리기: 차례 쪽 수를 먼저 재고 → 본문을 이어지는 쪽 번호로 나누고 → 차례를 맨 앞에 끼워요
function mbRender(){const M=S.mbook;if(!M||!M.data)return;const host=$("#bkpages"),meas=$("#bkmeasure");if(!host||!meas)return;
  if(document.fonts&&document.fonts.status!=="loaded"){document.fonts.ready.then(()=>{if(S.mbook===M)mbRender();});return;}
  host.innerHTML="";meas.innerHTML="";const title=M.src.name;
  // 1) 시나리오마다 블록·앞부분 (S.book을 잠깐 빌려 써요 · 사이에 기다림 없음)
  const items=M.data.map(x=>{const prev=S.book;S.book={scid:x.sc.id,parts:x.parts,mode:"view",size:M.size,sel:new Set()};let blocks=[],front={castP:""};
    try{blocks=bookBlocks(x.sc,false);front=bookFront(x.sc);}finally{S.book=prev;}
    const revs=M.opt.rev?(S.revs[x.sc.id]||[]).filter(r=>r.html||r.text):[];return {...x,blocks,castP:front.castP,revs};});
  // 2) 부 나누기: 캠페인은 한 부, 단편은 하나가 한 부 · 캠페인 페이지 합본이면 편 하나가 한 부
  const parts=[];items.forEach(it=>{const last=parts[parts.length-1];if(it.c&&M.src.kind==="f"){if(last&&last.c===it.c)last.items.push(it);else parts.push({c:it.c,items:[it]});}else parts.push({items:[it]});});
  // 3) 차례 항목 (쪽 번호는 나중에)
  const toc=[];parts.forEach((P,pi)=>{const nm=P.c?P.c.name:P.items[0].sc.name;toc.push({lv:0,t:`${pi+1}부 ${nm}`,sub:P.c?"캠페인":"",key:"p"+pi});
    P.items.forEach((it,ii)=>{const ind=P.c?1:0;if(P.c)toc.push({lv:1,t:`${it.sc.gaiden?"외전":epLabel(P.c,it.sc)||""} ${it.sc.name}`.trim(),key:`e${pi}_${ii}`});
      if(M.opt.cast&&it.castP)toc.push({lv:ind+1,t:"등장인물",key:`c${pi}_${ii}`});
      it.blocks.forEach(b=>{if(b.k==="chap")toc.push({lv:ind+1,t:b.title,id:b.id,sid:it.sc.id});else if(b.k==="scene"&&b.lv===2&&b.text)toc.push({lv:ind+2,t:b.text,id:b.id,sid:it.sc.id});});
      if(it.revs.length)toc.push({lv:ind+1,t:"플레이어 후기",key:`r${pi}_${ii}`});});});
  const tocPages=nums=>{const pgs=[];let body=null;const np=()=>{const el=document.createElement("div");el.className="bpg";el.innerHTML=`<div class="bbody"></div><div class="bfolio"><span>${esc(title)}</span><span>${2+pgs.length}</span></div>`;pgs.push(el);meas.appendChild(el);body=el.firstChild;};
    np();body.innerHTML=`<h2 class="ph">CONTENTS</h2><h3 class="pt">차례</h3><ul class="btoc mbtoc"></ul>`;let ul=body.querySelector("ul");
    toc.forEach(t=>{const li=document.createElement("li");li.className=t.lv===0?"ch pt":t.lv===1?"ch":"sc";li.style.paddingLeft=(t.lv>0?(t.lv-1)*12+(t.lv>1?10:0):0)+"px";li.innerHTML=`${esc(t.t)}${t.sub?` <small>${esc(t.sub)}</small>`:""}<span class="p">${nums?(nums(t)||""):"000"}</span>`;ul.appendChild(li);
      if(body.scrollHeight>body.clientHeight+1&&ul.children.length>1){ul.removeChild(li);np();body.innerHTML=`<ul class="btoc mbtoc"></ul>`;ul=body.querySelector("ul");ul.appendChild(li);}});
    return pgs;};
  const T=tocPages(null).length;meas.innerHTML="";
  // 4) 표지
  const cov=document.createElement("div");cov.className="bpg bcover";if(M.cover)cov.style.setProperty("--og",`url('${safeU(M.cover)}')`);
  const allDays=items.flatMap(it=>it.parts.map(p=>p.day)).filter(Boolean).sort();
  cov.innerHTML=`<div class="art${M.cover?" img":""}"></div><div class="band"></div><div class="in"><div class="series">REPLAY BOOK · COLLECTION</div><h1>${esc(title)}</h1><div class="bcsub">${esc(M.src.sub||"")}</div>
    <div class="bcpub"><span>${site().title===SITE_UNSET?"":esc(site().title)}</span><span>${allDays.length?esc(allDays[0].replace(/-/g,". ")):""}${allDays.length>1?` – ${esc(allDays.at(-1).replace(/-/g,". "))}`:""} · ${parts.length}부</span></div></div>`;
  host.appendChild(cov);const tocAnchor=document.createElement("div");host.appendChild(tocAnchor);
  // 5) 본문: 쪽 번호는 표지(1)·차례(T) 다음부터 이어져요
  let p=2+T;const pageOfKey={},pageOfId={};
  // 부·편 속표지는 늘 오른쪽(홀수 쪽)에서 시작 · 모자라면 빈 쪽을 하나 넣어요
  const recto=()=>{if(p%2===0){const el=document.createElement("div");el.className="bpg bblank";host.appendChild(el);p++;}};
  const partPage=(cls,html,folio)=>{recto();const el=document.createElement("div");el.className="bpg mbpart "+cls;el.innerHTML=`<div class="bbody">${html}</div><div class="bfolio"><span>${esc(folio)}</span><span>${p}</span></div>`;host.appendChild(el);return p++;};
  const sysOf=sc=>effSys(sc)?sysLabel(effSys(sc)):"";
  parts.forEach((P,pi)=>{const first=P.items[0].sc,ds=P.items.flatMap(it=>it.parts.map(x=>x.day)).filter(Boolean).sort();
    pageOfKey["p"+pi]=partPage(P.c?"cp":"",`<div class="n">${String(pi+1).padStart(2,"0")}</div><h2>${esc(P.c?P.c.name:first.name)}</h2><p>${esc([P.c?"캠페인":"",sysOf(first),ds.length?ds[0].replace(/-/g,". ")+(ds.length>1&&ds.at(-1)!==ds[0]?" – "+ds.at(-1).slice(5).replace(/-/g,". "):""):"",P.c?`${P.items.length}편`:""].filter(Boolean).join(" · "))}</p>`,title);
    P.items.forEach((it,ii)=>{const sc=it.sc,gk=gmKey(sc),gm=(sc.sp||[]).find(x=>x.k===gk);
      if(P.c)pageOfKey[`e${pi}_${ii}`]=partPage("ep",`<div class="n s">${esc(sc.gaiden?"외전":epLabel(P.c,sc)||"")}</div><h2>${esc(sc.name)}</h2><p>${esc([it.parts[0]?it.parts[0].day.replace(/-/g,". "):"",gm?`${gmAb(sc)} ${pcSplit(gm.name).name}`:""].filter(Boolean).join(" · "))}</p>`,P.c.name);
      if(M.opt.cast&&it.castP){const t=document.createElement("div");t.innerHTML=it.castP;const el=t.firstElementChild;const f=el.querySelector(".bfolio");if(f){f.firstElementChild.textContent=sc.name;f.lastElementChild.textContent=p;}host.appendChild(el);pageOfKey[`c${pi}_${ii}`]=p++;}
      const pages=bookPaginate(it.blocks,host,p);pages.forEach((pg,k)=>pg.ids.forEach(id=>{const key=sc.id+"|"+id;if(!pageOfId[key])pageOfId[key]=p+k;}));p+=pages.length;
      if(it.revs.length){pageOfKey[`r${pi}_${ii}`]=p;const pgs=[];let body=null;const np=()=>{const el=document.createElement("div");el.className="bpg";el.innerHTML=`<div class="bbody"></div><div class="bfolio"><span>${esc(sc.name)}</span><span>${p}</span></div>`;host.appendChild(el);pgs.push(el);p++;body=el.firstChild;};
        np();body.innerHTML=`<h2 class="ph">AFTERWORD</h2><h3 class="pt">플레이어 후기</h3>`;
        it.revs.forEach(r=>{const w=revWho(sc,r);const el=document.createElement("div");el.className="brv";el.innerHTML=`<b>${esc(w.name)}</b><small>${esc(w.gm?gmWord(sc):w.ch?w.ch+" 역":"")}</small><div class="rb">${r.html?richView(r.html):esc(r.text||"").replace(/\n/g,"<br>")}</div>`;
          body.appendChild(el);if(body.scrollHeight>body.clientHeight&&body.children.length>1){body.removeChild(el);np();body.appendChild(el);}});}});});
  // 6) 차례를 맨 앞(표지 다음)에 · 쪽 번호 채워서
  const tp=tocPages(t=>t.key?pageOfKey[t.key]:pageOfId[t.sid+"|"+t.id]);tp.forEach(el=>host.insertBefore(el,tocAnchor));tocAnchor.remove();meas.innerHTML="";bookSides(host);
  const cnt=$("#bkcnt");if(cnt)cnt.textContent=`${parts.length}부 · ${items.length}시나리오 · ${BOOK_SIZES[M.size].n} ${p-1+(T-tp.length)}쪽`;}
