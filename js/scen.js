// 코코 로그방 · 세션 페이지
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- scenario page ----------
// '나' 고르기용 이름칩 (잠금 화면 · 바꾸기 창): 인장 없이 이름만
function meCast(sc){return gmFirst((sc.sp||[]).filter(p=>p.k===gmKey(sc)||!isAnon(p)&&!/&/.test(p.name)||p.ch),gmKey(sc));}
function meName(sc,k){const p=(sc.sp||[]).find(x=>x.k===k);return p?pcSplit(p.name).name:"";}
function meChipsHTML(sc,sel,ext){
  const cs=meCast(sc);
  return `<div class="q">누구로 들어갈까요?</div><div class="lklist">${cs.map(p=>{const gm=p.k===gmKey(sc),q=pcSplit(p.name);
    return `<button type="button" class="lkc${p.k===sel?" mine":""}" data-mek="${esc(p.k)}" style="--c:${fixC(p.c)}">${gm?gmTag:q.n?`<span class="pcn">${q.n}</span>`:"<i></i>"}<span class="nm">${esc(gm?(p.ch||gmWord(sc)):(p.ch||q.name))}</span><span class="pl">${esc(p.ch||gm?q.name:"")}</span></button>`;}).join("")}</div>
    ${ext?`<button type="button" class="lkout${sel==="ext"?" on":""}" data-mek="ext">외부인으로 보기</button>`:""}`;
}
function mePicker(sc){
  const ov=document.createElement("div");ov.className="rvov";
  ov.innerHTML=`<div class="mepick">${meChipsHTML(sc,myK(sc.id),!S.canAdmin)}<div class="rv-btns"><button class="ghost" data-x>닫기</button></div></div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{const b=e.target.closest("[data-mek]");if(b){setMe(sc.id,b.dataset.mek);ov.remove();refreshCanWrite();render();return;}
    if(e.target===ov||e.target.closest("[data-x]"))ov.remove();};
}
function scenHTML(){
  const sc=scenById(S.cid);
  if(!sc){
    if(!S.loaded||!S.authUser)return `<div class="sc-page">${loaderHTML()}</div>`;
    return `<div class="sc-page"><button class="ghost ownonly" id="scback">← 목록</button><div class="notice">이 세션을 찾을 수 없어요.</div></div>`;
  }
  // 비밀번호를 넣기 전에는 시나리오 페이지 대신 잠금 화면만: 누구로 들어갈지 고르고 비밀번호
  if(!isOpen(sc.id))return `<div class="sc-page lockpage"><div class="lkwrap"><div class="lkbox">
      <div class="lockicon">🔒</div><h2>${esc(sc.name)}</h2><div class="tip">잠긴 세션이에요</div>
      ${meChipsHTML(sc,S.lockPick,true)}
      ${S.lockPick?`<div class="lkpw"><div class="who">${S.lockPick==="ext"?`외부인은 로그를 <span class="me">읽기만</span> 할 수 있어요`:`<span class="me">${esc(meName(sc,S.lockPick))}</span>(으)로 들어가요`}</div>
        <form id="unlockf"><input type="text" id="unlockpw" placeholder="열람 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form>
        <div class="tip" id="unlockmsg" style="margin-top:8px"></div></div>`:`<div class="guest">같이 플레이한 친구에게 받은 비밀번호가 필요해요</div>`}
      <div class="homefoot"><button class="ghost ownonly" id="scback">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div>
    </div></div></div>`;
  const days=(groups().find(g=>g.scen===sc.name)||{days:[]}).days;
  const txt=(v,ph)=>v?`<div class="sc-text">${esc(v)}</div>`:`<div class="sc-text empty">${ph}</div>`;
  if(S.scEdit){
    if(!S.scDraft||S.scDraft.id!==sc.id){S.scDraft=JSON.parse(JSON.stringify(sc));S.scDraft.sp=gmFirst(S.scDraft.sp,gmKey(S.scDraft));S.scBase=clone(S.scDraft);}
    const d=S.scDraft;
    return `<div class="sc-page">
      <div class="sc-top"><h2>세션 수정</h2><button class="ghost" data-x>취소</button><button class="pri" data-ok>저장</button></div>
      <div class="sc-sec"><div class="fields" style="margin:0">
        <label>시나리오 이름<input type="text" id="e-name" value="${esc(d.name)}"></label>
        <label>원어 제목 <span class="tip" style="display:inline">· 선택</span><input type="text" id="e-orig" value="${esc(d.orig||"")}" placeholder="해외 시나리오면 원래 제목 (없으면 비워 두세요)"></label>
        <label>룰 시스템<input type="text" id="e-sys" value="${esc(d.system||"")}" placeholder="예: D&D 5.5e, 더블크로스 3rd, CoC 7판, 인세인" list="syslist"></label>
        <label>고정탁 <span class="tip" style="display:inline">· 같은 인선으로 이어가는 탁이면 이름을 붙여요 (예: ㄹㅈㅅ)</span><input type="text" id="e-fix" value="${esc(d.fix||"")}" placeholder="비워 두면 없음" list="fixlist"></label>${fixListHTML()}
        <div class="donerow"><label class="chk"><input type="checkbox" id="e-done"${d.done?" checked":""}> 완주했어요</label><label class="donedate">완주한 날 <input type="date" id="e-doneat" value="${esc(d.doneAt||"")}"></label></div>
        <datalist id="syslist">${[...new Set(S.scens.map(x=>(x.system||"").trim()).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
      </div></div>
      ${cvEditHTML(d,sc)}
      <div class="sc-sec"><h4 data-en="NO-LOG DAYS">녹음 없이 플레이한 날 <span class="tip" style="letter-spacing:0">· 녹음이 금지된 세션 · 로그 없이 회차로만 보여요</span></h4>
        <div class="plays">${(d.plays||[]).map((v,i)=>`<span class="playd"><input type="date" data-play="${i}" value="${esc(v)}"><button type="button" class="ghost" data-playdel="${i}" title="빼기">✕</button></span>`).join("")}<button type="button" id="e-playadd">＋ 날짜 추가</button></div>
      </div>
      ${S.canAdmin&&S.db?(()=>{const others=d.camp&&campById(d.camp)?campEps(campById(d.camp)).filter(e=>e.id!==sc.id):[];
        const dc=campById(d.camp);
        return `<div class="sc-sec"><h4 data-en="CAMPAIGN">캠페인 · 캠프</h4><div class="campfld">
        <select id="e-camp"><option value="">없음</option>${S.camps.map(c=>`<option value="${esc(c.id)}"${c.id===d.camp?" selected":""}>${esc(c.name)}${isCamp(c)?" · 캠프":c.done?" (완주)":""}</option>`).join("")}<option value="__new">＋ 새 캠페인…</option><option value="__newcamp">＋ 새 캠프…</option></select>
        ${dc&&!isCamp(dc)?`<span>순서</span><select id="e-campafter"><option value="__first"${d.campAfter==="__first"?" selected":""}>맨 앞</option>${others.map(e=>`<option value="${esc(e.id)}"${d.campAfter===e.id?" selected":""}>${esc(epLabel(campById(d.camp),e))} ${esc(e.name)} 뒤</option>`).join("")}</select>
        <label class="chk"><input type="checkbox" id="e-gaiden"${d.gaiden?" checked":""}> 외전</label>`:""}</div>
        <div class="tip" style="margin-top:6px">${dc&&isCamp(dc)?"캠프는 여러 탁이 같이 돈 모임이에요 · 탁은 플레이 날짜 순서로 보여요":"캠페인: 이어지는 시나리오 · 룰을 비워 두면 캠페인 룰을 따라가요 · 외전은 편 번호 없이 '외전'으로 표시돼요<br>캠프: 여러 탁이 같이 돈 모임 (편 번호 없이 탁별로 보여요)"}</div></div>`;})():""}
      <div class="sc-sec"><h4 data-en="SUMMARY">개요</h4><textarea id="e-sum" placeholder="배경, 도입, 목표, 등장 NPC 등">${esc(d.summary||"")}</textarea></div>
      <div class="sc-sec"><h4 data-en="CAST">플레이어 · 등장인물</h4>
        ${(()=>{const c=SCC[sc.id];const zero=c?d.sp.filter(p=>p.k!==d.gm&&!(c[p.k]>0)).length:0;return `
        <div class="roster ed"><span></span><span class="h">인장</span><span class="h">플레이어 (로그에 나오는 이름)</span><span class="h">등장인물</span><span class="h">GM</span><span class="h" style="text-align:right">대사</span><span class="h" style="text-align:right">순서 · 지우기</span>
        ${d.sp.map((p,i)=>{const n=c?(c[p.k]||0):null;return `<button class="swatch" data-sw="${i}" style="--c:${fixC(p.c)}" title="색 바꾸기"></button>
          <button type="button" class="avb${d.gm===p.k?" gm":""}" data-av="${i}" style="--c:${fixC(p.c)}" title="눌러서 인장 올리기">${avHTML(p,d.gm===p.k)}${p.img?`<span class="avx" data-avx="${i}" title="인장 지우기">×</span>`:""}</button>
          <input type="text" data-nm="${i}" value="${esc(p.name)}"><input type="text" data-ch="${i}" value="${esc(p.ch||"")}" placeholder="(선택)">
          <input type="radio" name="gm" data-gm="${p.k}" ${d.gm===p.k?"checked":""} title="GM으로 지정">
          <span class="cnum">${n===null?"…":n}</span>
          <span class="mgb"><button type="button" class="ghost" data-emv="${i}" data-d="-1" title="위로" ${i===0?"disabled":""}>↑</button><button type="button" class="ghost" data-emv="${i}" data-d="1" title="아래로" ${i===d.sp.length-1?"disabled":""}>↓</button><button type="button" class="ghost" data-edel="${i}" title="${n===0?"목록에서 지우기":"대사가 있어서 못 지워요 (로그 화면에서 다른 플레이어로 옮긴 뒤 지울 수 있어요)"}" ${n===0?"":"disabled"}>🗑</button></span>`;}).join("")}
        </div>
        <div style="margin-top:6px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><button type="button" id="e-spadd">＋ 플레이어 추가</button><label class="chk"><input type="radio" name="gm" data-gm="" ${d.gm?"":"checked"}>GM 없음</label>
          ${zero&&!(sc.plays||[]).length?`<button type="button" class="ghost" id="ezero">대사 없는 플레이어 ${zero}명 한꺼번에 지우기</button>`:""}</div>
        <input type="file" id="e-avfile" accept="image/*" style="display:none">
        <div class="tip" style="margin-top:8px">동그라미를 누르면 인장을 올려요(정사각형으로 잘려요). ×로 지우면 GM은 GM 그림, 나머지는 캐릭터 이름 첫 글자가 나와요. ↑↓로 바꾼 순서가 로그 화면의 숫자키 순서예요(GM은 늘 1번). 🗑는 대사가 하나도 없는 플레이어만 지울 수 있어요. 바꾼 내용은 <b>저장</b>을 눌러야 반영돼요.</div>`;})()}
      </div>

      ${S.canAdmin&&S.scens.length>1?`<div class="sc-sec"><h4 data-en="MERGE">다른 세션과 합치기</h4>
        <div class="tip" style="margin-bottom:8px">실수로 두 개가 된 세션을 하나로 합쳐요. 이 세션의 녹음이 모두 고른 세션으로 옮겨가고, 화자 목록은 이름이 같은 사람끼리 합쳐져요. 개요와 룰 시스템은 고른 쪽이 비어 있을 때만 옮겨와요.</div>
        <div style="display:flex;gap:8px"><select id="mto" style="flex:1"><option value="">합칠 세션 고르기</option>${S.scens.filter(x=>x.id!==sc.id).map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select><button id="mgo">합치기</button></div>
      </div>`:""}
      ${S.canAdmin&&!days.some(x=>x.parts.length)?`<button id="scdel" style="color:var(--bad)">이 세션 지우기</button>`:""}
    </div>`;
  }
  return `<div class="sc-page">
    ${sc.fix?fixLineHTML(sc.fix,"campline"):""}
    ${campOf(sc)?isCamp(campOf(sc))?`<div class="campline">캠프 · <a href="#g-${esc(sc.camp)}">${esc(campOf(sc).name)}</a></div>`:`<div class="campline">📚 <a href="#g-${esc(sc.camp)}">${esc(campOf(sc).name)}</a> · ${esc(epLabel(campOf(sc),sc))}${sc.gaiden?"":` <span class="tip">(전체 ${campCount(campOf(sc))})</span>`}</div>`:""}
    ${(()=>{const t=`<h2>${esc(sc.name)}${sc.orig?`<span class="orig">${esc(sc.orig)}</span>`:""}</h2>`,m=`${effSys(sc)?`<span class="sys" data-th="${themeOf(sc)||"pa"}">${esc(sysLabel(effSys(sc)))}</span>`:""}${bookCan(sc)?`<button id="scbook" type="button" title="리플레이북" aria-label="리플레이북" onclick="location.hash='b-${esc(sc.id)}'">📖<span class="lbl"> 리플레이북</span></button>`:""}${S.canWrite?`<button id="scedit" title="세션 수정" aria-label="세션 수정">✎<span class="lbl"> 수정</span></button>`:""}`;
      const hv=coverOf(sc);return hv?`<div class="schero"><img src="${esc(hv.u)}" alt="" style="object-position:50% ${+hv.y>=0?hv.y:50}%"><div class="schero-t">${t}<span class="scmeta">${m}</span></div></div>`
        :`<div class="sc-top">${t}<span class="scmeta">${m}</span></div>`;})()}
    <div class="sc-sec"><h4 data-en="SUMMARY">개요</h4>${txt(sc.summary,"아직 개요가 없어요."+(S.canWrite?" ✎ 수정을 눌러 써 주세요.":""))}</div>
    <div class="sc-sec"><h4 data-en="CAST">플레이어 · 등장인물</h4>${sc.sp.length?`${(()=>{const m=meSp(sc.id),k=myK(sc.id);return k==="ext"&&!S.canAdmin?`<div class="meline">외부인으로 보는 중 · <button class="lnk" id="mepick">바꾸기</button></div>`:m?`<div class="meline" style="--c:${fixC(m.c)}"><span class="me"><i></i>나: ${esc(pcSplit(m.name).name)}</span>${m.ch?` · ${esc(m.ch)}`:""} · <button class="lnk" id="mepick">바꾸기</button></div>`:`<div class="meline"><button class="lnk" id="mepick">나는 누구? 고르기</button></div>`;})()}<div class="castrow">${(sc.sp.some(p=>p.chr)?gmFirst(sc.sp.filter(p=>p.chr&&p.ch),gmKey(sc)):gmFirst(sc.sp.filter(p=>p.k===gmKey(sc)||!isAnon(p)&&!/&/.test(p.name)||p.ch),gmKey(sc))).map(p=>{const gm=p.k===gmKey(sc),q=pcSplit(p.name);return `<div class="cc${gm?" gm":""}${p.k===myK(sc.id)?" mine":""}" style="--c:${fixC(p.c)}"><div class="av">${avHTML(p,gm&&!p.chr)}</div><div class="cn">${esc(gm?(p.ch||gmWord(sc)):(p.ch||q.name))}</div><div class="cp">${gm?gmTag:q.n?`<span class="pcn">${q.n}</span>`:""}${p.ch||gm?esc(q.name):""}</div></div>`;}).join("")}</div>`:`<div class="sc-text empty">녹음을 올리면 화자가 여기 모여요.</div>`}</div>
    <div class="sc-sec"><h4 data-en="SESSIONS">${days.length&&days.every(x=>x.nolog||x.parts.every(p=>p.src==="ccfolia"||p.src==="roll20"))?"회차":"녹음"}</h4>${days.length?daysHTML(days):`<div class="sc-text empty">아직 올린 회차가 없어요.</div>`}${S.db&&S.canWrite&&!sc.done?`<div class="upadd"><a class="btnlike" href="#up-${esc(sc.id)}">＋ 회차 올리기</a></div>`:""}</div>
    ${S.db?revSectionHTML(sc):""}
    ${S.db?galHTML(galSrcScen(sc)):""}
    ${S.canAdmin?`    <div class="sc-sec"><h4 data-en="ACCESS">${campOf(sc)?campWord(campOf(sc))+" 비밀번호":"세션 비밀번호"} <span class="tip" style="letter-spacing:0">· 주인만 보여요</span></h4>
      <div class="tip" style="margin-bottom:10px">${campOf(sc)?`이 비밀번호 하나로 ${esc(campOf(sc).name)}의 모든 ${isCamp(campOf(sc))?"탁이":"편이"} 열려요.`:"링크와 비밀번호를 같이 받은 사람만 이 세션을 보고 고칠 수 있어요."}${fixOfScen(sc)?` 고정탁 ${esc(fixOfScen(sc))}의 비밀번호와 같아요(새로 만들면 고정탁 전체가 바뀌어요).`:""} 비밀번호를 새로 만들면 예전 비밀번호로 연 사람은 다시 잠겨요.</div>
      ${S.secrets&&S.secrets[pwOf(sc)]?`<div class="pwrow"><code class="pw">${esc(S.secrets[pwOf(sc)])}</code>
        <button id="copyshare" class="pri">링크+비밀번호 복사</button><button id="regenpw" class="ghost">새로 만들기</button></div>
        <div class="tip" style="margin-top:8px;word-break:break-all">${esc(shareUrl(sc.id))}</div>`:`<div class="tip">비밀번호를 만드는 중…</div>`}
    </div>`:""}
    ${(()=>{const c=campOf(sc);if(!c)return "";const es=campEps(c),i=es.findIndex(e=>e.id===sc.id),pv=es[i-1],nx=es[i+1];
      return pv||nx?`<div class="epnav">${pv?`<a href="#c-${esc(pv.id)}">◀ ${esc(epLabel(c,pv)||"이전 탁")}<small>${esc(pv.name)}</small></a>`:"<span></span>"}${nx?`<a class="r" href="#c-${esc(nx.id)}">${esc(epLabel(c,nx)||"다음 탁")} ▶<small>${esc(nx.name)}</small></a>`:"<span></span>"}</div>`:"";})()}
    <div class="homefoot"><button class="ghost ownonly" id="scback">← 목록</button><span style="flex:1"></span><span class="authbox"></span></div>
  </div>`;
}
// 시나리오 페이지에서 플레이어 순서 바꾸기·안 쓰는 플레이어 지우기
// SCC: 시나리오별 플레이어 대사 수 (모든 녹음 합계), 맨 위에 선언
async function loadScenCounts(sc){
  const m={};
  for(const s of S.sessions.filter(x=>info(x).scen===sc.name)){
    const snap=await S.db.collection(`sessions/${s.id}/chunks`).get();
    snap.docs.forEach(d=>(d.data().b||[]).forEach(b=>{m[b.s]=(m[b.s]||0)+1;}));
  }
  SCC[sc.id]=m;
}
// 녹음 목록을 다 받아온 뒤에만 대사 수를 세요 (빈 목록으로 세면 모두 0이 돼요)
function sessionsReady(id){return S.canAdmin?!!SUB.sessData.all:!!SUB.sessData[id];}
// 수정 창에서 바꾼 부분만 최신 시나리오에 적용 (다른 사람이 그 사이에 바꾼 건 그대로 둬요)
// 카드 이미지 = 공유 이미지 (첫 화면 카드 + 링크 미리보기에 같이) · 직접 올린 그림(og) 또는 갤러리 사진 + 보여줄 위치
function cvEditHTML(d,sc){const G=galRaw(sc).filter(p=>galT(p)!=="txt"),opts=[...(d.og?[{id:"og",u:d.og,lb:"올린 그림"}]:[]),...G.slice().sort((a,b)=>(a.at||0)-(b.at||0)).flatMap((p,i)=>{const im=galImgs(p);return im.map((q,k)=>({id:p.id+"|"+k,u:q.u||q.o,lb:"갤러리 "+String(i+1).padStart(2,"0")+(im.length>1?"-"+(k+1):"")}));})];
  const c=d.cover||{},cur=c.og?"og":c.id?c.id+"|"+(c.k||0):(d.og?"og":""),y=+c.y>=0?+c.y:50,cu=coverOf(d);
  return `<div class="sc-sec cvsec"><h4 data-en="CARD IMAGE">카드 · 공유 이미지 <span class="tip" style="letter-spacing:0">· 첫 화면 카드와 링크 미리보기에 같이 쓰여요</span></h4>
    <div class="cvpick"><button type="button" class="cvup" id="e-ogup"><span>＋</span><small>새로 올리기</small></button><input type="file" id="e-ogfile" accept="image/*" style="display:none">${opts.map(o=>`<button type="button" class="${o.id===cur?"on":""}" data-cvpick="${esc(o.id)}"><img src="${esc(o.u)}" alt="" loading="lazy"><small>${esc(o.lb)}</small></button>`).join("")}</div>
    ${cu?`<div class="cvprev cv" id="e-cvprev"><img src="${esc(cu.u)}" alt="" style="object-position:50% ${y}%" draggable="false"></div>
    <div class="cvrng">위 <input type="range" id="e-cvy" min="0" max="100" value="${y}"> 아래${cur==="og"?`<button type="button" class="ghost" id="e-ogdel" style="margin-left:auto">올린 그림 빼기</button>`:""}</div><div class="tip">그림을 위아래로 끌거나 막대를 움직여서 보여줄 부분을 골라요 (4:3보다 긴 그림만 움직여요)</div>`:`<div class="tip">아직 그림이 없어요 · 새로 올리거나 갤러리 사진을 골라요</div>`}</div>`;}
// 올린 그림: 비율은 그대로, 긴 쪽 1200px
function shrinkKeep(file,max=1200){return new Promise((ok,no)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const r=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*r),h=Math.round(img.height*r),c=document.createElement("canvas");c.width=w;c.height=h;
    const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(img,0,0,w,h);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",.85));};
  img.onerror=()=>{URL.revokeObjectURL(u);no();};img.src=u;});}
function bindCvEdit(){const d=S.scDraft;if(!d)return;const sc=scenById(S.cid);
  document.querySelectorAll("[data-cvpick]").forEach(b=>b.onclick=()=>{const pl=window.__scPull;pl&&pl();const id=b.dataset.cvpick,y=+(d.cover&&d.cover.y)>=0?+d.cover.y:50;
    if(id==="og")d.cover={og:1,y};else{const [pid,k]=id.split("|");const p=galRaw(sc).find(x=>x.id===pid);const q=p&&galImgs(p)[+k||0];if(q)d.cover={id:pid,k:+k||0,u:q.u||q.o,w:q.w||0,h:q.h||0,y};}render();});
  const r=$("#e-cvy"),pv=$("#e-cvprev"),im=pv&&pv.querySelector("img");if(!r||!im)return;
  const setY=v=>{v=Math.max(0,Math.min(100,Math.round(v)));r.value=v;im.style.objectPosition=`50% ${v}%`;if(!d.cover)d.cover={og:1,y:v};else d.cover={...d.cover,y:v};};
  r.oninput=()=>setY(+r.value);
  let sy=null,s0=0;pv.onpointerdown=e=>{sy=e.clientY;s0=+r.value;pv.setPointerCapture(e.pointerId);};
  pv.onpointermove=e=>{if(sy==null)return;const ex=im.naturalHeight&&im.naturalWidth?im.clientWidth*im.naturalHeight/im.naturalWidth-im.clientHeight:0;if(ex<=0)return;setY(s0-(e.clientY-sy)/ex*100);};
  pv.onpointerup=pv.onpointercancel=()=>{sy=null;};}
function mergeScenEdit(L,base,d){
  if(JSON.stringify(d.cover||null)!==JSON.stringify(base.cover||null)){if(d.cover)L.cover=d.cover;else delete L.cover;}
  ["name","system","summary","orig","doneAt"].forEach(f=>{if((d[f]||"")!==(base[f]||""))L[f]=d[f];});
  if(!!d.done!==!!base.done)L.done=!!d.done;
  if((d.theme||"")!==(base.theme||"")){if(d.theme)L.theme=d.theme;else delete L.theme;}
  if((d.og||"")!==(base.og||"")){if(d.og)L.og=d.og;else delete L.og;}
  if((d.fix||"")!==(base.fix||"")){if(d.fix)L.fix=d.fix;else delete L.fix;}
  if(JSON.stringify(d.aliases||[])!==JSON.stringify(base.aliases||[]))L.aliases=d.aliases;
  if((d.gm||null)!==(base.gm||null)){if(d.gm)L.gm=d.gm;else delete L.gm;}
  {const pl=[...new Set((d.plays||[]).filter(x=>/^\d{4}-\d\d-\d\d$/.test(x)))].sort();if(JSON.stringify(pl)!==JSON.stringify(base.plays||[])){if(pl.length)L.plays=pl;else delete L.plays;}}
  d.sp=(d.sp||[]).filter(p=>(p.name||"").trim());
  const bk=new Map((base.sp||[]).map(p=>[p.k,p])),dk=new Map((d.sp||[]).map(p=>[p.k,p]));
  let arr=(L.sp||[]).filter(p=>!(bk.has(p.k)&&!dk.has(p.k)));
  (d.sp||[]).forEach(p=>{if(!bk.has(p.k)&&!arr.some(x=>x.k===p.k))arr.push(JSON.parse(JSON.stringify(p)));});
  (d.sp||[]).forEach(p=>{const b=bk.get(p.k)||{},l=arr.find(x=>x.k===p.k);if(!l)return;["name","ch","c"].forEach(f=>{if((p[f]||"")!==(b[f]||""))l[f]=p[f];});if((p.img||"")!==(b.img||"")){if(p.img)l.img=p.img;else delete l.img;}});
  if((d.sp||[]).map(p=>p.k).join()!==(base.sp||[]).map(p=>p.k).join()){
    const pos=new Map(d.sp.map((p,i)=>[p.k,i]));
    arr=[...arr.filter(p=>pos.has(p.k)).sort((a,b)=>pos.get(a.k)-pos.get(b.k)),...arr.filter(p=>!pos.has(p.k))];
  }
  L.sp=arr;
}
// 공유 링크는 p/시나리오.html (미리보기 이미지가 들어간 페이지) → 열면 바로 시나리오로 넘어가요
function shareUrl(id){return location.origin+location.pathname.replace(/index\.html$/,"")+"p/"+id+".html";}
function bindScen(){
  bindPartEdit();renderAuth();
  {const up=$("#e-ogup"),fi=$("#e-ogfile");
    if(up&&fi){up.onclick=()=>fi.click();
      fi.onchange=async ev=>{const f=ev.target.files[0];if(!f||!S.scDraft)return;
        try{const pl=window.__scPull;pl&&pl();S.scDraft.og=await shrinkKeep(f);S.scDraft.cover={og:1,y:50};render();toast("저장을 눌러야 적용돼요");}catch(e){toast("이미지를 읽지 못했어요");}};}
    const del=$("#e-ogdel");if(del)del.onclick=()=>{const pl=window.__scPull;pl&&pl();delete S.scDraft.og;if(S.scDraft.cover&&S.scDraft.cover.og)delete S.scDraft.cover;render();};}
  document.querySelectorAll("[data-theme-set]").forEach(b=>b.onclick=()=>{if(!S.scDraft)return;const k=b.dataset.themeSet;
    if(k)S.scDraft.theme=k;else delete S.scDraft.theme;
    document.querySelectorAll("[data-theme-set]").forEach(x=>x.classList.toggle("on",x===b));
    if(k)document.body.dataset.theme=k;else delete document.body.dataset.theme;});
  {const sc0=scenById(S.cid);if(sc0&&S.canWrite&&sessionsReady(sc0.id)&&!SCC[sc0.id]&&!SCC["_l"+sc0.id]){SCC["_l"+sc0.id]=1;loadScenCounts(sc0).then(()=>{delete SCC["_l"+sc0.id];if(S.cid===sc0.id){if(S.scEdit){const pl=window.__scPull;pl&&pl();}render();}}).catch(()=>{delete SCC["_l"+sc0.id];});}}
  document.querySelectorAll(".lkwrap [data-mek]").forEach(b=>b.onclick=()=>{S.lockPick=b.dataset.mek;render();});
  const uf=$("#unlockf");if(uf){const inp=$("#unlockpw");setTimeout(()=>inp.focus(),0);uf.onsubmit=async ev=>{ev.preventDefault();const pw=inp.value.trim();if(!pw)return;const msg=$("#unlockmsg");msg.textContent="확인하는 중…";
    const id=S.cid,pick=S.lockPick;
    try{await unlockScen(pwOf(scenById(id))||id,pw);setMe(id,pick);S.lockPick=null;msg.textContent="열렸어요!";refreshCanWrite();}catch(e){msg.textContent=e&&e.code==="permission-denied"?"비밀번호가 틀렸어요.":"열지 못했어요: "+(e.code||e.message);}};}
  const mep=$("#mepick");if(mep)mep.onclick=()=>mePicker(scenById(S.cid));
  const scx=scenById(S.cid);
  const cs=$("#copyshare");if(cs)cs.onclick=async()=>{const t=`[${campOf(scx)?campOf(scx).name+" · ":""}${scx.name}] TRPG 로그\n${shareUrl(scx.id)}\n비밀번호: ${S.secrets[pwOf(scx)]}`;try{await navigator.clipboard.writeText(t);toast("복사했어요. 친구들에게 붙여넣어 보내면 돼요");}catch(e){toast("복사가 막혔어요");}};
  const rg=$("#regenpw");if(rg)rg.onclick=()=>confirmBox("비밀번호를 새로 만들까요? 예전 비밀번호로 연 사람은 모두 다시 잠겨요.","새로 만들기",async()=>{try{const fx=fixOfScen(scx);await S.db.doc("secrets/"+(fx?fixKey(fx):pwOf(scx))).set({pw:genPw()});if(fx)ownerMaintain();toast("새 비밀번호를 만들었어요");}catch(e){toast("바꾸지 못했어요");}});
  const b=$("#scback");if(b)b.onclick=()=>{location.hash="";};
  const e=$("#scedit");if(e)e.onclick=()=>{S.scEdit=true;render();};
  if(!S.scEdit){const sc0=scenById(S.cid);if(sc0){bindRevs(sc0);bindGal(galSrcScen(sc0));}}
  if(!S.scEdit)return;
  const sc=scenById(S.cid);if(!sc){S.scEdit=false;return;}
  const d=S.scDraft;
  const pull=()=>{d.name=$("#e-name").value.trim()||d.name;d.system=$("#e-sys").value.trim();d.fix=($("#e-fix")?.value||"").trim();d.orig=$("#e-orig").value.trim();d.done=$("#e-done").checked;d.doneAt=d.done?$("#e-doneat").value:"";d.summary=$("#e-sum").value.replace(/\s+$/,"");
    document.querySelectorAll("[data-nm]").forEach(i=>{const v=i.value.trim();if(v)d.sp[+i.dataset.nm].name=v;});
    document.querySelectorAll("[data-ch]").forEach(i=>{d.sp[+i.dataset.ch].ch=i.value.trim();});
    const g=document.querySelector("[data-gm]:checked");if(g){if(g.dataset.gm)d.gm=g.dataset.gm;else delete d.gm;}
    if(document.querySelector(".plays"))d.plays=[...document.querySelectorAll("[data-play]")].map(i=>i.value);
    const ec=$("#e-camp");if(ec&&!/^__new/.test(ec.value))d.camp=ec.value;const ea=$("#e-campafter");if(ea)d.campAfter=ea.value;const eg=$("#e-gaiden");if(eg)d.gaiden=eg.checked;if(isCamp(campById(d.camp)))d.gaiden=false;};
  {const ec=$("#e-camp");if(ec)ec.onchange=async()=>{if(ec.value==="__new"||ec.value==="__newcamp"){const cm=ec.value==="__newcamp";const n=(prompt(cm?"새 캠프 이름":"새 캠페인 이름")||"").trim();if(!n){ec.value=d.camp||"";return;}
      if(cm){try{pull();const id=await newCamp(n,"","camp");d.camp=id;d.campAfter="";d.gaiden=false;S.camps.push({id,name:n,system:"",kind:"camp",eps:[]});toast("캠프를 만들었어요");render();}catch(e){writeFail(e);}return;}
      try{pull();const id=await newCamp(n,d.system||"");d.camp=id;d.campAfter="";d.system="";S.camps.push({id,name:n,system:sc.system||"",eps:[]});toast("캠페인을 만들었어요. 캠페인 룰은 캠페인 페이지에서 바꿀 수 있어요",3500);render();}catch(e){writeFail(e);}return;}
    pull();d.campAfter="";render();};}
  {const pa=$("#e-playadd");if(pa)pa.onclick=()=>{pull();d.plays=[...(d.plays||[]),new Date(Date.now()+9*3600e3).toISOString().slice(0,10)];render();};}
  document.querySelectorAll("[data-playdel]").forEach(b=>b.onclick=()=>{pull();d.plays.splice(+b.dataset.playdel,1);render();});
  {const sa=$("#e-spadd");if(sa)sa.onclick=()=>{pull();d.sp.push({k:"k"+rid(),name:"",c:COLORS[d.sp.length%COLORS.length]});render();setTimeout(()=>{const i=document.querySelector(`[data-nm="${d.sp.length-1}"]`);i&&i.focus();},0);};}
  document.querySelectorAll("[data-sw]").forEach(btn=>btn.onclick=()=>{pull();const p=d.sp[+btn.dataset.sw];p.c=COLORS[(COLORS.indexOf(p.c)+1)%COLORS.length];render();});
  window.__scPull=pull;bindCvEdit();
  {const fi=$("#e-avfile");let at=-1;
    document.querySelectorAll("[data-av]").forEach(btn=>btn.onclick=ev=>{if(ev.target.closest("[data-avx]")){pull();delete d.sp[+btn.dataset.av].img;render();return;}at=+btn.dataset.av;if(fi){fi.value="";fi.click();}});
    if(fi)fi.onchange=async ev=>{const f=ev.target.files[0];if(!f||at<0)return;try{pull();d.sp[at].img=await shrinkImage(f,160,"image/jpeg");render();toast("저장을 눌러야 적용돼요");}catch(e){toast("이미지를 읽지 못했어요");}};}
  document.querySelectorAll("[data-emv]").forEach(btn=>btn.onclick=()=>{pull();const i=+btn.dataset.emv,j=i+(+btn.dataset.d);if(j<0||j>=d.sp.length)return;[d.sp[i],d.sp[j]]=[d.sp[j],d.sp[i]];render();});
  document.querySelectorAll("[data-edel]").forEach(btn=>btn.onclick=()=>{pull();const p=d.sp[+btn.dataset.edel];if(!p)return;d.sp=d.sp.filter(x=>x!==p);if(d.gm===p.k)delete d.gm;render();});
  const ez=$("#ezero");if(ez)ez.onclick=()=>{pull();const c=SCC[sc.id]||{};d.sp=d.sp.filter(p=>p.k===d.gm||c[p.k]>0);render();};
  document.querySelectorAll(".sc-page textarea").forEach(t=>{const fit=()=>{t.style.height="auto";t.style.height=Math.max(140,t.scrollHeight+4)+"px";};fit();t.oninput=fit;});
  document.querySelector("[data-x]").onclick=()=>{S.scEdit=false;S.scDraft=null;render();};
  document.querySelector("[data-ok]").onclick=async()=>{
    pull();
    const old=sc.name;
    const other=findScen(d.name);
    if(d.name!==old&&other&&other.id!==sc.id){toast("같은 이름의 세션이 이미 있어요. 합치려면 아래 '다른 세션과 합치기'를 써 주세요",3500);return;}
    const mine=S.sessions.filter(x=>info(x).scen===old);
    if(d.name!==old){d.aliases=[...new Set([...(d.aliases||[]),old])].filter(a=>a!==d.name);}
    const base=S.scBase||clone(sc),dd=clone(d);
    S.scEdit=false;S.scDraft=null;S.scBase=null;render();
    await mutateScen(sc.id,L=>mergeScenEdit(L,base,dd));
    if(S.canAdmin&&("camp" in dd||"gaiden" in dd)){const cur=campOf(sc)?campEps(campOf(sc)).map(e=>e.id):[];const curAfter=cur.indexOf(sc.id)>0?cur[cur.indexOf(sc.id)-1]:(cur.indexOf(sc.id)===0?"__first":"");
      if((dd.camp||"")!==(base.camp||"")||!!dd.gaiden!==!!base.gaiden||(dd.campAfter&&dd.campAfter!==curAfter)){try{await setEpCamp(sc.id,dd.camp||"",dd.campAfter||"",dd.gaiden);}catch(e){writeFail(e);}}}
    if(d.name!==old){
      for(const s of mine){
        try{await retry(()=>S.db.doc("sessions/"+s.id).update({scen:d.name}));}catch(e){writeFail(e);}
        await sleep(120);
      }
    }
    toast("저장했어요");
  };
  const mg=$("#mgo");if(mg)mg.onclick=()=>{
    const to=scenById($("#mto").value);if(!to){toast("합칠 세션을 골라 주세요");return;}
    confirmBox(`'${sc.name}'을(를) '${to.name}'(으)로 합칠까요? '${sc.name}'은(는) 목록에서 사라지고 녹음은 '${to.name}' 아래로 옮겨가요.`,"합치기",()=>mergeScen(sc,to));
  };
  const del=$("#scdel");if(del)del.onclick=()=>confirmBox(`'${sc.name}' 세션과 개요를 지울까요?`,"삭제",async()=>{S.scEdit=false;location.hash="";try{await retry(()=>S.db.doc("scenarios/"+sc.id).delete());}catch(e){toast("지우지 못했어요");}});
}

async function mergeScen(from,to){
  S.scEdit=false;S.scDraft=null;
  const mine=S.sessions.filter(x=>info(x).scen===from.name);
  to.aliases=[...new Set([...(to.aliases||[]),from.name,...(from.aliases||[])])].filter(a=>a!==to.name);
  ["summary","rules","system"].forEach(f=>{if(!to[f]&&from[f])to[f]=from[f];});
  const t=toast;location.hash="c-"+to.id;
  try{
    await saveScen(to);
    for(const s of mine){
      const sp=JSON.parse(JSON.stringify([...(from.sp||[]),...((s.sp||[]).filter(o=>!(from.sp||[]).some(x=>x.k===o.k)))]));
      await retry(()=>S.db.doc("sessions/"+s.id).update({scen:to.name,sp,scid:to.id}));await sleep(120);
    }
    await retry(()=>S.db.doc("scenarios/"+from.id).delete());
    S.scens=S.scens.filter(x=>x.id!==from.id);render();t("합쳤어요");
  }catch(e){writeFail(e);t("합치다가 멈췄어요. 다시 시도해 주세요");}
}
