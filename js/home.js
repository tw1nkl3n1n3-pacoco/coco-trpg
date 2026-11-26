// 코코 로그방 · 녹음 파일 올리기·메인 화면·검색·백업·파일 읽기
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- 녹음 파일 (Firebase Storage) ----------
async function loadCloudAudio(){
  if(!S.storage||!S.meta||!S.meta.audioPath)return;
  const sid=S.sid;S.audioLoading=true;renderHeader();
  try{
    const url=await S.storage.ref(S.meta.audioPath).getDownloadURL();
    if(S.sid!==sid)return;
    S.audioUrl=url;S.audioCloud=true;const a=$("#aud");if(a)a.src=url;
  }catch(e){toast("녹음을 불러오지 못했어요: "+(e.code||e.message),4000);}
  S.audioLoading=false;renderHeader();
}
// 올리기 전에 녹음을 opus로 줄여요(js/audio.js) · 안 되면 원본 그대로
async function uploadAudio(sess,file,onPct){
  let body=file,ext=(file.name.match(/\.([a-z0-9]+)$/i)||[,"m4a"])[1].toLowerCase(),type=file.type||(ext==="m4a"?"audio/mp4":"audio/"+ext),orig=0;
  if(S.storage&&typeof compressAudio==="function"&&!(S.site&&S.site.noz)){
    try{onPct&&onPct(0,"zip");const r=await compressAudio(file,f=>onPct&&onPct(Math.min(99,Math.floor(f*100)),"zip"));
      if(r){body=r.blob;ext="webm";type="audio/webm";orig=file.size;}}catch(e){console.warn(e);}
  }
  return putAudio(sess,file,body,ext,type,orig,onPct);
}
function putAudio(sess,file,body,ext,type,orig,onPct){
  return new Promise((ok,fail)=>{
    if(!S.storage){fail(new Error("Storage가 설정되지 않았어요"));return;}
    const scid=sess.scid||findScen(info(sess).scen)?.id;if(!scid){fail(new Error("세션을 찾을 수 없어요"));return;}
    const path=`audio/${scid}/${sess.id}.${ext}`;
    const task=S.storage.ref(path).put(body,{contentType:type});
    task.on("state_changed",sn=>onPct&&onPct(Math.floor(sn.bytesTransferred/sn.totalBytes*100)),fail,async()=>{
      try{
        if(sess.audioPath&&sess.audioPath!==path){try{await S.storage.ref(sess.audioPath).delete();}catch(e){}}
        await S.db.doc("sessions/"+sess.id).update({audioPath:path,audioName:file.name,audioSize:body.size,...(orig?{audioOrig:orig}:{audioOrig:firebase.firestore.FieldValue.delete()})});ok(path);
      }catch(e){fail(e);}
    });
  });
}
async function removeAudio(sess){
  if(sess.audioPath){try{await S.storage.ref(sess.audioPath).delete();}catch(e){}}
  await S.db.doc("sessions/"+sess.id).update({audioPath:firebase.firestore.FieldValue.delete(),audioName:firebase.firestore.FieldValue.delete(),audioSize:firebase.firestore.FieldValue.delete()});
}
const normT=t=>String(t||"").replace(/\.[a-z0-9]+$/i,"").replace(/[^0-9a-z가-힣]/gi,"").toLowerCase();
function audioBox(){
  if(!S.meta||!S.canWrite)return;
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="box"><h2>녹음 파일 링크</h2><div class="fields"><label>구글 드라이브 같은 곳의 공유 링크<input type="text" id="f-audio" value="${esc(S.meta.audio||"")}" placeholder="https://drive.google.com/..."></label></div>
    <div class="btns"><button data-x>취소</button><button class="pri" data-ok>저장</button></div></div>`;
  document.body.appendChild(m);$("#f-audio").focus();
  m.querySelector("[data-x]").onclick=()=>m.remove();m.onclick=ev=>{if(ev.target===m)m.remove();};
  m.querySelector("[data-ok]").onclick=async()=>{S.meta.audio=safeUrl($("#f-audio").value);m.remove();await saveMeta();renderHeader();};
}
// 메인 화면·시나리오 페이지에서 녹음 정보 고치기
function editSessionBox(id){
  const s=S.sessions.find(x=>x.id===id);if(!s||!S.canWrite||!S.db)return;
  const v=info(s);
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="box"><h2>녹음 정보</h2>${infoFields({...v,withAudio:true,audio:s.audio})}
    <div class="tip" style="margin-top:8px">원래 파일 이름: ${esc(s.title||"")}</div>
    ${S.storage?`<div class="audiobox"><b>녹음 파일</b> <span class="tip">${s.audioPath?`☁ ${esc(s.audioName||"올린 파일")}${s.audioSize?` · ${Math.round(s.audioSize/1048576)}MB`:""}`:"아직 없어요"}</span><br>
      <span class="filebtn"><button type="button">${s.audioPath?"바꾸기":"⬆ 올리기"}</button><input type="file" id="sb-audio" accept="audio/*,video/*,.m4a,.mp3,.wav,.ogg,.webm"></span>
      ${s.audioPath?`<button type="button" class="ghost" id="sb-audiodel" style="color:var(--bad)">녹음 지우기</button>`:""} <span class="tip" id="sb-aprog"></span></div>`:""}
    <div class="btns">${S.canAdmin?`<button data-del style="margin-right:auto;color:var(--bad)">이 녹음 삭제</button>`:""}<button data-x>취소</button><button class="pri" data-ok>저장</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector("[data-x]").onclick=()=>m.remove();
  m.onclick=ev=>{if(ev.target===m)m.remove();};
  const sba=m.querySelector("#sb-audio");if(sba)sba.onchange=async ev=>{const f=ev.target.files[0];if(!f)return;const pr=m.querySelector("#sb-aprog");
    try{await uploadAudio(s,f,(p,st)=>pr.textContent=`${st==="zip"?"녹음 줄이는 중":"올리는 중"}… ${p}%`);pr.textContent="올렸어요 ✓";}catch(e){pr.textContent="올리지 못했어요: "+(e.code||e.message);}};
  const sbd=m.querySelector("#sb-audiodel");if(sbd)sbd.onclick=()=>{m.remove();confirmBox("이 녹음 파일을 지울까요? 로그는 그대로 남아요.","지우기",async()=>{try{await removeAudio(s);toast("녹음 파일을 지웠어요");}catch(e){toast("지우지 못했어요");}});};
  m.querySelector("[data-ok]").onclick=async()=>{
    const f=readFields();m.remove();
    const patch={...f};
    if(f.scen!==v.scen){const tgt=findScen(f.scen);if(tgt)patch.scid=tgt.id;const old=findScen(v.scen);patch.sp=JSON.parse(JSON.stringify([...(old?.sp||[]),...((s.sp||[]).filter(o=>!(old?.sp||[]).some(x=>x.k===o.k)))]));}
    try{await retry(()=>S.db.doc("sessions/"+id).update(patch));toast("저장했어요");}catch(e){writeFail(e);toast("저장하지 못했어요");}
  };
  const d=m.querySelector("[data-del]");if(d)d.onclick=()=>{m.remove();confirmBox(`'${v.scen} ${fmtDay(v.day)}${v.part>1?" "+pieceNo(v.part):""}' 녹음의 로그를 지울까요? 모두에게서 사라지고 되돌릴 수 없어요.`,"삭제",()=>deleteSession(id));};
}
function bindPartEdit(){document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();editSessionBox(b.dataset.edit);});}

// ---------- home & import ----------
// 카드 이미지: 대표 이미지(갤러리에서 고른 것 · cover) 또는 공유 이미지(og) · 원래 비율, 4:3보다 길면 고른 위치로 잘라요
function coverOf(x){if(!x)return null;const c=x.cover;if(c&&c.og)return x.og?{u:x.og,y:c.y}:null;if(c&&c.u)return c;return x.og?{u:x.og,y:50}:null;}
function coverHTML(x,cls){const c=coverOf(x);return c?`<div class="${cls} cv"><img src="${esc(c.u)}" alt="" loading="lazy" decoding="async" style="object-position:50% ${+c.y>=0?+c.y:50}%"></div>`:"";}
function pwOf(sc){return sc&&sc.camp&&campById(sc.camp)?sc.camp:sc&&sc.id;}
function scenSecHTML(g){return `
      <section class="scen">${coverHTML(g.sc,"ogtop")}
        ${g.sc?.fix?fixLineHTML(g.sc.fix):""}<div class="scen-h"><h3><a href="#" data-scen="${esc(g.scen)}" title="개요 보기">${esc(g.scen)} ›</a>${g.sc?.orig?`<span class="orig">${esc(g.sc.orig)}</span>`:""}</h3>${g.sc?.system?`<span class="sys" data-th="${themeOf(g.sc)||"pa"}">${esc(sysLabel(g.sc.system))}</span>`:""}<span class="d${g.sc?.done?" dstamp":""}">${g.sc&&!isOpen(g.sc.id)?(g.sc.lastDay?`${g.sc.nDays||1}회차 · 마지막 ${esc(fmtDay(g.sc.lastDay))} 🔒`:"🔒"):g.days.length?`${g.days.length}회차 · 마지막 ${esc(fmtDay(g.last))}`:"아직 녹음 없음"}${stampHTML(g.sc)}</span></div>
        ${g.sc?.summary?`<div class="sum">${esc(g.sc.summary)}</div>`:""}
        ${castHTML(g.sc)}
        ${g.sc&&!isOpen(g.sc.id)?"":daysHTML(g.days,false)}
      </section>`;}
// 메인 검색 드롭다운: 시나리오 · 사람 · 캐릭터
function hqSuggest(terms,nq){
  const ok=t=>{const h=nq(t);return terms.every(x=>h.includes(x));};
  const scen=[];S.camps.forEach(c=>{if(ok(c.name+"|"+(c.orig||"")))scen.push({href:"#g-"+c.id,t:c.name,tag:isCamp(c)?"캠프":"캠페인",sub:campCount(c),d:campKey(c)});});
  S.scens.forEach(sc=>{if(ok(sc.name+"|"+(sc.orig||"")))scen.push({href:"#c-"+sc.id,t:sc.name,sys:effSys(sc),th:themeOf(sc),sub:sc.orig||"",d:sc.lastDay||""});});
  scen.sort((a,b)=>(b.d||"").localeCompare(a.d||""));
  const P=new Map(),C=[];
  S.scens.forEach(sc=>{const g=gmKey(sc);(sc.sp||[]).forEach(p=>{if(/&/.test(p.name||"")||isAnon(p))return;const n=pcSplit(p.name||"").name;if(!n)return;
    if(!P.has(n))P.set(n,{n,c:p.c,cnt:0,gm:0,ids:new Set()});const o=P.get(n);if(!o.ids.has(sc.id)){o.ids.add(sc.id);o.cnt++;if(p.k===g)o.gm++;}
    if(p.ch&&ok(p.ch))C.push({href:"#c-"+sc.id,ch:p.ch,who:n,sc:sc.name,c:p.c,d:sc.lastDay||""});});});
  const people=[...P.values()].filter(o=>ok(o.n)).sort((a,b)=>b.cnt-a.cnt);
  C.sort((a,b)=>(b.d||"").localeCompare(a.d||""));
  return {scen,people,chars:C};
}
function hqDropHTML(terms,nq){
  const R=hqSuggest(terms,nq),more=S.hqMore||{};let i=0;const it=[];
  const sec=(key,title,arr,f)=>{if(!arr.length)return "";const lim=more[key]?arr.length:5;
    return `<div class="hq-sec"><div class="hq-h">${title}</div>${arr.slice(0,lim).map(x=>{const n=i++;it.push(x);return f(x,n);}).join("")}${arr.length>5&&!more[key]?`<button type="button" class="hq-more" data-hqmore="${key}">${arr.length-5}개 더 보기</button>`:""}</div>`;};
  const html=sec("s","시나리오",R.scen,(x,n)=>`<a class="hq-it${S.hqSel===n?" on":""}" href="${esc(x.href)}" data-hqi="${n}"><b>${esc(x.t)}</b>${x.tag?`<span class="hq-tag">${x.tag}</span>`:x.sys?`<span class="sys" data-th="${x.th||"pa"}">${esc(sysLabel(x.sys))}</span>`:""}<small>${esc([x.sub,x.d?fmtDay(x.d):""].filter(Boolean).join(" · "))}</small></a>`)
    +sec("p","사람",R.people,(x,n)=>`<button type="button" class="hq-it${S.hqSel===n?" on":""}" data-hqwho="${esc(x.n)}" data-hqi="${n}"><i class="hq-dot" style="--c:${fixC(x.c)}"></i><b>${esc(x.n)}</b><small>세션 ${x.cnt}개${x.gm?` · GM ${x.gm}번`:""}</small></button>`)
    +sec("c","캐릭터",R.chars,(x,n)=>`<a class="hq-it${S.hqSel===n?" on":""}" href="${esc(x.href)}" data-hqi="${n}"><i class="hq-dot" style="--c:${fixC(x.c)}"></i><b>${esc(x.ch)}</b><small>${esc(x.who)} · ${esc(x.sc)}</small></a>`);
  S.hqItems=it;
  return `<div class="hq-drop">${html||`<div class="hq-none">맞는 시나리오·사람·캐릭터가 없어요</div>`}<div class="hq-foot">Enter: 아래 목록에서 '${esc(S.homeQ.trim())}' 전체 보기 · Esc: 닫기</div></div>`;
}
function homeHTML(){
  const can=S.db&&S.canWrite;
  const all=groups();
  // 캠페인·캠프에 들어간 세션은 그 카드 안에서만 보여요
  const plainGs=all.filter(g=>!(g.sc&&g.sc.camp&&campById(g.sc.camp)));
  // 검색: 제목·원어 제목·룰·플레이어·캐릭터·캠페인/캠프 이름 (띄어쓰기·대소문자 무시)
  const nq=x=>String(x||"").toLowerCase().replace(/\s+/g,"");
  // 목록은 Enter로 확정한 검색어(homeQc)로, 드롭다운은 치는 중인 글자(homeQ)로
  const toTerms=v=>String(v||"").trim().split(/\s+/).map(nq).filter(Boolean);
  const terms=toTerms(S.homeQc),tterms=toTerms(S.homeQ);
  const hay=sc=>sc?nq([sc.name,sc.orig,sc.fix,effSys(sc),sysLabel(effSys(sc)),ruleWords(effSys(sc)),themeOf(sc)==="deco"?"D&D 디앤디":themeOf(sc)==="dx"?"더블크로스 DX":themeOf(sc)==="wa"?"인세인":"",...(sc.sp||[]).flatMap(p=>[pcSplit(p.name||"").name,p.ch])].join("|")):"";
  const hit=h=>terms.every(t=>h.includes(t));
  const campHay=c=>nq([c.name,c.orig,c.place,c.fix,c.system,sysLabel(c.system||""),ruleWords(c.system||"")].join("|"))+"|"+campEps(c).map(hay).join("|");
  const who=S.homePerson||"",hasWho=sc=>!who||(sc?.sp||[]).some(p=>pcSplit(p.name||"").name===who);
  const gs=plainGs.filter(g=>(!terms.length||hit(g.sc?hay(g.sc):nq(g.scen)))&&hasWho(g.sc));
  const cs=S.camps.filter(c=>(!terms.length||hit(campHay(c)))&&(!who||campEps(c).some(hasWho)));
  const live=cs.filter(c=>!c.done&&!isCamp(c)).sort((a,b)=>campLast(b).localeCompare(campLast(a)));
  // 완주한 캠페인·캠프는 일반 세션 사이에 날짜 순으로 · 연도가 바뀌는 곳에 구분선
  const hx=isHX();
  const items=[...gs.map(g=>({k:g.last||"",html:hx?hxScCard(g):scenSecHTML(g)})),...cs.filter(c=>c.done||isCamp(c)).map(c=>({k:campKey(c),html:hx?hxCampCard(c):campCardHTML(c)}))].sort((a,b)=>b.k.localeCompare(a.k));
  const ycnt={};items.forEach(x=>{const y=(x.k||"").slice(0,4);ycnt[y]=(ycnt[y]||0)+1;});
  let py="";const listHTML=items.map(x=>{const y=(x.k||"").slice(0,4);const sep=y&&y!==py?`<div class="hyear"><span>${esc(y)}</span>${hx?`<small class="hx-m">${ycnt[y]} records</small>`:""}</div>`:"";if(y)py=y;return sep+x.html;}).join("");
  const notices=`    ${S.err?`<div class="notice bad">${esc(S.err)}</div>`:""}
    ${!S.ready||(S.db&&!S.loaded)?loaderHTML():""}
    ${S.ready&&S.setupNeeded?`<div class="notice bad">아직 Firebase 설정이 비어 있어요. 저장소 <b>Settings → Secrets and variables → Actions → Variables</b>에 <b>FIREBASE_CONFIG</b>와 <b>OWNER_EMAIL</b>을 넣고 다시 배포해 주세요. 자세한 방법은 저장소의 README에 있어요. </div>`:""}
    ${S.ready&&S.db&&S.loaded&&!S.canAdmin&&S.scens.some(x=>!isOpen(x.id))?`<div class="notice">🔒 표시된 세션은 같이 플레이한 친구에게 받은 비밀번호를 넣어야 로그를 볼 수 있어요.</div>`:""}`;
  const search=`${S.loaded&&plainGs.length+S.camps.length>0?`<div class="hsearch${who?" haschip":""}"><svg class="hq-ic" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>${who?`<span class="hq-chip">👤 ${esc(who)}<button type="button" id="hq-who-x" title="풀기">✕</button></span>`:""}<input type="search" id="hq" value="${esc(S.homeQ||"")}" placeholder="${who?"더 좁혀 보기":"세션 · 룰 · 플레이어 · 캐릭터 검색"}" autocomplete="off">${terms.length||who?`<span class="hq-n">${live.length+items.length}개</span>`:""}${S.hqOpen&&tterms.length?hqDropHTML(tterms,nq):""}</div>`:""}`;
  const emptyMsg=terms.length?`<div class="notice">'${esc(String(S.homeQc||"").trim())}'에 맞는 세션이 없어요.</div>`:S.ready&&S.db&&S.loaded?`<div class="notice">아직 올린 세션이 없어요.${S.canAdmin?" ＋ 세션 올리기로 올려 주세요.":""}</div>`:"";
  const adminBtn=S.canAdmin&&S.db?`<a class="ghost adminbtn" href="#admin" title="관리자 페이지">⚙ 관리${adminAlert()?'<i class="dot-alert"></i>':""}</a>`:"";
  if(hx)return hxHomeHTML({all,live,can,notices,search,list:listHTML||(live.length?"":emptyMsg),n:items.length,adminBtn});
  return `<div class="home hmain">
    <div class="hometop"><h2>${iconHTML(site().icon)}${esc(site().title)}</h2></div>
    <div class="tip" style="font-size:13.5px">${esc(site().sub).replace(/\n/g,"<br>")}</div>
    ${S.loaded&&S.scens.length?(t=>`<div class="hstats"><span><b>${t.scen}</b>시나리오</span><span><b>${t.ses}</b>세션</span>${t.cpn?`<span><b>${t.cpn}</b>캠페인</span>`:""}<span><b>${t.ppl}</b>함께한 사람</span></div>`)(homeStats(all)):""}
    ${notices}
    ${search}
    <div id="sesslist">${live.length?`<div class="hlab">진행 중인 캠페인</div>${live.map(campCardHTML).join("")}`:""}${listHTML||(live.length?"":terms.length?`<div class="notice">'${esc(String(S.homeQc||"").trim())}'에 맞는 세션이 없어요.</div>`:S.ready&&S.db&&S.loaded?`<div class="notice">아직 올린 세션이 없어요.${S.canAdmin?" 아래 ＋ 세션 올리기로 올려 주세요.":""}</div>`:"")}</div>
    ${can?`<div class="upentry"><a class="btnlike pri upbtn" href="#up">＋ 세션 올리기</a><span class="tip">녹음 · 코코포리아 로그 · 녹음 없는 세션</span></div>`:""}
    ${fixTagsHTML()}
    <div class="homefoot"><span class="hright">${S.canAdmin&&S.db?`<a class="ghost adminbtn" href="#admin" title="관리자 페이지">⚙ 관리${adminAlert()?'<i class="dot-alert"></i>':""}</a>`:""}<span class="authbox"></span></span></div>
  </div>`;
}
async function importAll(data,prog){
  S.importing=true;
  try{
    let n=0;const total=data.scenarios.length+BK_COLS.reduce((a,c)=>a+(data[c]||[]).length,0)+data.sessions.reduce((a,s)=>a+1+(s.chunks||[]).length,0);
    let batch=S.db.batch(),inBatch=0;
    const put=async(path,body)=>{batch.set(S.db.doc(path),body);inBatch++;n++;if(inBatch>=400){prog(`가져오는 중… ${n}/${total}`);await retry(()=>batch.commit());batch=S.db.batch();inBatch=0;}};
    for(const sc of data.scenarios){const {id,...b}=sc;await put("scenarios/"+id,b);}
    for(const col of BK_COLS)for(const d of data[col]||[]){const {id,...b}=d;await put(col+"/"+id,b);}
    for(const se of data.sessions){
      const {id,chunks,...b}=se;await put("sessions/"+id,b);
      for(const c of chunks||[]){const {id:cid,...cb}=c;await put(`sessions/${id}/chunks/${cid}`,cb);}
    }
    if(inBatch)await retry(()=>batch.commit());
    S.impMsg=`완료! 세션 ${data.scenarios.length}개, 녹음 ${data.sessions.length}개를 가져왔어요`;
  }catch(e){S.impMsg="가져오다가 멈췄어요: "+(e.code||e.message)+" · 다시 가져오면 처음부터 덮어써요";}
  S.importing=false;render();
}
const BK_COLS=["camps","reviews","comments","secrets","fixes"];
async function exportAll(prog){
  const out={format:"trpg-log",version:2,exported:new Date().toISOString(),scenarios:[],sessions:[]};
  // 캠페인·캠프, 후기, 댓글, 비밀번호도 같이 (읽을 수 없는 건 건너뛰어요)
  for(const col of BK_COLS){try{const q=await S.db.collection(col).get();out[col]=q.docs.map(d=>({id:d.id,...d.data()}));}catch(e){}}
  const scs=await S.db.collection("scenarios").get();
  scs.docs.forEach(d=>out.scenarios.push({id:d.id,...d.data()}));
  const ss=await S.db.collection("sessions").get();
  let i=0;
  for(const d of ss.docs){
    i++;prog&&prog(`읽는 중… ${i}/${ss.docs.length}`);
    const ch=await S.db.collection(`sessions/${d.id}/chunks`).get();
    out.sessions.push({id:d.id,...d.data(),chunks:ch.docs.map(c=>({id:c.id,...c.data()}))});
  }
  return out;
}
const isAnon=p=>/^참석자\s*\d+$/.test(p.name)&&!p.ch;
function castHTML(sc){
  const g=gmKey(sc);
  // 타이만: 메인 캐릭터(맡은 사람이 있는 캐릭터)만, 캐릭터 이름을 크게
  if((sc?.sp||[]).some(p=>p.chr)){const m=gmFirst(sc.sp.filter(p=>p.chr&&p.ch),g);if(!m.length)return "";
    return `<div class="cast" data-th="${themeOf(sc)||"pa"}">${m.map(p=>`<span class="castc" style="--c:${fixC(p.c)}">${spDot(p)}<b>${esc(p.ch)}</b><span>${spName(p)}</span></span>`).join("")}</div>`;}
  const cast=gmFirst((sc?.sp||[]).filter(p=>p.k===g||!isAnon(p)&&!/&/.test(p.name)||p.ch),g);
  if(!cast.length)return "";
  return `<div class="cast" data-th="${themeOf(sc)||"pa"}">${cast.map(p=>`<span class="castc${p.k===g?" gm":""}" style="--c:${fixC(p.c)}">${p.k===g?gmTag:spDot(p)}<b>${spName(p)}</b>${p.ch?`<span>${esc(p.ch)}</span>`:""}</span>`).join("")}</div>`;
}
function daysHTML(days,gear=true){
  const exp=d=>S.db&&d.parts.length?`<button class="ghost dexp" data-exps="${esc(d.parts[0].scen)}" data-expd="${esc(d.day)}" title="이 회차 로그를 HTML 파일로 받기">⬇ HTML</button>`:"";
  const set=p=>gear&&S.canAdmin&&S.db?`<button class="pset" data-edit="${esc(p.id)}" title="시나리오·날짜·순서·녹음 링크 고치기">⚙</button>`:"";
  return days.map((d,i)=>{
    if(!d.parts.length)return `<div class="day oday nolog"><span class="oline"><span class="nth">${i+1}회차</span><span class="odate">${esc(fmtDay(d.day))}</span><span class="ocnt">녹음 없음</span></span></div>`;
    // 온라인(코코포리아) 회차는 한 로그뿐이라 '1부' 칩 없이 한 줄로, 줄 전체가 링크
    if(d.parts.length===1&&(d.parts[0].src==="ccfolia"||d.parts[0].src==="roll20")){const p=d.parts[0];
      return `<div class="day oday"><a class="oline" href="#s-${esc(p.id)}"><span class="nth">${i+1}회차</span><span class="odate">${esc(fmtDay(d.day))}</span><span class="ocnt">${p.n?p.n+"개 대사":""}</span><span class="ogo">›</span></a>${set(p)}</div>`;}
    // 녹음을 여러 조각으로 나눠 올렸어도 한 회차는 한 줄 · 대사 수는 합쳐서 · 조각 ①②는 세션 페이지에서만
    const tot=d.parts.reduce((a,p)=>a+(+p.n||0),0),one=d.parts.length===1;
    return `<div class="day oday"><a class="oline" href="#s-${esc(d.parts[0].id)}"><span class="nth">${i+1}회차</span><span class="odate">${esc(fmtDay(d.day))}</span><span class="ocnt">${tot?tot.toLocaleString()+"개 대사":""}</span>${one||!gear?'<span class="ogo">›</span>':""}</a>
    ${one||!gear?(one?set(d.parts[0]):""):`<span class="pieces">${d.parts.map((p,j)=>`<span class="partw"><a class="piece" href="#s-${esc(p.id)}" title="녹음 조각 ${j+1}${p.n?" · "+p.n+"개 대사":""}">${pieceNo(j+1)}</a>${set(p)}</span>`).join("")}</span>`}${exp(d)}</div>`;  }).join("")+(days.some(d=>d.parts.length)&&days.every(d=>!d.parts.length||d.parts.length===1&&(d.parts[0].src==="ccfolia"||d.parts[0].src==="roll20"))&&S.db?`<div class="allexp"><button class="ghost dexp all" data-exps="${esc((days.find(d=>d.parts.length)||{parts:[{}]}).parts[0].scen)}" data-expd="*" title="모든 회차를 HTML 파일 하나로 받기">⬇ 전체 HTML</button></div>`:"");
}
async function gotoScen(name,edit){
  let sc=findScen(name);
  if(!sc){
    if(!(S.db&&S.canWrite)){toast("아직 페이지가 없는 세션이에요");return;}
    sc=createScen(name,[]);await saveScen(sc);
  }
  if(edit)S.pendingEdit=sc.id;location.hash="c-"+sc.id;
}
// ---------- 자동 백업: 주인이 들어올 때 일주일에 한 번, Storage backups/에 JSON으로 · 최근 BK_KEEP개만 남겨요 ----------
const BK_DAYS=7,BK_KEEP=8;
async function bkList(){const r=await S.storage.ref("backups").listAll();return r.items.map(x=>({name:x.name,path:x.fullPath})).sort((a,b)=>b.name.localeCompare(a.name));}
async function bkRun(why){
  if(S.bkRunning||!S.canAdmin||!S.storage)return;S.bkRunning=true;
  try{
    const data=await exportAll();const json=JSON.stringify(data);
    const d=new Date(Date.now()+9*3600e3).toISOString();const name=`trpg-log-${d.slice(0,10)}_${d.slice(11,16).replace(":","")}.json`;
    await S.storage.ref("backups/"+name).put(new Blob([json],{type:"application/json"}),{contentType:"application/json"});
    await S.db.doc("scenarios/_site").set({bk:Date.now()},{merge:true});
    try{const ls=await bkList();for(const x of ls.slice(BK_KEEP))await S.storage.ref(x.path).delete().catch(()=>{});S.bk=ls.slice(0,BK_KEEP);}catch(e){}
    if(why!=="auto")toast("백업했어요");
  }catch(e){console.warn("백업 실패",e);if(why!=="auto")toast("백업하지 못했어요: "+(e.code||e.message),4000);else S.bkErr=e.code||e.message;}
  S.bkRunning=false;const el=$("#bklist");if(el){el.innerHTML=bkListHTML();bindBkList();}
}
// 주인이 들어오고 데이터가 다 불러와지면 한 번 확인
function bkAuto(){
  if(S.bkChecked||!S.canAdmin||!S.storage||!S.loaded||!S.site)return;S.bkChecked=true;
  if(Date.now()-(S.site.bk||0)>BK_DAYS*864e5)setTimeout(()=>bkRun("auto"),4000);
}
function bkListHTML(){
  const last=S.site&&S.site.bk;
  const head=`<div class="bkhead"><span>자동 백업 <b>${last?esc(fmtDay(new Date(last+9*3600e3).toISOString().slice(0,10))):"아직 없음"}</b> · 일주일마다 · 최근 ${BK_KEEP}개 보관</span>
    <button class="ghost" id="bknow"${S.bkRunning?" disabled":""}>${S.bkRunning?"백업하는 중…":"지금 백업"}</button></div>${S.bkErr?`<div class="tip" style="color:var(--bad)">지난 자동 백업 실패: ${esc(S.bkErr)} · 저장소 규칙을 새 버전으로 바꿨는지 확인해 주세요</div>`:""}`;
  if(S.bk===undefined){S.bk=null;bkList().then(l=>{S.bk=l;const el=$("#bklist");if(el){el.innerHTML=bkListHTML();bindBkList();}}).catch(e=>{S.bk=[];S.bkErr=S.bkErr||(e.code==="storage/unauthorized"?"권한 없음":"");});}
  const list=S.bk||[];
  return head+(list.length?`<div class="bkrows">${list.map(x=>`<div class="bkrow"><span>${esc(x.name.replace(/^trpg-log-|\.json$/g,"").replace("_"," ").replace(/(\d\d)(\d\d)$/,"$1:$2"))}</span><button class="lnk" data-bkget="${esc(x.path)}">받기</button></div>`).join("")}</div>`:"");
}
function bindBkList(){
  const n=$("#bknow");if(n)n.onclick=()=>{bkRun("now");const el=$("#bklist");if(el){el.innerHTML=bkListHTML();bindBkList();}};
  document.querySelectorAll("[data-bkget]").forEach(b=>b.onclick=async()=>{try{const u=await S.storage.ref(b.dataset.bkget).getDownloadURL();window.open(u,"_blank");}catch(e){toast("받지 못했어요: "+(e.code||e.message));}});
}
function bindBackup(){
  bindBkList();
  const eb=$("#exportb");if(eb)eb.onclick=async()=>{
    const pr=$("#exprog");eb.disabled=true;
    try{
      const data=await exportAll(t=>pr.textContent=t);
      const json=JSON.stringify(data);
      const name=`trpg-log-${new Date().toISOString().slice(0,10)}.json`;
      const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([json],{type:"application/json"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
      pr.textContent=`완료 (${data.sessions.length}개 녹음)`;
    }catch(e){pr.textContent="내보내지 못했어요: "+(e&&e.message||e);}
    eb.disabled=false;
  };
  const imf=$("#importf");if(imf)imf.onchange=async ev=>{
    const f=ev.target.files[0];if(!f)return;const pr=$("#exprog");
    let data;try{data=JSON.parse(await f.text());}catch(e){pr.textContent="JSON 파일을 읽지 못했어요";return;}
    if(data.format!=="trpg-log"){pr.textContent="이 사이트에서 내보낸 파일이 아니에요";return;}
    confirmBox(`세션 ${data.scenarios.length}개, 녹음 ${data.sessions.length}개를 가져올까요? 같은 녹음이 이미 있으면 덮어써요.`,"가져오기",()=>importAll(data,t=>pr.textContent=t));
  };
}
function homeSoft(){const box=document.querySelector(".hsearch"),list=$("#sesslist");if(!box||!list){render();return;}
  const t=document.createElement("div");t.innerHTML=homeHTML();const nb=t.querySelector(".hsearch"),nl=t.querySelector("#sesslist");
  box.querySelectorAll(".hq-n,.hq-drop").forEach(e=>e.remove());if(nb)nb.querySelectorAll(".hq-n,.hq-drop").forEach(e=>box.appendChild(e));
  {const a=document.querySelector(".hx-cnt"),b=t.querySelector(".hx-cnt");if(a&&b)a.textContent=b.textContent;}
  if(nl)list.replaceWith(nl);S.hqSoft=true;bindHome();S.hqSoft=false;}
// 홈 카드 두 줄: 연도·제목 줄 사이의 카드들을 키가 낮은 쪽 줄에 차례로 넣어요 (빈칸 없이 지그재그)
const HM_TWO=matchMedia("(min-width:720px)"),HM_THREE=matchMedia("(min-width:1000px)"),HM_HX2=matchMedia("(min-width:641px)");
function homeMasonry(){const L=$("#sesslist");if(!L)return;
  L.querySelectorAll(":scope>.mrow").forEach(r=>{const cs=[...r.querySelectorAll(":scope>.mcol>*")].sort((a,b)=>a._hm-b._hm);r.replaceWith(...cs);});
  // 기본: 넓으면 2줄 · 아카이브: 넓으면 3줄, 중간이면 2줄
  const n=isHX()?(HM_THREE.matches?3:HM_HX2.matches?2:1):(HM_TWO.matches?2:1);if(n<2)return;
  const kids=[...L.children];kids.forEach((k,i)=>k._hm=i);let cols=null;
  for(const k of kids){if(!k.matches(".scen,.hxc")){cols=null;continue;}
    if(!cols){const row=document.createElement("div");row.className="mrow";row.style.gridTemplateColumns=`repeat(${n},minmax(0,1fr))`;cols=[...Array(n)].map(()=>{const c=document.createElement("div");c.className="mcol";row.appendChild(c);return c;});k.before(row);}
    cols.reduce((m,c)=>c.offsetHeight<m.offsetHeight?c:m,cols[0]).appendChild(k);}
  // 이미지가 늦게 뜨면 키가 바뀌니까 한 번 더 맞춰요
  L.querySelectorAll("img:not([data-hm])").forEach(im=>{im.dataset.hm=1;if(!im.complete)im.addEventListener("load",()=>{clearTimeout(homeMasonry._t);homeMasonry._t=setTimeout(homeMasonry,80);},{once:true});});}
[HM_TWO,HM_THREE,HM_HX2].forEach(m=>m.addEventListener("change",homeMasonry));
function bindHome(){
  homeMasonry();bindPartEdit();renderAuth();if(isHX())bindHX();
  document.querySelectorAll("[data-cmore]").forEach(b=>b.onclick=()=>{const id=b.dataset.cmore;S.campMore[id]=!S.campMore[id];render();});
  bindBackup();
  async function bulkAudio(files){
    const box=$("#bulkres");
    const pairs=[],miss=[];
    files.forEach(f=>{const s=S.sessions.find(x=>normT(x.title)===normT(f.name));if(s)pairs.push([f,s]);else miss.push(f.name);});
    box.innerHTML=`${pairs.map(([f,s],i)=>`<div id="ba${i}">⏳ ${esc(f.name)} → ${esc(info(s).scen)} ${pieceNo(info(s).part)}</div>`).join("")}${miss.length?`<div style="color:var(--bad)">짝을 못 찾음: ${miss.map(esc).join(", ")} (⚙에서 하나씩 올릴 수 있어요)</div>`:""}`;
    S.importing=true;
    for(let i=0;i<pairs.length;i++){const [f,s]=pairs[i];const row=$("#ba"+i);
      try{await uploadAudio(s,f,(p,st)=>row.textContent=`⬆ ${f.name} → ${info(s).scen} ${pieceNo(info(s).part)} · ${st==="zip"?"줄이는 중 ":""}${p}%`);row.textContent=`✓ ${f.name} → ${info(s).scen} ${pieceNo(info(s).part)}`;}
      catch(e){row.textContent=`✗ ${f.name}: ${e.code||e.message}`;row.style.color="var(--bad)";}}
    S.bulkMsg=box.innerHTML;S.importing=false;render();
  }
  {const hq=$("#hq");const again=pos=>{S.hqFull=true;try{render();const n=$("#hq");if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(e){}}}finally{S.hqFull=false;}};
    // 입력칸은 그대로 두고 목록·드롭다운만 바꿔요 (한글 조합이 끊기지 않게)
    const soft=homeSoft;
    if(hq&&!S.hqSoft){
    {const ch=document.querySelector(".hq-chip");if(ch)hq.style.paddingLeft=(ch.offsetWidth+44)+"px";}
    hq.oninput=()=>{S.homeQ=hq.value;if(!hq.value.trim())S.homeQc="";S.hqOpen=!!hq.value.trim();S.hqSel=-1;S.hqMore={};soft();};
    hq.onfocus=()=>{if(S.hqFull||S.hqRender)return;if(!S.hqOpen&&hq.value.trim()){S.hqOpen=true;soft();}};
    hq.onblur=()=>{if(S.hqRender)return;setTimeout(()=>{if(S.hqOpen&&document.activeElement!==$("#hq")){S.hqOpen=false;soft();}},150);};
    hq.onkeydown=e=>{const n=(S.hqItems||[]).length;
      if(e.isComposing)return;
      if(e.key==="ArrowDown"&&S.hqOpen&&n){e.preventDefault();S.hqSel=((S.hqSel??-1)+1)%n;soft();}
      else if(e.key==="ArrowUp"&&S.hqOpen&&n){e.preventDefault();S.hqSel=((S.hqSel??0)-1+n)%n;soft();}
      else if(e.key==="Enter"){e.preventDefault();const el=S.hqOpen&&S.hqSel>=0?document.querySelector(`[data-hqi="${S.hqSel}"]`):null;if(el){el.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));return;}S.homeQc=S.homeQ;S.hqOpen=false;again(hq.selectionStart);}
      else if(e.key==="Escape"){if(S.hqOpen){S.hqOpen=false;again(hq.selectionStart);}else if(hq.value){S.homeQ="";S.homeQc="";again(0);}}
      else if(e.key==="Backspace"&&!hq.value&&S.homePerson){S.homePerson="";again(0);}};}
    document.querySelectorAll("[data-hqi]").forEach(el=>el.onmousedown=e=>{e.preventDefault();
      if(el.dataset.hqwho){S.homePerson=el.dataset.hqwho;S.homeQ="";S.homeQc="";S.hqOpen=false;S.hqSel=-1;again(0);}
      else{S.hqOpen=false;S.homeQ="";S.homeQc="";location.hash=el.getAttribute("href").slice(1);}});
    document.querySelectorAll("[data-hqmore]").forEach(b=>b.onmousedown=e=>{e.preventDefault();S.hqMore={...(S.hqMore||{}),[b.dataset.hqmore]:true};soft();});
    const wx=$("#hq-who-x");if(wx)wx.onclick=()=>{S.homePerson="";render();};}
  document.querySelectorAll("[data-scen]").forEach(a=>a.onclick=ev=>{ev.preventDefault();gotoScen(a.dataset.scen);});
  const nb=$("#nscenb");if(nb){const ni=$("#nscen");const go=()=>{const v=ni.value.trim();if(!v)return;if(scenByName(v)){gotoScen(v);return;}gotoScen(v,true);};nb.onclick=go;ni.onkeydown=ev=>{if(ev.key==="Enter")go();};}
}
// 고른 파일 읽기: 코코포리아 html · 클로바노트 txt(+녹음) · 녹음만. opt.scen/system/orig이 있으면 그 세션으로 (세션 올리기 페이지)
async function takeFiles(all,opt){
    if(!all.length)return;
    const htm=all.find(f=>/\.html?$/i.test(f.name)||f.type==="text/html");
    if(htm){const box=$("#imp");S.bulkMsg="";$("#bulkres").innerHTML="";const text=await htm.text();const cc=parseCcfolia(text)||parseRoll20(text);
      if(!cc||!cc.days.length){box.innerHTML=`<div class="notice bad">로그에서 대사를 찾지 못했어요. 코코포리아는 방 메뉴 → 로그 출력, 롤20은 게임의 Chat Archive 페이지를 저장한 html이 맞는지 확인해 주세요.</div>`;return;}
      ccForm(cc,box,opt);return;}
    const isTxt=f=>/\.txt$/i.test(f.name)||f.type==="text/plain";
    const files=all.filter(isTxt),audios=all.filter(f=>!isTxt(f));
    const box=$("#imp");S.bulkMsg="";$("#bulkres").innerHTML="";
    if(!files.length){if(audios.length)await bulkAudio(audios);return;}
    const items=[];
    for(const f of files){const r=parseClova(await f.text());if(r.blocks.length){r.fileName=f.name;items.push(r);}}
    if(!items.length){box.innerHTML=`<div class="notice bad">대사를 찾지 못했어요. 클로바노트에서 내보낸 txt가 맞는지 확인해 주세요.</div>`;return;}
    // txt와 이름이 같은 녹음 파일 짝짓기
    const audioFor=r=>audios.find(a=>normT(a.name)===normT(r.fileName))||audios.find(a=>normT(a.name)===normT(r.title));
    items.sort((a,b)=>a.title.localeCompare(b.title,"ko",{numeric:true}));
    const g=guessInfo(items[0].title,items[0].dateLine);g.scen=opt.scen||resolveScen(g.scen);
    const exists=S.sessions.some(s=>{const i=info(s);return i.scen===g.scen&&i.day===g.day&&i.part===g.part;});
    const v={...g,part:items.length===1&&!exists?g.part:(exists?nextPart(g.scen,g.day):g.part)};
    const unmatched=audios.filter(a=>!items.some(r=>audioFor(r)===a));
    box.innerHTML=`<div class="notice">${items.map(r=>`<b>${esc(r.title)}</b> · 대사 ${r.blocks.length}개 · 화자 ${new Set(r.blocks.map(b=>b.s)).size}명${audioFor(r)?` · 🎧 ${esc(audioFor(r).name)}`:audios.length?` · <span style="color:var(--faint)">녹음 없음</span>`:""}`).join("<br>")}
      ${unmatched.length?`<br><span style="color:var(--bad)">짝을 못 찾은 녹음: ${unmatched.map(a=>esc(a.name)).join(", ")} (txt와 파일 이름을 같게 해 주세요)</span>`:""}</div>
      ${infoFields(v)}
      ${items.length>1?`<div class="tip">파일 이름 순서대로 녹음 조각 ${pieceNo(v.part)}부터 차례로 붙여요.</div>`:""}
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="pri" id="igo">${S.db&&S.canWrite?"올리기":"미리보기"}</button></div><div id="iprog" class="tip" style="margin-top:6px"></div>`;
    if(opt.scen){const fs=$("#f-scen");if(fs){fs.value=opt.scen;fs.closest("label").style.display="none";}}
    $("#igo").onclick=async()=>{
      const f=readFields();
      if(!(S.db&&S.canWrite)){toast("관리자로 로그인해야 올릴 수 있어요");return;}
      let first=null;S.importing=true;
      try{for(let i=0;i<items.length;i++){
        const inf={...f,part:f.part+i};
        const sid=await importSession(items[i],inf,`(${i+1}/${items.length}) `,{system:opt.system||"",orig:opt.orig||"",camp:opt.camp||"",gaiden:!!opt.gaiden});if(!sid)return;first=first||sid;
        const au=audioFor(items[i]);
        if(au&&S.storage){const pr=$("#iprog");const sc=findScen(inf.scen);
          try{await uploadAudio({id:sid,scid:sc&&sc.id,title:items[i].title,scen:inf.scen},au,(p,st)=>setProg(pr,`(${i+1}/${items.length}) 녹음 ${st==="zip"?"줄이는":"올리는"} 중…`,p/100));}
          catch(e){toast(`${au.name} 녹음을 올리지 못했어요: ${e.code||e.message}`,5000);}}
      }}
      finally{S.importing=false;}
      location.hash="s-"+first;
    };
}
function buildSession(r,inf){
  const sp=[],map={};
  r.blocks.forEach(b=>{if(!map[b.s]){const k="k"+rid();map[b.s]=k;sp.push({k,name:b.s,c:COLORS[sp.length%COLORS.length]});}});
  const all=r.blocks.map(b=>({id:rid(),s:map[b.s],t:b.t,x:b.x}));
  const cnt={};all.forEach(b=>cnt[b.s]=(cnt[b.s]||0)+1);sp.sort((a,b)=>cnt[b.k]-cnt[a.k]);
  const chunks=[];for(let i=0;i<all.length;i+=CHUNK)chunks.push(all.slice(i,i+CHUNK));
  return {meta:{title:r.title,date:r.dateLine,created:Date.now(),n:all.length,sp,...(inf||guessInfo(r.title,r.dateLine))},chunks};
}
