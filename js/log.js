// 코코 로그방 · 로그 화면: 그리기·선택·글 고치기·단락·고유명사·녹음 재생·키보드
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- rendering ----------
const THEMES={"":{n:"양피지",d:"지금 기본 · 판타지",sw:["#efe3cc","#fff","#9c3d22","#c9a46a"]},wa:{n:"인세인",d:"인세인 룰에 자동 적용",sw:["#0a0a0a","#fcfcfb","#b0101a","#d4d4d4"]},deco:{n:"D&D",d:"D&D 룰에 자동 적용",sw:["#e9e4d6","#fbf8f0","#1f4a3d","#b08a3e"]},blue:{n:"블루 모던",d:"현대 · SF · 현대 수사",sw:["#eef3f9","#ffffff","#2563eb","#38bdf8"]}};
// 테마는 룰 시스템에 따라 자동으로 정해져요
// PC 번호: 플레이어 이름이 "PC1 코코"처럼 시작하면 번호를 동그라미 안에 넣고 이름에서는 빼요
const pcSplit=v=>{const m=String(v||"").match(/^\s*PC\s*(\d{1,2})\s*[.:·\-]?\s*(.+)$/i);return m?{n:m[1],name:m[2]}:{n:"",name:String(v||"")};};
const spDot=(p,style="")=>{const q=pcSplit(p.name);return `<span class="dot${q.n?" pcn":""}"${style?` style="${style}"`:""}>${q.n}</span>`;};
const spName=p=>esc(pcSplit(p.name).name);
// 인장(동그란 캐릭터 이미지): 올린 그림 → 없으면 GM은 GM 그림, 나머지는 캐릭터 이름 첫 글자
const avHTML=(p,gm)=>p.img?`<img src="${p.img}" alt="">`:gm?`<span class="gmav"><span class="gmw">GM</span></span>`:`<span class="ini">${esc((p.ch||pcSplit(p.name).name||"?").trim().slice(0,1))}</span>`;
// 룰 이름 표기: DnD·D＆D → D&D
const sysLabel=v=>String(v||"").replace(/\bD\s*(n|＆)\s*D\b/gi,"D&D");
// 완주 도장: 시나리오 이름으로 각도·위치·잉크를 정해요 (항상 같은 모양)
function stampHTML(sc,word){
  if(!sc||!sc.done&&!word)return "";
  let x=2166136261;for(const c of sc.name||sc.id||"")x=Math.imul(x^c.codePointAt(0),16777619)>>>0;
  const st=`--sr:${-26+x%23}deg;--sx:${(x>>>5)%13-6}px;--sy:${(x>>>9)%9-4}px;opacity:${(0.74+((x>>>13)%13)/100).toFixed(2)}`;
  return `<span class="donestamp${word==="종료"?" end":""}" style="${st}" title="${word||"완주"}${sc.doneAt?" · "+esc(sc.doneAt):""}">${word||"완주"}</span>`;
}
function themeOf(sc){
  const r=String(effSys(sc)).toLowerCase().replace(/\s+/g,"");
  if(/인세인|insane/.test(r))return "wa";
  if(/d&d|dnd|d＆d|디앤디|던전앤드래곤|던전&드래곤|dungeons/.test(r))return "deco";
  if(/더블크로스|doublecross|덥크|^dx(\d|$)|^dx3/.test(r))return "dx";
  return "plain";
}
function applyTheme(){
  if(S.gid&&!S.sid&&!S.cid){const c=campById(S.gid);const t=c&&c.system?themeOf({system:c.system}):"plain";if((document.body.dataset.theme||"")!==t)document.body.dataset.theme=t;document.body.dataset.page="scen";return;}
  const sc=S.revPage?S.revPage.sc:S.cid?(S.scEdit&&S.scDraft?S.scDraft:scenById(S.cid)):(S.sid&&S.meta?curScen():null);
  // 시나리오 정보가 아직 안 왔으면 양피지 대신 메인 화면 색으로 기다려요
  const t=S.revPage?(sc?themeOf(sc):"plain"):!S.cid&&!S.sid&&!S.local?"plain":!sc&&!S.local?"plain":themeOf(sc);
  if((document.body.dataset.theme||"")!==t){if(t)document.body.dataset.theme=t;else delete document.body.dataset.theme;}
  document.body.dataset.page=S.revPage?"scen":S.cid?"scen":S.sid?"log":"home";
}
function render(){try{bkAuto();}catch(e){}
  const app=$("#app");
  refreshCanWrite();applyTheme();if(typeof setTitle==="function")setTitle();
  if(document.body.classList.contains("booking")!==!!S.book){document.body.classList.toggle("booking",!!S.book);document.documentElement.classList.toggle("booking",!!S.book);}
  if(S.book){const ae=document.activeElement;if(S.book.mode==="edit"&&ae&&ae.closest&&ae.closest("#bksheet")&&$("#bksheet"))return;
    app.innerHTML=bookHTML();bindBook();return;}
  if(S.revPage){app.innerHTML=revPageHTML();return;}
  if(S.up&&!S.sid&&!S.cid){app.innerHTML=upHTML();bindUp();return;}
  if(S.gid&&!S.sid&&!S.cid){app.innerHTML=campPageHTML();bindCamp();return;}
  if(S.cid){app.innerHTML=scenHTML();bindScen();return;}
  if(!S.sid&&S.admin){app.innerHTML=adminHTML();bindAdmin();return;}
  if(!S.sid&&!S.admin&&document.activeElement&&document.activeElement.id==="hq"&&$("#sesslist")&&!S.hqFull){refreshCanWrite();homeSoft();return;}
  if(!S.sid){const ae=document.activeElement,keep=ae&&ae.id==="hq"?[ae.selectionStart,ae.selectionEnd]:null;S.hqRender=true;
    app.innerHTML=homeHTML();bindHome();if(keep){const n=$("#hq");if(n){n.focus();try{n.setSelectionRange(keep[0],keep[1]);}catch(e){}}}S.hqRender=false;return;}
  app.innerHTML=`
  <header id="hdr"></header>
  <div class="wrap ${S.canWrite?"":"ro"}">
    <aside id="side"></aside>
    <main>
      <div class="tools">
        <input type="search" id="q" placeholder="검색 (예: NPC 이름, 단서)" value="${esc(S.q)}">
        <span class="status" id="qcount"></span>
        <button class="ghost" id="copyAll" title="보이는 로그를 텍스트로 복사">텍스트 복사</button>
      </div>
      ${S.err?`<div class="notice bad">${esc(S.err)}</div>`:""}
      ${S.local?`<div class="notice">미리보기 모드예요. 여기서 고친 내용은 저장되지 않아요.</div>`:""}
      <div class="logbox"><div id="log"></div><div id="cmcol"></div></div>
    </main>
  </div>
  <footer id="pbar"></footer>`;
  renderHeader();renderSide();renderAllRows();bindSession();
}

function renderHeader(){
  const h=$("#hdr");if(!h)return;
  const a=$("#aud");
  h.innerHTML=`
    <div class="bar">
      ${S.meta?(()=>{const i=info(S.meta);const sib=siblings();const n=dayIndex();return `
      <div class="crumb"><h1 title="세션 페이지 보기"><a class="scl" href="#c-${esc(curScen()?.id||"")}">${esc(i.scen)}</a></h1>
        <span class="status">${n?n+"회차 · ":""}${esc(fmtDay(i.day))}</span></div>
      <div class="pnav">${(sib.length?sib:[{id:S.sid,part:i.part}]).map(p=>`<a class="pchip${p.id===S.sid?" on":""}" href="#s-${esc(p.id)}">${p.part}부</a>`).join("")}</div>
`;})():`<h1>${S.local?"미리보기":"불러오는 중…"}</h1>`}
      <span class="sp"></span>
      <span class="status" id="save"></span>
      <button class="ghost" id="help">단축키</button>
    </div>`;
  const pb=$("#pbar");
  if(pb)pb.classList.toggle("noaud",S.meta?.src==="ccfolia"&&!S.meta?.audioPath);
  if(pb)pb.innerHTML=`
    <div class="player">
      ${S.meta?.audioPath?`<span class="cloud" title="${esc(S.meta.audioName||"")}">${S.audioLoading?"☁ 녹음 불러오는 중…":S.audioCloud?"☁ 녹음 연결됨":"☁ 녹음 있음"}</span>`:S.canAdmin&&S.meta&&!S.local&&S.storage?`<span class="filebtn"><button class="ghost">⬆ 녹음 올리기</button><input type="file" id="upaudio" accept="audio/*,video/*,.m4a,.mp3,.wav,.ogg,.webm"></span>`:""}
      ${S.meta?.audioPath?"":safeUrl(S.meta?.audio)?`<a class="dl" href="${esc(safeUrl(S.meta.audio))}" target="_blank" rel="noopener" title="새 창에서 열려요. 받은 파일을 오른쪽 버튼으로 열면 돼요">⬇ 녹음 받기</a>`:(S.canWrite&&S.meta&&!S.local?`<button class="ghost" id="addaudio" title="구글 드라이브 같은 곳의 공유 링크를 붙여두면 멤버들이 받아갈 수 있어요">+ 녹음 링크</button>`:"")}
      <button id="pp" ${S.audioUrl?"":"disabled"}>▶</button>
      <button id="bk" class="ghost" ${S.audioUrl?"":"disabled"} title="5초 뒤로">−5s</button>
      <button id="fw" class="ghost" ${S.audioUrl?"":"disabled"} title="5초 앞으로">+5s</button>
      <span class="time" id="tm">${S.audioUrl?"0:00 / 0:00":S.meta?.audioPath?"녹음 불러오는 중…":"녹음이 올라오면 대사 시간을 눌러 들을 수 있어요"}</span>
      <input type="range" id="seek" min="0" max="1000" value="0" ${S.audioUrl?"":"disabled"}>
      <select id="rate" ${S.audioUrl?"":"disabled"}><option>0.75</option><option selected>1</option><option>1.25</option><option>1.5</option><option>2</option></select>
      <label class="chk" title="재생 중인 대사로 화면이 따라가요. 직접 스크롤하거나 대사를 고치면 자동으로 꺼져요"><input type="checkbox" id="follow" ${S.follow?"checked":""}>따라가기</label>
      <button class="ghost hidden" id="jump" title="지금 재생 중인 대사로 이동">▸ 재생 위치로</button>
    </div>`;
  if(!a){const el=document.createElement("audio");el.id="aud";el.preload="metadata";document.body.appendChild(el);bindAudio(el);}
  else{ $("#rate").value=String(a.playbackRate);syncPlayer(); }
  bindHeader();renderStatus();renderAuth();
  requestAnimationFrame(()=>{document.documentElement.style.setProperty("--hdr",(h.offsetHeight)+"px");const pb=$("#pbar");if(pb)document.documentElement.style.setProperty("--pbar",(pb.offsetHeight)+"px");});
}

function renderStatus(){
  const el=$("#save");if(!el)return;
  if(S.local){el.textContent="저장 안 됨(미리보기)";el.className="status";return;}
  if(!S.canWrite){el.textContent="읽기 전용";el.className="status";return;}
  const busy=S.dirty.size||S.inflight.size||S.metaBusy||Object.values(S.scBusy).some(Boolean);
  if(S.err&&!busy){el.textContent="⚠ 저장 실패";el.className="status bad";return;}
  el.textContent=busy?"저장 중…":"✓ 모두 저장됨";el.className="status "+(busy?"":"ok");
}

function renderSide(){
  const side=$("#side");if(!side)return;
  const c=counts();
  const sp=shownSp();
  const hidden=spList().filter(s=>s.k!==ALL&&!(c[s.k]>0)&&!isGM(s.k)&&!S.fresh.has(s.k)).length;
  side.innerHTML=`
    <button class="foldh${S.openSp?" open":""}" data-fold="openSp"><span class="car">▸</span>플레이어 <span class="fc">${sp.length+1}</span><span class="fsub">클릭하면 그 사람만 보기</span></button>
    <div class="fold${S.openSp?" open":""}">
    ${curScen()?`<div class="tip" style="margin:-4px 0 8px">이 목록은 '${esc(curScen().name)}'의 모든 녹음이 같이 써요. ⋯에서 캐릭터 이름을 넣으면 로그에 플레이어와 같이 나와요.</div>`:""}
    <div id="splist">${sp.map((s,i)=>`
      <div class="spk ${S.spFilter===s.k?"on":""}" data-k="${s.k}" style="--c:${fixC(s.c)}">
        <span class="key">${i<9?i+1:""}</span>${spDot(s)}
        <span class="nm" data-act="filter" title="${esc(s.name)}">${isGM(s.k)?gmTag+" ":""}${spName(s)}${s.ch?` <small>${esc(s.ch)}</small>`:""}</span>
        <span class="cnt" data-cnt="${s.k}">${c[s.k]||0}</span>
        ${S.canWrite?`<button class="ghost more" data-act="menu" title="이름 바꾸기·합치기">⋯</button>`:""}
      </div>`).join("")}
      <div class="spk ${S.spFilter===ALL?"on":""}" data-k="${ALL}" style="--c:${ALLSP.c}">
        <span class="key">0</span><span class="dot"></span>
        <span class="nm" data-act="filter" title="여러 명이 동시에 말한 대사">${ALLSP.name}</span>
        <span class="cnt" data-cnt="${ALL}">${c[ALL]||0}</span>
      </div></div>
    ${hidden?`<button class="ghost zt" id="zerot">${S.showZero?"대사 없는 화자 숨기기":`이 녹음에 대사 없는 화자 ${hidden}명 보기`}</button>`:""}
    ${S.canWrite?`<div class="addsp"><input type="text" id="newsp" placeholder="새 플레이어 이름"><button id="addsp">추가</button></div>`:""}
    </div>
    ${(()=>{const ss=allSecs();return `<button class="foldh${S.openSec?" open":""}" data-fold="openSec"><span class="car">▸</span>단락 <span class="fc">${ss.length}</span><span class="fsub">세션 전체 · 누르면 이동</span></button>
    <div class="fold${S.openSec?" open":""}">
      <div class="secs">${(()=>{const days=[...new Set(S.sessions.map(info).filter(i=>S.meta&&i.scen===info(S.meta).scen).map(i=>i.day))].sort();const multi=new Set(ss.map(x=>x.day)).size>1||(ss.length&&ss[0].day!==(S.meta&&info(S.meta).day));let last=null;
        // '하' 단락은 바로 위 상·중 단락 아래에 접어 둬요
        let par=null;const kids={};ss.forEach(x=>{if(x.lv<3)par=x.id;else if(par){x.par=par;kids[par]=(kids[par]||0)+1;}});
        S.secOpen=S.secOpen||new Set();
        return ss.map(x=>{const h=multi&&x.day!==last?`<div class="secday">${days.indexOf(x.day)+1}회차 · ${esc(fmtDay(x.day))}</div>`:"";last=x.day;
          if(x.par&&!S.secOpen.has(x.par))return h;
          const k=kids[x.id],open=S.secOpen.has(x.id);
          return h+`<div class="secr"><button class="secb l${x.lv}${x.sid===S.sid?"":" other"}" data-sec="${x.sid}|${x.id}"><span class="sp">${x.part}부</span>${esc(x.x||"(이름 없음)")}</button>${k?`<button class="sectog${open?" open":""}" data-sectog="${x.id}" title="'하' 단락 ${k}개 ${open?"접기":"펼치기"}"><span class="car">▸</span>${k}</button>`:""}</div>`;}).join("")})()||'<div class="tip" style="padding:2px 4px 6px">아직 나눈 단락이 없어요</div>'}</div>
      ${S.canWrite?`<div class="secadd"><span>대사를 골라 두고 누르면, 그 대사 위에 단락이 생겨요</span><button class="ghost" id="addsec" data-lv="1" title="큰 단락 (예: 메인 페이즈)">＋ 상</button><button class="ghost" data-lv="2" title="중간 단락 (예: 1사이클)">＋ 중</button><button class="ghost" data-lv="3" title="작은 단락 (예: 씬)">＋ 하</button></div>`:""}
    </div>`;})()}
    ${curScen()?`<button class="foldh${S.openNoun?" open":""}" data-fold="openNoun"><span class="car">▸</span>고유명사 <span class="fc">${nounGroups().length}</span><span class="fsub">글자를 드래그해서 바꿔요</span></button>
    <div class="fold${S.openNoun?" open":""}">
    <div class="nouns">${nounGroups().map(g=>`<button class="noun${g.pc?" pc":""}" data-nedit="${esc(g.n)}" title="${S.canWrite?"눌러서 유의어 고치기":""}"><b>${esc(g.n)}</b>${g.a.length?`<small>${g.a.map(esc).join(" · ")}</small>`:""}${g.pc?'<span class="pct">PC</span>':""}</button>`).join("")||'<span class="tip">아직 없어요</span>'}</div>
    ${S.canWrite?`<button class="ghost zt" id="addnoun">＋ 고유명사 묶음 추가</button>`:""}
    </div>`:""}
    ${(()=>{const hs=allHands();const days=[...new Set(S.sessions.map(info).filter(i=>S.meta&&i.scen===info(S.meta).scen).map(i=>i.day))].sort();const multi=new Set(hs.map(x=>x.day)).size>1;
      return `<button class="foldh${S.openHand?" open":""}" data-fold="openHand"><span class="car">▸</span>핸드아웃 <span class="fc">${hs.length}</span><span class="fsub">세션 전체 · 누르면 이동</span></button>
    <div class="fold${S.openHand?" open":""}"><div class="secs">${hs.map(h=>`<button class="secb${h.sid===S.sid?"":" other"}" data-sec="${h.sid}|${h.id}" title="${esc((h.x||"").slice(0,80))}"><span class="sp">${multi?(days.indexOf(h.day)+1)+"회 ":""}${h.part}부</span>📜 ${esc(h.ti||(h.x||"").split("\n")[0].slice(0,24)||"(제목 없음)")}</button>`).join("")||'<div class="tip" style="padding:2px 4px 6px">아직 핸드아웃이 없어요. 대사를 고르고 <kbd>H</kbd>를 눌러 넣어요.</div>'}</div></div>`;})()}
    <h3 class="tip usage">자주 쓰는 조작 <button class="ghost tiny" id="help2">전체 보기 <kbd>?</kbd></button></h3>
    <div class="tip usage">
      클릭 고르기 · <kbd>Shift</kbd>+클릭/드래그 여러 줄 · 더블클릭·<kbd>Enter</kbd> 고치기<br>
      <kbd>1</kbd>~<kbd>9</kbd> 화자 · <kbd>C</kbd> 잡담 · <kbd>X</kbd> 빼기 · <kbd>B</kbd> 본세션 시작<br>
      <kbd>N</kbd> 묘사 · <kbd>D</kbd> 주사위 · <kbd>H</kbd> 핸드아웃 · <kbd>S</kbd> 단락 · <kbd>M</kbd> 위와 합치기 · <kbd>Del</kbd> 지우기<br>
      글자를 드래그하면 떼어내기·고유명사 메뉴 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 되돌리기
    </div>
    ${S.meta&&S.meta.src==="ccfolia"&&!S.meta.t0&&S.canWrite?`<div class="tip t0fix">이 로그는 예전에 올려서 실제 시각이 없어요. <button class="ghost" id="t0fix">🕘 코코포리아 html 다시 골라 실제 시각 넣기</button><input type="file" id="t0file" accept=".html,.htm" hidden></div>`:""}
    <div class="homefoot sidefoot"><button class="ghost" id="back" title="세션 목록">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div>`;
  bindSide();
}
function renderSideCounts(){const c=counts();document.querySelectorAll("[data-cnt]").forEach(el=>el.textContent=c[el.dataset.cnt]||0);}

// 등록된 고유명사는 로그 화면에서만 블럭으로 표시 (HTML로 받을 땐 안 보여요)
let _nre={k:null,re:null};
const NOUN_PRE="(?<![가-힣ㄱ-ㅎA-Za-z0-9])";
const nounIn=(txt,w)=>!!w&&new RegExp(NOUN_PRE+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(txt||"");
function nounRe(){
  const list=S.meta?[...new Set(nouns())].filter(Boolean).sort((a,b)=>b.length-a.length):[];
  const k=list.join("\u0001");
  // 낱말 앞이 한글·영문·숫자면 다른 낱말의 일부로 봐요 (예: '록'이 '초록색' 안에서 잡히지 않게) · 뒤에 붙는 조사는 괜찮아요
  if(_nre.k!==k)_nre={k,re:list.length?new RegExp(NOUN_PRE+"(?:"+list.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")+")","g"):null};
  return _nre.re;
}
function hlq(h){
  if(S.q){const q=esc(S.q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");h=h.replace(new RegExp(q,"gi"),m=>`<mark>${m}</mark>`);}
  return h;
}
// **강조** → 굵게. 별표는 숨겨 두기만 해서(글자 위치 계산이 안 틀어지게) 원문은 그대로예요
const emph=h=>h.replace(/\*\*([^*\n]+?)\*\*/g,'<strong class="em"><span class="mk">**</span>$1<span class="mk">**</span></strong>');
function hl(text){return emph(hl0(text));}
function hl0(text){
  const re=nounRe();
  if(re){let out="",last=0;text=String(text);re.lastIndex=0;let m;
    while((m=re.exec(text))){out+=hlq(esc(text.slice(last,m.index)))+`<span class="nb">${hlq(esc(m[0]))}</span>`;last=m.index+m[0].length;}
    return out+hlq(esc(text.slice(last)));}
  let h=esc(text);
  if(S.q){const q=esc(S.q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");h=h.replace(new RegExp(q,"gi"),m=>`<mark>${m}</mark>`);}
  return h;
}
const NOTE="__note",DICE="__dice",HAND="__hand",SEC="__sec";
// 리플레이북 표시: bk 0=본문 1=잡담 2=빼기 · 코코포리아 잡담 채널은 따로 안 고르면 잡담
const CHAT_TAB=/잡담|雑談|chat|other/i;
// 본세션 시작 줄: 직접 고른 줄(bstart) · 없으면 코코포리아처럼 0:00 앞 줄이 있을 때 0:00 첫 줄 · 그것도 없으면 처음부터
function startIdOf(list){
  const e=list.find(b=>b.bstart);if(e)return e.id;
  if(!list.length||!(list[0].t<0))return null;
  const f=list.find(b=>b.t>=0);return f?f.id:null;}
// 본세션 시작 줄 앞은 따로 안 고르면 빼기 (로그 페이지·리플레이북이 각자 채워요)
const PRE={log:new Set(),book:new Set()};
function preIds(list){const st=startIdOf(list),out=new Set();if(!st)return out;
  const i=list.findIndex(b=>b.id===st),keep=new Set();
  // 시작 줄 바로 위의 단락 제목은 본세션 쪽으로 (책에 같이 들어가요) · 사이에 낀 잡담 채널 줄은 건너뛰고 봐요
  for(let j=i-1;j>=0;j--){const b=list[j];if(b.s===SEC){keep.add(b.id);continue;}if(b.tab&&CHAT_TAB.test(b.tab))continue;break;}
  for(let k=0;k<i;k++)if(!keep.has(list[k].id))out.add(list[k].id);return out;}
function bkOf(b){if(!b)return 0;if(b.bk!=null)return b.bk;if(PRE.log.has(b.id)||PRE.book.has(b.id))return 2;return b.tab&&CHAT_TAB.test(b.tab)&&![NOTE,DICE,HAND,SEC].includes(b.s)?1:0;}
const OUT={success:"Success",failure:"Failure",critical:"Critical",fumble:"Fumble"};
// 룰에 맞춘 표기: 인세인은 크리티컬 대신 스페셜
const outLabel=(o,sc)=>o==="critical"&&themeOf(sc===undefined?curScen():sc)==="wa"?"Special":OUT[o];
const RULE_PH={
  wa:{sec:["예: 메인 페이즈","예: 1사이클","예: ○○의 씬"],judge:"판정 (선택) 예: 〈추적〉",res:"결과 예: 2D6 → 8 (목표 5)"},
  deco:{sec:["예: 1장 · 모험의 시작","예: 마을 조사","예: 전투 1라운드"],judge:"판정 (선택) 예: 지각(WIS)",res:"결과 예: 1d20+5 → 18 (DC 15)"},
  "":{sec:["예: 메인 페이즈","예: 1사이클","예: 씬 1"],judge:"판정 (선택) 예: 지각",res:"결과 예: 1d20+3 → 17"}};
const rulePH=()=>RULE_PH[themeOf(curScen())]||RULE_PH[""];
// 핸드아웃의 '[정보]', '[비밀]'로 시작하는 줄은 라벨로 (원문 글자는 그대로 둬요)
const HSEC=/^(\s*[【\[]?(정보|비밀)[】\]]?\s*[:：]?\s*)/;
function handLine(l){const m=l.match(HSEC);if(!m)return hl(l);const sec=m[2]==="비밀";
  return `<span class="hsecw${sec?" secret":""}" data-l="${sec?"비밀":"정보"}"><span class="mk">${esc(m[1])}</span></span>${hl(l.slice(m[1].length))}`;}
function diceInner(b){
  const p=b.w?spBy(b.w):null;
  if(!p&&!b.r&&!b.o&&!b.x&&!b.sec)return '<span class="ph">🎲 주사위 — ✎를 눌러 입력</span>';
  return `<span class="dd">🎲</span>${b.a?`<b class="dw">${esc(b.a)}</b>`:p?`<b class="dw">${esc(p.ch||p.name)}</b>`:""}${b.x?`<span class="dl">${hl(b.x)}</span>`:""}${b.r?`<span class="dr">${hl(b.r)}</span>`:""}${b.sec?`<span class="dres secret">Secret Dice</span>`:""}${b.o&&OUT[b.o]?`<span class="dres ${b.o}">${outLabel(b.o)}</span>`:""}`;
}
// 예전에 올린 코코포리아 회차들에 실제 시작 시각(t0)을 넣어요: 같은 시나리오·같은 날짜 회차와 짝지어서
async function fixT0(html){
  const parsed=parseCcfolia(html);if(!parsed)throw new Error("코코포리아 로그 html이 아니에요");
  const cur=S.sessions.find(s=>s.id===S.sid);if(!cur)return 0;const scen=info(cur).scen;
  const mine=S.sessions.filter(s=>info(s).scen===scen&&s.src==="ccfolia"&&!s.t0);
  let n=0;
  for(const s of mine){const i=info(s);
    const cands=parsed.days.map(d=>d.find(m=>m.ch==="main"&&!m.sys)||d[0]).filter(m=>m&&kst(m.t)===i.day);
    const m0=cands[(i.part||1)-1]||cands[0];if(!m0)continue;
    await S.db.doc(`sessions/${s.id}`).update({t0:m0.t});s.t0=m0.t;if(s.id===S.sid&&S.meta)S.meta.t0=m0.t;n++;}
  renderSide();renderAllRows(true);return n;
}
function setStart(id){
  if(!S.canWrite)return;const e=S.byId.get(id);if(!e)return;
  const ops=S.flat.filter(x=>x.b.bstart&&x.b.id!==id).map(x=>({ci:x.ci,op:{t:"set",id:x.b.id,f:{bstart:undefined}}}));
  if(!e.b.bstart)ops.push({ci:e.ci,op:{t:"set",id,f:{bstart:1}}});
  if(!ops.length)return;doOps(ops,"본세션 시작 줄 정하기");renderAllRows(true);toast("이 줄부터 본세션 · 리플레이북도 여기서 시작해요");
}
function rowHTML(e,prev){
  if(e.b.s===SEC){const b=e.b;
    return `<div class="row sec l${secLv(b)}${isSel(b.id)?" sel":""}" data-id="${b.id}">
    <button class="ts" data-act="seek" title="여기서 재생">${fmtLog(b.t)}</button>
    <div class="body"><div class="tx"><span class="ln">${b.x?hl(b.x):'<span class="ph">단락 이름</span>'}</span></div></div>
    <div class="act">
      <button class="w" data-act="edit" title="이름 고치기 (Enter · 더블클릭)">✎</button>
      <span class="w lvb" title="단락 단계">${[1,2,3].map(l=>`<button data-act="lv" data-lv="${l}" class="${secLv(b)===l?"on":""}">${"상중하"[l-1]}</button>`).join("")}</span>
      <button class="w" data-act="del" title="단락 나누기 지우기 (Delete)">🗑</button>
    </div></div>`;}
  if(e.b.s===HAND){const b=e.b;
    return `<div class="row${bkOf(b)===2?" bk-cut":""} hand${isSel(b.id)?" sel":""}${S.playingId===b.id?" playing":""}" data-id="${b.id}">
    <button class="ts" data-act="seek" title="여기서 재생">${fmtLog(b.t)}</button>
    <div class="body"><div class="hlab">📜 ${b.ti?`<b class="hti">${esc(b.ti)}</b>`:"핸드아웃"}</div><div class="tx">${b.x?`<span>${b.x.split("\n").map(l=>`<span class="ln">${handLine(l)}</span>`).join("<br>")}</span>`:'<span class="ph">핸드아웃 내용 · [정보] / [비밀]로 시작하는 줄은 라벨이 붙어요</span>'}</div></div>
    <div class="act">${cmBtn()}
      <button class="w" data-act="edit" title="글 수정 (Enter · 더블클릭)">✎</button>
      <button class="w" data-act="up" title="위 줄과 합치기 (M)">⤒</button>
      <button class="w" data-act="who" title="대사로 바꾸기">👤</button>
      <button class="w" data-act="note" title="아래에 상황 묘사 추가 (N)">＋상황</button>
      <button class="w" data-act="del" title="삭제 (Delete)">🗑</button>
    </div></div>`;}
  if(e.b.s===DICE){const b=e.b,p=b.w?spBy(b.w):null;
    return `<div class="row${bkOf(b)===2?" bk-cut":""} dice${isSel(b.id)?" sel":""}${S.playingId===b.id?" playing":""}" data-id="${b.id}" style="--c:${p?fixC(p.c):"#8a8178"}">
    <button class="ts" data-act="seek" title="여기서 재생">${fmtLog(b.t)}</button>
    <div class="body"><div class="tx">${diceInner(b)}</div></div>
    <div class="act">${cmBtn()}
      <button class="w" data-act="edit" title="주사위 수정 (Enter · 더블클릭)">✎</button>
      <button class="w" data-act="note" title="아래에 상황 묘사 추가 (N)">＋상황</button>
      <button class="w" data-act="dice" title="아래에 주사위 추가 (D)">＋🎲</button>
      <button class="w" data-act="del" title="삭제 (Delete)">🗑</button>
    </div></div>`;}
  if(e.b.s===NOTE){const b=e.b;
    return `<div class="row${bkOf(b)===2?" bk-cut":""} note${b.st?" stat":""}${b.tab?" tabbed":""}${S.startId===b.id?" bstart":""}${isSel(b.id)?" sel":""}${S.playingId===b.id?" playing":""}" data-id="${b.id}">
    <button class="ts" data-act="seek" title="여기서 재생">${fmtLog(b.t)}</button>
    <div class="body"><div class="tx">${b.x?`<span>${b.x.split("\n").map(l=>`<span class="ln">${hl(l)}</span>`).join("<br>")}</span>`:'<span class="ph">상황 묘사</span>'}</div></div>
    <div class="act">${cmBtn()}
      <button class="w" data-act="note" title="아래에 상황 묘사 추가 (N)">＋상황</button>
      <button class="w" data-act="dice" title="아래에 주사위 추가 (D)">＋🎲</button>
      <button class="w" data-act="who" title="대사로 바꾸기">👤</button>
      <button class="w" data-act="edit" title="글 수정 (Enter · 더블클릭)">✎</button>
      <button class="w" data-act="bstart" title="여기서 본세션 시작 · 리플레이북은 이 줄부터 (B)">▶</button>
      <button class="w" data-act="del" title="삭제 (Delete)">🗑</button>
    </div></div>`;}
  const b=e.b,s=spBy(b.s),lines=b.x.split("\n"),gm=isGM(s.k),bk=bkOf(b);
  // 잡담은 이름과 한 줄로(캐릭터 이름 없이), 매 줄 이름을 보여요
  // 잡담은 잡담끼리, 본문은 본문끼리 이어지는지 봐요
  const pbk=prev?bkOf(prev.b):-1,first=!prev||(pbk===1)!==(bk===1)||prev.b.s!==b.s||(bk!==1&&(prev.b.a||"")!==(b.a||""))||(bk!==1&&(prev.b.tab||"")!==(b.tab||""))||b.t-prev.b.t>120;
  const tx=lines.map((l,i)=>(i?`<button class="cut" data-act="cut" data-line="${i}" tabindex="-1" title="여기서 나눠서 다른 화자로 지정할 수 있게 해요">✂</button>`:"")+`<span class="ln">${hl(l)}</span>`).join(" ");
  const q=pcSplit(s.name),label=(gm?gmTag:q.n?`<span class="pcn">${q.n}</span>`:"")+esc(q.name),sub=bk===1?"":(b.a?esc(b.a):s.ch?esc(s.ch):"")+(b.tab&&!CHAT_TAB.test(b.tab)?`<span class="tabchip">${esc(b.tab)}</span>`:"");
  return `<div class="row${first?" first":""}${gm?" gm":""}${b.tab?" tabbed":""}${bk===1?" bk-ooc":bk===2?" bk-cut":""}${S.startId===b.id?" bstart":""}${isSel(b.id)?" sel":""}${S.playingId===b.id?" playing":""}" data-id="${b.id}" style="--c:${fixC(s.c)}">
    <button class="ts" data-act="seek" title="여기서 재생">${fmtLog(b.t)}</button>
    <div class="body">
      ${first?`<button class="who" data-act="who" title="클릭해서 화자 바꾸기">${label}${sub?`<small>${sub}</small>`:""}</button>`:""}
      <div class="tx">${tx}</div>
    </div>
    <div class="act">${cmBtn()}
      <button class="w" data-act="who" title="화자 바꾸기 (숫자키)">👤</button>
      <button class="w" data-act="edit" title="글 수정 (Enter · 더블클릭)">✎</button>
      <button class="w" data-act="up" title="위 대사와 합치기 (M)">⤒</button>
      <button class="w" data-act="note" title="아래에 상황 묘사 추가 (N)">＋상황</button>
      <button class="w" data-act="dice" title="아래에 주사위 추가 (D)">＋🎲</button>
      <button class="w" data-act="bstart" title="여기서 본세션 시작 · 리플레이북은 이 줄부터 (B)">▶</button>
      <button class="w" data-act="del" title="삭제 (Delete)">🗑</button>
    </div></div>`;
}
function cmBtn(){const id=cmScid();return S.db&&!S.local&&id&&isOpen(id)&&!isExt(id)?`<button class="cmw" data-act="cm" title="이 줄에 댓글">💬</button>`:"";}
function visible(e){
  if(e.b.s===SEC)return true;
  if(S.spFilter&&e.b.s!==S.spFilter&&!(e.b.s===DICE&&e.b.w===S.spFilter))return false;
  if(S.q&&!(e.b.x+" "+(e.b.r||"")).toLowerCase().includes(S.q.toLowerCase()))return false;
  return true;
}
function renderAllRows(keepScroll){
  const log=$("#log");if(!log)return;
  let anchor=null,off=0;
  if(keepScroll){for(const r of log.children){const rc=r.getBoundingClientRect();if(rc.bottom>130){anchor=r.dataset.id;off=rc.top;break;}}}
  if(!S.flat.length){
    log.innerHTML=S.local||!S.db||(S.loaded&&S.chunksLoaded)?`<div class="notice">아직 대사가 없어요.</div>`:loaderHTML();
    $("#qcount")&&($("#qcount").textContent="");return;
  }
  const vis=S.flat.filter(visible);{const all=S.flat.map(e=>e.b);S.startId=startIdOf(all);PRE.log=preIds(all);}
  // 고치는 중인 줄은 다시 그리지 않고 그대로 둬요 (다른 사람 수정이 들어와도 입력이 안 날아가게)
  const ed=log.querySelector(".row.editing"),fa=ed&&ed.contains(document.activeElement)?document.activeElement:null;
  const sel=fa&&"selectionStart" in fa?[fa.selectionStart,fa.selectionEnd]:null;
  S.rerendering=true;
  log.innerHTML=vis.map((e,i)=>rowHTML(e,vis[i-1])).join("")||`<div class="notice">조건에 맞는 대사가 없어요.</div>`;
  if(ed){const nr=log.querySelector(`.row[data-id="${ed.dataset.id}"]`);if(nr){nr.replaceWith(ed);if(fa){fa.focus({preventScroll:true});if(sel)try{fa.setSelectionRange(...sel);}catch(e){}}}}
  S.rerendering=false;
  const qc=$("#qcount");if(qc)qc.textContent=(S.q||S.spFilter)?`${vis.length}개`:`${S.flat.length}개 대사`;
  if(anchor){const r=log.querySelector(`[data-id="${anchor}"]`);if(r)window.scrollBy(0,r.getBoundingClientRect().top-off);}
  renderCmMarks();cmLayout();
}
function updateRow(id){
  const old=document.querySelector(`.row[data-id="${id}"]`);const e=S.byId.get(id);
  if(!old||!e)return;
  if(!visible(e)){renderAllRows(true);return;}
  const t=document.createElement("div");t.innerHTML=rowHTML(e,prevVis(e));const nr=t.firstElementChild;old.replaceWith(nr);
  const nx=nr.nextElementSibling;if(nx&&nx.dataset.id&&!nx.classList.contains("editing")){const ne=S.byId.get(nx.dataset.id);if(ne){t.innerHTML=rowHTML(ne,e);nx.replaceWith(t.firstElementChild);}}
  renderCmMarks();clearTimeout(S.cmLt);S.cmLt=setTimeout(cmLayout,60);
}
function prevVis(e){let i=S.flat.indexOf(e)-1;while(i>=0&&!visible(S.flat[i]))i--;return i>=0?S.flat[i]:null;}

// ---------- selection & popovers ----------
// 고르기: S.sel(지금 줄) · S.anchor(Shift로 넓힐 때 기준) · S.selSet(여러 줄)
const isSel=id=>S.sel===id||!!(S.selSet&&S.selSet.has(id));
function paintSel(){document.querySelectorAll("#log .row.sel").forEach(r=>{if(!isSel(r.dataset.id))r.classList.remove("sel");});
  (S.selSet&&S.selSet.size?[...S.selSet]:[S.sel]).forEach(id=>{const r=id&&document.querySelector(`.row[data-id="${id}"]`);r&&r.classList.add("sel");});}
// 고른 줄들(로그 순서대로)
function selIds(){if(S.selSet&&S.selSet.size>1)return S.flat.filter(e=>S.selSet.has(e.b.id)).map(e=>e.b.id);return S.sel?[S.sel]:[];}
function selRange(toId){
  const from=S.anchor&&S.byId.has(S.anchor)?S.anchor:S.sel||toId;
  const vis=S.flat.filter(visible).map(e=>e.b.id),a=vis.indexOf(from),z=vis.indexOf(toId);if(a<0||z<0){select(toId);return;}
  const [i,j]=a<z?[a,z]:[z,a];S.anchor=from;S.sel=toId;S.selSet=new Set(vis.slice(i,j+1));paintSel();
  const r=document.querySelector(`.row[data-id="${toId}"]`);if(r){const rc=r.getBoundingClientRect();if(rc.top<120||rc.bottom>innerHeight-20)r.scrollIntoView({block:"nearest"});}
}
function select(id,scroll=true){
  S.sel=id;S.anchor=id;S.selSet=null;paintSel();
  const r=document.querySelector(`.row[data-id="${id}"]`);
  if(r){if(scroll){const rc=r.getBoundingClientRect();const top=(parseInt(getComputedStyle(document.documentElement).getPropertyValue("--hdr"))||110)+10;if(rc.top<top||rc.bottom>innerHeight-20)r.scrollIntoView({block:"center"});}}
}
function moveSel(d,extend){
  if(S.follow&&S.audioUrl&&!$("#aud").paused)setFollow(false);
  const rows=[...document.querySelectorAll("#log .row")];if(!rows.length)return;
  let i=rows.findIndex(r=>r.dataset.id===S.sel);
  i=i<0?0:Math.min(rows.length-1,Math.max(0,i+d));if(extend&&S.sel)selRange(rows[i].dataset.id);else select(rows[i].dataset.id);
}
function closePop(){$("#layer").innerHTML="";}
function popAt(anchor,html,bind){
  closePop();const rc=anchor.getBoundingClientRect();
  const p=document.createElement("div");p.className="pop";p.innerHTML=html;$("#layer").appendChild(p);
  const w=p.offsetWidth,h=p.offsetHeight;
  p.style.left=Math.max(8,Math.min(innerWidth-w-8,rc.left))+"px";
  p.style.top=(rc.bottom+h+8>innerHeight?Math.max(8,rc.top-h-4):rc.bottom+4)+"px";
  bind(p);
  setTimeout(()=>document.addEventListener("mousedown",function f(ev){if(!p.contains(ev.target)){closePop();document.removeEventListener("mousedown",f);}}),0);
}
function whoMenu(anchor,id){
  if(!S.canWrite)return;
  const cur=S.byId.get(id)?.b.s;
  const shown=shownSp(),rest=spList().filter(x=>x.k!==ALL&&!shown.includes(x));
  popAt(anchor,`<button data-k="${ALL}" style="--c:${ALLSP.c}"><span class="k">0</span><span class="dot"></span>${ALLSP.name}${cur===ALL?" ✓":""}</button>`+shown.concat(rest).map((s,i)=>`${i===shown.length&&rest.length?'<hr><div class="tip" style="padding:0 8px">이 녹음에 대사 없는 화자</div>':""}<button data-k="${s.k}" style="--c:${fixC(s.c)}"><span class="k">${i<9&&i<shown.length?i+1:""}</span><span class="dot"></span>${esc(s.name)}${s.k===cur?" ✓":""}</button>`).join("")+
    `<hr>${cur===NOTE?"":`<button data-k="${NOTE}"><span class="k"></span>▤ 상황 묘사로 바꾸기</button>`}${cur===HAND?"":`<button data-k="${HAND}"><span class="k"></span>📜 핸드아웃으로 바꾸기</button>`}<input type="text" placeholder="새 화자 입력 후 Enter" id="pnew">`,p=>{
    p.querySelectorAll("button[data-k]").forEach(b=>b.onclick=()=>{assign(id,b.dataset.k);closePop();});
    const inp=$("#pnew",p);inp.onkeydown=ev=>{if(ev.key==="Enter"){const k=addSpeaker(inp.value);if(k)assign(id,k);closePop();}if(ev.key==="Escape")closePop();};
  });
}
function spMenu(anchor,k){
  const s=spBy(k),c=counts()[k]||0;
  const others=spList().filter(x=>x.k!==k);
  popAt(anchor,`<input type="text" id="rn" value="${esc(s.name)}" placeholder="이름">
    <input type="text" id="rch" value="${esc(s.ch||"")}" placeholder="캐릭터 이름 (선택)">
    <button data-a="rename">저장</button>
    <button data-a="up">순서 위로 (숫자키 앞당기기)</button>
    ${curScen()?`<button data-a="gm">${isGM(k)?"GM 해제":"GM으로 지정 (맨 앞으로)"}</button>`:""}<hr>
    <div class="tip" style="padding:2px 8px">이 녹음에서 이 화자의 대사 ${c}개를 모두 다른 화자로 옮기기</div>
    ${others.map(o=>`<button data-to="${o.k}" style="--c:${fixC(o.c)}"><span class="dot"></span>→ ${esc(o.name)}</button>`).join("")}
    ${c===0?`<hr><button data-a="del" style="color:var(--bad)">목록에서 지우기</button>`:""}`,p=>{
    const rn=$("#rn",p),rch=$("#rch",p);
    const doRename=()=>{const v=rn.value.trim(),ch=rch.value.trim();const t=spTarget().find(x=>x.k===k)||(S.meta.sp||[]).find(x=>x.k===k);
      // 같은 세션에 같은 이름이 이미 있으면 하나로 합칠지 물어봐요
      const dup=v&&t&&v!==t.name?spList().find(x=>x.k!==k&&x.name===v&&(!ch||!x.ch||x.ch===ch)):null;
      if(dup){closePop();confirmBox(`'${v}'이(가) 이미 있어요. 둘을 하나로 합칠까요? 이 세션의 모든 녹음에서 '${t.name}'의 대사를 '${v}'(으)로 옮겨요.`,"합치기",()=>mergeSpeakerAll(k,dup.k));return;}
      if(t&&v&&(v!==t.name||ch!==(t.ch||""))){const sc=curScen();
        if(sc&&sc.sp.some(x=>x.k===k))mutateScen(sc.id,d=>{const x=d.sp.find(x=>x.k===k);if(x){x.name=v;x.ch=ch;}});else{t.name=v;t.ch=ch;saveMeta();}
        renderSide();renderAllRows(true);}closePop();};
    [rn,rch].forEach(i=>i.onkeydown=ev=>{if(ev.key==="Enter")doRename();if(ev.key==="Escape")closePop();});
    p.querySelector('[data-a=rename]').onclick=doRename;
    p.querySelector('[data-a=up]').onclick=()=>{const sw=a=>{const i=a.findIndex(x=>x.k===k);if(i>0)[a[i-1],a[i]]=[a[i],a[i-1]];};const sc=curScen();
      if(sc)mutateScen(sc.id,d=>sw(d.sp));else{sw(spTarget());saveMeta();}renderSide();closePop();};
    p.querySelectorAll("[data-to]").forEach(b=>b.onclick=()=>{closePop();confirmBox(`이 녹음에서 '${s.name}'의 대사 ${c}개를 '${spBy(b.dataset.to).name}'(으)로 옮길까요?`,"옮기기",()=>mergeSpeaker(k,b.dataset.to));});
    const d=p.querySelector('[data-a=del]');if(d)d.onclick=()=>{closePop();removeSpeakerIfUnused(k);};
    const g=p.querySelector('[data-a=gm]');if(g)g.onclick=()=>{const sc=curScen();if(!sc){closePop();return;}const on=!isGM(k);mutateScen(sc.id,d=>{if(on)d.gm=k;else delete d.gm;});closePop();renderSide();renderAllRows(true);toast(on?"GM으로 지정했어요. 숫자키 1번이 돼요":"GM을 해제했어요");};
    setTimeout(()=>rn.select(),0);
  });
}
function confirmBox(msg,ok,fn){
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="box"><div>${esc(msg)}</div><div class="btns"><button data-x>취소</button><button class="pri" data-ok>${esc(ok)}</button></div></div>`;
  document.body.appendChild(m);m.querySelector("[data-x]").onclick=()=>m.remove();m.querySelector("[data-ok]").onclick=()=>{m.remove();fn();};
  m.onclick=ev=>{if(ev.target===m)m.remove();};
}
// 로그 페이지·책 고치기 공통 조작표
const KB_HELP=`<div class="kbgrid">
  <h4>고르기</h4><div><kbd>클릭</kbd> 한 줄 · <kbd>Shift</kbd>+<kbd>클릭</kbd> 또는 줄 위로 드래그 · <kbd>Shift</kbd>+<kbd>↑</kbd><kbd>↓</kbd> 여러 줄 · <kbd>↑</kbd><kbd>↓</kbd> 옮기기 · <kbd>Esc</kbd> 풀기</div>
  <h4>글 고치기</h4><div><kbd>더블클릭</kbd> 또는 <kbd>Enter</kbd> 시작 · 고치는 중 <kbd>Enter</kbd> 저장 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 줄바꿈 · <kbd>Esc</kbd> 취소</div>
  <h4>글자 드래그</h4><div>한 줄 안의 글자를 드래그하면 메뉴: <b>떼어서 다른 대사로</b> · <b>상황 묘사로 떼기</b> · <b>고유명사로 바꾸기/등록</b></div>
  <h4>화자</h4><div><kbd>1</kbd>~<kbd>9</kbd> 왼쪽 목록 순서 · <kbd>0</kbd> 전원 (여러 줄도 한 번에) · 로그 페이지만</div>
  <h4>책에 넣기</h4><div><kbd>C</kbd> 잡담 · <kbd>X</kbd> 빼기 (다시 누르면 본문으로) · <kbd>B</kbd> 여기서 본세션 시작</div>
  <h4>넣기</h4><div><kbd>N</kbd> 아래에 상황 묘사 · <kbd>D</kbd> 주사위 · <kbd>H</kbd> 핸드아웃 · <kbd>S</kbd> 위에 단락 (단락을 고르고 누르면 대→중→하)</div>
  <h4>정리</h4><div><kbd>M</kbd> 위 줄과 합치기 · <kbd>Delete</kbd> 지우기 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 되돌리기</div>
  <h4>재생</h4><div><kbd>Space</kbd> 재생/정지 · <kbd>P</kbd> 여기서 재생 · <kbd>[</kbd> <kbd>]</kbd> 5초 뒤로/앞으로</div>
</div><div class="tip" style="margin-top:8px">한글 입력 상태에서도 같은 자리 키로 돼요. <kbd>?</kbd>로 이 표를 열어요.</div>`;
function helpBox(){
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="box kbhelp"><h2>단축키 · 조작</h2>${KB_HELP}<div class="btns"><button class="pri" data-x>닫기</button></div></div>`;
  document.body.appendChild(m);m.querySelector("[data-x]").onclick=()=>m.remove();m.onclick=ev=>{if(ev.target===m)m.remove();};
}

// ---------- text editing ----------
function editRow(id){
  if(!S.canWrite)return;
  if(S.follow&&S.audioUrl&&!$("#aud").paused)setFollow(false);
  const r=document.querySelector(`.row[data-id="${id}"]`);const e=S.byId.get(id);if(!r||!e)return;
  select(id,false);
  const tx=r.querySelector(".tx");
  if(e.b.s===DICE){editDice(r,e);return;}
  const isSec=e.b.s===SEC,isNote=e.b.s===NOTE||isSec,isHand=e.b.s===HAND;
  r.classList.add("editing");
  const hlab=isHand&&r.querySelector(".hlab");
  if(hlab)hlab.innerHTML=`<input type="text" class="htin" placeholder="핸드아웃 제목 (예: 열차 탑승권)" value="${esc(e.b.ti||"")}">`;
  const hti=hlab&&hlab.querySelector("input");
  tx.innerHTML=`<textarea placeholder="${isSec?rulePH().sec[secLv(e.b)-1]:isNote?"예: 아래층에서 소음이 들린다":isHand?"핸드아웃 내용":""}">${esc(e.b.x)}</textarea><div class="edhint">${isNote||isHand?"Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소":"Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소 · 글자를 드래그하면 그 부분만 다른 사람 대사로 떼어내요 · **글자**로 감싸면 굵게"}</div>`;
  const ta=tx.querySelector("textarea");ta.style.height=Math.max(isNote?44:60,ta.scrollHeight+4)+"px";ta.focus();
  let done=false;
  const finish=save=>{if(done)return;done=true;
    if(save&&isHand){const x=ta.value.replace(/\n{3,}/g,"\n\n").trim(),ti=hti.value.trim();
      if(!x&&!ti){delBlock(id);loadSecs(true);return;}
      if(x!==e.b.x||ti!==(e.b.ti||""))doOps([{ci:e.ci,op:{t:"set",id,f:{x,ti}}}],"핸드아웃 수정");
      loadSecs(true);renderSide();}
    else if(save){setText(id,isSec?ta.value.replace(/\n/g," "):ta.value);if(isSec)loadSecs(true);}
    else if((isNote||isHand)&&!e.b.x&&!e.b.ti){const x=S.byId.get(id);if(x){S.undo.pop();doOps([{ci:x.ci,op:{t:"del",id}}],null);renderAllRows(true);}return;}
    if(S.byId.has(id)){updateRow(id);select(id,false);}};
  // 어디서든 Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소
  ta.onkeydown=ev=>{if(ev.key==="Escape"){ev.preventDefault();finish(false);}if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();finish(true);}ev.stopPropagation();};
  const inEd=()=>document.activeElement===ta||(hti&&document.activeElement===hti);
  // 수정 중에 글자를 드래그하면: 그 부분만 따로 떼어 다른 사람 대사로 만들기
  if(!isNote&&!isHand){
    const pick=ev=>{const a=ta.selectionStart,z=ta.selectionEnd;if(z-a<1||!ta.value.slice(a,z).trim()){closePop();return;}
      const rc=ev&&ev.clientX?{left:ev.clientX,right:ev.clientX,top:ev.clientY,bottom:ev.clientY+6}:ta.getBoundingClientRect();
      splitMenu(rc,a,z);};
    ta.addEventListener("mouseup",ev=>setTimeout(()=>pick(ev),0));
    ta.addEventListener("keyup",ev=>{if(ev.shiftKey&&/Arrow|Home|End/.test(ev.key))pick(null);});
  }
  function splitMenu(rc,a,z){
    const shown=shownSp(),list=[...shown,...spList().filter(x=>!shown.includes(x))];
    popAt({getBoundingClientRect:()=>rc},`<div class="tip" style="padding:2px 8px 4px">고른 부분을 따로 떼어 대사로 만들기 · 누구 대사?</div>
      ${list.map(p=>`<button data-k="${p.k}" style="--c:${fixC(p.c)}"><span class="dot"></span>${esc(p.name)}${p.ch?` <small style="color:var(--faint)">${esc(p.ch)}</small>`:""}${p.k===e.b.s?" (지금 화자)":""}</button>`).join("")}
      <hr><button data-k="${NOTE}">▤ 상황 묘사로</button>`,pp=>{
      pp.addEventListener("mousedown",ev=>{if(!ev.target.closest("input"))ev.preventDefault();});
      pp.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{closePop();doSplit(a,z,b.dataset.k);});
    });
  }
  function doSplit(a,z,k){
    const v=ta.value,parts=[[v.slice(0,a),e.b.s],[v.slice(a,z),k],[v.slice(z),e.b.s]].map(([x,sp])=>[x.replace(/\n{2,}/g,"\n").trim(),sp]).filter(([x])=>x);
    if(!parts.length)return;
    done=true;r.classList.remove("editing");
    const cur=S.byId.get(id);if(!cur)return;
    const ops=[{ci:cur.ci,op:{t:"set",id,f:{x:parts[0][0],s:parts[0][1]}}}];let prev=id;
    parts.slice(1).forEach(([x,sp])=>{const nb={id:rid(),s:sp,t:cur.b.t,x};ops.push({ci:cur.ci,op:{t:"ins",after:prev,b:nb}});prev=nb.id;});
    const selIdx=v.slice(0,a).trim()?1:0;
    doOps(ops,"대사 나누기");
    renderAllRows(true);renderSideCounts();
    const ids=[id,...ops.slice(1).map(o=>o.op.b.id)];select(ids[Math.max(0,selIdx)]||id,false);
    toast(k===NOTE?"상황 묘사로 떼어냈어요":`'${spBy(k).name}' 대사로 떼어냈어요 · Ctrl+Z로 되돌리기`);
  }
  const onBlur=()=>{if(S.rerendering)return;setTimeout(()=>{if(!inEd()&&ta.isConnected)finish(true);else if(!ta.isConnected&&!S.byId.has(id))finish(false);},0);};
  ta.onblur=onBlur;
  if(hti){hti.onblur=onBlur;hti.onkeydown=ev=>{ev.stopPropagation();if(ev.key==="Escape"){ev.preventDefault();finish(false);}if(ev.key==="Enter"){ev.preventDefault();if(ev.ctrlKey||ev.metaKey)finish(true);else ta.focus();}};
    if(!e.b.ti&&!e.b.x)hti.focus();}
}

function editDice(r,e){
  const id=e.b.id,b=e.b,tx=r.querySelector(".tx");
  r.classList.add("editing");
  let o=b.o||"",sec=!!b.sec;
  const opts=spList().map(p=>`<option value="${p.k}"${p.k===b.w?" selected":""}>${p.ch?esc(p.ch)+" ("+esc(p.name)+")":esc(p.name)}</option>`).join("");
  tx.innerHTML=`<div class="dform">
    <select data-f="w"><option value="">인물 고르기</option>${opts}</select>
    <input data-f="x" type="text" placeholder="${rulePH().judge}" value="${esc(b.x||"")}">
    <input data-f="r" type="text" placeholder="${rulePH().res}" value="${esc(b.r||"")}">
    <span class="dos"><button type="button" class="dres secret${sec?" on":""}" data-sec title="결과를 몰라도 돼요">Secret Dice</button>${Object.keys(OUT).map(k=>`<button type="button" class="dres ${k}${o===k?" on":""}" data-o="${k}">${outLabel(k)}</button>`).join("")}</span>
    <button type="button" class="pri" data-f="ok">저장</button><button type="button" data-f="no">취소</button>
  </div><div class="edhint">Enter 저장 · Esc 취소 · 성공 여부는 다시 누르면 해제돼요</div>`;
  const f=k=>tx.querySelector(`[data-f="${k}"]`);
  tx.querySelector("[data-sec]").onclick=ev=>{sec=!sec;ev.currentTarget.classList.toggle("on",sec);};
  tx.querySelectorAll("[data-o]").forEach(x=>x.onclick=()=>{o=o===x.dataset.o?"":x.dataset.o;tx.querySelectorAll("[data-o]").forEach(y=>y.classList.toggle("on",y.dataset.o===o));});
  let done=false;
  const finish=save=>{if(done)return;done=true;
    const v={w:f("w").value,x:f("x").value.trim(),r:f("r").value.trim(),o,sec};
    const empty=!v.x&&!v.r&&!v.o&&!v.sec,wasEmpty=!b.x&&!b.r&&!b.o&&!b.sec;
    if((save&&empty)||(!save&&wasEmpty)){const x=S.byId.get(id);if(x){if(wasEmpty&&S.undo.length&&S.undo[S.undo.length-1].label==="주사위 추가")S.undo.pop();doOps([{ci:x.ci,op:{t:"del",id}}],wasEmpty?null:"삭제");renderAllRows(true);}return;}
    if(save&&(v.w!==(b.w||"")||v.x!==(b.x||"")||v.r!==(b.r||"")||v.o!==(b.o||"")||v.sec!==!!b.sec))doOps([{ci:e.ci,op:{t:"set",id,f:v}}],"주사위 수정");
    if(S.byId.has(id)){updateRow(id);select(id,false);}};
  f("ok").onclick=()=>finish(true);f("no").onclick=()=>finish(false);
  tx.onkeydown=ev=>{if(ev.key==="Escape"){ev.preventDefault();finish(false);}else if(ev.key==="Enter"&&!ev.target.matches("button")){ev.preventDefault();finish(true);}ev.stopPropagation();};
  tx.onclick=ev=>ev.stopPropagation();
  (b.w?f("r"):f("w")).focus();
}

// ---------- 단락: 회차(1부·2부 전체) 안에서 이야기를 나누고 바로 이동 ----------
// S.secOther: 같은 회차의 다른 녹음에 있는 단락 {sid,part,id,x}
async function loadSecs(force){
  if(!S.db||!S.meta)return;
  const me=info(S.meta);
  const sib=S.sessions.map(x=>({...x,...info(x)})).filter(x=>x.scen===me.scen&&x.id!==S.sid),key=S.sid+"|"+sib.map(x=>x.id).join();
  if(!force&&S.secKey===key)return;S.secKey=key;
  const out=[],hands=[];
  for(const x of sib){try{const snap=await S.db.collection(`sessions/${x.id}/chunks`).get();
    snap.docs.map(d=>d.data()).sort((a,b)=>a.i-b.i).forEach(c=>(c.b||[]).forEach(b=>{if(b.s===SEC)out.push({sid:x.id,day:x.day,part:x.part,id:b.id,x:b.x,lv:secLv(b)});else if(b.s===HAND)hands.push({sid:x.id,day:x.day,part:x.part,id:b.id,ti:b.ti||"",x:b.x});}));}catch(e){}}
  if(S.secKey===key){S.secOther=out;S.handOther=hands;renderSide();}
}
function allSecs(){
  const me=S.meta?info(S.meta):{day:"",part:1};
  const here=S.flat.filter(e=>e.b.s===SEC).map(e=>({sid:S.sid,day:me.day,part:me.part,id:e.b.id,x:e.b.x,lv:secLv(e.b)}));
  // 안정 정렬: 같은 녹음 안에서는 로그 순서 그대로
  return [...(S.secOther||[]),...here].map((x,i)=>({...x,i})).sort((a,b)=>String(a.day).localeCompare(String(b.day))||a.part-b.part||a.i-b.i);
}
function allHands(){
  const me=S.meta?info(S.meta):{day:"",part:1};
  const here=S.flat.filter(e=>e.b.s===HAND).map(e=>({sid:S.sid,day:me.day,part:me.part,id:e.b.id,ti:e.b.ti||"",x:e.b.x}));
  return [...(S.handOther||[]),...here].map((x,i)=>({...x,i})).sort((a,b)=>String(a.day).localeCompare(String(b.day))||a.part-b.part||a.i-b.i);
}
function gotoSec(sec){
  if(sec.sid===S.sid){const r=document.querySelector(`.row[data-id="${sec.id}"]`);if(r){setFollow(false);r.scrollIntoView({block:"start",behavior:"smooth"});select(sec.id,false);}return;}
  S.gotoSec=sec.id;location.hash="s-"+sec.sid;
}
function tryGotoSec(){
  if(!S.gotoSec)return;const r=document.querySelector(`.row[data-id="${S.gotoSec}"]`);if(!r)return;
  const id=S.gotoSec;S.gotoSec=null;setFollow(false);
  [50,400,1000].forEach(ms=>setTimeout(()=>{const r2=document.querySelector(`.row[data-id="${id}"]`);if(r2){r2.scrollIntoView({block:"start"});if(ms===50)select(id,false);}},ms));
}
const secLv=b=>b.lv===2||b.lv===3?b.lv:1;
function nextSecName(lv){
  const list=allSecs().filter(x=>x.lv===lv);const last=list[list.length-1];
  const m=last&&last.x.match(/^(\D*)(\d+)(.*)$/);
  return m?m[1]+(+m[2]+1)+m[3]:lv===2?"1사이클":"";
}
function addSec(lv=1){
  if(!S.canWrite)return;
  const e=S.byId.get(S.sel);if(!e){toast("먼저 단락이 시작될 대사를 클릭해서 골라 주세요",3000);return;}
  const idx=S.flat.indexOf(e),prev=S.flat[idx-1];
  const nb={id:rid(),s:SEC,t:e.b.t,x:nextSecName(lv),lv};
  doOps([{ci:e.ci,op:{t:"ins",after:prev&&prev.ci===e.ci?prev.b.id:null,b:nb}}],"단락 나누기");
  if(lv===3){const list=allSecs();const i=list.findIndex(x=>x.id===nb.id);for(let j=i-1;j>=0;j--)if(list[j].lv<3){(S.secOpen=S.secOpen||new Set()).add(list[j].id);break;}}
  renderAllRows(true);renderSide();select(nb.id,false);editRow(nb.id);
  const ta=document.querySelector(`.row[data-id="${nb.id}"] textarea`);if(ta)ta.select();
}

// ---------- 고유명사: 드래그한 글자를 등록된 이름으로 바꾸기 ----------
// 고유명사 묶음: {n:풀네임, a:[유의어...]} · PC 캐릭터 이름은 자동으로 들어가요
const normNoun=x=>typeof x==="string"?{n:x,a:[]}:{n:x.n,a:x.a||[],...(x.d?{d:x.d}:{})};
function nounGroups(){return nounGroupsOf(curScen());}
// 고유명사 묶음 {n, a:[유의어], d:설명(리플레이북 메모)}
function nounGroupsOf(sc){
  if(!sc)return [];
  const st=(sc.nouns||[]).map(normNoun);
  const pcs=[...new Set((sc.sp||[]).filter(p=>p.ch&&p.k!==ALL).map(p=>p.ch.trim()).filter(Boolean))];
  return [...pcs.map(n=>({...(st.find(g=>g.n===n)||{n,a:[]}),pc:true})),...st.filter(g=>!pcs.includes(g.n))];
}
const nouns=()=>nounGroups().flatMap(g=>[g.n,...g.a]);
// oldN의 묶음을 g로 바꾸기 (g=null이면 지우기, oldN=null이면 새로 추가)
function saveNoun(oldN,g,sc0){
  const sc=sc0||curScen();if(!sc)return;
  if(g){g={n:g.n.trim(),a:[...new Set(g.a.map(x=>x.trim()).filter(x=>x&&x!==g.n.trim()))],...((g.d||"").trim()?{d:g.d.trim()}:{})};if(!g.n)return;}
  mutateScen(sc.id,d=>{
    const arr=(d.nouns||[]).map(normNoun);const i=oldN==null?-1:arr.findIndex(x=>x.n===oldN);
    if(!g){if(i>=0)arr.splice(i,1);}
    else{const j=arr.findIndex(x=>x.n===g.n);
      if(i>=0){arr[i]=g;if(j>=0&&j!==i)arr.splice(j,1);}
      else if(j>=0)arr[j]={n:g.n,a:[...new Set([...arr[j].a,...g.a])],...(g.d||arr[j].d?{d:g.d||arr[j].d}:{})};
      else arr.push(g);}
    d.nouns=arr.filter(x=>x.a.length||x.d||!(d.sp||[]).some(p=>p.ch&&p.ch.trim()===x.n));
  });
  renderSide();renderAllRows(true);
}
function addAlias(full,word){const g=nounGroups().find(x=>x.n===full);if(!g)return;saveNoun(g.n,{n:g.n,a:[...g.a,word],d:g.d||""});}
function nounEdit(anchor,full){
  const g=full==null?{n:"",a:[]}:nounGroups().find(x=>x.n===full);if(!g)return;
  popAt(anchor,`<div class="nedit">
    <label>풀네임${g.pc?' <span class="pct">PC · 캐릭터 이름에서 자동</span>':""}</label>
    <input type="text" id="nfull" value="${esc(g.n)}" ${g.pc?"disabled":""} placeholder="예: 등장인물 풀네임">
    <label>유의어 · 쉼표로 구분</label>
    <input type="text" id="nalt" value="${esc(g.a.join(", "))}" placeholder="예: 줄여 부르는 이름, 별명">
    <label>설명 · 리플레이북에서 처음 나오는 곳에 메모로 붙어요</label>
    <textarea id="ndesc" rows="3" placeholder="예: 이 시나리오의 무대. 일 년 내내 안개가 걷히지 않는 산골 마을.">${esc(g.d||"")}</textarea>
    <div class="btns">${full!=null&&!g.pc?'<button data-a="del" style="color:var(--bad)">지우기</button>':""}<button class="pri" data-a="ok">저장</button></div></div>`,p=>{
    const f=$("#nfull",p),a=$("#nalt",p),dz=$("#ndesc",p);
    const ok=()=>{const n=g.pc?g.n:f.value.trim();if(!n){toast("풀네임을 넣어 주세요");return;}
      if(full==null&&nounGroups().some(x=>x.n===n)){toast("이미 있는 고유명사예요");return;}
      saveNoun(full,{n,a:a.value.split(/[,，]/),d:dz.value});closePop();};
    [f,a].forEach(i=>i.onkeydown=ev=>{ev.stopPropagation();if(ev.key==="Enter")ok();if(ev.key==="Escape")closePop();});
    dz.onkeydown=ev=>{ev.stopPropagation();if(ev.key==="Escape")closePop();if(ev.key==="Enter"&&(ev.ctrlKey||ev.metaKey))ok();};
    p.querySelector("[data-a=ok]").onclick=ok;
    const d=p.querySelector("[data-a=del]");if(d)d.onclick=()=>{closePop();confirmBox(`'${g.n}' 묶음을 지울까요?`,"지우기",()=>saveNoun(g.n,null));};
    setTimeout(()=>(g.pc?a:f).focus(),0);
  });
}
function selInfo(){
  const sel=getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return null;
  const r=sel.getRangeAt(0);
  const ln=n=>(n.nodeType===1?n:n.parentElement)?.closest(".ln");
  const a=ln(r.startContainer),z=ln(r.endContainer);
  if(!a||a!==z)return null;
  const row=a.closest(".row");if(!row||row.classList.contains("editing"))return null;
  const e=S.byId.get(row.dataset.id);if(!e||e.b.s===DICE)return null;
  const li=[...row.querySelectorAll(".ln")].indexOf(a);
  const pre=document.createRange();pre.selectNodeContents(a);pre.setEnd(r.startContainer,r.startOffset);
  let st=pre.toString().length,en=st+r.toString().length;
  const line=(e.b.x.split("\n")[li])||"";
  while(st<en&&/\s/.test(line[st]))st++;while(en>st&&/\s/.test(line[en-1]))en--;
  if(en<=st)return null;
  return {id:e.b.id,li,st,en,word:line.slice(st,en),rect:r.getBoundingClientRect()};
}
function replaceAt(si,to){
  const e=S.byId.get(si.id);if(!e)return;
  const lines=e.b.x.split("\n");const l=lines[si.li];
  if(l==null||l.slice(si.st,si.en)!==si.word){toast("그 사이에 글이 바뀌었어요. 다시 골라 주세요");return;}
  lines[si.li]=l.slice(0,si.st)+to+l.slice(si.en);
  doOps([{ci:e.ci,op:{t:"set",id:si.id,f:{x:lines.join("\n")}}}],"고유명사 바꾸기");
  updateRow(si.id);toast(`'${si.word}' → '${to}'`);
}
// 글자 드래그 메뉴: 떼어내기(대사·상황 묘사) + 고유명사로 바꾸기·등록 — 고치는 중이든 아니든 같은 메뉴
function nounMenu(si){
  const gs=nounGroups(),known=nouns().includes(si.word),e0=S.byId.get(si.id),canSplit=e0&&e0.b.s!==SEC&&e0.b.s!==HAND;
  popAt({getBoundingClientRect:()=>si.rect},`<div class="tip" style="padding:2px 8px 4px"><b>'${esc(si.word.length>24?si.word.slice(0,24)+"…":si.word)}'</b></div>
    ${canSplit?`<div class="tsplit"><button data-tsplit>✂ 떼어서 다른 대사로</button><button data-tnote>▤ 상황 묘사로 떼기</button></div><hr>`:""}
    <div class="tip" style="padding:2px 8px 4px">고유명사로 바꾸기</div>
    ${gs.length?gs.map(g=>`<div class="ngrp">${[g.n,...g.a].map((w,i)=>`<button data-n="${esc(w)}" class="${i?"alt":"full"}">${esc(w)}</button>`).join("")}${g.pc?'<span class="pct">PC</span>':""}</div>`).join(""):'<div class="tip" style="padding:2px 8px">아직 등록된 고유명사가 없어요</div>'}
    <hr><input type="text" id="nnew" placeholder="새 풀네임 입력 후 Enter (목록에도 추가)">
    ${known?"":`<div class="nreg"><span>'${esc(si.word)}' 등록:</span><select id="nto"><option value="">새 고유명사(풀네임)로</option>${gs.map(g=>`<option value="${esc(g.n)}">${esc(g.n)}의 유의어로</option>`).join("")}</select><button data-reg>등록</button></div>`}`,p=>{
    p.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{closePop();getSelection().removeAllRanges();replaceAt(si,b.dataset.n);});
    const abs=()=>{const e=S.byId.get(si.id);const ls=e.b.x.split("\n");let a=0;for(let i=0;i<si.li;i++)a+=ls[i].length+1;return [a+si.st,a+si.en];};
    const ts=p.querySelector("[data-tsplit]"),tn=p.querySelector("[data-tnote]");
    if(tn)tn.onclick=()=>{const [a,z]=abs();closePop();getSelection().removeAllRanges();splitAbs(si.id,a,z,NOTE);};
    if(ts)ts.onclick=()=>{const [a,z]=abs(),e=S.byId.get(si.id),shown=shownSp(),list=[...shown,...spList().filter(x=>!shown.includes(x))];
      popAt({getBoundingClientRect:()=>si.rect},`<div class="tip" style="padding:2px 8px 4px">떼어낸 부분은 누구 대사?</div>${list.map((sp,i)=>`<button data-k="${sp.k}" style="--c:${fixC(sp.c)}"><span class="dot"></span>${i<9&&shown.includes(sp)?`<kbd>${i+1}</kbd> `:""}${esc(sp.name)}${sp.ch?` <small style="color:var(--faint)">${esc(sp.ch)}</small>`:""}${sp.k===e.b.s?" (지금 화자)":""}</button>`).join("")}`,pp=>{
        pp.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{closePop();getSelection().removeAllRanges();splitAbs(si.id,a,z,b.dataset.k);});});};
    const inp=$("#nnew",p);inp.onkeydown=ev=>{ev.stopPropagation();if(ev.key==="Enter"){const v=inp.value.trim();if(!v)return;closePop();if(!nounGroups().some(x=>x.n===v))saveNoun(null,{n:v,a:[]});replaceAt(si,v);}if(ev.key==="Escape")closePop();};
    const rg=p.querySelector("[data-reg]");if(rg)rg.onclick=()=>{const to=$("#nto",p).value;closePop();if(to)addAlias(to,si.word);else saveNoun(null,{n:si.word,a:[]});toast("등록했어요");};
    const sl=$("#nto",p);if(sl)sl.onkeydown=ev=>ev.stopPropagation();
  });
}
// 드래그: 여러 줄에 걸치면 그 줄들을 고르고, 한 줄 안 글자면 글자 메뉴
document.addEventListener("mouseup",ev=>{
  if(!ev.target.closest||!ev.target.closest("#log")||ev.target.closest("textarea,input"))return;
  setTimeout(()=>{const sel=getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;
    const r=sel.getRangeAt(0),rowOf=n=>(n.nodeType===1?n:n.parentElement)?.closest("#log .row");
    const a=rowOf(r.startContainer),z=rowOf(r.endContainer);
    if(a&&z&&a!==z){select(a.dataset.id,false);selRange(z.dataset.id);sel.removeAllRanges();closePop();return;}
    if(!S.canWrite)return;const si=selInfo();if(si)nounMenu(si);},0);
});

// ---------- audio ----------
function bindAudio(a){
  a.addEventListener("timeupdate",onTime);
  a.addEventListener("play",syncPlayer);a.addEventListener("pause",syncPlayer);a.addEventListener("loadedmetadata",syncPlayer);
}
function syncPlayer(){syncJump();
  const a=$("#aud");if(!a||!$("#pp"))return;
  $("#pp").textContent=a.paused?"▶":"❚❚";
  if(S.audioUrl){$("#tm").textContent=fmt(a.currentTime)+" / "+fmt(a.duration||0);if(a.duration)$("#seek").value=Math.round(a.currentTime/a.duration*1000);}
}
function onTime(){
  const a=$("#aud");syncPlayer();
  if(!S.flat.length)return;
  const t=a.currentTime;let lo=0,hi=S.flat.length-1,ans=-1;
  while(lo<=hi){const m=(lo+hi)>>1;if(S.flat[m].b.t<=t){ans=m;lo=m+1;}else hi=m-1;}
  // first block of that timestamp group
  if(ans>=0){const tt=S.flat[ans].b.t;while(ans>0&&S.flat[ans-1].b.t===tt)ans--;}
  const id=ans>=0?S.flat[ans].b.id:null;
  if(id!==S.playingId){
    const p=S.playingId&&document.querySelector(`.row[data-id="${S.playingId}"]`);p&&p.classList.remove("playing");
    S.playingId=id;
    const r=id&&document.querySelector(`.row[data-id="${id}"]`);
    if(r){r.classList.add("playing");if(S.follow&&!a.paused&&!document.activeElement?.matches("textarea"))r.scrollIntoView({block:"center",behavior:"smooth"});}
    syncJump();
  }
}
function setFollow(v){S.follow=v;const f=$("#follow");if(f)f.checked=v;syncJump();}
function syncJump(){const j=$("#jump"),a=$("#aud");if(j)j.classList.toggle("hidden",S.follow||!S.audioUrl||!a||a.paused);}
// 사용자가 직접 스크롤하면 따라가기를 끔
["wheel","touchmove"].forEach(ev=>window.addEventListener(ev,()=>{const a=$("#aud");if(S.follow&&a&&!a.paused&&S.audioUrl)setFollow(false);},{passive:true}));
function playAt(t){
  const a=$("#aud");
  if(!S.audioUrl){toast("먼저 위에서 녹음 파일을 열어 주세요");return;}
  a.currentTime=Math.max(0,t-0.5);a.play().catch(()=>{});
}
function togglePlay(){const a=$("#aud");if(!S.audioUrl)return;a.paused?a.play().catch(()=>{}):a.pause();}

// ---------- bindings ----------
function bindHeader(){
  $("#help").onclick=helpBox;
  const aa=$("#addaudio");if(aa)aa.onclick=audioBox;
  const ua=$("#upaudio");if(ua)ua.onchange=async ev=>{const f=ev.target.files[0];if(!f)return;const s=S.sessions.find(x=>x.id===S.sid)||{id:S.sid,...S.meta};
    try{await uploadAudio(s,f,(pct,st)=>{const c=document.querySelector(".player .filebtn button");if(c)c.textContent=`${st==="zip"?"줄이는 중":"올리는 중"} ${pct}%`;});toast("녹음을 올렸어요");}catch(e){toast("올리지 못했어요: "+(e.code||e.message),4000);renderHeader();}};
  if($("#afile"))$("#afile").onchange=ev=>{const f=ev.target.files[0];if(!f)return;if(S.audioUrl&&!S.audioCloud)URL.revokeObjectURL(S.audioUrl);S.audioCloud=false;S.audioUrl=URL.createObjectURL(f);const a=$("#aud");a.src=S.audioUrl;renderHeader();toast("녹음을 열었어요. 시간을 누르면 거기서 재생돼요");};
  $("#pp").onclick=togglePlay;
  $("#bk").onclick=()=>{const a=$("#aud");a.currentTime=Math.max(0,a.currentTime-5);};
  $("#fw").onclick=()=>{const a=$("#aud");a.currentTime=a.currentTime+5;};
  $("#seek").oninput=ev=>{const a=$("#aud");if(a.duration)a.currentTime=ev.target.value/1000*a.duration;};
  $("#rate").onchange=ev=>{$("#aud").playbackRate=+ev.target.value;};
  $("#follow").onchange=ev=>{setFollow(ev.target.checked);if(S.follow){const r=S.playingId&&document.querySelector(`.row[data-id="${S.playingId}"]`);r&&r.scrollIntoView({block:"center",behavior:"smooth"});}};
  $("#jump").onclick=()=>{setFollow(true);const r=S.playingId&&document.querySelector(`.row[data-id="${S.playingId}"]`);r&&r.scrollIntoView({block:"center",behavior:"smooth"});};
}
function bindSide(){
  {const tb=$("#t0fix"),tf=$("#t0file");if(tb&&tf){tb.onclick=()=>tf.click();tf.onchange=async()=>{const f=tf.files[0];if(!f)return;try{const n=await fixT0(await f.text());toast(n?`${n}개 회차에 실제 시각을 넣었어요`:"이 파일에서 맞는 회차를 못 찾았어요");}catch(e){writeFail(e);}};}}
  {const h2=$("#help2");if(h2)h2.onclick=helpBox;}
  const bk=$("#back");if(bk)bk.onclick=()=>{location.hash="";if(S.local){S.local=false;openSession(null);}};
  renderAuth();
  document.querySelectorAll("[data-fold]").forEach(b=>b.onclick=()=>{const k=b.dataset.fold;S[k]=!S[k];b.classList.toggle("open",S[k]);b.nextElementSibling.classList.toggle("open",S[k]);});
  const zt=$("#zerot");if(zt)zt.onclick=()=>{S.showZero=!S.showZero;renderSide();};
  document.querySelectorAll("#splist .spk").forEach(el=>{
    const k=el.dataset.k;
    el.querySelector('[data-act=filter]').onclick=()=>{S.spFilter=S.spFilter===k?null:k;renderSide();renderAllRows();window.scrollTo(0,0);};
    const m=el.querySelector('[data-act=menu]');if(m)m.onclick=()=>spMenu(m,k);
  });
  document.querySelectorAll("[data-nedit]").forEach(b=>b.onclick=()=>{if(S.canWrite)nounEdit(b,b.dataset.nedit);});
  const an=$("#addnoun");if(an)an.onclick=()=>nounEdit(an,null);
  document.querySelectorAll("[data-sectog]").forEach(b=>b.onclick=()=>{const id=b.dataset.sectog;S.secOpen.has(id)?S.secOpen.delete(id):S.secOpen.add(id);renderSide();});
  document.querySelectorAll("[data-sec]").forEach(b=>b.onclick=()=>{const [sid,id]=b.dataset.sec.split("|");gotoSec({sid,id});});
  document.querySelectorAll(".secadd [data-lv]").forEach(b=>b.onclick=()=>addSec(+b.dataset.lv));
  const add=$("#addsp");if(add){const inp=$("#newsp");const go=()=>{if(addSpeaker(inp.value)){toast("추가했어요. 숫자키로 바로 지정할 수 있어요");}};add.onclick=go;inp.onkeydown=ev=>{if(ev.key==="Enter")go();ev.stopPropagation();};}
}
let qTimer;
function bindSession(){
  const q=$("#q");q.oninput=()=>{clearTimeout(qTimer);qTimer=setTimeout(()=>{S.q=q.value.trim();renderAllRows();},200);};
  q.onkeydown=ev=>{ev.stopPropagation();if(ev.key==="Escape"){q.value="";S.q="";renderAllRows();q.blur();}};
  $("#copyAll").onclick=async()=>{
    const txt=S.flat.filter(visible).map(e=>e.b.s===SEC?["\n== "+e.b.x+" ==\n","\n- "+e.b.x+" -\n","\n  · "+e.b.x+"\n"][secLv(e.b)-1]:e.b.s===HAND?`\n[핸드아웃${e.b.ti?": "+e.b.ti:""}]\n${e.b.x}\n`:e.b.s===DICE?`🎲 ${e.b.w?(spBy(e.b.w).ch||spBy(e.b.w).name):""} ${e.b.x||""} ${e.b.r||""} ${e.b.sec?"Secret Dice":""} ${e.b.o?outLabel(e.b.o):""}`.replace(/\s+/g," ").trim():e.b.s===NOTE?`\n— ${e.b.x.replace(/\n/g," ")} —\n`:`[${fmt(e.b.t)}] ${spBy(e.b.s).name}: ${e.b.x.replace(/\n/g," ")}`).join("\n");
    try{await navigator.clipboard.writeText((S.meta?.title?S.meta.title+"\n\n":"")+txt);toast("복사했어요");}catch(e){toast("복사가 막혔어요. 브라우저 권한을 확인해 주세요");}
  };
  $("#log").onclick=ev=>{
    const row=ev.target.closest(".row");if(!row)return;const id=row.dataset.id;
    const act=ev.target.closest("[data-act]")?.dataset.act;
    if(act==="seek"){select(id,false);playAt(S.byId.get(id).b.t);return;}
    if(act==="cm"){S.cmOpen===id?cmClose():cmOpenAt(id);return;}
    if(act==="who"){select(id,false);whoMenu(ev.target.closest("[data-act]"),id);return;}
    if(act==="cut"){if(S.canWrite)splitBlock(id,+ev.target.dataset.line);return;}
    if(act==="edit"){editRow(id);return;}
    if(act==="up"){mergePrev(id);return;}
    if(act==="bstart"){setStart(id);return;}
    if(act==="del"){delBlock(id);return;}
    if(act==="note"){addNote(id);return;}
    if(act==="dice"){addDice(id);return;}
    if(act==="lv"){const e=S.byId.get(id),l=+ev.target.closest("[data-lv]").dataset.lv;if(e&&S.canWrite&&secLv(e.b)!==l){doOps([{ci:e.ci,op:{t:"set",id,f:{lv:l}}}],"단락 단계 바꾸기");updateRow(id);renderSide();loadSecs(true);}return;}
    if(!ev.target.closest("textarea")){if(ev.shiftKey&&S.sel)selRange(id);else if(!(S.selSet&&S.selSet.size>1&&getSelection&&!getSelection().isCollapsed))select(id,false);}
  };
  $("#log").onmousedown=ev=>{if(ev.shiftKey&&!ev.target.closest("textarea,input"))ev.preventDefault();};
  // 더블클릭: 글 고치기 (버튼·입력칸 빼고)
  $("#log").ondblclick=ev=>{const row=ev.target.closest(".row");if(!row||ev.target.closest("button,textarea,input,select")||row.classList.contains("editing"))return;
    const sel=getSelection();if(sel)sel.removeAllRanges();closePop();editRow(row.dataset.id);};
  $("#log").ondblclick=ev=>{const row=ev.target.closest(".row");if(row&&ev.target.closest(".tx")&&!ev.target.closest("textarea,.dform"))editRow(row.dataset.id);};
}
// 로그 페이지 단축키 (한글 입력 상태에서도 같은 자리 키로 돼요)
const KO_KEY={"ㅊ":"c","ㅌ":"x","ㅠ":"b","ㄴ":"s","ㅡ":"m","ㅜ":"n","ㅇ":"d","ㅗ":"h","ㅔ":"p","ㅓ":"j","ㅏ":"k"};
const keyOf=k=>KO_KEY[k]||(k.length===1?k.toLowerCase():k);
document.addEventListener("keydown",ev=>{
  if(!S.sid&&!S.local)return;
  if(ev.target.matches("input,textarea,select")||document.querySelector(".modal"))return;
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="z"){if(S.canWrite){ev.preventDefault();undo();}return;}
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const k=keyOf(ev.key),W=S.canWrite;
  if(k==="ArrowDown"||k==="j"){ev.preventDefault();moveSel(1,ev.shiftKey);}
  else if(k==="ArrowUp"||k==="k"){ev.preventDefault();moveSel(-1,ev.shiftKey);}
  else if(k===" "){ev.preventDefault();togglePlay();}
  else if(k==="Escape"){closePop();if(S.selSet&&S.selSet.size>1)select(S.sel,false);}
  else if(k==="?"){ev.preventDefault();helpBox();}
  else if(k==="["){const a=$("#aud");a&&(a.currentTime=Math.max(0,a.currentTime-5));}
  else if(k==="]"){const a=$("#aud");a&&(a.currentTime+=5);}
  else if(!S.sel)return;
  else if(/^[1-9]$/.test(k)&&W){const sp=shownSp()[+k-1];if(sp)assignMany(selIds(),sp.k);}
  else if(k==="0"&&W){assignMany(selIds(),ALL);}
  else if(k==="Enter"){ev.preventDefault();editRow(S.sel);}
  else if((k==="Delete"||k==="Backspace")&&W){ev.preventDefault();delMany(selIds());}
  else if(k==="c"&&W){ev.preventDefault();bkToggle(selIds(),1);}
  else if(k==="x"&&W){ev.preventDefault();bkToggle(selIds(),2);}
  else if(k==="b"&&W){ev.preventDefault();setStart(S.sel);}
  else if(k==="s"&&W){ev.preventDefault();const e=S.byId.get(S.sel);if(e&&e.b.s===SEC)cycleSec(S.sel);else addSec(1);}
  else if(k==="m"&&W){ev.preventDefault();mergePrev(S.sel);}
  else if(k==="n"&&W){ev.preventDefault();addNote(S.sel);}
  else if(k==="d"&&W){ev.preventDefault();addDice(S.sel);}
  else if(k==="h"&&W){ev.preventDefault();addHand(S.sel);}
  else if(k==="p"){const e=S.byId.get(S.sel);e&&playAt(e.b.t);}
});

// ---------- scenario / date grouping ----------
function guessInfo(title,dateLine){
  title=String(title||"").trim();
  let day="",scen=title,part=null,m;
  if((m=title.match(/^(\d{2})(\d{2})(\d{2})\s+(.+)$/))){day=`20${m[1]}-${m[2]}-${m[3]}`;scen=m[4];}
  else if((m=String(dateLine||"").match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/))){day=`${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;}
  if((m=scen.match(/^(.+?)\s*[-_#(]?\s*(\d{1,2})\s*\)?\s*(?:부|편|파트)?$/))){scen=m[1].trim();part=+m[2];}
  return {scen:scen||"이름 없는 시나리오",day,part:part||1};
}
function info(s){const g=guessInfo(s.title,s.date);return {scen:resolveScen(s.scen||g.scen),day:s.day||g.day,part:s.part||g.part};}
const normName=n=>String(n||"").replace(/[\s·._\-:~!?'"()\[\]]/g,"").toLowerCase();
function findScen(name){
  if(!name)return null;
  const n=normName(name);
  return S.scens.find(x=>x.name===name)||S.scens.find(x=>(x.aliases||[]).includes(name))
    ||S.scens.find(x=>normName(x.name)===n||(x.aliases||[]).some(a=>normName(a)===n))||null;
}
function resolveScen(name){return findScen(name)?.name||name;}
const WD="일월화수목금토";
function fmtDay(d){if(!d)return "날짜 없음";const [y,m,dd]=d.split("-").map(Number);const dt=new Date(y,m-1,dd);return `${y===new Date().getFullYear()?"":y+"년 "}${m}월 ${dd}일 (${WD[dt.getDay()]})`;}
function groups(){
  const by={};
  S.sessions.forEach(s=>{const i=info(s);(by[i.scen]=by[i.scen]||{scen:i.scen,days:{}});(by[i.scen].days[i.day]=by[i.scen].days[i.day]||[]).push({...s,...i});});
  S.scens.forEach(sc=>{if(!by[sc.name])by[sc.name]={scen:sc.name,days:{}};});
  return Object.values(by).map(g=>{
    const sc=scenByName(g.scen);
    // 녹음 없이 플레이한 날(녹음 금지 세션)도 회차로 셈해요
    (sc?.plays||[]).forEach(d=>{if(d&&!g.days[d])g.days[d]=[];});
    const days=Object.keys(g.days).sort().map(d=>({day:d,parts:g.days[d].sort((a,b)=>a.part-b.part),nolog:!g.days[d].length}));
    // 로그가 잠겨 있어도 정렬이 같도록, 주인이 시나리오 문서에 적어둔 마지막 플레이 날짜를 써요
    return {scen:g.scen,sc,days,last:days.length?days[days.length-1].day:(sc?.lastDay||(sc?new Date(sc.created||0).toISOString().slice(0,10):""))};
  }).sort((a,b)=>b.last.localeCompare(a.last)||a.scen.localeCompare(b.scen,"ko"));
}
function siblings(){
  if(!S.meta)return [];const me=info(S.meta);
  return S.sessions.filter(s=>{const i=info(s);return i.scen===me.scen&&i.day===me.day;}).map(s=>({...s,...info(s)})).sort((a,b)=>a.part-b.part);
}
function dayIndex(){ // 몇 회차인지
  if(!S.meta)return 0;const me=info(S.meta);
  const days=[...new Set(S.sessions.map(info).filter(i=>i.scen===me.scen).map(i=>i.day))].sort();
  return days.indexOf(me.day)+1;
}
function scenList(){return [...new Set(S.sessions.map(s=>info(s).scen))].sort((a,b)=>a.localeCompare(b,"ko"));}
function nextPart(scen,day){const ps=S.sessions.map(info).filter(i=>i.scen===scen&&i.day===day).map(i=>i.part);return ps.length?Math.max(...ps)+1:1;}
function infoFields(v){
  return `<div class="fields">
    <label>시나리오<input type="text" id="f-scen" list="scenlist" value="${esc(v.scen)}" placeholder="예: 시나리오 이름"></label>
    <datalist id="scenlist">${scenList().map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
    <div class="two"><label>플레이한 날<input type="date" id="f-day" value="${esc(v.day)}"></label>
    <label>몇 번째 녹음<input type="number" id="f-part" min="1" max="20" value="${v.part}"></label></div>
    ${v.withAudio?`<label>녹음 파일 링크 (구글 드라이브 등, 선택)<input type="text" id="f-audio" value="${esc(v.audio||"")}" placeholder="https://drive.google.com/..."></label>`:""}
  </div>`;
}
const safeUrl=u=>{u=String(u||"").trim();return /^https?:\/\/\S+$/i.test(u)?u:"";};
function readFields(){const a=$("#f-audio");return {...(a?{audio:safeUrl(a.value)}:{}),scen:resolveScen($("#f-scen").value.trim()||"이름 없는 시나리오"),day:$("#f-day").value||"",part:Math.max(1,parseInt($("#f-part").value)||1)};}
