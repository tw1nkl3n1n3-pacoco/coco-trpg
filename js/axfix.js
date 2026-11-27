// 어카이브(사이트 테마) · 페어·고정탁 페이지
// 홈 어카이브 틀(왼쪽 제목·오른쪽 숫자 4칸, 01·02 번호 섹션, 기록 카드)을 이어받고
// 기본 페어 스킨의 전신 포스터는 FIG.01 액자로, 프로필은 FILE 신상 카드로 · 타임라인·포스트·수정·비밀번호는 같은 부품
function axSh(i,ko,en,right){return `<div class="hx-sh"><span class="hx-m hx-idx">${String(i).padStart(2,"0")}</span><h2>${ko}<small>${en}</small></h2><span class="hx-ln"></span>${right||""}</div>`;}
function axFile(m,fields,lab){const q=m.q||{},num=v=>v&&!/\D/.test(v)?v:v||"—";
  const cells=[["AGE",q.age],["HEIGHT",q.ht],["SEX",q.sex],["MBTI",q.mbti]].filter(x=>x[1]);
  const pic=q.bust?.u||q.cut?.u||q.icon?.u||"",tags=(q.tags||[]).filter(t=>t&&t!==q.mbti).slice(0,4),secs=fields.filter(k=>(q.sec||{})[k]);
  return `<div class="axdc" id="nfm-${esc(m.n)}" style="--c:${m.c}"><div class="ph${!q.bust?.u&&q.cut?.u?" cut":""}"><span class="no hx-m">${esc(lab)}</span>${pic?`<img src="${esc(pic)}" alt="" loading="lazy">`:`<i>${esc([...(m.nm||"?")][0])}</i>`}</div>
    <div class="bd"><span class="hx-tag" style="--c:${m.c}">${esc(m.en||m.nm)}</span><h3>${esc(m.nm)}</h3>${q.rn||q.ren?`<div class="rn">${[q.rn,q.ren&&q.ren.toUpperCase()].filter(Boolean).map(esc).join(" · ")}</div>`:""}
      ${cells.length?`<dl>${cells.map(([k,v])=>`<div><dt class="hx-m">${k}</dt><dd>${esc(num(v))}</dd></div>`).join("")}</dl>`:""}
      ${tags.length?`<div class="tags">${tags.map(t=>`<span class="hx-tag o">${esc(String(t).toUpperCase())}</span>`).join("")}</div>`:""}
      ${secs.length?`<div class="sec">${secs.map(k=>`<details><summary><b>${esc(k)}</b><span class="hx-m">+ OPEN</span></summary><p>${esc(q.sec[k]).replace(/\n/g,"<br>")}</p></details>`).join("")}</div>`:""}
      ${m.own?`<div class="own"><span class="hx-m">PLAYER</span> <b>${esc(m.own)}</b></div>`:""}</div></div>`;}
function axPageHTML(f){const pair=jgPair(f),d=jgDoc(f),fields=d.fields&&d.fields.length?d.fields:JG_F0,data=jgFixData(f),ban=d.banner,W=fixWord(f),code=fixCode(f)||encodeURIComponent(f);
  const srcs=jgSrcs(f),items=galAll(srcs,1),postsH=S.db?galHTML(srcs,{newest:1,title:"포스트",en:"POSTS"}):"";
  let mem=[];if(pair){const [A,B]=jgSides(f);mem=[A,B].map(s=>({n:s.own||s.key,nm:s.nm,en:s.en,q:s.pr,own:s.own,c:s.key==="a"?"var(--ja)":"var(--jb)"}));}
  else mem=fxMembers(f).map(m=>({...m,own:m.n}));
  const sysc={};data.gs.forEach(g=>{const x=effSys(g.sc);if(x)sysc[x]=(sysc[x]||0)+1;});const sys=Object.keys(sysc).sort((a,b)=>sysc[b]-sysc[a])[0]||"";
  const pad=n=>String(n).padStart(2,"0"),first=data.days[0]||"";
  const line=pair?d.rel:d.tag;
  // 기록: 캠페인은 한 장으로 묶고, 새것부터 (홈 어카이브와 같은 카드)
  const seen=new Set(),recs=[];data.gs.slice().sort((a,b)=>(b.last||"").localeCompare(a.last||"")).forEach(g=>{const c=g.sc.camp&&campById(g.sc.camp);if(c){if(seen.has(c.id))return;seen.add(c.id);recs.push(hxCampCard(c));}else recs.push(hxScCard(g));});
  // 그림 액자: 페어는 첫 화면 그림 위에 두 사람 전신 · 고정탁은 그림 + 멤버 아이콘
  const cuts=pair?mem.filter(m=>m.q.cut?.u):[];
  const fig=(ban?.u||cuts.length)?`<div class="axfig${ban?.u?"":" nobg"}">${ban?.u?`<img class="bg" src="${esc(ban.u)}" alt="" style="object-position:50% ${+ban.y>=0?+ban.y:40}%">`:""}
      ${cuts.map((m,i)=>`<img class="cut c${i}" src="${esc(m.q.cut.u)}" alt="">`).join("")}${cuts.map((m,i)=>`<span class="nm n${i} hx-m" style="--c:${m.c}">${esc(m.en||m.nm)}</span>`).join("")}
      ${!pair?`<div class="mems">${mem.map(m=>`<button type="button" data-nfgo="${esc(m.n)}" style="--c:${m.c}">${m.q.icon?.u?`<img src="${esc(m.q.icon.u)}" alt="">`:`<i>${esc([...m.nm][0])}</i>`}<b>${esc(m.nm)}</b></button>`).join("")}</div>`:""}
      <span class="crop tl"></span><span class="crop tr"></span><div class="cap hx-m">FIG.01<i>${esc(W)} 첫 화면</i></div></div>`:"";
  // 타임라인 옆: 달별 세션 막대 + 세계관(서브) 요약
  const mc={};data.days.forEach(x=>{const k=x.slice(0,7);mc[k]=(mc[k]||0)+1;});const months=Object.keys(mc).sort().slice(-8),mx=Math.max(1,...Object.values(mc)),lastM=months.at(-1);
  const recsSub=(d.recs||[]).slice().sort((a,b)=>jgNorm(a.d).localeCompare(jgNorm(b.d)));
  const side=`<div class="axtls"><div class="hx-m hx-k">SESSIONS / MONTH</div><div class="big">${pad(data.days.length)}</div><p>${first?esc(hxDot(first.slice(0,7)))+" – "+esc(hxDot((data.days.at(-1)||"").slice(0,7))):"아직 세션이 없어요"}</p>
    <div class="bars">${months.map(k=>`<div><span>${esc(k.slice(2).replace("-","."))}</span><i class="${k===lastM?"l":""}" style="width:${Math.round(mc[k]/mx*100)}%"></i><span>${mc[k]}</span></div>`).join("")}</div>
    ${recsSub.length?`<div class="hx-m hx-k" style="margin-top:18px">SUB · 기록 ${recsSub.length}</div><p class="subs">${recsSub.slice(0,5).map(r=>`${esc(r.d)} ${esc(r.t)}`).join(" · ")}${recsSub.length>5?" …":""}</p>`:""}</div>`;
  const ro=jgRO(f);
  const acc=`${fixAccHTML(f)}${ro?(pair?`<div class="sc-sec fxacc jgacc axacc"><div><div class="hx-m hx-k">PAIR PASSWORD</div><h3>페어 비밀번호</h3><p>넣으면 글을 올리고, 기록을 더하고, 댓글을 달 수 있어요. 잠긴 글도 보여요.</p></div><form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="페어 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`
    :`<div class="sc-sec fxacc jgacc axacc"><div><div class="hx-m hx-k">TABLE PASSWORD</div><h3>고정탁 비밀번호</h3><p>누구로 들어갈지 고르고 비밀번호를 넣어요.</p><div class="fxpk">${mem.map(m=>`<button type="button" class="${S.fxPick===m.n?"on":""}" data-fxpick="${esc(m.n)}" style="--c:${m.c}"><i></i>${esc(m.nm)} · ${esc(m.n)}</button>`).join("")}<button type="button" class="${S.fxPick==="ext"?"on":""}" data-fxpick="ext">외부인으로</button></div></div><form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="고정탁 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`):""}`;
  let n=0;const N=()=>++n;
  return `<div class="jgp hx axp${pair?" pair":""}"><div class="hx-wrap">
    <div class="hx-bar"><a class="hx-logo" href="#" aria-label="목록"></a><a href="#"><b>${esc(site().title)}</b></a><span class="hx-m">/ ${pair?"PAIR":"TABLE"} / ${esc(f)}</span><span style="flex:1"></span><a class="hx-m" href="#">← 목록</a></div>
    <section class="hx-hero"><div class="hx-hl"><div class="hx-dots"></div><div class="hx-m hx-k">▲ ${pair?`PAIR — ${esc(mem[0].en)} × ${esc(mem[1].en)}`:`TABLE — ${mem.length} MEMBERS`}</div><h1>${esc(f)}<span></span></h1>
        ${line?`<div class="hx-ko">${esc(line)}</div>`:""}
        <div class="axids">${mem.map(m=>`<span class="hx-tag" style="--c:${m.c}">${esc(m.en||m.nm)}${m.en&&m.en!==m.nm?" · "+esc(m.nm):""}</span>`).join("")}${sys?`<span class="hx-tag o" style="--c:${hxCol({system:sys})}">${esc(sysLabel(sys))}</span>`:""}</div></div>
      <div class="hx-hr"><div class="hx-stat"><b>${pad(data.stories)}</b><div><span class="hx-m">STORIES</span><small>함께한 이야기</small></div></div><div class="hx-stat"><b>${pad(data.days.length)}</b><div><span class="hx-m">SESSIONS</span><small>세션</small></div></div><div class="hx-stat"><b>${first?jgDaysSince(first):"—"}</b><div><span class="hx-m">DAYS</span><small>함께한 날</small></div></div><div class="hx-stat"><b class="sm">${first?esc(first.slice(2,7).replace("-",".")):"—"}</b><div><span class="hx-m">SINCE</span><small>첫 세션</small></div></div></div></section>
    ${fig}
    ${axSh(N(),pair?"두 사람":"멤버","Profile",`<span class="hx-m">${mem.length} FILES</span>`)}
    <div class="axdos${pair?" two":""}">${mem.map((m,i)=>axFile(m,fields,"FILE "+String.fromCharCode(65+i))).join("")}</div>
    ${axSh(N(),"함께한 기록","Records",`${recs.length?`<a class="axbtn hx-m" href="#mb-f-${esc(code)}">📖 리플레이북 합본</a>`:""}<span class="hx-m">${recs.length} RECORDS</span>`)}
    ${recs.length?`<div class="axrecs">${recs.join("")}</div>`:`<div class="axempty">아직 세션이 없어요</div>`}
    ${axSh(N(),"타임라인","Timeline","")}
    <div class="axtlw"><div class="nftl axtl">${jgTimelineHTML(f,data,items)}</div>${side}</div>
    ${axSh(N(),"포스트","Posts",`<span class="hx-m">${items.length} ITEMS</span>`)}
    <div class="axposts">${postsH}</div>
    ${acc?axSh(N(),"접근","Access","")+`<div class="axaccw">${acc}</div>`:""}
    <div class="hx-foot axfoot"><span class="hx-m">© ${esc(site().title)} · ARCHIVE</span><span style="flex:1"></span>${jgCanEdit(f)?`<button type="button" class="jged" id="jgedit">${S.jgEdit?"✕ 수정 닫기":`✎ ${W} 수정`}</button>`:""}</div>
    ${S.jgEdit&&jgCanEdit(f)?jgEditHTML(f):""}
  </div></div>`;}
function bindAxPage(f){if(jgPair(f))bindJgPage(f);else bindFxPage(f);nfFromToCap();if(typeof bindHX==="function")bindHX();
  document.querySelectorAll("[data-nfgo]").forEach(b=>b.onclick=()=>document.getElementById("nfm-"+b.dataset.nfgo)?.scrollIntoView({block:"center",behavior:"smooth"}));
  // 타임라인은 옆 칸(세션 막대) 높이에 맞춰 접고 더 보기
  const tl=document.querySelector(".axtl .jgtl"),key=S.jgTl||"main";
  if(tl&&!(S.jgAll||{})[key]){const cap=Math.max(document.querySelector(".axtls")?.offsetHeight||0,460);if(tl.scrollHeight>cap+60){tl.style.maxHeight=cap+"px";tl.classList.add("clamp");tl.querySelector(".jgmore")?.remove();
    const b=document.createElement("button");b.type="button";b.className="jgmore";b.textContent="타임라인 더 보기 ▾";b.onclick=()=>{S.jgAll={...(S.jgAll||{}),[key]:true};render();};tl.appendChild(b);}}}
