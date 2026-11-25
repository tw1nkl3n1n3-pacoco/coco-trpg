// 코코 로그방 · 공통: 로그 파서·도구·상태·시작·데이터 구독
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- parser ----------
function unent(t){return t.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);|&#(\d+);/g,(m,n,d)=>d?String.fromCharCode(+d):({amp:"&",lt:"<",gt:">",quot:'"',"#39":"'",apos:"'",nbsp:" "}[n]));}
function parseClova(text){
  text=unent(text);
  const lines=text.replace(/\r\n?/g,"\n").split("\n");
  const title=(lines[0]||"").trim()||"제목 없는 세션";
  const dateLine=(lines[1]||"").trim();
  const head=/^(.+?) (\d{1,2}:\d{2}(?::\d{2})?)$/;
  const blocks=[];let cur=null,prevBlank=true;
  for(let i=2;i<lines.length;i++){
    const ln=lines[i].trim();
    if(!ln){if(cur){blocks.push(cur);cur=null;}prevBlank=true;continue;}
    const m=prevBlank&&!cur?ln.match(head):null;
    if(m){const p=m[2].split(":").map(Number);const t=p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1];cur={s:m[1].trim(),t,x:[]};}
    else if(cur){cur.x.push(ln);}
    prevBlank=false;
  }
  if(cur)blocks.push(cur);
  return {title,dateLine,blocks:blocks.filter(b=>b.x.length).map(b=>({s:b.s,t:b.t,x:b.x.join("\n").replace(/clovanote\.naver\.com\s*$/,"").trim()})).filter(b=>b.x)};
}

// ---------- utils ----------
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rid=()=>Math.random().toString(36).slice(2,9);
const fmt=t=>{if(t<0)return "-"+fmt(-t);t=Math.floor(t||0);const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return (h?h+":":"")+String(m).padStart(h?2:1,"0")+":"+String(s).padStart(2,"0");};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const COLORS=["#a8401f","#2f6690","#4f7a2a","#7a4a9e","#b8691c","#1f7f74","#a83a62","#7d6a14","#3f4fa0","#5c4a3a","#c0392b","#2e6b4f"];
const CHUNK=60;
const OLDC=["#f3c97f","#8fc7f2","#f29a9a","#a5dd9b","#d4a5f5","#f5b98a","#7fd8d0","#f2a7d0","#c9c97f","#9fa8f5","#e8e8e8","#b8e07a"];
// 더블크로스 테마에서는 누런 올리브색을 맑은 색으로 바꿔 보여줘요
const DXC={"#4f7a2a":"#17a25e","#7d6a14":"#d18b00","#5c4a3a":"#6b7280","#b8691c":"#e46a12"};
const fixC=c=>{const i=OLDC.indexOf(c);const v=i>=0?COLORS[i]:(c||"#7a6a5a");return document.body&&document.body.dataset.theme==="dx"&&DXC[v]||v;};
const ckey=i=>"c"+String(i).padStart(3,"0");
function toast(msg,ms=2200){const d=document.createElement("div");d.className="toast";d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),ms);}
async function retry(fn){
  for(let a=0;;a++){
    try{return await fn();}
    catch(e){const c=e&&e.code;if((c==="resource_exhausted"||c==="resource-exhausted"||c==="unavailable"||c==="deadline-exceeded"||!c)&&a<5){await sleep(1200*(a+1)+Math.random()*400);continue;}throw e;}
  }
}

// ---------- state ----------
const S={site:null,ops:{},fresh:new Set(),showZero:false,db:null,user:null,canWrite:false,canAdmin:false,ready:false,auth:null,authUser:null,editors:[],owner:"",setupNeeded:false,
  sessions:[],sid:null,meta:null,chunks:{},flat:[],byId:new Map(),
  sel:null,q:"",spFilter:null,follow:true,undo:[],
  dirty:new Set(),inflight:new Set(),tmr:{},err:null,
  unsub:[],local:false,scens:[],scensLoaded:false,cid:null,scBusy:{},scAgain:{},chunksLoaded:false,ensured:false,ensuring:false,scEdit:false,audioUrl:null,playingId:null,metaBusy:false,metaAgain:false,loadTimer:null,loaded:false};

const SCC={};
// ---------- boot ---------- (js/ 파일을 모두 읽은 뒤 시작)
const boot=async()=>{
  render();
  const cfg=window.FIREBASE_CONFIG;
  S.owner=String(window.OWNER_EMAIL||"").trim().toLowerCase();
  if(window.firebase&&cfg&&cfg.apiKey&&!/YOUR_|여기에/.test(cfg.apiKey)){
    try{
      firebase.initializeApp(cfg);
      S.db=firebase.firestore();
      try{S.db.settings({ignoreUndefinedProperties:true,merge:true});}catch(e){}
      S.auth=firebase.auth();
      try{S.storage=firebase.storage();}catch(e){S.storage=null;}
    }catch(e){S.db=null;S.err="Firebase 설정을 읽지 못했어요: "+(e.message||e);}
  }else S.setupNeeded=true;
  S.ready=true;
  if(!S.db)render();
  if(S.db){
    S.loadTimer=setTimeout(()=>{if(!S.loaded){S.err="저장소에 아직 연결되지 않았어요. 잠시 후 다시 확인해 주세요.";render();}},10000);
    S.auth.onAuthStateChanged(u=>{
      S.authUser=u;
      if(!u){S.auth.signInAnonymously().catch(()=>{S.loaded=true;render();});return;}
      updatePerms();syncSubs(true);
    });
  }
  route();
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else setTimeout(boot,0);
// ---------- data subscriptions (권한에 따라 읽을 수 있는 것만) ----------
let _unlockIds=[];try{_unlockIds=JSON.parse(localStorage.getItem("trpg-unlocked")||"[]");}catch(e){}
function saveUnlocks(){try{localStorage.setItem("trpg-unlocked",JSON.stringify(_unlockIds));}catch(e){}}
const SUB={mode:null,all:[],scen:{},sess:{},edQ:null,scData:{},sessData:{},edIds:[]};
function myEmail(){return String(S.authUser&&!S.authUser.isAnonymous&&S.authUser.email||"").toLowerCase();}
// 비밀번호로 연 시나리오는 보기·고치기 모두 가능
// 시나리오 목록·개요는 누구나 보고, 로그는 비밀번호로 연 사람만 (녹음 목록을 받아온 시나리오 = 열린 시나리오)
function isOpen(id){return S.canAdmin||(!!id&&(!!SUB.sessData[id]||(!!S.camps&&S.camps.some(c=>c.id===id&&c.kind==="camp")&&campOpen(campById(id)))));}
function canWriteScen(id){return !!id&&isOpen(id)&&!isExt(id);}
// 이 브라우저에서 고른 '나' (시나리오마다): 화자 key · "ext"(외부인 · 읽기만) · 없음
let _me={};try{_me=JSON.parse(localStorage.getItem("trpg-me")||"{}")||{};}catch(e){}
// 주인은 관리 페이지에 적은 '내 닉네임'과 같은 플레이어를 자동으로 '나'로 써요 (직접 고른 게 있으면 그게 먼저)
function ownerK(id){if(!S.canAdmin||!id)return "";const ns=(site().nicks||[]).map(x=>String(x).trim().toLowerCase()).filter(Boolean);if(!ns.length)return "";
  const sc=scenById(id);const p=(sc?.sp||[]).find(x=>ns.includes(pcSplit(x.name||"").name.trim().toLowerCase())||ns.includes(String(x.name||"").trim().toLowerCase()));return p?p.k:"";}
function myK(id){return id&&(_me[id]||ownerK(id)||(typeof campMeK==="function"?campMeK(id):"")||(typeof campSelfK==="function"?campSelfK(id):""))||"";}
function setMe(id,k){if(k)_me[id]=k;else delete _me[id];try{localStorage.setItem("trpg-me",JSON.stringify(_me));}catch(e){}}
function isExt(id){return !S.canAdmin&&myK(id)==="ext";}
function meSp(id){const k=myK(id),sc=scenById(id)||(typeof campScById==="function"?campScById(id):null);return k&&k!=="ext"&&sc?(sc.sp||[]).find(p=>p.k===k)||null:null;}
// 후기·댓글을 쓸 수 있는 사람: 연 시나리오에서 나를 고른 멤버 (주인은 언제나)
function canTalk(id){return isOpen(id)&&(S.canAdmin||!!meSp(id));}
function myUid(){return S.auth&&S.auth.currentUser?S.auth.currentUser.uid:"";}
// 처음 열 때 잠깐 기본값이 보이지 않게: 지난번에 본 사이트 정보(브라우저에 저장)나 페이지 제목으로 시작해요
const SITE_UNSET="사이트 이름을 정해주세요"; // 사이트 설정에 이름이 없을 때
const _initTitle=document.title||SITE_UNSET;
let _siteCache=null;try{_siteCache=JSON.parse(localStorage.getItem("trpg-site")||"null");}catch(e){}
const SITE_DEF={title:_initTitle,sub:"",icon:""};
if(_siteCache&&!S.site)S.site=_siteCache;
const site=()=>{const o={...SITE_DEF,...Object.fromEntries(Object.entries(S.site||{}).filter(([k,v])=>v!==undefined&&v!==null))};if(!String(o.title||"").trim())o.title=SITE_UNSET;return o;};
const isImgIcon=v=>/^(data:image\/|https?:\/\/)/.test(v||"");
function iconHTML(v,cls="sicon"){if(!v)return "";return isImgIcon(v)?`<img class="${cls}" src="${esc(v)}" alt="">`:`<span class="${cls}">${esc(v)}</span>`;}
// 브라우저 탭 제목: 메인은 사이트 이름, 시나리오·로그는 "시나리오 · 사이트 이름"
function setTitle(){const st=site();const sc=S.cid?scenById(S.cid):(S.sid&&S.meta?curScen():null);
  const t=sc&&sc.name?`${sc.name} · ${st.title}`:st.title;if(document.title!==t)document.title=t;}
function applySite(){
  const st=site();setTitle();
  let href;
  if(isImgIcon(st.icon))href=st.icon;
  else if(st.icon)href="data:image/svg+xml,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${st.icon.replace(/[<&>]/g,"")}</text></svg>`);
  let l=document.querySelector("link[rel=icon]");
  if(!href){if(l)l.remove();return;}
  if(!l){l=document.createElement("link");l.rel="icon";document.head.appendChild(l);}
  if(l.href!==href)l.href=href;
}
