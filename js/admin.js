// 코코 로그방 · 관리 페이지 (#admin) · 저장 공간
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- 관리자 페이지 (#admin) ----------
const RULES_VERSION="7"; // firebase/firestore.rules 의 rulesv 숫자와 같아야 해요
const ST_RULES_VERSION="6"; // firebase/storage.rules 의 rulesv 숫자
S.chk={fs:"?",st:"?",build:null,newer:null,upstream:"",commits:null,err:""};
const adminAlert=()=>S.chk.fs==="old"||S.chk.st==="old"||(S.chk.newer||0)>0;
const projId=()=>(window.FIREBASE_CONFIG||{}).projectId||"";
async function checkRules(){
  if(!S.db)return;
  try{await S.db.doc("rulesv/"+RULES_VERSION).get();S.chk.fs="ok";}
  catch(e){S.chk.fs=e&&e.code==="permission-denied"?"old":"err";}
  if(S.storage&&(window.FIREBASE_CONFIG||{}).storageBucket){
    try{await S.storage.ref("rulesv/"+ST_RULES_VERSION).getMetadata();S.chk.st="ok";}
    catch(e){const c=e&&e.code||"";S.chk.st=c.includes("object-not-found")?"ok":c.includes("unauthorized")||c.includes("unauthenticated")?"old":"err";}
  }else S.chk.st="none";
}
async function checkUpdate(){
  try{const r=await fetch("build.json?nc="+Date.now());S.chk.build=r.ok?await r.json():null;}catch(e){S.chk.build=null;}
  const b=S.chk.build;if(!b||!b.repo)return;
  const src=b.upstream||b.repo;S.chk.upstream=b.upstream||"";
  try{
    const r=await fetch(`https://api.github.com/repos/${src}/commits?per_page=40`);
    if(!r.ok)throw new Error("GitHub "+r.status);
    const list=(await r.json()).filter(c=>!/공유 미리보기 갱신|파일 버전 갱신/.test(c.commit.message)&&c.commit.author.name!=="og-bot");
    S.chk.commits=list.map(c=>({sha:c.sha,msg:c.commit.message.split("\n")[0],date:c.commit.author.date}));
    if(b.upstream){const i=list.findIndex(c=>c.sha===b.sha);S.chk.newer=i<0?list.length:i;}else S.chk.newer=0;
  }catch(e){S.chk.err=e.message;}
}
let _chkRan=false;
async function runAdminChecks(force){
  if(!S.canAdmin||!S.db)return;if(_chkRan&&!force)return;_chkRan=true;
  await Promise.all([checkRules(),checkUpdate()]);
  if(S.admin||!S.sid)render();
  if((S.chk.fs==="old"||S.chk.st==="old")&&!S.admin&&!sessionStorage.getItem("rules-nag"))rulesModal();
}
async function rulesText(kind){
  const r=await fetch(`firebase/${kind}.rules?nc=`+Date.now());if(!r.ok)throw new Error("규칙 파일을 찾지 못했어요");
  return (await r.text()).replace(/__OWNER_EMAIL__/g,S.owner||"");
}
function consoleUrl(kind){const pid=projId(),b=(window.FIREBASE_CONFIG||{}).storageBucket||"";
  return kind==="storage"?`https://console.firebase.google.com/project/${pid}/storage/${b}/rules`:`https://console.firebase.google.com/project/${pid}/firestore/databases/-default-/security/rules`;}
async function copyRules(kind,btn){
  try{const t=await rulesText(kind);await navigator.clipboard.writeText(t);const o=btn.textContent;btn.textContent="✓ 복사했어요";setTimeout(()=>btn.textContent=o,1800);}
  catch(e){toast("복사하지 못했어요: "+e.message,3000);}
}
function rulesBlockHTML(){
  const st=k=>({ok:'<span class="ok">✓ 최신</span>',old:'<span class="bad">⚠ 옛날 버전</span>',none:'<span class="tip">녹음 저장소를 안 써요</span>',err:'<span class="tip">확인하지 못했어요</span>'}[S.chk[k]]||'<span class="tip">확인 중…</span>');
  const row=(k,kind,label)=>`<div class="rrow"><b>${label}</b> ${st(k)}
    ${S.chk[k]==="none"?"":`<span class="rbtns"><button data-copy="${kind}">규칙 복사</button><a class="btnlike" href="${consoleUrl(kind)}" target="_blank" rel="noopener">Firebase 규칙 화면 열기 ↗</a></span>`}</div>`;
  return row("fs","firestore","DB 규칙 (Firestore)")+row("st","storage","녹음 저장소 규칙 (Storage)")+
    `<div class="tip" style="margin-top:6px">옛날 버전이면 <b>규칙 복사</b> → <b>Firebase 규칙 화면 열기</b> → 원래 내용을 지우고 붙여 넣기 → <b>게시</b>를 눌러 주세요. 관리자 이메일(${esc(S.owner||"")})은 자동으로 채워져요. 게시한 뒤 이 페이지를 새로고침하면 확인돼요.</div>`;
}
function rulesModal(){
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="box" style="max-width:560px"><b>보안 규칙을 새 버전으로 바꿔 주세요</b>
    <div class="tip" style="margin:6px 0 10px">사이트가 업데이트되면서 Firebase 보안 규칙도 바뀌었어요. 바꾸지 않으면 일부 기능이 안 될 수 있어요.</div>
    ${rulesBlockHTML()}<div class="btns"><button data-x>나중에</button><a class="btnlike pri" href="#admin" data-go>관리자 페이지로</a></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyRules(b.dataset.copy,b));
  const close=()=>{sessionStorage.setItem("rules-nag","1");m.remove();};
  m.querySelector("[data-x]").onclick=close;m.querySelector("[data-go]").onclick=close;
}
function updateBlockHTML(){
  const c=S.chk,b=c.build;
  if(!b)return `<div class="tip">버전 정보가 없어요. (GitHub Actions로 배포된 사이트에서만 확인할 수 있어요)</div>`;
  const when=b.time?new Date(b.time).toLocaleString("ko-KR"):"";
  const head=`<div class="tip">지금 버전: <code>${esc((b.sha||"").slice(0,7))}</code> · 배포 ${esc(when)} · 저장소 <a href="https://github.com/${esc(b.repo)}" target="_blank" rel="noopener">${esc(b.repo)}</a></div>`;
  if(c.err)return head+`<div class="tip bad">업데이트를 확인하지 못했어요 (${esc(c.err)})</div>`;
  if(!c.commits)return head+`<div class="tip">확인 중…</div>`;
  const items=list=>`<ul class="chg">${list.map(x=>`<li><span class="tip">${esc(new Date(x.date).toLocaleDateString("ko-KR"))}</span> ${esc(x.msg)}</li>`).join("")}</ul>`;
  if(!c.upstream)return head+`<div class="ok" style="margin:6px 0">원본 저장소예요. 다른 분들은 이 저장소를 포크해서 업데이트를 받아요.</div><div class="tip">최근 바뀐 내용</div>${items(c.commits.slice(0,8))}`;
  if(!c.newer)return head+`<div class="ok" style="margin:6px 0">✓ 최신 버전이에요 (원본: ${esc(c.upstream)})</div>`;
  return head+`<div class="bad" style="margin:6px 0">새 버전이 있어요 · 바뀐 것 ${c.newer>=c.commits.length?c.newer+"개 이상":c.newer+"개"}</div>${items(c.commits.slice(0,Math.min(c.newer,12)))}
    <a class="btnlike pri" href="https://github.com/${esc(b.repo)}" target="_blank" rel="noopener">업데이트하러 가기 ↗</a>
    <div class="tip" style="margin-top:6px">열리는 GitHub 페이지에서 <b>Sync fork</b> → <b>Update branch</b>를 누르면 몇 분 뒤 이 사이트에 반영돼요.</div>`;
}
function adminHTML(){
  if(!S.canAdmin)return `<div class="home"><div class="hometop"><h2><a href="#" class="ghost">← 목록</a></h2><span class="authbox"></span></div><div class="notice">관리자만 볼 수 있는 페이지예요.</div></div>`;
  const st=site();
  return `<div class="home admin">
    <div class="hometop"><h2><a href="#" class="back" title="목록으로">←</a> ⚙ 관리</h2><span class="authbox"></span></div>
    <div class="admtabs">${[["site","사이트"],["rule","룰"],["emo","이모티콘"],["bk","백업"],["chk","점검"]].map(([k,n])=>`<button type="button" data-admtab="${k}" class="${(S.admTab||"site")===k?"on":""}">${n}</button>`).join("")}</div>
    <div class="admbody" data-tab="${S.admTab||"site"}">
    ${S.db?ruleAdmHTML():""}
    <div class="card" data-t="site"><b>사이트 설정</b>
      <div class="nedit" style="padding:6px 0 0">
        <label>사이트 이름</label><input type="text" id="s-title" value="${esc((S.site&&S.site.title)||"")}" placeholder="${esc(SITE_UNSET)}">
        <label>설명 문구</label><textarea id="s-sub" rows="2" style="resize:vertical">${esc(st.sub)}</textarea>
        <label>아이콘 · 이모지 하나를 넣거나 이미지를 올려요 (브라우저 탭에도 보여요)</label>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span id="s-prev" style="font-size:24px;min-width:32px;text-align:center">${iconHTML(st.icon,"sicon big")}</span>
          <input type="text" id="s-icon" value="${isImgIcon(st.icon)?"":esc(st.icon)}" placeholder="예: 🎲" style="width:80px">
          <button type="button" id="s-up">이미지 올리기</button><button type="button" class="ghost" id="s-clr">없애기</button>
          <input type="file" id="s-file" accept="image/*" style="display:none"></div>
        <label>홈 테마</label>
        <select id="s-home"><option value=""${st.home==="x"?"":" selected"}>기본</option><option value="x"${st.home==="x"?" selected":""}>아카이브 (밝은 플랫 · 3줄 카드)</option></select>
        <label>내 닉네임 · 여러 개면 쉼표로 (예: AA, BB) · 세션마다 이 이름의 플레이어가 자동으로 '나'가 돼요</label>
        <input type="text" id="s-nicks" value="${esc((st.nicks||[]).join(", "))}" placeholder="AA, BB">
        ${S.storage?`<label class="zchk"><input type="checkbox" id="s-z"${S.site&&S.site.noz?"":" checked"} style="width:auto"> 녹음을 올릴 때 용량 줄이기 <span class="tip" style="display:inline">· 말소리용 opus로 바꿔 보통 1/2~1/3 크기 · 크롬·엣지 권장</span></label>`:""}
        <div class="btns"><button class="pri" id="s-ok">저장</button></div>
      </div></div>
    ${S.db&&S.storage?`<div class="card" data-t="site"><b>저장 공간</b> <span class="tip">· 녹음·이모티콘 파일 (US 지역 무료 범위 기준)</span><div id="stuse">${storeUseHTML()}</div></div>`:""}
    ${S.db?`<div class="card emadm" data-t="emo"><b>이모티콘</b> <span class="tip">· 사이트 어디서든 :이름: 으로 써요 (후기·댓글) · 주인만 등록</span>
      <div class="emrow">${(st.emo||[]).map(e=>`<div class="it" title=":${esc(e.n)}:"><button class="x" data-emdel="${esc(e.n)}" title="지우기">✕</button><img src="${esc(e.u)}" alt=""><span>:${esc(e.n)}:</span></div>`).join("")||`<span class="tip">아직 없어요.</span>`}</div>
      <div class="emadd"><button type="button" class="up" id="em-pick" title="이미지 고르기">${S.emPrev?`<img src="${S.emPrev}" alt="">`:"＋"}</button><input type="text" id="em-n" placeholder="이름 (예: 하하)" maxlength="20" style="width:140px"><button class="pri" id="em-add">등록</button><span class="tip">정사각형 이미지 · 128px로 줄여서 저장 · 움직이는 GIF도 돼요</span>
        <input type="file" id="em-file" accept="image/*" style="display:none"></div></div>`:""}
    <div class="card" data-t="chk"><b>업데이트</b><div id="upd">${updateBlockHTML()}</div></div>
    <div class="card" data-t="chk"><b>보안 규칙 점검</b> <span class="tip">· 규칙 버전 ${RULES_VERSION}</span><div id="rules" style="margin-top:6px">${rulesBlockHTML()}</div></div>
    ${S.db?`    <div class="card" data-t="bk">
      <b>백업 · 옮기기</b>
      <div class="tip" style="margin:4px 0 10px">전체 데이터(세션·대사·캠페인·캠프·후기·댓글·비밀번호)를 JSON 파일로 받아 두거나, 받아 둔 JSON을 다시 가져와요. 가져오면 같은 것은 덮어써요. 녹음 파일은 들어가지 않아요.</div>
      ${S.storage?`<div id="bklist">${bkListHTML()}</div>`:""}
      <button id="exportb">⬇ JSON으로 내보내기</button>
      <span class="filebtn"><button>⬆ JSON 가져오기</button><input type="file" id="importf" accept=".json,application/json"></span>
      <span class="tip" id="exprog">${esc(S.impMsg||"")}</span>
    </div>
    `:""}
  </div>
  </div>`;
}
// ---------- 룰 관리 ----------
const RULE_TH=[["","자동 (룰 이름으로)"],["plain","기본 (흰색)"],["deco","D&D (양피지)"],["dx","더블크로스 (검정·빨강)"],["wa","인세인 (흑백·빨강)"]];
// 저장된 룰 + 아직 룰로 안 묶인 시스템 이름(임시 줄)
function ruleRows(){const R=siteRules().map((r,i)=>({...r,i}));const raw=[...new Set([...S.scens,...S.camps].map(x=>(x.system||"").trim()).filter(Boolean))];
  raw.forEach(v=>{if(!ruleOf(v))R.push({n:sysLabel(v),m:[v],a:[],th:"",tmp:1});});
  const cnt=r=>[...S.scens,...S.camps].filter(x=>{const v=(x.system||"").trim();if(!v)return false;const k=rnorm(v);return rnorm(r.n)===k||(r.m||[]).some(y=>rnorm(y)===k);}).length;
  return R.map(r=>({...r,cnt:cnt(r)})).sort((a,b)=>b.cnt-a.cnt||a.n.localeCompare(b.n,"ko"));}
function ruleAdmHTML(){const R=ruleRows();S.ruleRowsCache=R;
  return `<div class="card rulecard" data-t="rule"><b>룰</b> <span class="tip">· 룰 이름을 어떻게 묶고 보여줄지, 무슨 말로 검색되게 할지 정해요</span>
    <div class="rltest">🔍 검색 시험 <input type="text" id="rl-q" placeholder="예: ㄷㅁㄷ" value="${esc(S.rlQ||"")}"><span id="rl-hit" class="tip"></span></div>
    ${R.map((r,j)=>`<div class="rlrow${r.tmp?" tmp":""}" data-rj="${j}"><div class="rlnm"><input type="text" value="${esc(r.n)}" data-rlname="${j}"><small>${r.ed?"묶음 이름 · ":""}세션 ${r.cnt}개${r.tmp?" · 아직 따로 정하지 않았어요":""}</small>${r.tmp?"":`<button type="button" class="ghost rldel" data-rldel="${j}" title="이 룰 설정 지우기">설정 지우기</button>`}</div>
      <div class="rlf"><div><b>묶을 이름</b>${(r.m||[]).map((x,k)=>`<span class="rlchip">${esc(x)}<i data-rlx="${j}:m:${k}">✕</i></span>`).join("")}<input type="text" class="rladd" data-rladd="${j}:m" placeholder="＋ 이름"></div>
        <div><b>검색 별명</b>${(r.a||[]).map((x,k)=>`<span class="rlchip al">${esc(x)}<i data-rlx="${j}:a:${k}">✕</i></span>`).join("")}<input type="text" class="rladd" data-rladd="${j}:a" placeholder="＋ 별명"></div>
        <div><b>보이기</b><label class="chk"><input type="checkbox" data-rled="${j}"${r.ed?" checked":""} style="width:auto"> 세션·카드에는 적힌 이름 그대로 (판 표시) · 검색·테마·묶음만 같이</label></div>
        <div><b>테마</b><select data-rlth="${j}">${RULE_TH.map(([v,n])=>`<option value="${v}"${(r.th||"")===v?" selected":""}>${n}</option>`).join("")}</select></div></div></div>`).join("")||`<div class="tip">아직 룰이 적힌 세션이 없어요</div>`}
    <div class="tip" style="margin-top:8px;line-height:1.7">· 묶을 이름: 세션에 이렇게 적혀 있어도 같은 룰로 쳐요 (다른 줄의 이름을 여기 넣으면 그 줄이 이 룰로 합쳐져요)<br>· 검색 별명: 검색창에 이 말을 쳐도 그 룰 세션이 나와요 (카드에는 안 보여요)<br>· 테마: 비워 두면 룰 이름으로 자동으로 골라요</div></div>`;}
async function ruleSave(fn){const R=S.ruleRowsCache||ruleRows();const list=R.map(r=>({n:r.n,m:[...(r.m||[])],a:[...(r.a||[])],th:r.th||"",ed:!!r.ed,tmp:r.tmp}));
  fn(list);
  const out=list.filter(r=>!r.del&&r.n&&(!r.tmp||r.touched)).map(r=>{const o={n:r.n.trim(),m:[...new Set(r.m.map(x=>x.trim()).filter(Boolean))],a:[...new Set(r.a.map(x=>x.trim()).filter(Boolean))]};if(r.th)o.th=r.th;if(r.ed)o.ed=1;return o;});
  // 다른 룰에 묶인 이름은 한 곳에만
  const seen=new Set();out.forEach(r=>{r.m=r.m.filter(x=>{const k=rnorm(x);if(seen.has(k))return false;seen.add(k);return true;});});
  S.site={...S.site,rules:out};render();
  try{await S.db.doc("scenarios/_site").set({rules:out},{merge:true});}catch(e){writeFail(e);}}
function rlTest(){const q=rnorm($("#rl-q")?.value||""),h=$("#rl-hit");if(!h)return;S.rlQ=$("#rl-q").value;if(!q){h.textContent="";return;}
  const R=S.ruleRowsCache||[];const hits=R.filter(r=>[r.n,...(r.m||[]),...(r.a||[])].some(x=>rnorm(x).includes(q)));
  h.innerHTML=hits.length?"→ "+hits.map(r=>`<b>${esc(r.n)}</b> · 세션 ${r.cnt}개`).join(" / "):"→ 맞는 룰이 없어요";}
function bindRuleAdm(){
  document.querySelectorAll("[data-admtab]").forEach(b=>b.onclick=()=>{S.admTab=b.dataset.admtab;document.querySelector(".admbody").dataset.tab=S.admTab;document.querySelectorAll("[data-admtab]").forEach(x=>x.classList.toggle("on",x===b));});
  const q=$("#rl-q");if(q){q.oninput=rlTest;rlTest();}
  document.querySelectorAll("[data-rlname]").forEach(i=>i.onchange=()=>{const j=+i.dataset.rlname,v=i.value.trim();if(!v){i.value=S.ruleRowsCache[j].n;return;}ruleSave(L=>{L[j].n=v;L[j].touched=1;});});
  document.querySelectorAll("[data-rladd]").forEach(i=>i.onkeydown=e=>{if(e.key!=="Enter"||e.isComposing)return;e.preventDefault();const [j,f]=i.dataset.rladd.split(":"),v=i.value.trim();if(!v)return;
    ruleSave(L=>{L[+j][f].push(v);L[+j].touched=1;if(f==="m")L.forEach((r,x)=>{if(x!==+j&&r.tmp&&r.m.some(y=>rnorm(y)===rnorm(v)))r.del=1;});});setTimeout(()=>{const n=document.querySelector(`[data-rladd="${j}:${f}"]`);n&&n.focus();},50);});
  document.querySelectorAll("[data-rlx]").forEach(b=>b.onclick=()=>{const [j,f,k]=b.dataset.rlx.split(":");ruleSave(L=>{L[+j][f].splice(+k,1);L[+j].touched=1;});});
  document.querySelectorAll("[data-rled]").forEach(c=>c.onchange=()=>{const j=+c.dataset.rled;ruleSave(L=>{L[j].ed=c.checked;L[j].touched=1;});});
  document.querySelectorAll("[data-rlth]").forEach(sl=>sl.onchange=()=>{const j=+sl.dataset.rlth;ruleSave(L=>{L[j].th=sl.value;L[j].touched=1;});});
  document.querySelectorAll("[data-rldel]").forEach(b=>b.onclick=()=>confirmBox("이 룰 설정을 지울까요? 세션에 적힌 룰 이름은 그대로 남아요.","지우기",()=>ruleSave(L=>{L[+b.dataset.rldel].del=1;})));
}
function bindAdmin(){bindRuleAdm();
  renderAuth();bindBackup();
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copyRules(b.dataset.copy,b));
  const t=$("#s-title");if(!t)return;
  let icon=site().icon;
  const prev=()=>{$("#s-prev").innerHTML=iconHTML(icon,"sicon big");};
  $("#s-icon").oninput=ev=>{icon=ev.target.value.trim();prev();};
  $("#s-clr").onclick=()=>{icon="";$("#s-icon").value="";prev();};
  $("#s-up").onclick=()=>$("#s-file").click();
  $("#s-file").onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{icon=await shrinkImage(f,128,"image/png");$("#s-icon").value="";prev();}catch(e){toast("이미지를 읽지 못했어요");}};
  $("#s-ok").onclick=async()=>{
    const v={title:$("#s-title").value.trim(),sub:$("#s-sub").value.trim(),icon:icon||"",nicks:[...new Set($("#s-nicks").value.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean))],home:$("#s-home").value,...($("#s-z")?{noz:!$("#s-z").checked}:{})};
    S.site={...S.site,...v};applySite();
    try{await S.db.doc("scenarios/_site").set(v,{merge:true});toast("저장했어요");}catch(e){writeFail(e);}
    render();
  };
  bindEmoAdmin();
  storeScan();
  if(!_chkRan)runAdminChecks();
}
// ---------- 저장 공간 · 예상 비용 (관리 페이지) ----------
// 무료: 저장 5GB-월 · 내려받기 월 100GB (US-EAST1 등 US 지역 버킷). 넘는 저장은 GB당 월 약 $0.02
const FREE_GB=5,USD_GB=0.02,KRW=1400;
S.stu=null;let _stuRun=false;
function fmtMB(b){const m=b/1048576;return m>=1024?(m/1024).toFixed(2)+"GB":m>=1?Math.round(m)+"MB":b>0?Math.max(1,Math.round(b/1024))+"KB":"0MB";}
function storeUseHTML(){
  const u=S.stu;if(!u)return `<div class="tip" style="margin-top:6px">세는 중…</div>`;
  const tot=u.audio+u.emo,gb=tot/1073741824,pct=Math.min(100,gb/FREE_GB*100);
  const over=Math.max(0,gb-FREE_GB),usd=over*USD_GB,krw=Math.ceil(usd*KRW);
  return `<div class="stbar"><i style="width:${pct.toFixed(1)}%"></i></div>
    <div class="stnum"><b>${fmtMB(tot)}</b> / 무료 ${FREE_GB}GB <span class="tip">(${pct<1&&tot>0?"1% 미만":Math.round(pct)+"%"})</span></div>
    <div class="tip">녹음 ${u.nAudio}개 ${fmtMB(u.audio)} · 이모티콘 ${u.nEmo}개 ${fmtMB(u.emo)}${u.miss?` · 크기를 못 읽은 파일 ${u.miss}개`:""}</div>
    <div class="stcost">이번 달 예상 비용: <b>${over>0?`약 ${krw.toLocaleString("ko-KR")}원`:"0원"}</b> <span class="tip">${over>0?`(무료 5GB를 넘은 ${over.toFixed(2)}GB × $${USD_GB} · $1=${KRW}원으로 셈)`:"· 무료 범위 안이에요"}</span></div>
    <div class="tip" style="margin-top:4px">${u.nAudio&&u.audio?`녹음 평균 ${fmtMB(u.audio/u.nAudio)} 기준으로 녹음 약 ${Math.max(0,Math.floor((FREE_GB*1073741824-tot)/(u.audio/u.nAudio)))}개를 더 올릴 수 있어요. `:""}듣기(내려받기)는 월 100GB까지 무료라 따로 셈하지 않아요. 후기 사진은 빠져 있어요.</div>`;
}
async function storeScan(){
  if(!S.canAdmin||!S.storage)return;
  // 녹음 목록이 바뀌었으면(처음 불러올 때 포함) 다시 세요
  const key=S.sessions.filter(x=>x.audioPath).map(x=>x.id+":"+(x.audioSize||0)).join(",")+"|"+(site().emo||[]).length;
  if(_stuRun||(S.stu&&S.stu.key===key))return;_stuRun=true;
  const u={audio:0,nAudio:0,emo:0,nEmo:0,miss:0};
  for(const x of S.sessions.filter(x=>x.audioPath)){let sz=x.audioSize||0;
    if(!sz){try{sz=(await S.storage.ref(x.audioPath).getMetadata()).size||0;if(sz)S.db.doc("sessions/"+x.id).update({audioSize:sz}).catch(()=>{});}catch(e){u.miss++;}}
    if(sz){u.audio+=sz;u.nAudio++;}}
  const list=site().emo||[];let fix=false;
  for(const e of list){let sz=e.sz||0;if(!sz&&e.p){try{sz=(await S.storage.ref(e.p).getMetadata()).size||0;e.sz=sz;fix=true;}catch(err){u.miss++;}}if(sz){u.emo+=sz;u.nEmo++;}}
  if(fix)S.db.doc("scenarios/_site").set({emo:list},{merge:true}).catch(()=>{});
  u.key=key;S.stu=u;_stuRun=false;const el=$("#stuse");if(el)el.innerHTML=storeUseHTML();
}
function bindEmoAdmin(){
  const pick=$("#em-pick"),file=$("#em-file");if(!pick)return;
  pick.onclick=()=>file.click();
  file.onchange=async()=>{const f=file.files[0];file.value="";if(!f)return;
    try{if(/gif/i.test(f.type)&&f.size<700*1024){S.emBlob=f;S.emPrev=URL.createObjectURL(f);}
      else{const d=await shrinkImage(f,128,"image/png");S.emBlob=await (await fetch(d)).blob();S.emPrev=d;}
      pick.innerHTML=`<img src="${S.emPrev}" alt="">`;$("#em-n").focus();}catch(e){toast("이미지를 읽지 못했어요");}};
  $("#em-add").onclick=async()=>{const n=$("#em-n").value.trim().replace(/^:|:$/g,"");
    if(!S.emBlob){toast("이미지를 먼저 골라 주세요");return;}
    if(!/^[^:\s<>"'&]{1,20}$/.test(n)){toast("이름은 띄어쓰기·: 없이 20글자까지예요");return;}
    const list=[...(site().emo||[])];if(list.some(e=>e.n===n)){toast(`:${n}: 은 이미 있어요`);return;}
    const b=$("#em-add");b.disabled=true;
    try{const gif=/gif/i.test(S.emBlob.type),ref=S.storage.ref(`emoji/${Date.now().toString(36)}${rid4()}.${gif?"gif":"png"}`);
      await ref.put(S.emBlob,{contentType:gif?"image/gif":"image/png",cacheControl:"public,max-age=31536000"});
      const u=await ref.getDownloadURL();list.push({n,u,p:ref.fullPath,sz:S.emBlob.size||0});
      await S.db.doc("scenarios/_site").set({emo:list},{merge:true});S.site={...S.site,emo:list};
      S.emBlob=null;S.emPrev=null;toast(`:${n}: 를 등록했어요`);render();}
    catch(e){b.disabled=false;toast("등록하지 못했어요"+(e&&e.code?` (${e.code})`:""));}};
  document.querySelectorAll("[data-emdel]").forEach(b=>b.onclick=async()=>{const n=b.dataset.emdel;if(!confirm(`:${n}: 이모티콘을 지울까요? 이미 쓴 글에서는 :${n}: 글자로 보이게 돼요.`))return;
    const list=(site().emo||[]).filter(e=>e.n!==n),old=(site().emo||[]).find(e=>e.n===n);
    try{await S.db.doc("scenarios/_site").set({emo:list},{merge:true});S.site={...S.site,emo:list};if(old&&old.p)S.storage.ref(old.p).delete().catch(()=>{});render();}catch(e){writeFail(e);}});
}
