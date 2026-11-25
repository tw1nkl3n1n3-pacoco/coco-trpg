// 코코 로그방 · 세션 올리기 페이지 · 로딩·진행 막대
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- 세션 올리기 페이지 (#up · #up-<세션id>) ----------
// 1 종류(오프라인/온라인) → 2 세션(이어서/새로) → 3 자료(녹음·코코포리아 로그·없음) → 4 확인
const UP_STEPS=["종류","세션","자료","확인"];
function upScen(){const u=S.up;return u.mode==="cont"?scenById(u.scid):null;}
function upCamp(){const u=S.up;return u.mode==="next"?campById(u.gid):null;}
function upName(){const u=S.up,sc=upScen();return sc?sc.name:(u.name||"").trim();}
function upCont(){return S.scens.filter(x=>!x.done&&x.id!=="_site").sort((a,b)=>(b.lastDay||"").localeCompare(a.lastDay||"")||a.name.localeCompare(b.name,"ko"));}
function upHTML(){
  const u=S.up,st=u.step,can=S.db&&S.canWrite;
  const card=(on,attr,ic,t,d)=>`<button type="button" class="upcard${on?" on":""}" ${attr}>${ic?`<span class="ic">${ic}</span>`:""}<b>${t}</b><span class="d">${d}</span></button>`;
  let body="";
  if(!can)body=`<div class="notice">세션을 올리려면 관리자로 로그인해 주세요.</div>`;
  else if(st===0)body=`<div class="upq">어떤 세션이에요?</div><div class="upcards">
    ${card(u.kind==="off",'data-upk="off"',"🎙","오프라인 세션","만나서 플레이 · 클로바노트 녹음·대사 txt를 올리거나, 녹음 없이 날짜만 남겨요")}
    ${card(u.kind==="on",'data-upk="on"',"💻","온라인 세션","코코포리아 등에서 플레이 · 방의 로그 html을 올리거나, 로그 없이 날짜만 남겨요")}</div>`;
  else if(st===1){const list=upCont();
    body=`${u.fixedCamp?`<div class="upq">${isCamp(campById(u.gid))?`${esc(campById(u.gid)?.name||"캠프")}에 탁 추가`:`${esc(campById(u.gid)?.name||"캠페인")}의 다음 시나리오`}</div>`:`<div class="upq">어느 세션이에요?</div><div class="upcards">
      ${card(u.mode==="cont",'data-upm="cont"',"","이어서 하는 세션","이미 있는 세션에 회차를 추가해요 · 완주한 세션은 안 보여요")}
      ${card(u.mode==="new",'data-upm="new"',"","새 세션","처음 올리는 시나리오")}
      ${S.camps.some(c=>!c.done&&!isCamp(c))?card(u.mode==="next"&&!u.ck,'data-upm="next"',"","캠페인의 다음 시나리오","진행 중인 캠페인에 새 편을 붙여요 · 지난 편 플레이어가 미리 채워져요"):""}
      ${card(u.mode==="next"&&!!u.ck,'data-upm="camp"',"","캠프의 탁","당일치기·며칠짜리 캠프에서 돈 탁을 올려요 · 캠프는 여기서 새로 만들 수도 있어요")}</div>`}
      ${u.mode==="next"?`<div class="upq"${u.fixedCamp?' style="display:none"':""}>${u.ck?"캠프":"캠페인"}</div><div class="upsel"${u.fixedCamp?' style="display:none"':""}><select id="up-g"><option value="">— 골라 주세요 —</option>${S.camps.filter(c=>u.ck?isCamp(c):!c.done&&!isCamp(c)).map(c=>`<option value="${esc(c.id)}"${c.id===u.gid?" selected":""}>${esc(c.name)} · ${campCount(c)}</option>`).join("")}${u.ck?`<option value="__newcamp">＋ 새 캠프…</option>`:""}</select></div>
        <div class="fields" style="margin-top:10px"><label>시나리오 이름<input type="text" id="up-name" value="${esc(u.name||"")}" placeholder="${u.ck?"이 탁의 시나리오 이름":"이번 편 시나리오 이름"}"></label>
        <label>해외 시나리오면 원래 제목 (선택)<input type="text" id="up-orig" value="${esc(u.orig||"")}"></label>
        ${u.ck?`<label>룰<input type="text" id="up-sys" value="${esc(u.system||"")}" placeholder="예: 더블크로스 3rd · 인세인 · D&D 5e"></label></div>`:`<label>룰 <span class="tip" style="display:inline">· 비워 두면 캠페인 룰${upCamp()&&upCamp().system?`(${esc(sysLabel(upCamp().system))})`:""}을 따라가요</span><input type="text" id="up-sys" value="${esc(u.system||"")}" placeholder="다른 룰로 갈 때만"></label>
        <label class="chk"><input type="checkbox" id="up-gai"${u.gaiden?" checked":""}> 외전</label></div>`}`
      :u.mode==="cont"?(list.length?`<div class="upq">세션 고르기</div><div class="upsel"><select id="up-sc"><option value="">— 골라 주세요 —</option>${list.map(x=>{const n=groups().find(g=>g.scen===x.name)?.days.length||0;return `<option value="${esc(x.id)}"${x.id===u.scid?" selected":""}>${esc(x.name)}${x.system?` · ${esc(sysLabel(x.system))}`:""}${n?` · ${n}회차`:""}</option>`;}).join("")}</select></div>`:`<div class="tip" style="margin-top:12px">이어서 할 세션이 없어요. 완주하지 않은 세션만 여기 떠요.</div>`)
      :`<div class="upq">새 세션</div><div class="fields"><label>시나리오 이름<input type="text" id="up-name" value="${esc(u.name||"")}" placeholder="시나리오 이름"></label>
        <label>해외 시나리오면 원래 제목 (선택)<input type="text" id="up-orig" value="${esc(u.orig||"")}"></label>
        <label>룰<input type="text" id="up-sys" value="${esc(u.system||"")}" placeholder="예: 더블크로스 3rd · 인세인 · D&D 5e" list="up-syslist"></label>
        <datalist id="up-syslist">${[...new Set(S.scens.map(x=>sysLabel(x.system||"")).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist></div>`}`;}
  else if(st===2){const off=u.kind==="off";
    body=`<div class="upsc"><b>${esc(upName())}</b> · ${off?"오프라인":"온라인"}</div><div class="upq">무엇을 올릴까요?</div><div class="upcards">
      ${off?card(u.src==="file",'data-ups="file"',"🎧","녹음 올리기","클로바노트 대사 txt + 녹음 파일(m4a 등)을 한꺼번에 · 이름이 같으면 알아서 짝지어요 · 녹음 파일만 골라 이미 올린 회차에 붙일 수도 있어요")
        :card(u.src==="file",'data-ups="file"',"📜","코코포리아 로그","방 메뉴 → 로그 출력으로 받은 html · 날짜별로 회차를 나눠요")}
      ${card(u.src==="none",'data-ups="none"',"🚫",off?"녹음 없음":"로그 없음",off?"녹음이 금지된 세션 · 플레이한 날짜만 회차로 남겨요":"플레이한 날짜만 회차로 남겨요")}</div>
      ${u.src==="file"?`<div class="upq">파일</div><label class="updrop" id="up-drop"><b>${off?"여기로 끌어다 놓거나 눌러서 고르기":"로그 html 고르기"}</b>${off?"대사 txt · 녹음 파일을 한꺼번에":"[메인]·[잡담] 탭이 다 들어간 로그면 좋아요"}
          <input type="file" id="up-file" ${off?`accept=".txt,text/plain${S.storage?",audio/*,video/*,.m4a,.mp3,.wav,.ogg,.webm":""}" multiple`:'accept=".html,.htm,text/html"'} style="display:none"></label>
        <div id="imp"></div><div id="bulkres" class="tip" style="margin-top:8px">${S.bulkMsg||""}</div>`
      :u.src==="none"?`<div class="upq">플레이한 날</div><div class="updates">${u.dates.map((v,i)=>`<span class="playd"><input type="date" data-upd="${i}" value="${esc(v)}">${u.dates.length>1?`<button type="button" class="ghost" data-updel="${i}">✕</button>`:""}</span>`).join("")}<button type="button" class="ghost" id="up-dadd">＋ 날짜 추가</button></div>`:""}`;}
  else if(st===3){const sc=upScen(),n=(groups().find(g=>g.scen===upName())?.days.length)||0;const ds=[...new Set(u.dates.filter(Boolean))].sort();
    body=`<div class="upq">이렇게 올릴게요</div><div class="upsum"><b>${esc(upName())}</b> · ${u.kind==="off"?"오프라인":"온라인"}${(sc?.system||u.system)?` · ${esc(sysLabel(sc?.system||u.system))}`:""}${sc?"":upCamp()?` · <span class="tip">${isCamp(upCamp())?`${esc(upCamp().name)}의 탁`:`${esc(upCamp().name)}의 ${u.gaiden?"외전":"다음 편"}`}</span>`:` · <span class="tip">새 세션</span>`}<br>
      ${ds.map((d,i)=>`${n+i+1}회차 · ${esc(fmtDay(d))} — ${u.kind==="off"?"녹음 없음":"로그 없음"}`).join("<br>")}</div>
      ${sc?"":`<div class="tip" style="margin-top:8px">올린 뒤 세션 수정 화면이 열려요. 거기서 플레이어·등장인물을 넣어 주세요.</div>`}<div id="iprog" class="tip" style="margin-top:6px"></div>`;}
  const fileStep=st===2&&u.src==="file";
  const shown=fileStep&&u.picked?3:st;
  const nextOk=st===0?!!u.kind:st===1?(u.mode==="cont"?!!u.scid:u.mode==="next"?!!u.gid&&!!(u.name||"").trim():!!(u.name||"").trim()):st===2?u.src==="none":false;
  return `<div class="upw"><h2>세션 올리기</h2><div class="tip">플레이한 세션을 올려요</div>
    <div class="upsteps">${UP_STEPS.map((x,i)=>`<span class="${i===shown?"on":i<shown?"done":""}">${i+1}. ${x}</span>`).join("")}</div>
    ${body}
    <div class="upnav"><button class="ghost" id="up-back">${st===0||(st===2&&u.fixed&&false)?"← 목록":"← 이전"}</button>${!can||fileStep?"":st===3?`<button class="pri" id="up-go">올리기</button>`:`<button class="pri" id="up-next"${nextOk?"":" disabled"}>다음 →</button>`}</div></div>`;
}
function bindUp(){
  const u=S.up;if(!u)return;
  const pull=()=>{const sc=$("#up-sc");if(sc)u.scid=sc.value;const ug=$("#up-g");if(ug)u.gid=ug.value;const gi=$("#up-gai");if(gi)u.gaiden=gi.checked;const n=$("#up-name");if(n)u.name=n.value;const o=$("#up-orig");if(o)u.orig=o.value.trim();const y=$("#up-sys");if(y)u.system=y.value.trim();
    const ds=document.querySelectorAll("[data-upd]");if(ds.length)u.dates=[...ds].map(i=>i.value);};
  const go=()=>{render();window.scrollTo(0,0);};
  document.querySelectorAll("[data-upk]").forEach(b=>b.onclick=()=>{u.kind=b.dataset.upk;u.src="";u.picked=false;render();});
  document.querySelectorAll("[data-upm]").forEach(b=>b.onclick=()=>{pull();const m=b.dataset.upm,ck=m==="camp"?"camp":"";if(ck!==(u.ck||""))u.gid="";u.ck=ck;u.mode=m==="camp"?"next":m;render();});
  document.querySelectorAll("[data-ups]").forEach(b=>b.onclick=()=>{u.src=b.dataset.ups;u.picked=false;S.bulkMsg="";if(u.src==="none"&&!u.dates.length)u.dates=[new Date(Date.now()+9*3600e3).toISOString().slice(0,10)];render();});
  const sc=$("#up-sc");if(sc)sc.onchange=()=>{pull();render();};
  const ugs=$("#up-g");if(ugs)ugs.onchange=async()=>{if(ugs.value==="__newcamp"){const n=(prompt("새 캠프 이름")||"").trim();if(!n){ugs.value=u.gid||"";return;}
    try{const id=await newCamp(n,"","camp");S.camps.push({id,name:n,system:"",kind:"camp",eps:[]});u.gid=id;toast("캠프를 만들었어요. 날짜·장소는 캠프 페이지에서 넣어요",3500);render();}catch(e){writeFail(e);}return;}
    pull();render();};
  const nm=$("#up-name");if(nm)nm.oninput=()=>{pull();const b=$("#up-next");if(b)b.disabled=!u.name.trim()||(u.mode==="next"&&!u.gid);};
  const da=$("#up-dadd");if(da)da.onclick=()=>{pull();u.dates.push(u.dates[u.dates.length-1]||new Date(Date.now()+9*3600e3).toISOString().slice(0,10));render();};
  document.querySelectorAll("[data-updel]").forEach(b=>b.onclick=()=>{pull();u.dates.splice(+b.dataset.updel,1);render();});
  $("#up-back").onclick=()=>{pull();u.picked=false;
    if(u.step===0){location.hash=u.fixedCamp?"g-"+u.gid:u.fixed?"c-"+u.scid:"";return;}
    u.step=u.step===2&&u.fixed?0:u.step-1;go();};
  const nx=$("#up-next");if(nx)nx.onclick=()=>{pull();
    if(u.step===1&&(u.mode==="new"||u.mode==="next")){const n=u.name.trim();if(findScen(n)){toast("이미 있는 세션이에요. '이어서 하는 세션'에서 골라 주세요",3500);return;}}
    u.step=u.step===0&&u.fixed?2:u.step+1;go();};
  const opt=()=>{const s=upScen();return {scen:upName(),system:s?"":u.system||"",orig:s?"":u.orig||"",camp:u.mode==="next"?u.gid:"",gaiden:u.mode==="next"&&!!u.gaiden&&!isCamp(upCamp())};};
  const fi=$("#up-file");if(fi){fi.onchange=async()=>{const all=[...fi.files];fi.value="";if(!all.length)return;u.picked=true;
      document.querySelectorAll(".upsteps span").forEach((x,i)=>{x.className=i===3?"on":i<3?"done":"";});
      await takeFiles(all,opt());};
    const dr=$("#up-drop");dr.ondragover=e=>{e.preventDefault();dr.classList.add("over");};dr.ondragleave=()=>dr.classList.remove("over");
    dr.ondrop=async e=>{e.preventDefault();dr.classList.remove("over");const all=[...(e.dataTransfer?.files||[])];if(!all.length)return;u.picked=true;
      document.querySelectorAll(".upsteps span").forEach((x,i)=>{x.className=i===3?"on":i<3?"done":"";});await takeFiles(all,opt());};}
  const ug=$("#up-go");if(ug)ug.onclick=async()=>{
    const ds=[...new Set(u.dates.filter(x=>/^\d{4}-\d\d-\d\d$/.test(x)))].sort();if(!ds.length){toast("날짜를 넣어 주세요");return;}
    ug.disabled=true;const pr=$("#iprog");pr.textContent="올리는 중…";
    try{let sc=upScen();
      if(sc){await mutateScen(sc.id,L=>{L.plays=[...new Set([...(L.plays||[]),...ds])].sort();});location.hash="c-"+sc.id;}
      else{let sp=[];const c=upCamp();
        if(c&&!isCamp(c)){const last=campEps(c).filter(e=>(e.sp||[]).length).pop();if(last)sp=(last.sp||[]).filter(p=>!/&/.test(p.name||"")&&(p.k===gmKey(last)||!isAnon(p)||p.ch)).map(p=>({k:"k"+rid(),name:pcSplit(p.name||"").name,c:p.c,...(p.ch?{ch:p.ch}:{}),...(p.img?{img:p.img}:{}),_gm:p.k===gmKey(last)}));}
        const gmP=sp.find(p=>p._gm);sp.forEach(p=>delete p._gm);
        sc=createScen(u.name.trim(),sp);sc.plays=ds;if(gmP)sc.gm=gmP.k;if(u.system)sc.system=u.system;if(u.orig)sc.orig=u.orig;if(c){sc.camp=c.id;if(u.gaiden&&!isCamp(c))sc.gaiden=true;}
        await saveScen(sc);
        if(c){await S.db.doc("camps/"+c.id).update({eps:[...campEps(c).map(e=>e.id).filter(x=>x!==sc.id),sc.id]});if(!sc.gaiden){c.eps=[...(c.eps||[]),sc.id];await closePrevEps(c.id,sc.id);}}
        S.pendingEdit=sc.id;location.hash="c-"+sc.id;}
    }catch(e){ug.disabled=false;pr.innerHTML=`<span style="color:var(--bad)">올리지 못했어요: ${esc(e.code||e.message||"")}</span>`;}
  };
}

// ---------- 로딩 화면 (테마별) · 로그 뼈대 · 진행 막대 ----------
// 0.3초 안에 끝나는 로딩에는 안 보이게 CSS에서 살짝 늦게 나타나요
function loaderHTML(){return `<div class="ldr" role="status" aria-label="불러오는 중"><div class="ldots"><i></i><i></i><i></i></div><div class="lbl">불러오는 중</div></div>`;}
// 올리기 진행 막대: label · 0~1
function setProg(el,label,f){if(!el)return;let b=el.querySelector(".upbar");
  if(!b){el.innerHTML=`<div class="upbar"><div class="top"><span class="l"></span><b class="p"></b></div><div class="pbar"><i></i></div></div>`;b=el.querySelector(".upbar");}
  b.querySelector(".l").textContent=label;const p=f==null?null:Math.max(0,Math.min(1,f));
  b.querySelector(".p").textContent=p==null?"":Math.round(p*100)+"%";b.querySelector(".pbar i").style.width=(p==null?100:p*100)+"%";b.classList.toggle("ind",p==null);}
