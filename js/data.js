// 코코 로그방 · 이미지 줄이기·주인 설정·로그인·녹음 불러오기·저장·시나리오·화자·편집 작업
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// 이미지 파일을 작게 줄여서 data URL로 (정사각형으로 가운데 자르기)
function shrinkImage(file,size,type="image/jpeg",w=size,h=size){
  return new Promise((ok,no)=>{const img=new Image();const u=URL.createObjectURL(file);
    img.onload=()=>{const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");
      if(type==="image/jpeg"){g.fillStyle="#fff";g.fillRect(0,0,w,h);} // 투명한 부분이 검게 되지 않게 흰 바탕
      const r=Math.max(w/img.width,h/img.height),dw=img.width*r,dh=img.height*r;g.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
      URL.revokeObjectURL(u);ok(c.toDataURL(type,.85));};
    img.onerror=()=>{URL.revokeObjectURL(u);no();};img.src=u;});
}
function publish(){
  const old=S.scens;
  // scenarios/_site: 사이트 제목·설명·아이콘 (주인만 고칠 수 있어요)
  S.site=SUB.scData._site?JSON.parse(JSON.stringify(SUB.scData._site)):(S.site||{});
  if(SUB.scData._site)try{localStorage.setItem("trpg-site",JSON.stringify(S.site));}catch(e){}
  applySite();
  const ids=new Set([...Object.keys(SUB.scData)].filter(id=>id!=="_site"));
  S.scens=[...ids].map(id=>{const o=old.find(x=>x.id===id);return (S.scBusy[id]&&o)?o:{id,...JSON.parse(JSON.stringify(SUB.scData[id]))};});
  old.forEach(o=>{if(S.scBusy[o.id]&&!S.scens.find(x=>x.id===o.id))S.scens.push(o);});
  // 캠페인 비밀번호로 연 경우: 그 캠페인의 모든 편 로그를 받아와요
  if(!S.canAdmin&&S.db)_unlockIds.filter(x=>x.startsWith("g")).forEach(g=>S.scens.filter(x=>x.camp===g).forEach(x=>watchSess(x.id)));
  const all=[];Object.values(SUB.sessData).forEach(m=>Object.values(m).forEach(x=>all.push(x)));
  S.sessions=all.sort((a,b)=>String(a.title).localeCompare(String(b.title),"ko",{numeric:true}));
  const cwChanged=refreshCanWrite();
  if(S.sid){if(cwChanged)render();else{renderSide();renderAllRows(true);renderHeader();}maybeEnsure();if(S.chunksLoaded)loadSecs();}
  else if(!S.importing&&!S.scEdit)render();
  if(S.canAdmin)ownerMaintain();
}
function markLoaded(){if(!S.loaded){S.loaded=true;S.scensLoaded=true;clearTimeout(S.loadTimer);if(S.err&&S.err.startsWith("저장소"))S.err=null;}}
function clearSubs(){
  SUB.all.forEach(u=>{try{u()}catch(e){}});SUB.all=[];
  Object.values(SUB.scen).forEach(u=>{try{u()}catch(e){}});Object.values(SUB.sess).forEach(u=>{try{u()}catch(e){}});

  if(SUB.camps){try{SUB.camps()}catch(e){}SUB.camps=null;}
  SUB.scen={};SUB.sess={};SUB.edQ=null;SUB.scData={};SUB.sessData={};SUB.edIds=[];
}
function syncSubs(reset){
  if(!S.db||!S.authUser)return;
  const mode=S.canAdmin?"owner":"user:"+(myEmail()||"anon");
  if(reset||mode!==SUB.mode){clearSubs();SUB.mode=mode;}
  if(!SUB.camps)SUB.camps=S.db.collection("camps").onSnapshot(snap=>{S.camps=snap.docs.map(d=>({id:d.id,...d.data()}));publish();},()=>{});
  if(S.canAdmin){
    if(SUB.all.length)return;
    SUB.all.push(S.db.collection("scenarios").onSnapshot(snap=>{SUB.scData={};snap.docs.forEach(d=>SUB.scData[d.id]=d.data());markLoaded();publish();},e=>{markLoaded();render();}));
    SUB.all.push(S.db.collection("sessions").onSnapshot(snap=>{const m={};snap.docs.forEach(d=>m[d.id]={id:d.id,...d.data()});SUB.sessData={all:m};markLoaded();publish();},e=>{}));
    SUB.all.push(S.db.collection("secrets").onSnapshot(snap=>{S.secrets={};snap.docs.forEach(d=>S.secrets[d.id]=d.data().pw);if(S.cid&&!S.scEdit||S.fix&&!S.sid&&!S.cid)render();ownerMaintain();},()=>{}));
    return;
  }
  // 시나리오 목록은 누구나
  if(!SUB.all.length)SUB.all.push(S.db.collection("scenarios").onSnapshot(snap=>{SUB.scData={};snap.docs.forEach(d=>SUB.scData[d.id]=d.data());markLoaded();publish();},e=>{markLoaded();render();}));
  // 로그(녹음)는 비밀번호로 연 시나리오만
  _unlockIds.forEach(id=>watchSess(id));
}
function watchSess(id){
  if(SUB.sess[id])return;
  SUB.sess[id]=S.db.collection("sessions").where("scid","==",id).onSnapshot(snap=>{
    const m={};snap.docs.forEach(d=>m[d.id]={id:d.id,...d.data()});SUB.sessData[id]=m;publish();
  },e=>{ // 비밀번호가 바뀌었거나 권한이 없어짐
    delete SUB.sess[id];delete SUB.sessData[id];
    _unlockIds=_unlockIds.filter(x=>x!==id);saveUnlocks();publish();
  });
}
async function unlockScen(id,pw){
  if(!S.authUser){await S.auth.signInAnonymously();}
  const uid=S.auth.currentUser.uid;
  await S.db.doc(`unlocks/${id}_${uid}`).set({scid:id,uid,pw:String(pw).trim(),at:Date.now()});
  if(!_unlockIds.includes(id)){_unlockIds.push(id);saveUnlocks();}
  if(id.startsWith("g"))S.scens.filter(x=>x.camp===id).forEach(x=>watchSess(x.id));else watchSess(id);
}
// 사이트 주인: 녹음에 시나리오 id 달기, 시나리오마다 열람 비밀번호 만들기
let _maintTimer=null;const _pwMade=new Set();
function ownerMaintain(){clearTimeout(_maintTimer);_maintTimer=setTimeout(_ownerMaintain,1500);}
async function _ownerMaintain(){
  if(!S.canAdmin||!S.db||!S.secrets)return;
  for(const s of S.sessions){
    const sc=findScen(info(s).scen);
    if(sc&&s.scid!==sc.id){try{await S.db.doc("sessions/"+s.id).update({scid:sc.id});}catch(e){}}
  }
  // 시나리오마다 회차 수·마지막 플레이 날짜를 적어둬요 (로그인 안 한 사람의 목록 정렬용)
  for(const sc of S.scens){
    const days=[...new Set([...S.sessions.filter(x=>info(x).scen===sc.name).map(x=>info(x).day),...(sc.plays||[])].filter(Boolean))].sort();
    const lastDay=days.length?days[days.length-1]:"";
    if((sc.lastDay||"")!==lastDay||(sc.nDays||0)!==days.length){try{await S.db.doc("scenarios/"+sc.id).update({lastDay,nDays:days.length});}catch(e){}}
  }
  for(const sc of [...S.scens,...S.camps]){
    if(!S.secrets[sc.id]&&!_pwMade.has(sc.id)){_pwMade.add(sc.id);try{const ex=await S.db.doc("secrets/"+sc.id).get();if(!ex.exists)await S.db.doc("secrets/"+sc.id).set({pw:genPw()});}catch(e){_pwMade.delete(sc.id);}}
  }
  // 고정탁: 고정탁 비밀번호를 하나 만들고, 고정탁 안의 세션·캠페인 비밀번호를 모두 그걸로 맞춰요
  if(typeof allFixes!=="function")return;
  for(const f of allFixes()){
    const k=fixKey(f);let pw=S.secrets[k];
    if(!pw){if(_pwMade.has(k))continue;_pwMade.add(k);
      try{const ex=await S.db.doc("secrets/"+k).get();pw=ex.exists?ex.data().pw:genPw();if(!ex.exists)await S.db.doc("secrets/"+k).set({pw});}catch(e){_pwMade.delete(k);continue;}}
    for(const id of fixPwIds(f)){if(S.secrets[id]!==pw){try{await S.db.doc("secrets/"+id).set({pw});}catch(e){}}}
  }
}
function genPw(){const c="abcdefghjkmnpqrstuvwxyz23456789";let o="";const a=new Uint32Array(8);crypto.getRandomValues(a);a.forEach(n=>o+=c[n%c.length]);return o;}
function refreshCanWrite(){
  const id=S.cid||(S.meta&&curScen()?.id)||null;
  const v=S.sid||S.cid?canWriteScen(id):S.canAdmin;
  if(v!==S.canWrite){S.canWrite=v;return true;}return false;
}
// ---------- login & permissions ----------
function updatePerms(){
  const em=myEmail();
  const before=S.canAdmin;
  S.canAdmin=!!em&&em===S.owner;
  if(S.canAdmin)setTimeout(()=>runAdminChecks(),800);
  refreshCanWrite();
  if(before!==S.canAdmin){if(S.sid||(!S.importing&&!S.scEdit))render();}
  else renderAuth();
}
async function login(){
  try{await S.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());}
  catch(e){if(e&&e.code==="auth/popup-blocked"){try{await S.auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());}catch(_){}}else if(e&&e.code!=="auth/popup-closed-by-user")toast("로그인하지 못했어요: "+(e.code||e.message),4000);}
}
function authHTML(){
  if(!S.auth)return "";
  const u=S.authUser;
  return u&&!u.isAnonymous?`<span class="me">${esc((S.canAdmin&&((S.site&&S.site.nicks)||[])[0])||u.displayName||u.email)}${S.canAdmin?" · 주인":""}</span><button class="ghost" data-logout>로그아웃</button>`
    :`<button class="ghost small" data-login title="사이트 주인 전용">관리자 로그인</button>`;
}
function renderAuth(){
  document.querySelectorAll(".authbox").forEach(el=>el.innerHTML=authHTML());
  document.querySelectorAll("[data-login]").forEach(b=>b.onclick=login);
  document.querySelectorAll("[data-logout]").forEach(b=>b.onclick=()=>S.auth.signOut());
}
window.addEventListener("hashchange",route);

function route(){
  const h=location.hash.slice(1);
  const sid=h.startsWith("s-")?h.slice(2):null;
  const cid=h.startsWith("c-")?h.slice(2):null;
  const rid=h.startsWith("r-")?h.slice(2):null;
  const gid=h.startsWith("g-")?h.slice(2):null;
  const bid=h.startsWith("b-")?h.slice(2):null;
  if(bid){if(!S.book||S.book.scid!==bid){S.revPage=null;S.gid=null;S.up=null;S.admin=false;if(S.sid||S.cid){S.cid=null;openSession(null);}bookOpen(bid);window.scrollTo(0,0);}return;}
  if(S.book){S.book=null;PRE.book=new Set();document.body.classList.remove("booking");document.documentElement.classList.remove("booking");if(!sid&&!cid&&!h)render();}
  // 게시물 하나 (#p-출처~id)
  const pid=h.startsWith("p-")?h.slice(2):null;
  if(pid){if(!S.postPage||S.postPage.key!==pid){S.fix=null;S.gid=null;S.revPage=null;S.up=null;S.admin=false;if(S.sid||S.cid){S.cid=null;closeSession();S.sid=null;}openPostPage(pid);}return;}
  if(S.postPage){S.postPage=null;if(!sid&&!cid&&!h.startsWith("f-")&&!h.startsWith("g-")&&!h.startsWith("r-"))render();}
  // 고정탁 페이지 (#f-이름)
  const fid=h.startsWith("f-")?decodeURIComponent(h.slice(2)):null;
  if(fid){if(S.fix!==fid){S.fix=fid;S.revPage=null;S.gid=null;S.up=null;S.admin=false;if(S.sid||S.cid){S.cid=null;openSession(null);}else render();window.scrollTo(0,0);}return;}
  if(S.fix){S.fix=null;if(!sid&&!cid&&!h)render();}
  if(gid){if(S.gid!==gid||S.revPage){S.revPage=null;S.gid=gid;S.campEdit=false;S.up=null;S.admin=false;if(S.sid||S.cid){S.cid=null;openSession(null);}else render();window.scrollTo(0,0);}return;}
  if(S.gid){S.gid=null;if(!sid&&!cid&&!h)render();}
  if(rid){if(!S.revPage||S.revPage.rid!==rid){S.cid=null;openSession(null);openRevPage(rid);}return;}
  if(S.revPage){S.revPage=null;if(!sid&&!cid){render();}}
  const upm=h==="up"?"":h.startsWith("up-")?h.slice(3):null;
  if(upm!==null){
    if(!S.up||S.up.from!==h){const g=upm.startsWith("g")?upm:"";
      S.up={from:h,step:0,kind:"",mode:g?"next":"cont",scid:g?"":upm,gid:g,ck:g&&isCamp(campById(g))?"camp":"",fixedCamp:!!g,fixed:!!upm&&!g,name:"",system:"",orig:"",src:"",dates:[],picked:false};}
    S.admin=false;if(S.sid||S.cid){S.cid=null;openSession(null);}else render();window.scrollTo(0,0);return;}
  if(S.up){S.up=null;S.bulkMsg="";if(!sid&&!cid){render();}}
  const adm=h==="admin";
  if(adm!==!!S.admin){S.admin=adm;if(!sid&&!cid&&!S.sid&&!S.cid){render();window.scrollTo(0,0);return;}}
  if(sid!==S.sid||cid!==S.cid){if(cid)delete SCC[cid];S.cid=cid;S.lockPick=null;S.scEdit=!!cid&&S.pendingEdit===cid;S.pendingEdit=null;S.scDraft=null;openSession(sid);window.scrollTo(0,0);}
}

// ---------- session load ----------
function closeSession(){S.secOther=[];S.handOther=[];S.secKey=null;flushAll();S.ops={};S.dirty.clear();const a=document.getElementById("aud");if(a&&S.audioUrl){a.pause();a.removeAttribute("src");a.load();if(!S.audioCloud)URL.revokeObjectURL(S.audioUrl);S.audioUrl=null;S.playingId=null;}S.audioCloud=false;S.audioLoading=false;S.unsub.forEach(u=>{try{u()}catch(e){}});S.unsub=[];S.meta=null;S.chunks={};S.flat=[];S.chunksLoaded=false;S.ensured=false;S.byId.clear();S.sel=null;S.undo=[];S.spFilter=null;S.q="";}
function openSession(sid){
  if(S.local&&sid===null){/* leaving local view */S.local=false;}
  closeSession();S.sid=sid;
  if(!sid){render();return;}
  if(!S.db){render();return;}
  render();
  const u1=S.db.doc("sessions/"+sid).onSnapshot(d=>{
    if(!d.exists){if(!d.metadata.fromCache){S.meta=null;S.err="이 세션을 찾을 수 없어요.";render();}return;}
    if(S.metaBusy)return;
    S.meta=JSON.parse(JSON.stringify(d.data()));
    if(S.meta.audioPath&&!S.audioUrl&&!S.audioLoading)loadCloudAudio();
    if(refreshCanWrite())render();else{renderSide();renderAllRows();renderHeader();}maybeEnsure();watchCms();
  },e=>{S.err=e&&e.code==="permission-denied"?"이 녹음은 잠겨 있어요. 세션 링크로 들어와서 비밀번호를 입력해 주세요.":"세션 정보를 불러오지 못했어요.";render();});
  const u2=S.db.collection("sessions/"+sid+"/chunks").onSnapshot(snap=>{
    let changed=false;
    snap.docs.forEach(d=>{
      const ci=d.data().i;
      if(S.dirty.has(ci)||S.inflight.has(ci)||(S.ops[ci]||[]).length)return;
      const b=d.data().b||[];
      if(JSON.stringify(S.chunks[ci])!==JSON.stringify(b)){S.chunks[ci]=JSON.parse(JSON.stringify(b));changed=true;}
    });
    if(!snap.metadata.fromCache)S.chunksLoaded=true;
    if(changed){rebuild();renderAllRows(true);renderSide();}
    if(S.chunksLoaded){tryGotoSec();loadSecs();}
    maybeEnsure();
  },e=>{if(!(S.err||"").includes("잠겨"))S.err="로그를 불러오지 못했어요.";render();});
  S.unsub.push(u1,u2);
}

function rebuild(){
  S.flat=[];S.byId.clear();
  Object.keys(S.chunks).map(Number).sort((a,b)=>a-b).forEach(ci=>{
    S.chunks[ci].forEach((b,bi)=>{const e={b,ci,bi};S.flat.push(e);S.byId.set(b.id,e);});
  });
  syncN();
}
// 목록에 보이는 "N개 대사"를 실제 줄 수와 맞춰요 (나누기·추가·삭제 뒤에도)
function syncN(){
  clearTimeout(S.nTmr);
  S.nTmr=setTimeout(()=>{
    const sid=S.sid,n=S.flat.length;
    if(!sid||!S.db||S.local||!S.canWrite||!S.chunksLoaded||!S.meta||!n||S.meta.n===n)return;
    S.meta.n=n;S.db.doc("sessions/"+sid).set({n},{merge:true}).catch(()=>{});
  },3000);
}

// ---------- persistence ----------
// 고친 내용을 "작업"(op) 단위로 모았다가, 저장할 때 최신 내용을 다시 읽어 그 위에 작업만 덧붙여요.
// 그래서 여럿이 같은 부분을 동시에 고쳐도 서로의 수정이 덮이지 않아요.
const clone=o=>JSON.parse(JSON.stringify(o));
function applyOp(arr,op){
  if(op.t==="set"){const b=arr.find(x=>x.id===op.id);if(b)Object.keys(op.f).forEach(k=>{if(op.f[k]===undefined)delete b[k];else b[k]=op.f[k];});}
  else if(op.t==="ins"){
    if(arr.some(x=>x.id===op.b.id))return;
    let i;
    if(op.after===null)i=0;
    else{const j=arr.findIndex(x=>x.id===op.after);
      if(j>=0)i=j+1;else{i=0;arr.forEach((x,k)=>{if(x.t<=op.b.t)i=k+1;});}}
    arr.splice(i,0,clone(op.b));
  }
  else if(op.t==="del"){const i=arr.findIndex(x=>x.id===op.id);if(i>=0)arr.splice(i,1);}
}
function invOp(arr,op){
  if(op.t==="set"){const b=arr.find(x=>x.id===op.id)||{};const f={};Object.keys(op.f).forEach(k=>f[k]=b[k]);return {t:"set",id:op.id,f};}
  if(op.t==="ins")return {t:"del",id:op.b.id};
  const i=arr.findIndex(x=>x.id===op.id);return {t:"ins",after:i>0?arr[i-1].id:null,b:clone(arr[i])};
}
// list: [{ci,op}] — 화면에 바로 반영하고 저장 대기열에 넣어요
function doOps(list,label){
  if(!S.canWrite&&!S.local)return;
  const inv=[];
  list.forEach(({ci,op})=>{const arr=S.chunks[ci];if(!arr)return;inv.unshift({ci,op:invOp(arr,op)});applyOp(arr,op);(S.ops[ci]=S.ops[ci]||[]).push(op);});
  if(label){S.undo.push({label,inv});if(S.undo.length>100)S.undo.shift();}
  rebuild();[...new Set(list.map(x=>x.ci))].forEach(ci=>touch(ci));
}
function touch(ci){
  if(S.local){renderStatus();return;}
  S.dirty.add(ci);clearTimeout(S.tmr[ci]);S.tmr[ci]=setTimeout(()=>flush(ci),700);renderStatus();
}
async function flush(ci){
  if(S.inflight.has(ci))return;
  const ops=S.ops[ci]||[];
  if(!ops.length){S.dirty.delete(ci);renderStatus();return;}
  const sid=S.sid,ref=S.db.doc(`sessions/${sid}/chunks/${ckey(ci)}`);
  S.ops[ci]=[];S.inflight.add(ci);S.dirty.delete(ci);renderStatus();
  try{
    const merged=await S.db.runTransaction(async tx=>{
      const d=await tx.get(ref);const arr=d.exists?clone(d.data().b||[]):[];
      ops.forEach(op=>applyOp(arr,op));tx.set(ref,{i:ci,b:arr});return arr;
    });
    S.err=null;
    if(S.sid===sid){ // 다른 사람 수정까지 합쳐진 최신 내용 + 아직 안 보낸 내 작업
      const arr=clone(merged);(S.ops[ci]||[]).forEach(op=>applyOp(arr,op));
      if(JSON.stringify(arr)!==JSON.stringify(S.chunks[ci])){S.chunks[ci]=arr;rebuild();renderAllRows(true);renderSideCounts();}
    }
  }catch(e){if(S.sid===sid)S.ops[ci]=ops.concat(S.ops[ci]||[]);writeFail(e);}
  S.inflight.delete(ci);
  if(S.sid===sid&&(S.ops[ci]||[]).length&&!S.err){S.dirty.add(ci);flush(ci);}
  renderStatus();
}
function flushAll(){Object.keys(S.ops).forEach(ci=>{if((S.ops[ci]||[]).length){clearTimeout(S.tmr[ci]);flush(+ci);}});}
window.addEventListener("beforeunload",ev=>{if(Object.values(S.ops).some(o=>o&&o.length)||S.inflight.size){flushAll();ev.preventDefault();ev.returnValue="";}});
function writeFail(e){
  if(e&&(e.code==="invalid_argument"||e.code==="permission-denied")){S.canWrite=false;S.err="고칠 권한이 없어서 보기 전용으로 바뀌었어요. 비밀번호가 바뀌었다면 세션 링크로 다시 들어와 새 비밀번호를 넣어 주세요.";render();}
  else if(e&&e.code==="quota_exceeded"){S.err="저장 공간이 가득 찼어요: "+(e.message||"");}
  else S.err="저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
  renderStatus();
}
async function saveMeta(){
  if(S.local){renderSide();renderAllRows();return;}
  if(S.metaBusy){S.metaAgain=true;return;}
  S.metaBusy=true;renderStatus();
  try{await retry(()=>S.db.doc("sessions/"+S.sid).set(S.meta));}catch(e){writeFail(e);}
  S.metaBusy=false;
  if(S.metaAgain){S.metaAgain=false;saveMeta();}
  renderStatus();
}
// 되돌리기: 내가 한 작업만 거꾸로 적용해요 (다른 사람 수정은 건드리지 않아요)
function undo(){
  const u=S.undo.pop();if(!u){toast("되돌릴 작업이 없어요");return;}
  doOps(u.inv.filter(x=>S.chunks[x.ci]),null);
  renderAllRows(true);renderSide();toast("되돌림: "+u.label);
}

// ---------- scenarios ----------
function hashName(n){let h=2166136261;for(const ch of n){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}return "c"+h.toString(36);}
const scenByName=n=>S.scens.find(x=>x.name===n);
const scenById=id=>S.scens.find(x=>x.id===id);
function curScen(){return S.meta?findScen(info(S.meta).scen):null;}
function newScenId(name){let id=hashName(name),i=2;while(scenById(id))id=hashName(name)+"-"+(i++);return id;}
async function saveScen(sc){
  if(S.local)return;
  const id=sc.id;
  if(S.scBusy[id]){S.scAgain[id]=true;return;}
  S.scBusy[id]=true;renderStatus();
  const {id:_,...body}=sc;
  // 갤러리(gal)는 다른 사람이 동시에 올릴 수 있어서, 저장할 때 서버에 있는 걸 그대로 둬요
  const clean=JSON.parse(JSON.stringify(body));delete clean.gal;
  try{await retry(()=>S.db.runTransaction(async tx=>{const ref=S.db.doc("scenarios/"+id),d=await tx.get(ref),g=d.exists?d.data().gal:undefined;tx.set(ref,g!==undefined?{...clean,gal:g}:clean);}));}catch(e){writeFail(e);}
  S.scBusy[id]=false;
  if(S.scAgain[id]){S.scAgain[id]=false;await saveScen(scenById(id)||sc);}
  renderStatus();
}
// 시나리오 정보도 저장 순간의 최신 내용을 읽어서 바꾼 부분만 적용해요
async function mutateScen(id,fn){
  const sc=scenById(id);if(sc)fn(sc);
  if(S.local||!S.db)return;
  S.scBusy[id]=(S.scBusy[id]||0)+1;renderStatus();
  try{
    await S.db.runTransaction(async tx=>{
      const ref=S.db.doc("scenarios/"+id);const d=await tx.get(ref);
      const body=d.exists?clone(d.data()):(sc?clone(sc):{});body.sp=body.sp||[];
      fn(body);delete body.id;tx.set(ref,clone(body));
    });
  }catch(e){writeFail(e);}
  S.scBusy[id]--;renderStatus();
}
function createScen(name,sp){
  const sc={id:newScenId(name),name,system:"",summary:"",rules:"",sp:sp||[],created:Date.now()};
  S.scens.push(sc);return sc;
}
// 녹음별로 따로 있던 화자 목록을 시나리오 공용 목록으로 합치기
function maybeEnsure(){
  if(S.ensured||S.ensuring||S.local||!S.db||!S.canWrite||!S.meta||!S.scensLoaded||!S.chunksLoaded)return;
  S.ensuring=true;ensureScen().finally(()=>{S.ensuring=false;});
}
async function ensureScen(){
  const name=info(S.meta).scen;let sc=findScen(name);
  const own=S.meta.sp||[];
  if(!sc){sc=createScen(name,JSON.parse(JSON.stringify(own)));await saveScen(sc);}
  else if(own.length){
    const remap={},toAdd=[];
    own.forEach(e=>{
      if(sc.sp.some(x=>x.k===e.k))return;
      const same=sc.sp.find(x=>x.name===e.name);
      if(same)remap[e.k]=same.k;else toAdd.push({...e});
    });
    if(toAdd.length)await mutateScen(sc.id,d=>{toAdd.forEach(e=>{if(!d.sp.some(x=>x.k===e.k))d.sp.push({...e});});});
    if(Object.keys(remap).length)doOps(S.flat.filter(x=>remap[x.b.s]).map(x=>({ci:x.ci,op:{t:"set",id:x.b.id,f:{s:remap[x.b.s]}}})),null);
  }
  if(own.length||!S.meta.scen){S.meta.sp=[];Object.assign(S.meta,info(S.meta));await saveMeta();}
  S.ensured=true;renderSide();renderAllRows(true);
  cleanupZero();
}
async function countsElsewhere(){
  const sc=curScen();const m={};if(!sc)return m;
  for(const s of S.sessions){
    if(s.id===S.sid||info(s).scen!==sc.name)continue;
    const snap=await S.db.collection(`sessions/${s.id}/chunks`).get();
    snap.docs.forEach(d=>(d.data().b||[]).forEach(b=>{m[b.s]=(m[b.s]||0)+1;}));
  }
  return m;
}
// 시나리오의 어느 녹음에도 대사가 없는 화자를 목록에서 정리
async function cleanupZero(){
  const sc=curScen();if(!sc||!S.canWrite||S.local)return;
  const here=counts();
  const cand=sc.sp.filter(p=>!(here[p.k]>0)&&p.k!==gmKey(sc)&&!S.fresh.has(p.k));
  if(!cand.length)return;
  let other;try{other=await countsElsewhere();}catch(e){return;}
  const dead=new Set(cand.filter(p=>!(other[p.k]>0)&&!(counts()[p.k]>0)).map(p=>p.k));
  if(!dead.size)return;
  if(dead.has(S.spFilter))S.spFilter=null;
  await mutateScen(sc.id,d=>{d.sp=d.sp.filter(p=>!dead.has(p.k));});renderSide();
}
async function usageElsewhere(k){
  const sc=curScen();if(!sc)return 0;
  let n=0;
  for(const s of S.sessions){
    if(s.id===S.sid||info(s).scen!==sc.name)continue;
    try{const snap=await S.db.collection(`sessions/${s.id}/chunks`).get();snap.docs.forEach(d=>(d.data().b||[]).forEach(b=>{if(b.s===k)n++;}));}catch(e){n++;}
  }
  return n;
}

// ---------- speakers ----------
const ALL="__all",ALLSP={k:ALL,name:"전원",c:"#8a8178"};
const gmKey=sc=>sc&&sc.gm&&(sc.sp||[]).some(x=>x.k===sc.gm)?sc.gm:null;
const gmFirst=(arr,g)=>g?[...arr.filter(x=>x.k===g),...arr.filter(x=>x.k!==g)]:arr;
function spList(){
  const sc=curScen();const own=(S.meta?.sp||[]).filter(o=>o.k!==ALL);
  if(!sc)return own.concat(ALLSP);
  return gmFirst(sc.sp.filter(x=>x.k!==ALL).concat(own.filter(o=>!sc.sp.some(x=>x.k===o.k))),gmKey(sc)).concat(ALLSP);
}
const isGM=k=>!!k&&gmKey(curScen())===k;
// GM 딱지 (D&D는 CSS로 'DM'으로 바뀌어요)
const gmTag='<span class="gmtag"><span class="gmw">GM</span></span>';
const gmWord=sc=>themeOf(sc)==="deco"?"던전 마스터":"게임 마스터";
const spBy=k=>spList().find(s=>s.k===k)||{k,name:"(목록에 없는 화자)",c:"#888"};
function spTarget(){const sc=curScen();return sc?sc.sp:S.meta.sp;}
function counts(){const c={};S.flat.forEach(e=>{if(e.b.s!==NOTE&&e.b.s!==DICE&&e.b.s!==HAND&&e.b.s!==SEC)c[e.b.s]=(c[e.b.s]||0)+1;});return c;}
function addNote(afterId){
  if(!S.canWrite)return;
  const e=S.byId.get(afterId);if(!e)return;
  const nb={id:rid(),s:NOTE,t:e.b.t,x:""};
  doOps([{ci:e.ci,op:{t:"ins",after:e.b.id,b:nb}}],"상황 묘사 추가");
  renderAllRows(true);select(nb.id,false);editRow(nb.id);
}
function addHand(afterId){
  if(!S.canWrite)return;
  const e=S.byId.get(afterId);if(!e)return;
  const nb={id:rid(),s:HAND,t:e.b.t,x:""};
  doOps([{ci:e.ci,op:{t:"ins",after:e.b.id,b:nb}}],"핸드아웃 추가");
  renderAllRows(true);select(nb.id,false);editRow(nb.id);
}
function addDice(afterId){
  if(!S.canWrite)return;
  const e=S.byId.get(afterId);if(!e)return;
  const w=e.b.s===DICE?e.b.w:(e.b.s===NOTE?"":e.b.s);
  const nb={id:rid(),s:DICE,t:e.b.t,x:"",w:w||"",r:"",o:""};
  doOps([{ci:e.ci,op:{t:"ins",after:e.b.id,b:nb}}],"주사위 추가");
  renderAllRows(true);select(nb.id,false);editRow(nb.id);
}
function addSpeaker(name){
  name=name.trim();if(!name)return null;
  const ex=spList().find(s=>s.name===name);if(ex)return ex.k;
  const k="k"+rid();const c=counts();const arr=spTarget();
  // 새 화자는 '주요 화자'(대사 10개 이상) 바로 뒤에 넣어서 숫자키 1~9 안에 들어오게
  const before=(arr.find(s=>(c[s.k]||0)>0&&(c[s.k]||0)<10)||{}).k||null;
  const np={k,name,c:COLORS[arr.length%COLORS.length]};
  const ins=a=>{if(a.some(x=>x.k===k))return;const i=before?a.findIndex(x=>x.k===before):-1;if(i<0)a.push({...np});else a.splice(i,0,{...np});};
  S.fresh.add(k);
  const sc=curScen();if(sc)mutateScen(sc.id,d=>ins(d.sp));else{ins(arr);saveMeta();}
  renderSide();return k;
}
function assign(id,k){
  const e=S.byId.get(id);if(!e||e.b.s===k)return;
  const old=e.b.s;
  doOps([{ci:e.ci,op:{t:"set",id,f:e.b.a&&!isGM(k)?{s:k,a:undefined}:{s:k}}}],"화자 변경");updateRow(id);
  const c=counts();
  if((c[k]||0)===1||!(c[old]>0)){renderSide();}else renderSideCounts();
  if(!(c[old]>0)&&!isGM(old)&&!S.fresh.has(old)){clearTimeout(S.zeroTmr);S.zeroTmr=setTimeout(cleanupZero,4000);}
}
// 여러 줄 한꺼번에: 화자 바꾸기 · 잡담/빼기 · 지우기
const isSpecialS=s=>s===NOTE||s===DICE||s===HAND||s===SEC;
function assignMany(ids,k){
  const es=ids.map(id=>S.byId.get(id)).filter(e=>e&&e.b.s!==k&&(ids.length===1||!isSpecialS(e.b.s)));if(!es.length)return;
  if(es.length===1){assign(es[0].b.id,k);return;}
  doOps(es.map(e=>({ci:e.ci,op:{t:"set",id:e.b.id,f:e.b.a&&!isGM(k)?{s:k,a:undefined}:{s:k}}})),"화자 변경");renderAllRows(true);renderSide();
}
function bkDefault(b){return PRE.log.has(b.id)?2:b.tab&&CHAT_TAB.test(b.tab)&&!isSpecialS(b.s)?1:0;}
function bkToggle(ids,v){
  let es=ids.map(id=>S.byId.get(id)).filter(Boolean);if(v===1)es=es.filter(e=>!isSpecialS(e.b.s));if(!es.length)return;
  const to=es.every(e=>bkOf(e.b)===v)?0:v;
  doOps(es.map(e=>({ci:e.ci,op:{t:"set",id:e.b.id,f:{bk:to===bkDefault(e.b)?undefined:to}}})),to===2?"빼기":to===1?"잡담":"본문으로");
  renderAllRows(true);toast(`${es.length>1?es.length+"줄 ":""}${to===2?"빼기":to===1?"잡담":"본문"}으로 · 리플레이북에 반영돼요`);
}
function delMany(ids){
  if(ids.length<=1){if(ids[0])delBlock(ids[0]);return;}
  const es=ids.map(id=>S.byId.get(id)).filter(Boolean);const last=S.flat.indexOf(es[es.length-1]);const nxt=S.flat.slice(last+1).find(e=>!ids.includes(e.b.id));
  doOps(es.map(e=>({ci:e.ci,op:{t:"del",id:e.b.id}})),"삭제");renderAllRows(true);renderSideCounts();if(nxt)select(nxt.b.id);toast(`${es.length}줄 삭제했어요 · Ctrl+Z로 되돌리기`);
}
// 단락 단계 돌리기: 대 → 중 → 하 → 대
function cycleSec(id){const e=S.byId.get(id);if(!e||e.b.s!==SEC)return;const l=secLv(e.b)%3+1;doOps([{ci:e.ci,op:{t:"set",id,f:{lv:l}}}],"단락 단계 바꾸기");updateRow(id);renderSide();if(typeof loadSecs==="function")loadSecs(true);toast(["대","중","하"][l-1]+"단락");}
function shownSp(){
  const c=counts();
  const L=spList().filter(s=>s.k!==ALL&&(S.showZero||(c[s.k]||0)>0||isGM(s.k)||S.fresh.has(s.k)));
  // 타이만(자캐) 세션: 캐릭터를 앞에, 플레이어·GM 본인(잡담)은 뒤에
  return isTai()?[...L.filter(s=>s.chr),...L.filter(s=>!s.chr)]:L;
}
function isTai(){return spList().some(s=>s.chr);}
async function removeSpeakerIfUnused(k){
  if((counts()[k]||0)>0)return false;
  const n=await usageElsewhere(k);
  if(n>0){toast(`같은 세션의 다른 녹음에서 ${n}개 대사가 이 화자로 되어 있어서 목록에는 남겨뒀어요`,3500);return false;}
  const sc=curScen();if(sc)mutateScen(sc.id,d=>{d.sp=d.sp.filter(x=>x.k!==k);});
  if(S.meta.sp?.some(x=>x.k===k)){S.meta.sp=S.meta.sp.filter(x=>x.k!==k);saveMeta();}
  if(S.spFilter===k)S.spFilter=null;renderSide();return true;
}
// 세션(시나리오)의 모든 녹음에서 화자 from → to 로 옮기고 목록에서 from을 지워요
// alias: 옮긴 줄에 원래 이름을 '그 줄에서 쓴 이름'(a)으로 남겨요 (타이만에서 정체를 숨긴 캐릭터 → 진짜 캐릭터)
async function mergeSpeakerAll(from,to,alias){
  const sc=curScen();const al=e=>alias&&e.b.s===from&&!e.b.a?{a:alias}:{};
  doOps(S.flat.filter(e=>e.b.s===from||e.b.w===from).map(e=>({ci:e.ci,op:{t:"set",id:e.b.id,f:{...(e.b.s===from?{s:to}:{}),...(e.b.w===from?{w:to}:{}),...al(e)}}})),alias?"가명으로 합치기":"화자 합치기");
  if(S.spFilter===from)S.spFilter=null;renderAllRows();renderSide();
  if(sc&&!S.local){const others=S.sessions.filter(x=>x.scid===sc.id&&x.id!==S.sid);let n=0;
    for(const ss of others){try{const q=await S.db.collection(`sessions/${ss.id}/chunks`).get();
      for(const d of q.docs){const b=d.data().b||[];let ch=false;const nb=b.map(x=>{if(x.s!==from&&x.w!==from)return x;ch=true;n++;return {...x,...(x.s===from?{s:to}:{}),...(x.w===from?{w:to}:{}),...(alias&&x.s===from&&!x.a?{a:alias}:{})};});
        if(ch)await retry(()=>d.ref.update({b:nb}));}}catch(e){toast("다른 녹음 일부를 옮기지 못했어요",4000);}}
    await mutateScen(sc.id,d=>{d.sp=(d.sp||[]).filter(x=>x.k!==from);if(d.gm===from)d.gm=to;});
    toast(`합쳤어요${n?` (다른 녹음 ${n}줄 포함)`:""}`);}
  else{await removeSpeakerIfUnused(from);toast("합쳤어요");}
  renderSide();renderAllRows(true);
}
async function mergeSpeaker(from,to){
  doOps(S.flat.filter(e=>e.b.s===from).map(e=>({ci:e.ci,op:{t:"set",id:e.b.id,f:{s:to}}})),"화자 합치기");
  if(S.spFilter===from)S.spFilter=null;
  renderAllRows();renderSide();toast("옮겼어요");
  await removeSpeakerIfUnused(from);
}

// ---------- edits ----------
function splitBlock(id,lineIdx){
  const e=S.byId.get(id);if(!e)return;
  const lines=e.b.x.split("\n");if(lineIdx<=0||lineIdx>=lines.length)return;
  const nb={id:rid(),s:e.b.s,t:e.b.t,x:lines.slice(lineIdx).join("\n")};
  doOps([{ci:e.ci,op:{t:"set",id,f:{x:lines.slice(0,lineIdx).join("\n")}}},{ci:e.ci,op:{t:"ins",after:id,b:nb}}],"나누기");
  renderAllRows(true);renderSideCounts();select(nb.id);
}
// 글자 범위 [a,z)를 떼어 화자 k의 새 줄로 (k가 상황 묘사면 묘사로)
function splitAbs(id,a,z,k){
  const e=S.byId.get(id);if(!e)return;const v=e.b.x||"";
  const parts=[[v.slice(0,a),e.b.s],[v.slice(a,z),k],[v.slice(z),e.b.s]].map(([x,sp])=>[x.replace(/\n{2,}/g,"\n").trim(),sp]).filter(([x])=>x);
  if(!parts.length||(parts.length===1&&parts[0][1]===e.b.s))return;
  const f0={x:parts[0][0],s:parts[0][1]};if(parts[0][1]!==e.b.s&&e.b.a&&!isGM(parts[0][1]))f0.a=undefined;
  const ops=[{ci:e.ci,op:{t:"set",id,f:f0}}];let prev=id;const ids=[id];
  parts.slice(1).forEach(([x,sp])=>{const nb={id:rid(),s:sp,t:e.b.t,x,...(e.b.tab?{tab:e.b.tab}:{}),...(sp===e.b.s&&e.b.a?{a:e.b.a}:{})};ops.push({ci:e.ci,op:{t:"ins",after:prev,b:nb}});prev=nb.id;ids.push(nb.id);});
  doOps(ops,"대사 나누기");renderAllRows(true);renderSideCounts();
  select(ids[v.slice(0,a).trim()?1:0]||id,false);
  toast(k===NOTE?"상황 묘사로 떼어냈어요 · Ctrl+Z로 되돌리기":`'${spBy(k).name}' 대사로 떼어냈어요 · Ctrl+Z로 되돌리기`);
}
function mergePrev(id){
  const e=S.byId.get(id);if(!e)return;
  const idx=S.flat.indexOf(e);if(idx<=0)return;
  const p=S.flat[idx-1];
  doOps([{ci:p.ci,op:{t:"set",id:p.b.id,f:{x:p.b.x+"\n"+e.b.x}}},{ci:e.ci,op:{t:"del",id}}],"위와 합치기");
  renderAllRows(true);renderSideCounts();select(p.b.id);
}
function delBlock(id){
  const e=S.byId.get(id);if(!e)return;
  const idx=S.flat.indexOf(e);const nxt=S.flat[idx+1]||S.flat[idx-1];
  doOps([{ci:e.ci,op:{t:"del",id}}],"삭제");
  renderAllRows(true);renderSideCounts();if(nxt)select(nxt.b.id);toast("삭제했어요 · Ctrl+Z로 되돌리기");
}
function setText(id,x){
  const e=S.byId.get(id);if(!e)return;x=x.replace(/\n{2,}/g,"\n").trim();
  if(!x){delBlock(id);return;}
  if(x===e.b.x)return;doOps([{ci:e.ci,op:{t:"set",id,f:{x}}}],"텍스트 수정");
}
