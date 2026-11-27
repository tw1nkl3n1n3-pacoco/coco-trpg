// 코코 로그방 · 세션 후기·로그 댓글·이모티콘·블로그식 편집기
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- 세션 후기 ----------
async function copyText(t,ok){try{await navigator.clipboard.writeText(t);toast(ok||"복사했어요");}catch(e){prompt("이 주소를 복사해 주세요",t);}}
// reviews/{rid}: 누구나 읽기 · 시나리오를 연 멤버가 쓰고, 쓴 브라우저(uid)와 주인만 고쳐요
S.revs={};S.revForm=null;S.revPage=null;
function watchRevs(scid){
  if(!S.db||S.revs[scid]!==undefined)return;
  S.revs[scid]=null;
  S.db.collection("reviews").where("scid","==",scid).onSnapshot(snap=>{
    S.revs[scid]=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.created||0)-(b.created||0));
    // 후기를 쓰는 중이면 다시 그리지 않아요 (쓰던 글이 지워지지 않게)
    if((S.cid===scid||S.gid===scid)&&!S.scEdit&&!S.campEdit&&!(S.revForm&&S.revForm.scid===scid))render();
  },()=>{S.revs[scid]=[];});
}
const revUrl=rid=>location.href.split("#")[0].replace(/\?.*$/,"")+"#r-"+rid;
function revWho(sc,r){const p=(sc?.sp||[]).find(x=>x.k===r.k);return {p,name:p?pcSplit(p.name).name:r.name||"?",ch:p?p.ch:r.ch||"",gm:!!p&&p.k===gmKey(sc)};}
// 내가 쓴 후기 (쓴 브라우저) · 주인은 모두
function revMine(r){return S.canAdmin||(!!r.uid&&r.uid===myUid());}
function revCardHTML(sc,r,inPage){
  const w=revWho(sc,r);
  return `<div class="rvcard">${inPage?"":`<button class="x" data-rvclose title="닫기">×</button>`}<div class="rv-k">${sc?.isCampSc?"CAMP REVIEW":"SESSION REVIEW"}</div>
    <div class="rv-t">${esc(sc?.name||"")}</div><div class="rv-s">${(sc?.isCampSc?[sc.place,sc.when]:[sc?.orig,sc?.system?sysLabel(sc.system):""]).filter(Boolean).map(esc).join(" · ")}</div>
    <div class="rv-body${r.html?" rich":""}">${r.html?richView(r.html):emoize(xEm(r.text||""))}</div>
    <div class="rv-sign">— ${esc(w.gm?gmWord(sc).replace(/ /g,""):"")}${w.gm?" ":""}${esc(w.name)}${w.ch&&!w.gm?` (${esc(w.ch)})`:""}</div>
    <div class="rv-foot"><span>${esc(site().title)}</span>${inPage?`<a href="#${sc?.isCampSc?"g":"c"}-${esc(r.scid)}" class="rv-go">${sc?.isCampSc?"캠프":"세션"} 페이지 보기 ›</a>`:`<button class="pri" data-rvcopy="${esc(r.id)}">🔗 이 후기 링크 복사</button>`}</div></div>`;
}
function revSectionHTML(sc){
  watchRevs(sc.id);
  const list=S.revs[sc.id]||[];
  const f=S.revForm&&S.revForm.scid===sc.id?S.revForm:null;
  const cm=!!sc.isCampSc,has=new Set(list.map(r=>r.k)),mine=list.some(r=>r.uid&&r.uid===myUid()||r.k===myK(sc.id));
  const cast=gmFirst(sc.sp.filter(p=>p.k===gmKey(sc)||!isAnon(p)&&!/&/.test(p.name)||p.ch),gmKey(sc)).filter(p=>!cm||!has.has(p.k)||(f&&f.k===p.k));
  const rows=list.map(r=>{const w=revWho(sc,r);
    return `<div class="rvr${cm?" noav":""}">${cm?"":`<span class="av${w.gm?" gm":""}" style="--c:${fixC(w.p?.c||"#888")}">${w.p?avHTML(w.p,w.gm):`<span class="ini">${esc((w.ch||w.name).slice(0,1))}</span>`}</span>`}
      <span class="nm"><b>${esc(w.name)}</b>${cm?(w.p?.roles?`<small>${esc(w.p.roles)}</small>`:""):w.ch||w.gm?`<small>${esc(w.gm?gmWord(sc):w.ch)}</small>`:""}</span>
      ${r.url?`<a class="ext" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">외부 후기 ↗</a>${r.lpw?`<button class="ghost lpw" data-rvlpw="${esc(r.id)}" title="눌러서 비밀번호 복사">🔑 ${esc(r.lpw)}</button>`:""}`:`<button class="go" data-rvopen="${esc(r.id)}">후기 보기</button><button class="cp ghost" data-rvcopy="${esc(r.id)}" title="이 후기 링크 복사">🔗</button>`}
      ${revMine(r)?`<button class="ghost cp" data-rvedit="${esc(r.id)}" title="고치기">✎</button>`:""}${revMine(r)?`<button class="ghost cp" data-rvdel="${esc(r.id)}" title="지우기">🗑</button>`:""}</div>`;}).join("");
  const form=f?`<div class="rvform">
      ${f.id||!S.canAdmin?`<div class="tip">${esc(revWho(sc,f).name)} 님의 후기${f.id?"를 고쳐요":"예요"}</div>`:`<label>누구의 후기예요?<select id="rv-k">${cast.map(p=>`<option value="${esc(p.k)}"${f.k===p.k?" selected":""}>${esc(pcSplit(p.name).name)}${p.k===gmKey(sc)||p.ch?` · ${esc(p.k===gmKey(sc)?gmWord(sc):p.ch)}`:""}</option>`).join("")}</select></label>`}
      <div class="tabs"><button type="button" data-rvmode="text" class="${f.mode==="text"?"on":""}">여기에 쓰기</button><button type="button" data-rvmode="url" class="${f.mode==="url"?"on":""}">링크 붙이기</button></div>
      ${f.mode==="text"?wedHTML("rv-wed",f.html!=null?f.html:textToRich(f.text||"")):`<input type="url" id="rv-url" value="${esc(f.url||"")}" placeholder="https:// (블로그·X·포스타입 등에 쓴 후기 주소)"><input type="text" id="rv-lpw" value="${esc(f.lpw||"")}" placeholder="글 비밀번호 (걸려 있으면 · 선택)" autocomplete="off" style="margin-top:6px">`}
      <div class="rv-btns" style="margin-top:0"><button class="pri" id="rv-save">저장</button><button class="ghost" id="rv-cancel">취소</button><span id="rv-msg" class="tip"></span></div></div>`:"";
  if(!list.length&&!f&&(!S.db||!canTalk(sc.id)))return "";
  return `<div class="sc-sec rvsec"><h4 data-en="REVIEWS">${cm?"캠프 후기":"세션 후기"}</h4>${rows?`<div class="rvlist">${rows}</div>`:""}${form}
    ${f||!canTalk(sc.id)||cm&&(S.canAdmin?!cast.length:mine)?"":`<div class="rv-btns"><button class="${list.length?"":"pri"}" id="rv-add">＋ 후기 남기기</button></div>`}</div>`;
}
function revPopup(sc,r){
  const ov=document.createElement("div");ov.className="rvov";ov.innerHTML=revCardHTML(sc,r,false);document.body.appendChild(ov);
  const close=()=>ov.remove();ov.onclick=e=>{if(e.target===ov||e.target.closest("[data-rvclose]"))close();};
  ov.querySelector("[data-rvcopy]").onclick=()=>copyText(revUrl(r.id),"후기 링크를 복사했어요");
  document.addEventListener("keydown",function k(e){if(e.key==="Escape"){close();document.removeEventListener("keydown",k);}});
}
function bindRevs(sc){
  const list=S.revs[sc.id]||[],byId=id=>list.find(x=>x.id===id);
  document.querySelectorAll("[data-rvopen]").forEach(b=>b.onclick=()=>revPopup(sc,byId(b.dataset.rvopen)));
  document.querySelectorAll(".rvsec [data-rvcopy]").forEach(b=>b.onclick=()=>copyText(revUrl(b.dataset.rvcopy),"후기 링크를 복사했어요"));
  const add=$("#rv-add");if(add)add.onclick=()=>{const m=meSp(sc.id),taken=new Set(sc.isCampSc?list.map(r=>r.k):[]);S.revForm={scid:sc.id,mode:"text",k:(m&&!taken.has(m.k)?m:sc.sp.find(p=>p.k!==gmKey(sc)&&!taken.has(p.k))||sc.sp[0]||{}).k};render();};
  document.querySelectorAll("[data-rvedit]").forEach(b=>b.onclick=async()=>{const r=byId(b.dataset.rvedit);if(!r)return;
    S.revForm={scid:sc.id,id:r.id,k:r.k,mode:r.url?"url":"text",text:r.text||"",html:r.html!=null?r.html:null,url:r.url||"",lpw:r.lpw||""};render();});
  document.querySelectorAll("[data-rvlpw]").forEach(b=>b.onclick=()=>{const r=byId(b.dataset.rvlpw);r&&copyText(r.lpw,"비밀번호를 복사했어요");});
  document.querySelectorAll("[data-rvdel]").forEach(b=>b.onclick=async()=>{const r=byId(b.dataset.rvdel);if(!r||!confirm(`${revWho(sc,r).name} 님의 후기를 지울까요? 되돌릴 수 없어요.`))return;
    try{await S.db.doc("reviews/"+r.id).delete();}catch(e){writeFail(e);}});
  const f=S.revForm;if(!f||f.scid!==sc.id)return;
  const pull=()=>{const k=$("#rv-k");if(k)f.k=k.value;const w=$("#rv-wed");if(w)f.html=wedValue(w);const u=$("#rv-url");if(u)f.url=u.value.trim();const lp=$("#rv-lpw");if(lp)f.lpw=lp.value.trim();};
  {const w=$("#rv-wed");if(w)bindWed(w,sc.id);}
  document.querySelectorAll("[data-rvmode]").forEach(b=>b.onclick=()=>{pull();f.mode=b.dataset.rvmode;render();});
  $("#rv-cancel").onclick=()=>{S.revForm=null;render();};
  $("#rv-save").onclick=async()=>{pull();const msg=$("#rv-msg");
    const del=firebase.firestore.FieldValue.delete();
    const body=f.mode==="text"?{html:f.html||"",text:del,url:del,lpw:del}:{url:f.url,lpw:f.lpw?f.lpw.slice(0,60):del,text:del,html:del};
    if(f.mode==="text"&&!(f.html||"").replace(/<br>|<\/?(div|p)>|\s|&nbsp;/g,"")){msg.textContent="후기를 적어 주세요";return;}
    if(f.mode==="url"&&!/^https?:\/\/\S+\.\S+/.test(f.url||"")){msg.textContent="https://로 시작하는 주소를 넣어 주세요";return;}
    const p=sc.sp.find(x=>x.k===f.k)||{};
    try{
      if(f.id){await S.db.doc("reviews/"+f.id).update({...body,updated:Date.now()});}
      else{if(!S.authUser)await S.auth.signInAnonymously();
        const uid=S.auth.currentUser.uid,rid="r"+Date.now().toString(36)+rid4();
        const data={scid:sc.id,k:f.k,name:pcSplit(p.name||"").name,ch:p.ch||"",uid,created:Date.now(),updated:Date.now()};
        if(f.mode==="text")data.html=body.html;else{data.url=f.url;if(f.lpw)data.lpw=f.lpw.slice(0,60);}
        await S.db.doc("reviews/"+rid).set(data);
      }
      S.revForm=null;toast("후기를 저장했어요");render();
    }catch(e){msg.textContent="저장하지 못했어요: "+(e.code==="permission-denied"?"권한이 없어요":e.code||e.message);}
  };
}
const rid4=()=>Math.random().toString(36).slice(2,6);
// 후기 하나만 보는 페이지 (#r-후기id) — 비밀번호 없이 열려요
async function openRevPage(rid){
  S.revPage={rid,loading:true};render();
  try{const d=await S.db.doc("reviews/"+rid).get();if(!d.exists){S.revPage={rid,err:"후기를 찾을 수 없어요."};render();return;}
    const r={id:d.id,...d.data()};const s=await S.db.doc("scenarios/"+r.scid).get();
    let sc=s.exists?{id:s.id,...s.data()}:null;
    if(!sc){const g=await S.db.doc("camps/"+r.scid).get();if(g.exists){const c={id:g.id,...g.data()};sc={id:c.id,name:c.name,sp:[],isCampSc:true,place:c.place||"",when:campWhen(c)};}}
    S.revPage={rid,r,sc};}
  catch(e){S.revPage={rid,err:"후기를 불러오지 못했어요."};}
  render();
}
function revPageHTML(){
  const P=S.revPage||{};
  if(P.loading)return `<div class="rvpage">${loaderHTML()}</div>`;
  if(P.err)return `<div class="rvpage"><div class="notice bad">${esc(P.err)}</div></div>`;
  return `<div class="rvpage">${revCardHTML(P.sc,P.r,true)}</div>`;
}
function attachToScen(meta,chunks){
  let sc=findScen(meta.scen);if(sc)meta.scen=sc.name;else sc=createScen(meta.scen,[]);
  const remap={};
  meta.sp.forEach(e=>{const same=sc.sp.find(x=>x.name===e.name);if(same)remap[e.k]=same.k;else sc.sp.push(e);});
  // 대사 화자(s)뿐 아니라 주사위 굴린 사람(w)도 같이 바꿔요
  chunks.forEach(c=>c.forEach(b=>{if(remap[b.s])b.s=remap[b.s];if(b.w&&remap[b.w])b.w=remap[b.w];}));
  meta.sp=[];return sc;
}
async function importSession(r,inf,pre="",cfg={}){return importBuilt(buildSession(r,inf),pre,cfg);}
async function importBuilt(built,pre="",cfg={}){
  const {meta,chunks}=built;
  const sc=attachToScen(meta,chunks);meta.scid=sc.id;
  // 타이만이면 GM이 맡은 캐릭터 화자가 GM
  const gmK=built.gmName?(sc.sp.find(x=>x.name===built.gmName&&(built.gmCh?x.ch===built.gmCh:!x.ch))||{}).k:null;
  const sid="s"+Date.now().toString(36)+rid().slice(0,3);
  const prog=$("#iprog"),btn=$("#igo");btn.disabled=true;
  try{
    setProg(prog,pre+"세션 만드는 중…",0.02);
    await mutateScen(sc.id,L=>{if(!L.name)Object.assign(L,clone(sc));sc.sp.forEach(e=>{if(!L.sp.some(x=>x.k===e.k))L.sp.push(clone(e));});
      if(gmK&&!(L.gm&&L.sp.some(x=>x.k===L.gm)))L.gm=gmK;if(cfg.system&&!L.system)L.system=cfg.system;if(cfg.orig&&!L.orig)L.orig=cfg.orig;if(cfg.camp&&!L.camp){L.camp=cfg.camp;if(cfg.gaiden)L.gaiden=true;}});
    if(cfg.camp){const c=campById(cfg.camp);if(c&&!(c.eps||[]).includes(sc.id)){const eps=[...campEps(c).map(e=>e.id).filter(x=>x!==sc.id),sc.id];await S.db.doc("camps/"+cfg.camp).update({eps});
      if(!cfg.gaiden){c.eps=eps;const ns=scenById(sc.id);if(ns)ns.camp=cfg.camp;await closePrevEps(cfg.camp,sc.id);}}}
    await retry(()=>S.db.doc("sessions/"+sid).set(meta));
    for(let i=0;i<chunks.length;i++){
      setProg(prog,`${pre}대사 올리는 중… ${i+1}/${chunks.length}`,(i+1)/chunks.length);
      await retry(()=>S.db.doc(`sessions/${sid}/chunks/${ckey(i)}`).set({i,b:chunks[i]}));
      await sleep(150);
    }
    setProg(prog,"완료!",1);return sid;
  }catch(e){
    btn.disabled=false;
    prog.innerHTML=`<span style="color:var(--bad)">${e&&e.code==="invalid_argument"?"이 링크에서는 올릴 권한이 없어요. 페이지 주인에게 편집 권한(Contributor 이상)을 받아 주세요.":"올리다가 멈췄어요. 다시 눌러 주세요."}</span>`;
    return null;
  }
}
async function deleteSession(sid){
  try{
    const snap=await S.db.collection(`sessions/${sid}/chunks`).get();
    for(const d of snap.docs){await retry(()=>S.db.doc(`sessions/${sid}/chunks/${d.id}`).delete());await sleep(100);}
    const ss=S.sessions.find(x=>x.id===sid);if(ss&&ss.audioPath&&S.storage){try{await S.storage.ref(ss.audioPath).delete();}catch(e){}}
    await retry(()=>S.db.doc("sessions/"+sid).delete());toast("지웠어요");
  }catch(e){toast("지우지 못했어요");}
}
// 글 수정 칸에서 "->"는 "→", "..."는 "…"로 바로 바꿔 줘요 (커서 위치는 그대로)
const AUTO_REP=[[/->/g,"→",1],[/\.\.\./g,"…",2]];
document.addEventListener("input",ev=>{
  const t=ev.target;if(!t||!t.matches||!t.matches("textarea,input[type=text]"))return;
  if(!t.closest(".row,.dform,.pop,.sc-page"))return;
  if(!AUTO_REP.some(([re])=>{re.lastIndex=0;return re.test(t.value);}))return;
  let pos=t.selectionStart,v=t.value;
  AUTO_REP.forEach(([re,to,cut])=>{re.lastIndex=0;const n=(v.slice(0,pos).match(re)||[]).length;v=v.replace(re,to);pos-=n*cut;});
  t.value=v;try{t.setSelectionRange(pos,pos);}catch(e){}
});

// ---------- 로그 댓글 ----------
// comments/{cid}: {scid, sid, bid(대사 id), k(누구), name, uid, text, created, updated}
// 한 대사에 달린 댓글은 한 줄기(첫 댓글 + 답글)로 보여요. 컴퓨터(넓은 화면)는 로그 오른쪽에 늘 보이고, 좁은 화면은 💬 숫자 → 아래 시트.
S.cms=[];S.cmSid=null;S.cmOpen=null;S.cmEdit=null;S.cmDraft={};
function cmScid(){return (S.meta&&S.meta.scid)||curScen()?.id||null;}
function watchCms(){
  const sid=S.sid,scid=cmScid();
  if(!S.db||S.local||!sid||!scid||S.cmSid===sid||!isOpen(scid))return;
  S.cmSid=sid;S.cms=[];
  const u=S.db.collection("comments").where("scid","==",scid).where("sid","==",sid).onSnapshot(snap=>{
    S.cms=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.created||0)-(b.created||0));
    cmRefresh();
  },()=>{S.cms=[];});
  S.unsub.push(()=>{u();S.cmSid=null;S.cms=[];S.cmOpen=null;S.cmEdit=null;});
}
const cmOf=bid=>S.cms.filter(c=>c.bid===bid);
function cmWide(){return innerWidth>=1240;}
function cmWho(c){const sc=scenById(c.scid)||curScen();const p=(sc?.sp||[]).find(x=>x.k===c.k);const gm=!!p&&!!sc&&p.k===gmKey(sc);return {p,gm,name:p?pcSplit(p.name).name:c.name||"?"};}
function cmTime(t){const d=new Date(t||0),n=new Date();const hm=`${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;return d.toDateString()===n.toDateString()?hm:`${d.getMonth()+1}/${d.getDate()} ${hm}`;}
function cmMine(c){return S.canAdmin||(!!c.uid&&c.uid===myUid());}
function cmOneHTML(c,full){const w=cmWho(c),gm=w.gm;
  return `<div class="cmh"><span class="av${gm?" gm":""}" style="--c:${fixC(w.p?.c||"#888")}">${w.p?avHTML(w.p,gm):`<span class="ini">${esc(w.name.slice(0,1))}</span>`}</span><span class="n">${esc(w.name)}</span><span class="tm">${cmTime(c.created)}${c.updated&&c.updated-c.created>60000?" · 수정됨":""}</span>
    ${full&&cmMine(c)&&S.cmEdit!==c.id?`<span class="cmx"><button data-cmed="${esc(c.id)}" title="고치기">✎</button><button data-cmdel="${esc(c.id)}" title="지우기">🗑</button></span>`:""}</div>
    ${full&&S.cmEdit===c.id?`<textarea class="cmta" data-cmedta="${esc(c.id)}">${esc(c.text)}</textarea><div class="cmbtn"><button class="ghost" data-cmedx>취소</button><button class="pri" data-cmeds="${esc(c.id)}">저장</button></div>`:`<div class="cmt">${emoize(esc(c.text).replace(/\n/g,"<br>"))}</div>`}`;}
function cmThreadHTML(bid,open){
  const list=cmOf(bid),scid=cmScid(),me=meSp(scid),talk=canTalk(scid)&&!!me;
  if(!open)return list.length?`${cmOneHTML(list[0],false)}${list.length>1?`<div class="cmmore">답글 ${list.length-1}개</div>`:""}`:"";
  return list.map((c,i)=>`<div class="cmone${i?" rp":""}">${cmOneHTML(c,true)}</div>`).join("")+
    (talk?`<textarea class="cmta" id="cmnew" placeholder="${list.length?"답글 달기":"댓글 달기"}${me?` (나: ${esc(pcSplit(me.name).name)})`:""}">${esc(S.cmDraft[bid]||"")}</textarea><div class="cmbtn"><button class="ghost" data-cmclose>${list.length?"닫기":"취소"}</button><button class="pri" data-cmsend="${esc(bid)}">등록</button></div>`
      :`<div class="cmro">${isOpen(scid)&&!isExt(scid)?`<button class="lnk" data-cmme>내가 누구인지 고르면</button> 댓글을 달 수 있어요`:"외부인은 읽기만 할 수 있어요"}</div><div class="cmbtn"><button class="ghost" data-cmclose>닫기</button></div>`);}
// 넓은 화면: 로그 오른쪽 칸에 대사 높이에 맞춰 카드 놓기
function cmLayout(){
  const col=$("#cmcol"),box=$(".logbox");if(!col||!box)return;
  const wide=cmWide()&&!!cmScid()&&isOpen(cmScid());document.body.classList.toggle("cmwide",wide);
  if(!wide){col.innerHTML="";return;}
  if(col.contains(document.activeElement)&&document.activeElement.matches("textarea"))return; // 쓰는 중이면 그대로
  const bt=box.getBoundingClientRect().top;
  const bids=[...new Set(S.cms.map(c=>c.bid))];if(S.cmOpen&&!bids.includes(S.cmOpen))bids.push(S.cmOpen);
  const items=[];
  bids.forEach(bid=>{const r=document.querySelector(`#log .row[data-id="${CSS.escape(bid)}"]`);if(!r)return;items.push({bid,want:r.getBoundingClientRect().top-bt,open:bid===S.cmOpen});});
  items.sort((a,b)=>a.want-b.want);
  col.innerHTML=items.map(it=>`<div class="cmc${it.open?" on":""}" data-cmbid="${esc(it.bid)}">${cmThreadHTML(it.bid,it.open)}</div>`).join("");
  const cards=[...col.children];cards.forEach((c,i)=>{items[i].h=c.offsetHeight;});
  // 고른 카드는 제 대사 높이에 딱 맞추고, 나머지는 겹치지 않게 위아래로 비켜요
  let ai=items.findIndex(x=>x.open);if(ai<0)ai=0;
  if(items.length){items[ai].top=Math.max(0,items[ai].want);
    for(let i=ai-1;i>=0;i--)items[i].top=Math.min(items[i].want,items[i+1].top-items[i].h-8);
    for(let i=ai+1;i<items.length;i++)items[i].top=Math.max(items[i].want,items[i-1].top+items[i-1].h+8);
    let sh=Math.min(0,...items.map(x=>x.top));if(sh<0)items.forEach(x=>x.top-=sh);}
  cards.forEach((c,i)=>c.style.top=items[i].top+"px");
  col.style.height=items.length?Math.max(...items.map(x=>x.top+x.h))+"px":"0";
  cmBind(col);
}
function cmSheet(){
  document.querySelectorAll(".cmsheet-ov").forEach(e=>e.remove());
  if(!S.cmOpen||cmWide())return;
  const e=S.byId.get(S.cmOpen),ov=document.createElement("div");ov.className="cmsheet-ov";
  const quote=e?(e.b.s===DICE?(e.b.x||"🎲"):e.b.x||"").split("\n")[0].slice(0,80):"";
  ov.innerHTML=`<div class="cmsheet"><div class="grab"></div>${quote?`<div class="cmq">${esc(quote)}</div>`:""}<div class="cmsb">${cmThreadHTML(S.cmOpen,true)}</div></div>`;
  document.body.appendChild(ov);
  ov.onclick=ev=>{if(ev.target===ov){S.cmOpen=null;ov.remove();renderCmMarks();}};
  cmBind(ov);
}
// 좁은 화면에서 쓰는 중에는 시트를 다시 그리지 않아요
function cmRefresh(){
  document.body.classList.toggle("cmwide",cmWide()&&!!S.sid&&!!cmScid()&&isOpen(cmScid()));
  renderCmMarks();
  if(cmWide())cmLayout();
  else{const ov=document.querySelector(".cmsheet-ov");if(ov&&ov.contains(document.activeElement)&&document.activeElement.matches("textarea"))return;if(S.cmOpen)cmSheet();}
}
// 대사 줄의 표시(형광펜 · 💬 숫자)만 다시
function renderCmMarks(){
  const n={};S.cms.forEach(c=>n[c.bid]=(n[c.bid]||0)+1);
  document.querySelectorAll("#log .row[data-id]").forEach(r=>{const k=n[r.dataset.id]||0;r.classList.toggle("hascm",!!k);r.classList.toggle("cmon",r.dataset.id===S.cmOpen);
    let ch=r.querySelector(".cmchip");if(k){if(!ch){ch=document.createElement("button");ch.className="cmchip";ch.dataset.act="cm";r.querySelector(".body")?.appendChild(ch);}ch.textContent="💬 "+k;}else if(ch)ch.remove();});
}
function cmOpenAt(bid){
  S.cmOpen=bid;S.cmEdit=null;renderCmMarks();
  if(cmWide()){cmLayout();setTimeout(()=>{const t=$("#cmcol .cmc.on textarea");t&&!cmOf(bid).length&&t.focus();},0);}else{cmSheet();}
}
function cmClose(){S.cmOpen=null;S.cmEdit=null;renderCmMarks();if(cmWide())cmLayout();else cmSheet();}
function cmBind(root){
  root.querySelectorAll(".cmc:not(.on)").forEach(c=>c.onclick=()=>cmOpenAt(c.dataset.cmbid));
  root.querySelectorAll("[data-cmclose]").forEach(b=>b.onclick=ev=>{ev.stopPropagation();cmClose();});
  root.querySelectorAll("[data-cmme]").forEach(b=>b.onclick=()=>{const sc=scenById(cmScid());sc&&mePicker(sc);});
  const ta=root.querySelector("#cmnew");if(ta)ta.oninput=()=>{S.cmDraft[S.cmOpen]=ta.value;};
  root.querySelectorAll("[data-cmsend]").forEach(b=>b.onclick=async()=>{const bid=b.dataset.cmsend,t=root.querySelector("#cmnew"),text=(t?.value||"").trim();if(!text)return;
    const scid=cmScid(),me=meSp(scid);
    if(!me){toast("먼저 내가 누구인지 골라 주세요");const sc=scenById(scid);sc&&mePicker(sc);return;}
    b.disabled=true;
    try{if(!S.authUser)await S.auth.signInAnonymously();
      await S.db.collection("comments").add({scid,sid:S.sid,bid,k:me.k,name:pcSplit(me.name||"").name,uid:myUid(),text:text.slice(0,2000),created:Date.now(),updated:Date.now()});
      delete S.cmDraft[bid];t.value="";t.blur();}
    catch(e){b.disabled=false;toast("댓글을 달지 못했어요"+(e.code==="permission-denied"?" (권한이 없어요)":""));}});
  root.querySelectorAll("[data-cmed]").forEach(b=>b.onclick=()=>{S.cmEdit=b.dataset.cmed;cmRefreshForce();});
  root.querySelectorAll("[data-cmedx]").forEach(b=>b.onclick=()=>{S.cmEdit=null;cmRefreshForce();});
  root.querySelectorAll("[data-cmeds]").forEach(b=>b.onclick=async()=>{const id=b.dataset.cmeds,t=root.querySelector(`[data-cmedta="${CSS.escape(id)}"]`),text=(t?.value||"").trim();if(!text)return;
    try{await S.db.doc("comments/"+id).update({text:text.slice(0,2000),updated:Date.now()});S.cmEdit=null;t.blur();cmRefreshForce();}catch(e){toast("고치지 못했어요");}});
  root.querySelectorAll("[data-cmdel]").forEach(b=>b.onclick=async()=>{if(!confirm("이 댓글을 지울까요?"))return;
    try{await S.db.doc("comments/"+b.dataset.cmdel).delete();}catch(e){toast("지우지 못했어요");}});
}
function cmRefreshForce(){const a=document.activeElement;a&&a.blur&&a.matches("textarea")&&a.blur();cmRefresh();}
let _cmRz;addEventListener("resize",()=>{clearTimeout(_cmRz);_cmRz=setTimeout(()=>{if(S.sid){cmRefresh();if(S.cmOpen&&cmWide())document.querySelectorAll(".cmsheet-ov").forEach(e=>e.remove());}},150);});

// ---------- 이모티콘 (사이트 공용 :이름:) · 블로그식 글쓰기 ----------
// scenarios/_site.emo = [{n:"하하", u:"이미지 주소"}] — 주인만 등록, 어디서든 :하하: 로 써요
function emoMap(){const m={};(site().emo||[]).forEach(e=>{if(e&&e.n&&e.u)m[e.n]=e.u;});return m;}
function emoImg(n,u){return `<img class="emo" src="${esc(u)}" alt=":${esc(n)}:" title=":${esc(n)}:" data-emo="${esc(n)}" draggable="false">`;}
// 이미 안전하게 만든 HTML 안의 글자 부분에서만 :이름: 을 그림으로
function emoize(html){const m=emoMap();if(!Object.keys(m).length)return html;
  return html.replace(/(<[^>]*>)|:([^:\s<>"'&]{1,20}):/g,(all,tag,n)=>tag?tag:(m[n]?emoImg(n,m[n]):all));}
// 후기 HTML 정리: 허용한 서식만 남겨요 (다른 사람 글에 이상한 코드가 섞이지 않게)
const RICH_TAGS={B:"b",STRONG:"b",I:"i",EM:"i",U:"u",S:"s",STRIKE:"s",DEL:"s",BR:"br",P:"p",DIV:"div",H1:"h3",H2:"h3",H3:"h3",H4:"h3",BLOCKQUOTE:"blockquote",HR:"hr",SPAN:"span",FONT:"span",A:"a",IMG:"img",UL:"ul",OL:"ol",LI:"li"};
const IMG_OK=u=>/^https:\/\/firebasestorage\.googleapis\.com\//.test(u)||/^https:\/\/[a-z0-9.-]+\.firebasestorage\.app\//.test(u);
function cleanHTML(html){
  const doc=new DOMParser().parseFromString(`<div>${html||""}</div>`,"text/html");
  const out=document.createElement("div");
  const color=v=>{v=String(v||"").trim();return /^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|[a-z]{3,20})$/i.test(v)?v:"";};
  const walk=(src,dst)=>{src.childNodes.forEach(n=>{
    if(n.nodeType===3){const v=n.nodeValue.replace(/\u200b/g,"");if(v)dst.appendChild(document.createTextNode(v));return;}
    if(n.nodeType!==1)return;
    const t=RICH_TAGS[n.tagName];
    if(!t){if(!/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|svg|SVG|MATH)$/.test(n.tagName))walk(n,dst);return;}
    if(t==="img"){
      if(n.dataset&&n.dataset.emo){dst.appendChild(document.createTextNode(`:${n.dataset.emo}:`));return;}
      const src=n.getAttribute("src")||"";if(!IMG_OK(src))return;
      const im=document.createElement("img");im.src=src;im.className="pic";im.alt="";dst.appendChild(im);return;}
    const el=document.createElement(t);
    if(t==="a"){const h=n.getAttribute("href")||"";if(!/^https?:\/\//i.test(h)){walk(n,dst);return;}el.href=h;el.target="_blank";el.rel="noopener noreferrer";}
    if(t==="span"){const c=color(n.style&&n.style.color||n.getAttribute("color"));if(c)el.style.color=c;}
    if(t==="p"||t==="div"||t==="h3"){const a=n.style&&n.style.textAlign||n.getAttribute("align")||"";if(/^(center|right)$/.test(a))el.style.textAlign=a;}
    if(t==="span"&&!el.getAttribute("style")){walk(n,dst);return;}
    walk(n,el);dst.appendChild(el);});};
  walk(doc.body.firstChild,out);
  return out.innerHTML.replace(/(<br>\s*){3,}/g,"<br><br>").replace(/^(\s|<br>)+|(\s|<br>)+$/g,"");
}
const richView=html=>emoize(cleanHTML(html));
const textToRich=t=>xEm(t||"");
// 블로그식 편집기
const WED_COLORS=["#e0263d","#e07b00","#12a35a","#2563eb","#7a4a9e","#888888"];
function wedHTML(id,html){
  return `<div class="wed" id="${id}"><div class="wtb">
    <button type="button" data-w="bold" title="굵게"><b>B</b></button><button type="button" data-w="italic" title="기울임"><i>I</i></button><button type="button" data-w="underline" title="밑줄"><u>U</u></button><button type="button" data-w="strikeThrough" title="취소선"><s>S</s></button>
    <span class="sep"></span><button type="button" data-w="color" title="글자색"><span class="cdot"></span></button><button type="button" data-w="h3" title="소제목" style="font-weight:700">H</button><button type="button" data-w="quote" title="인용">❝</button><button type="button" data-w="hr" title="구분선">―</button><button type="button" data-w="center" title="가운데 정렬">☰</button>
    <span class="sep"></span><button type="button" data-w="link" title="링크">🔗</button><button type="button" data-w="img" title="사진 넣기">🖼</button><button type="button" class="em" data-w="emo" title="이모티콘">★</button>
    <input type="file" accept="image/*" class="wfile" style="display:none"></div>
    <div class="wbody" contenteditable="true" data-ph="후기를 적어 주세요. 저장하면 이 후기만 따로 볼 수 있는 링크가 생겨요.">${emoize(html||"")}</div></div>`;
}
function wedValue(root){return cleanHTML(root.querySelector(".wbody").innerHTML);}
async function uploadPic(file,scid){
  if(!S.storage)throw new Error("저장소를 쓸 수 없어요");
  if(!S.authUser)await S.auth.signInAnonymously();
  const img=await new Promise((ok,no)=>{const i=new Image(),u=URL.createObjectURL(file);i.onload=()=>{ok(i);};i.onerror=no;i.src=u;});
  const r=Math.min(1,1200/img.width),w=Math.round(img.width*r),h=Math.round(img.height*r);
  const c=document.createElement("canvas");c.width=w;c.height=h;const cg=c.getContext("2d");cg.fillStyle="#fff";cg.fillRect(0,0,w,h);cg.drawImage(img,0,0,w,h);URL.revokeObjectURL(img.src);
  const blob=await new Promise(ok=>c.toBlob(ok,"image/jpeg",.86));
  const ref=S.storage.ref(`img/${scid}/${myUid()}/${Date.now().toString(36)}${rid4()}.jpg`);
  await ref.put(blob,{contentType:"image/jpeg",cacheControl:"public,max-age=31536000"});
  return await ref.getDownloadURL();
}
function emoPop(anchor,onPick){
  document.querySelectorAll(".emopop").forEach(e=>e.remove());
  const list=site().emo||[];const p=document.createElement("div");p.className="emopop";
  p.innerHTML=`<div class="tt">이모티콘<span>:이름: 으로도 써져요</span></div>${list.length?`<div class="g">${list.map(e=>`<button type="button" data-n="${esc(e.n)}"><img src="${esc(e.u)}" alt=""><span>${esc(e.n)}</span></button>`).join("")}</div>`:`<div class="tip" style="padding:6px 2px">아직 등록된 이모티콘이 없어요.${S.canAdmin?" 관리 페이지에서 올릴 수 있어요.":""}</div>`}`;
  anchor.appendChild(p);
  p.onmousedown=e=>e.preventDefault();
  p.onclick=e=>{const b=e.target.closest("[data-n]");if(b){onPick(b.dataset.n);p.remove();}};
  setTimeout(()=>document.addEventListener("mousedown",function f(e){if(!p.contains(e.target)){p.remove();document.removeEventListener("mousedown",f);}}),0);
}
function bindWed(root,scid){
  const body=root.querySelector(".wbody"),file=root.querySelector(".wfile");
  let saved=null;const keep=()=>{const s=getSelection();if(s.rangeCount&&body.contains(s.anchorNode))saved=s.getRangeAt(0).cloneRange();};
  const back=()=>{body.focus();if(saved){const s=getSelection();s.removeAllRanges();s.addRange(saved);}};
  body.addEventListener("keyup",keep);body.addEventListener("mouseup",keep);body.addEventListener("input",keep);
  const ins=html=>{back();document.execCommand("insertHTML",false,html);keep();};
  const cmd=(c,v)=>{back();document.execCommand(c,false,v);keep();sync();};
  const block=()=>{const s=getSelection();let n=s.anchorNode;while(n&&n!==body){if(n.nodeType===1&&/^(H3|BLOCKQUOTE)$/.test(n.tagName))return n.tagName;n=n.parentNode;}return "";};
  const sync=()=>{root.querySelectorAll("[data-w]").forEach(b=>{const w=b.dataset.w;let on=false;
    try{if(/^(bold|italic|underline|strikeThrough)$/.test(w))on=document.queryCommandState(w);if(w==="center")on=document.queryCommandState("justifyCenter");}catch(e){}
    if(w==="h3")on=block()==="H3";if(w==="quote")on=block()==="BLOCKQUOTE";b.classList.toggle("on",on);});};
  document.addEventListener("selectionchange",()=>{if(document.activeElement===body)sync();});
  try{document.execCommand("styleWithCSS",false,false);document.execCommand("defaultParagraphSeparator",false,"div");}catch(e){}
  root.querySelector(".wtb").onmousedown=e=>{if(e.target.closest("button"))e.preventDefault();};
  root.querySelector(".wtb").onclick=async e=>{const b=e.target.closest("[data-w]");if(!b)return;const w=b.dataset.w;
    if(/^(bold|italic|underline|strikeThrough)$/.test(w))cmd(w);
    else if(w==="h3")cmd("formatBlock",block()==="H3"?"div":"h3");
    else if(w==="quote")cmd("formatBlock",block()==="BLOCKQUOTE"?"div":"blockquote");
    else if(w==="hr")cmd("insertHorizontalRule");
    else if(w==="center")cmd(document.queryCommandState("justifyCenter")?"justifyLeft":"justifyCenter");
    else if(w==="link"){const u=prompt("링크 주소 (https://…)");if(u&&/^https?:\/\/\S+/.test(u.trim())){const s=getSelection();if(saved&&!saved.collapsed)cmd("createLink",u.trim());else ins(`<a href="${esc(u.trim())}">${esc(u.trim())}</a>&nbsp;`);}}
    else if(w==="img")file.click();
    else if(w==="emo")emoPop(root,n=>{const u=emoMap()[n];if(u)ins(emoImg(n,u)+"&#8203;");});
    else if(w==="color"){document.querySelectorAll(".wcolor").forEach(x=>x.remove());const p=document.createElement("div");p.className="wcolor";
      p.innerHTML=WED_COLORS.map(c=>`<button type="button" data-c="${c}" style="background:${c}"></button>`).join("")+`<button type="button" data-c="" class="none" title="기본색">✕</button>`;
      root.appendChild(p);p.onmousedown=ev=>ev.preventDefault();
      p.onclick=ev=>{const x=ev.target.closest("[data-c]");if(!x)return;cmd("foreColor",x.dataset.c||getComputedStyle(body).color);p.remove();};
      setTimeout(()=>document.addEventListener("mousedown",function f(ev){if(!p.contains(ev.target)){p.remove();document.removeEventListener("mousedown",f);}}),0);}
  };
  const addPic=async f=>{if(!f||!/^image\//.test(f.type))return;const t=toast("사진 올리는 중…",60000);
    try{const u=await uploadPic(f,scid);document.querySelectorAll(".toast").forEach(x=>x.remove());ins(`<img class="pic" src="${esc(u)}" alt=""><br>`);}
    catch(err){document.querySelectorAll(".toast").forEach(x=>x.remove());toast("사진을 올리지 못했어요"+(err&&err.code?` (${err.code})`:""));}};
  file.onchange=()=>{const f=file.files[0];file.value="";addPic(f);};
  // 붙여넣기: 사진은 올리고, 글은 허용한 서식만
  body.addEventListener("paste",e=>{const dt=e.clipboardData;if(!dt)return;
    const f=[...dt.files||[]].find(x=>/^image\//.test(x.type));if(f){e.preventDefault();keep();addPic(f);return;}
    const h=dt.getData("text/html");e.preventDefault();keep();
    if(h)ins(emoize(cleanHTML(h)));else ins(esc(dt.getData("text/plain")).replace(/\n/g,"<br>"));});
  body.addEventListener("drop",e=>{const f=[...(e.dataTransfer?.files||[])].find(x=>/^image\//.test(x.type));if(f){e.preventDefault();addPic(f);}});
  // :이름: 을 치면 바로 그림으로
  body.addEventListener("input",e=>{const s=getSelection();if(!s.rangeCount)return;const n=s.anchorNode;if(!n||n.nodeType!==3)return;
    const before=n.nodeValue.slice(0,s.anchorOffset),m=before.match(/:([^:\s<>"'&]{1,20}):$/);if(!m)return;const u=emoMap()[m[1]];if(!u)return;
    const r=document.createRange();r.setStart(n,s.anchorOffset-m[0].length);r.setEnd(n,s.anchorOffset);s.removeAllRanges();s.addRange(r);
    document.execCommand("insertHTML",false,emoImg(m[1],u)+"&#8203;");keep();});
}
