// 페어·고정탁 페이지 · 넷플릭스식 (시안 미리보기: #nf-코드)
// 어두운 바탕 고정 · 첫 화면 그림 + 왼쪽 큰 제목 + 출연 · 아래로 프로필 / 이야기 / 타임라인 / 포스트
// 타임라인·포스트·수정·비밀번호는 지금 페어·고정탁 부품을 그대로 써요
const NF_BG="#141414";
function nfStories(f,data){const out=[],seen=new Set();
  data.gs.slice().sort((a,b)=>(a.days[0]?.day||"").localeCompare(b.days[0]?.day||"")).forEach(g=>{const c=g.sc.camp&&campById(g.sc.camp);
    if(c){if(seen.has(c.id))return;seen.add(c.id);const es=campEps(c),gs=data.gs.filter(x=>x.sc.camp===c.id),ds=gs.flatMap(x=>x.days.map(d=>d.day)).filter(Boolean).sort(),cm=isCamp(c),done=!cm&&!!c.done;
      const fin=es.filter(e=>e.done||done).length;out.push({href:"#g-"+c.id,name:c.name,cv:(campCover(c,es)||{}).u||"",tag:cm?"캠프":`캠페인 · ${done?"완주":"진행 중"}`,sub:`${es.filter(e=>!e.gaiden).length}편${ds.length?" · "+jgDot(ds[0].slice(5))+(ds.length>1?" – "+jgDot(ds.at(-1).slice(5)):""):""}`,pg:es.length?Math.round(fin/es.length*100):0,k:ds[0]||""});}
    else{const d0=g.days[0]?.day||"",dl=g.last||d0;out.push({href:"#c-"+g.sc.id,name:g.sc.name,cv:(coverOf(g.sc)||{}).u||"",tag:"",sub:`${g.days.length}세션${d0?" · "+jgDot(d0.slice(5))+(dl&&dl!==d0?" – "+jgDot(dl.slice(5)):""):""}`,pg:g.sc.done||g.days.length?100:0,k:d0});}});
  return out;}
function nfCard(m,fields,op){const q=m.q||{},dl=[q.age&&(/\D/.test(q.age)?q.age:q.age+"세"),q.ht&&(/\D/.test(q.ht)?q.ht:q.ht+"cm"),q.sex,q.mbti].filter(Boolean),secs=fields.filter(k=>(q.sec||{})[k]);
  return `<div class="nfpf${op?" op":""}" style="--c:${m.c}">${q.icon?.u?`<img src="${esc(q.icon.u)}" alt="">`:`<i>${esc((m.nm||"").slice(0,1))}</i>`}
    <div class="b"><b>${esc(m.nm)}</b><small>${[q.rn,q.ren,m.own||m.n].filter(Boolean).map(esc).join(" · ")}</small>${dl.length?`<p>${dl.map(esc).join(" · ")}</p>`:""}
      ${secs.map(k=>`<details><summary>${esc(k)}</summary><p>${esc(q.sec[k]).replace(/\n/g,"<br>")}</p></details>`).join("")}</div></div>`;}
function nfPageHTML(f){const pair=jgPair(f),d=jgDoc(f),fields=d.fields&&d.fields.length?d.fields:JG_F0,data=jgFixData(f),ban=d.banner,W=fixWord(f);
  const srcs=jgSrcs(f),items=galAll(srcs,1),postsH=S.db?galHTML(srcs,{newest:1,title:"포스트",en:"POSTS"}):"";
  const sys=(()=>{const c={};data.gs.forEach(g=>{const x=sysLabel(effSys(g.sc)||"");if(x)c[x]=(c[x]||0)+1;});return Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||"";})();
  let mem=[];if(pair){const [A,B]=jgSides(f);mem=[A,B].map(s=>({nm:s.nm,en:s.en,q:s.pr,own:s.own,c:s.key==="a"?"var(--ja)":"var(--jb)",n:s.own}));}
  else mem=fxMembers(f).map(m=>({...m,own:m.n}));
  const last=data.days.at(-1),lastG=last?data.gs.find(g=>g.days.some(x=>x.day===last)):null,code=fixCode(f)||encodeURIComponent(f);
  const meta=[last?`<span class="new">최근 세션 ${esc(jgDot(last.slice(5)))}</span>`:"",data.days.length?`<span>${esc(jgDot(data.days[0]).slice(0,7))} –</span>`:"",sys?`<span class="bx">${esc(sys)}</span>`:"",`<span>이야기 ${data.stories}</span>`,`<span>세션 ${data.days.length}</span>`,data.days.length?`<span>함께한 날 ${jgDaysSince(data.days[0])}</span>`:""].join("");
  const line=pair?d.rel:d.tag;
  const right=`<div class="nfcast">${mem.map(m=>`<button type="button" data-nfgo="${esc(m.n)}" style="--c:${m.c}">${m.q.icon?.u?`<img src="${esc(m.q.icon.u)}" alt="">`:`<i>${esc(m.nm.slice(0,1))}</i>`}<b>${esc(m.nm)}</b><small>${esc(m.n)}</small></button>`).join("")}</div>`;
  const st=nfStories(f,data);
  return `<div class="jgp nfx${pair?" pair":""}">
    <section class="nfhero">${ban?.u?`<img class="bg" src="${esc(ban.u)}" alt="" style="object-position:50% ${+ban.y>=0?+ban.y:40}%">`:`<div class="bg empty"></div>`}
      <div class="nfin"><div class="tag">${pair?`페어 · ${esc(mem[0].en)} × ${esc(mem[1].en)}`:`고정탁 · ${mem.length}명`}</div><h1>${esc(f)}</h1>
        <div class="meta">${meta}</div>${line?`<p>${esc(line)}</p>`:""}
        <div class="btns">${lastG?`<a class="b1" href="#c-${esc(lastG.sc.id)}">▶ 최근 로그</a>`:""}${st.length?`<a class="b2" href="#mb-f-${esc(code)}">📖 리플레이북</a>`:""}</div></div>
      ${right}</section>
    <div class="nfrow"><h3>${pair?"함께한 이야기":"이야기"} <small>${st.length} · 오래된 것부터</small><span class="nfh">${st.length>4?`<button type="button" data-nfall="st">${(S.nfAll||{}).st?"접기 ▴":"모두 보기 ›"}</button>`:""}${st.length?`<a href="#mb-f-${esc(code)}">📖 리플레이북 합본</a>`:""}</span></h3>
      ${st.length?`<div class="nfscr${(S.nfAll||{}).st?" all":""}"><button type="button" class="nfarw l" data-nfarw="-1" aria-label="이전">‹</button><div class="nfcards">${st.map(s=>`<a class="nfcd" href="${esc(s.href)}">${s.cv?`<img src="${esc(s.cv)}" alt="" loading="lazy">`:""}${s.tag?`<span class="tp">${esc(s.tag)}</span>`:""}<b>${esc(s.name)}</b><small>${esc(s.sub)}</small><span class="pg"><i style="width:${s.pg}%"></i></span></a>`).join("")}</div><button type="button" class="nfarw r" data-nfarw="1" aria-label="다음">›</button></div>`:`<div class="empty">아직 세션이 없어요</div>`}</div>
    <div class="nfrow nfsplit"><div><h3>${pair?"두 사람":"멤버"}</h3><div class="nfpfs">${mem.map(m=>`<div id="nfm-${esc(m.n)}">${nfCard(m,fields)}</div>`).join("")}</div></div>
      <div class="nftl">${jgTimelineHTML(f,data,items).replace("<h4>TIMELINE","<h4>타임라인")}</div></div>
    <div class="nfrow nfposts${(S.nfAll||{}).po?" all":""}">${postsH}</div>
    <div class="nfrow nfend">
      ${S.canAdmin?`<div class="jgtop jgbot"><a class="ghost ownonly" href="#">← 첫 화면</a><a class="ghost" href="#f-${esc(code)}">지금 디자인으로 보기</a><span style="flex:1"></span><button type="button" class="jged" id="jgedit">${S.jgEdit?"✕ 수정 닫기":`✎ ${W} 수정`}</button></div>`:""}
      ${S.jgEdit&&S.canAdmin?jgEditHTML(f):""}
      ${fixAccHTML(f)}${jgRO(f)?(pair?`<div class="sc-sec fxacc jgacc"><h4 data-en="ACCESS">페어 비밀번호</h4><div class="tip">페어 비밀번호를 넣으면 글을 올리고, 기록을 더하고, 댓글을 달 수 있어요.</div><form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="페어 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`
        :`<div class="sc-sec fxacc jgacc"><h4 data-en="ACCESS">고정탁 비밀번호</h4><div class="tip">누구로 들어갈지 고르고 비밀번호를 넣어요.</div><div class="fxpk">${mem.map(m=>`<button type="button" class="${S.fxPick===m.n?"on":""}" data-fxpick="${esc(m.n)}" style="--c:${m.c}"><i></i>${esc(m.nm)} · ${esc(m.n)}</button>`).join("")}<button type="button" class="${S.fxPick==="ext"?"on":""}" data-fxpick="ext">외부인으로</button></div><form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="고정탁 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`):""}
    </div></div>`;}
function bindNfPage(f){if(jgPair(f))bindJgPage(f);else bindFxPage(f);
  // 포스트: 줄 양옆 화살표 + 모두 보기 (갤러리 부품 바깥에서 붙여요)
  const gs=document.querySelector(".nfposts .galsec"),gg=gs&&gs.querySelector(".galg");
  if(gs&&gg){const n=gg.children.length,h=gs.querySelector("h4");if(n>6&&h&&!h.querySelector("[data-nfall]"))h.insertAdjacentHTML("beforeend",`<button type="button" class="nfallb" data-nfall="po">${(S.nfAll||{}).po?"접기 ▴":"모두 보기 ›"}</button>`);
    const w=document.createElement("div");w.className="nfscr";gg.before(w);w.append(Object.assign(document.createElement("button"),{type:"button",className:"nfarw l",textContent:"‹"}),gg,Object.assign(document.createElement("button"),{type:"button",className:"nfarw r",textContent:"›"}));
    w.querySelector(".l").dataset.nfarw="-1";w.querySelector(".r").dataset.nfarw="1";}
  // 타임라인은 왼쪽 멤버 칸 높이만큼 보여 주고 더 보기 (모바일은 520px)
  {const tl=document.querySelector(".nftl .jgtl"),pf=document.querySelector(".nfsplit>div:first-child"),key=S.jgTl||"main";
    if(tl&&pf&&!(S.jgAll||{})[key]){const two=getComputedStyle(tl.closest(".nfsplit")).gridTemplateColumns.split(" ").length>1,cap=two?Math.max(pf.offsetHeight,420):520;
      if(tl.scrollHeight>cap+60){tl.style.maxHeight=cap+"px";tl.classList.add("clamp");tl.querySelector(".jgmore")?.remove();
        const b=document.createElement("button");b.type="button";b.className="jgmore";b.textContent="타임라인 더 보기 ▾";b.onclick=()=>{S.jgAll={...(S.jgAll||{}),[key]:true};render();};tl.appendChild(b);}}}
  document.querySelectorAll("[data-nfall]").forEach(b=>b.onclick=()=>{S.nfAll={...(S.nfAll||{}),[b.dataset.nfall]:!(S.nfAll||{})[b.dataset.nfall]};render();});
  document.querySelectorAll(".nfscr").forEach(w=>{const sc=w.querySelector(".nfcards,.galg");if(!sc)return;const up=()=>{w.classList.toggle("atl",sc.scrollLeft<4);w.classList.toggle("atr",sc.scrollLeft+sc.clientWidth>=sc.scrollWidth-4);};
    sc.addEventListener("scroll",up,{passive:true});up();w.querySelectorAll("[data-nfarw]").forEach(b=>b.onclick=()=>sc.scrollBy({left:+b.dataset.nfarw*sc.clientWidth*.9,behavior:"smooth"}));});
  document.querySelectorAll("[data-nfgo]").forEach(b=>b.onclick=()=>document.getElementById("nfm-"+b.dataset.nfgo)?.scrollIntoView({block:"center",behavior:"smooth"}));}
