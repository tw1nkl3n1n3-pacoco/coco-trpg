// 코코 로그방 · 리플레이북 (#b-세션id): 로그를 책처럼 · 표지·등장인물·차례·본문·후기 · 책 고치기(본문/잡담/빼기)
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// 줄마다 bk 값으로 책에 어떻게 들어갈지 정해요: 0 본문 · 1 잡담(플레이어 이름으로 작게) · 2 빼기 (bkOf, log.js)
const BOOK_SIZES={a5:{n:"A5",w:559,h:794,lab:"A5 (148×210)"},b6:{n:"B6",w:484,h:688,lab:"B6 (128×182)"},a6:{n:"A6",w:397,h:559,lab:"A6 문고 (105×148)"}};
const BOOK_ACC={wa:"#b0101a",deco:"#8a2a12",dx:"#e0263d",plain:"#1c1c1b"};

function bookCan(sc){return !!sc&&(S.canAdmin||isOpen(sc.id)&&!isExt(sc.id));}
function bookOpen(scid){
  S.book={scid,mode:"view",size:(()=>{try{return localStorage.getItem("trpg-booksize")||"a5";}catch(e){return "a5";}})(),parts:null,sel:new Set(),anchor:null,editing:null,err:""};
  render();bookLoad();
}
// 세션의 모든 회차·부 로그를 순서대로 불러와요
async function bookLoad(){
  const B=S.book;if(!B)return;const sc=scenById(B.scid);
  if(!sc||!S.db||!S.loaded){B.tries=(B.tries||0)+1;if(B.tries<60)setTimeout(bookLoad,400);else render();return;}
  if(!bookCan(sc)){render();return;}
  const g=groups().find(x=>x.scen===sc.name);const parts=[];
  try{
    for(const d of g?g.days:[])for(const s of d.parts){
      const snap=await S.db.collection(`sessions/${s.id}/chunks`).get();
      const chunks={};snap.docs.forEach(x=>{chunks[x.data().i]=x.data().b||[];});
      parts.push({sid:s.id,day:d.day,part:s.part,chunks});
    }
  }catch(e){B.err=e.code==="permission-denied"?"로그가 잠겨 있어요. 세션 비밀번호로 들어와 주세요.":"로그를 불러오지 못했어요: "+(e.code||e.message);render();return;}
  if(S.book!==B)return;
  B.parts=parts;B.ver=(B.ver||0)+1;watchRevs(sc.id);render();
}
function bookItems(P){const out=[];Object.keys(P.chunks).map(Number).sort((a,b)=>a-b).forEach(ci=>P.chunks[ci].forEach(b=>out.push({b,ci,sid:P.sid})));return out;}
// 고친 내용은 세션 로그(chunks)에 바로 저장해요 · 같은 줄을 로그 페이지에서도 보게 돼요
async function bookSet(changes){
  const B=S.book;if(!B||!B.parts)return;const by={};
  changes.forEach(c=>{const P=B.parts.find(p=>p.sid===c.sid);if(!P)return;const arr=P.chunks[c.ci];const b=arr&&arr.find(x=>x.id===c.id);if(!b)return;
    Object.keys(c.f).forEach(k=>{if(c.f[k]===undefined)delete b[k];else b[k]=c.f[k];});B.ver=(B.ver||0)+1;(by[c.sid+"|"+c.ci]=by[c.sid+"|"+c.ci]||[]).push({t:"set",id:c.id,f:c.f});});
  bookRender();
  try{for(const key of Object.keys(by)){const [sid,ci]=key.split("|");const ref=S.db.doc(`sessions/${sid}/chunks/${ckey(+ci)}`);
    await S.db.runTransaction(async tx=>{const d=await tx.get(ref);const arr=d.exists?clone(d.data().b||[]):[];by[key].forEach(op=>applyOp(arr,op));tx.set(ref,{i:+ci,b:arr});});}
  }catch(e){writeFail(e);}
}

// ---------- 책 내용 → 블록 ----------
function bookSp(sc,k){if(k===ALL)return ALLSP;return (sc.sp||[]).find(p=>p.k===k)||null;}
function bookTxt(x,inQ){
  // 「」 안은 대사, 밖은 행동 묘사(옅게) · 쪽이 나뉘어 「 가 앞쪽에 있으면 inQ
  x=x||"";if(!/「/.test(x)&&!inQ)return esc(x).replace(/\n/g,"<br>");
  let pre="";
  if(inQ){const i=x.indexOf("」");const h=i<0?x:x.slice(0,i+1);pre=`<span class="bq">${esc(h)}</span>`;x=i<0?"":x.slice(i+1);}
  const out=esc(x).replace(/(「[^」]*」?)/g,'\u0001$1\u0002').split(/(\u0001[^\u0002]*\u0002)/).map(t=>!t?"":t[0]==="\u0001"?`<span class="bq">${t.slice(1,-1)}</span>`:t.trim()?`<span class="ba">${t}</span>`:t).join("");
  return (pre+out).replace(/\n/g,"<br>");
}
function bookBlocks(sc,edit){
  // 장은 단락(큰 단락)으로만 나눠요 · 회차·부는 쪽 아래 날짜로만 보여요
  const B=S.book,th=themeOf(sc)||"plain",gk=gmKey(sc),gmw=th==="deco"?"DM":"GM";
  const out=[];let n=0;
  PRE.book=new Set();
  const nouns=nounGroupsOf(sc).filter(g=>g.d),noted=new Set();
  const noteFor=txt=>{const r=[];nouns.forEach(g=>{if(noted.has(g.n))return;if([g.n,...g.a].some(w=>nounIn(txt,w))){noted.add(g.n);r.push({k:"note",n:g.n,d:g.d});}});return r;};
  B.parts.forEach(P=>{
    const multi=B.parts.filter(q=>q.day===P.day).length>1,day=P.day;
    if(edit)out.push({k:"day",text:fmtDay(P.day)+(multi?` · ${P.part}부`:""),day});
    // 본세션 시작 줄 앞은 따로 고르지 않으면 빼기로 (1·2로 책에 넣을 수 있어요)
    const its=bookItems(P),st=startIdOf(its.map(e=>e.b));preIds(its.map(e=>e.b)).forEach(id=>PRE.book.add(id));
    its.forEach(e=>{const b=e.b,bk=bkOf(b);if(st&&b.id===st&&edit)out.push({k:"start",sid:P.sid,day});
      if(bk===2&&!edit)return;const base={id:b.id,ci:e.ci,sid:e.sid,bk,day};
      if(b.s===SEC){if(secLv(b)<=1)out.push({...base,k:"chap",label:"CHAPTER "+(++n),title:b.x||"단락"});else out.push({...base,k:"scene",text:b.x||"",lv:secLv(b)});return;}
      if(b.s===NOTE){if(!b.x)return;out.push({...base,k:"nar",text:b.x});out.push(...(edit?[]:noteFor(b.x)));return;}
      if(b.s===HAND){out.push({...base,k:"hand",title:b.ti||"핸드아웃",text:b.x||""});return;}
      if(b.s===DICE){const p=b.w?bookSp(sc,b.w):null;out.push({...base,k:"dice",who:b.a||(p?(p.ch||pcSplit(p.name).name):""),text:b.x||"",res:b.r||"",sec:!!b.sec});return;}
      const p=bookSp(sc,b.s)||{name:"?",c:"#888"},gm=p.k===gk,q=pcSplit(p.name||""),ch=b.a||p.ch||"";
      // GM 줄은 늘 'GM'을 캐릭터 이름처럼, 아래 회색으로 닉네임
      const gn=q.name&&!isAnon(p)?q.name:gmw;
      out.push({...base,k:"line",gm,ooc:bk===1,c:p.c,pc:q.n,player:gm?gn:q.name,char:gm?gmw:(ch||q.name),sub:gm?(gn!==gmw?gn:""):(!ch?"":q.name),text:b.x||""});
      if(!edit&&bk!==1)out.push(...noteFor(b.x));
    });
  });
  if(edit)return out;
  // 내용이 다 빠진 장·단락 제목은 책에서 빼요
  const keep=out.map(()=>true);
  out.forEach((x,i)=>{if(x.k!=="chap"&&x.k!=="scene")return;let has=false;
    // 아래 단계 단락 제목은 건너뛰고, 같은·위 단계 제목이 나오기 전에 내용이 있는지 봐요
    for(let j=i+1;j<out.length;j++){const y=out[j];if(y.k==="chap"||(x.k==="scene"&&y.k==="scene"&&y.lv<=x.lv))break;if(y.k!=="note"&&y.k!=="scene"){has=true;break;}}
    keep[i]=has;});
  return out.filter((x,i)=>keep[i]);
}
function blockHTML(x,edit){
  const B=S.book,sel=edit&&B.sel.has(x.id)?" sel":"",cut=x.bk===2?" cut":"",dat=edit&&x.id?` data-bid="${esc(x.id)}"`:"";
  const tag=edit?(x.bk===1?'<span class="btag ooc">잡담</span>':x.bk===2?'<span class="btag cut">빼기</span>':""):"";
  const editing=edit&&B.editing===x.id;
  const tbox=editing?`<textarea class="bked" id="bked">${esc(x.text)}</textarea><div class="bkhint">Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소 · 로그에도 그대로 반영돼요</div>`:null;
  switch(x.k){
    case "chap":return `<div class="bchap"><small>${esc(x.label)}</small><b>${esc(x.title)}</b></div>`;
    case "day":return edit?`<div class="bday">${esc(x.text)} 회차</div>`:"";
    case "start":return edit?`<div class="bstartmk">▶ 본세션 시작 · 책은 여기서부터</div>`:"";
    case "scene":return edit?"":`<div class="bscene l${x.lv}">${esc(x.text||"")}</div>`;
    case "nar":return `<p class="bnar${sel}${cut}"${dat}>${tbox||esc(x.text).replace(/\n/g,"<br>")}${tag}</p>`;
    case "hand":return `<div class="bhand${sel}${cut}"${dat}>${x.cont?"":`<b>HANDOUT · ${esc(x.title)}</b>`}${tbox||esc(x.text).replace(/\n/g,"<br>")}${tag}</div>`;
    case "dice":return `<div class="bdice${sel}${cut}"${dat}><b class="t">판정</b><span>${esc([x.who,x.text].filter(Boolean).join(" · "))}</span>${x.sec?'<span class="r">Secret Dice</span>':x.res?`<span class="r">${esc(x.res)}</span>`:""}${tag}</div>`;
    case "note":return `<div class="bmemo"><b>${esc(x.n)}</b>${esc(x.d)}</div>`;
    case "line":
      if(x.ooc)return `<div class="bln ooc${x.same||x.cont?" same":""}${sel}${cut}"${dat}><span class="sp">${x.cont||x.same?"":esc(x.player)}</span><span class="tx">${tbox||esc(x.text).replace(/\n/g,"<br>")}</span>${tag}</div>`;
      return `<div class="bln${x.gm?" gm":""}${x.same||x.cont?" same":""}${sel}${cut}"${dat} style="--c:${fixC(x.c)}"><span class="sp">${x.cont||x.same?"":esc(x.char)+(x.sub?`<small>${esc(x.sub)}</small>`:"")}</span><span class="tx">${tbox||bookTxt(x.text,x.inQ)}</span>${tag}</div>`;
  }
  return "";
}

// ---------- 쪽 나누기: 실제 크기의 빈 쪽에 블록을 채워 보며 넘치면 다음 쪽으로 ----------
function bookPaginate(blocks,host,startNo){
  // 실제 크기의 빈 쪽에 블록을 하나씩 넣어 보고, 넘치면 긴 글은 쪽 끝에서 나눠 다음 쪽으로 이어요
  const pages=[];let body=null,day=null;
  const pg=()=>pages[pages.length-1];
  const newPage=()=>{const el=document.createElement("div");el.className="bpg";el.innerHTML=`<div class="bbody"></div><div class="bfolio"><span></span><span></span></div>`;host.appendChild(el);body=el.firstChild;pages.push({el,ids:[],chap:null,day:null});};
  // 넘침 판단은 1px도 봐줘요 안 해요 (반올림 탓에 마지막 줄 아래가 살짝 잘리던 것)
  const over=()=>{if(body.scrollHeight>body.clientHeight)return true;const l=body.lastElementChild;return !!l&&l.getBoundingClientRect().bottom>body.getBoundingClientRect().bottom+.5;};
  const mk=x=>{const t=document.createElement("div");t.innerHTML=blockHTML(x,false);return t.firstElementChild;};
  const SPLIT=new Set(["nar","line","hand"]);
  const fits=x=>{const el=mk(x);if(!el)return true;body.appendChild(el);const ok=!over();body.removeChild(el);return ok;};
  const piece=(x,k)=>{const head=x.text.slice(0,k),rest=x.text.slice(k).replace(/^[ \t]+/,"").replace(/^\n/,"");
    const qs=(x.inQ?"「":"")+head,inQ=qs.lastIndexOf("「")>qs.lastIndexOf("」");return [{...x,text:head.replace(/\s+$/,"")},{...x,text:rest,cont:true,inQ}];};
  const fitLen=x=>{let lo=0,hi=x.text.length;while(lo<hi){const m=(lo+hi+1)>>1;if(fits({...x,text:x.text.slice(0,m)}))lo=m;else hi=m-1;}
    if(lo<=0||lo>=x.text.length)return lo;const h=x.text.slice(0,lo),br=Math.max(h.lastIndexOf("\n"),h.lastIndexOf(" "));return br>lo*.6?br+1:lo;};
  const place=el=>{body.appendChild(el);};
  // 바로 앞 줄과 같은 사람·같은 종류(본문/잡담)면 이름 생략 · 사이에 다른 종류가 끼거나 쪽이 바뀌면 다시 보여요
  let st={m:null,o:null,pg:-1};const spk=x=>x.ooc?x.player:x.char+"|"+(x.sub||"");
  const withSame=x=>{if(st.pg!==pages.length)st={m:null,o:null,pg:pages.length};if(x.k!=="line"||x.cont)return x;return {...x,same:spk(x)===(x.ooc?st.o:st.m)};};
  const commit=x=>{if(x.k==="line"){if(x.ooc){st.o=spk(x);st.m=null;}else{st.m=spk(x);st.o=null;}}else if(x.k!=="note"){st.m=null;st.o=null;}};
  newPage();
  blocks.forEach(x0=>{
    if(x0.k==="chap"&&body.children.length)newPage();
    if(x0.k==="chap")pg().chap=x0.id;
    let x=x0,guard=0;
    while(x&&guard++<400){
      if(x.day&&pg().day==null)pg().day=x.day;
      x=withSame(x);
      const el=mk(x);if(!el)break;place(el);
      if(!over()){if(x.id)pg().ids.push(x.id);commit(x);break;}
      body.removeChild(el);
      const empty=!body.children.length;
      if(SPLIT.has(x.k)&&x.text&&x.text.length>1){const k=fitLen(x);
        // 쪽 끝에 두 줄쯤 이상 들어가면 나눠 채우고, 아니면 통째로 다음 쪽으로
        if(k>0&&(empty||k>=24&&x.text.length-k>=8)){const [a,b]=piece(x,k);place(mk(a));if(x.id)pg().ids.push(x.id);newPage();x=b;continue;}}
      if(empty){place(el);if(x.id)pg().ids.push(x.id);commit(x);break;}
      // 단락 제목만 쪽 끝에 홀로 남지 않게 같이 넘겨요
      const last=body.lastElementChild,carry=last&&last.classList.contains("bscene")?last:null;if(carry)body.removeChild(carry);
      newPage();if(carry)place(carry);
    }
    if(x0.day)day=x0.day;
  });
  void day;
  let d0=null;pages.forEach((p,i)=>{if(p.day)d0=p.day;const f=p.el.querySelector(".bfolio");f.firstChild.textContent=d0?fmtDay(d0)+" 회차":"";f.lastChild.textContent=startNo+i;});
  return pages;
}
// ---------- 화면 ----------
function bookHTML(){
  const B=S.book,sc=scenById(B.scid);
  if(!sc)return `<div class="bookwrap">${loaderHTML()}</div>`;
  if(!bookCan(sc))return `<div class="sc-page"><div class="notice">리플레이북은 세션 비밀번호로 들어온 사람만 볼 수 있어요.</div><button class="ghost" onclick="location.hash='c-${esc(sc.id)}'">← 세션 페이지</button></div>`;
  const th=themeOf(sc)||"plain",acc=BOOK_ACC[th]||BOOK_ACC.plain,Z=BOOK_SIZES[B.size]||BOOK_SIZES.a5;
  const bar=`<div class="bkbar"><a class="ghost" href="#c-${esc(sc.id)}">← 세션 페이지</a><b>📖 ${esc(sc.name)}</b>
    <span class="seg"><button data-bmode="view" class="${B.mode==="view"?"on":""}">완성본</button><button data-bmode="edit" class="${B.mode==="edit"?"on":""}">책 고치기</button></span>
    <select id="bksize">${Object.entries(BOOK_SIZES).map(([k,v])=>`<option value="${k}"${k===B.size?" selected":""}>${v.lab}</option>`).join("")}</select>
    <span class="sp"></span><span class="cnt" id="bkcnt"></span>${B.mode==="view"?`<button class="pri" id="bkprint">PDF로 저장 · 인쇄</button>`:""}</div>`;
  if(B.err)return `<div class="bookwrap" style="--acc:${acc}">${bar}<div class="notice">${esc(B.err)}</div></div>`;
  if(!B.parts)return `<div class="bookwrap" style="--acc:${acc}">${bar}${loaderHTML()}</div>`;
  if(!B.parts.length)return `<div class="bookwrap" style="--acc:${acc}">${bar}<div class="notice">이 세션에는 아직 로그가 없어요.</div></div>`;
  return `<div class="bookwrap mode-${B.mode}" style="--acc:${acc};--pw:${Z.w}px;--ph:${Z.h}px" data-size="${B.size}" data-th="${th}">${bar}
    ${B.mode==="edit"?`<div class="bkedit"><div class="bkkeys"><span><kbd>1</kbd>본문</span><span><kbd>2</kbd>잡담</span><span><kbd>3</kbd>빼기</span><span>Shift+클릭 여러 줄</span><span>두 번 눌러 글 고치기</span></div><div class="bksheet" id="bksheet"></div></div>`:`<div class="bkpages" id="bkpages"></div>`}
    <div class="bkmeasure" id="bkmeasure"></div></div>`;
}
function bookFront(sc){
  const th=themeOf(sc)||"plain",gk=gmKey(sc),gmw=th==="deco"?"DM":"GM",days=[...new Set(S.book.parts.map(p=>p.day))];
  const cast=gmFirst((sc.sp||[]).filter(p=>p.k!==ALL&&(p.k===gk||!isAnon(p)&&!/&/.test(p.name)||p.ch)),gk);
  const pcn=p=>+(pcSplit(p.name).n||"").replace(/\D/g,"")||99;
  const gm=cast.find(p=>p.k===gk),pcs=cast.filter(p=>p.k!==gk).sort((a,b)=>pcn(a)-pcn(b));
  const sys=effSys(sc)?sysLabel(effSys(sc)):"";
  const cover=`<div class="bpg bcover"${sc.og?` style="--og:url('${sc.og}')"`:""}><div class="art${sc.og?" img":""}"></div><div class="band"></div><div class="in">
    <div class="series">${sys?`<b>${esc(sys)}</b>`:""}REPLAY BOOK</div><h1>${esc(sc.name)}</h1>${sc.orig?`<div class="bcorig">${esc(sc.orig)}</div>`:""}
    ${sc.summary?`<div class="bcsub">${esc(sc.summary.split("\n").filter(Boolean).slice(0,2).join(" "))}</div>`:""}
    <div class="bcwho">${gm?`<div><b>${gmw}</b>${esc(pcSplit(gm.name).name)}</div>`:""}<div><b>PL</b>${pcs.map(p=>esc(pcSplit(p.name).name)).join(" · ")}</div></div>
    <div class="bcpub"><span>${site().title===SITE_UNSET?"":esc(site().title)}</span><span>${days.length?esc(days[0].replace(/-/g,". ")):""}${days.length>1?` – ${esc(days[days.length-1].slice(5).replace(/-/g,". "))}`:""}${campOf(sc)?` · ${esc(campOf(sc).name)}`:""}</span></div></div></div>`;
  const castP=`<div class="bpg"><div class="bbody"><h2 class="ph">CHARACTERS</h2><h3 class="pt">등장인물</h3><div class="bcast">${pcs.map(p=>{const q=pcSplit(p.name);return `<div class="bpc" style="--c:${fixC(p.c)}"><span class="av">${p.img?`<img src="${esc(p.img)}" alt="">`:`<em>${esc((p.ch||q.name).slice(0,1))}</em>`}${q.n?`<i>${q.n}</i>`:""}</span><div><b>${esc(p.ch||q.name)}</b><div class="pl">플레이어 · ${esc(q.name)}</div>${p.memo?`<p>${esc(p.memo)}</p>`:""}</div></div>`;}).join("")}</div>
    ${gm?`<div class="bgm"><b>${gmw}</b>${esc(pcSplit(gm.name).name)}${gm.ch?` · ${esc(gm.ch)}`:""} — 이 이야기의 진행자</div>`:""}</div><div class="bfolio"><span>${esc(sc.name)}</span><span>2</span></div></div>`;
  return {cover,castP};
}
// 쪽 나누기는 무거워서, 내용·판형이 그대로면 지난 결과를 다시 써요
function bookPages(sc){
  const B=S.book,key=[B.ver||0,B.size,JSON.stringify(sc.sp||[]),JSON.stringify(sc.nouns||[])].join("|");
  if(B.pc&&B.pc.key===key)return B.pc;
  const m=$("#bkmeasure");if(!m)return B.pc||null;
  m.innerHTML="";const blocks=bookBlocks(sc,false),pages=bookPaginate(blocks,m,4);pages.forEach(p=>p.el.remove());
  const pageOf={};pages.forEach((p,i)=>p.ids.forEach(id=>{if(!pageOf[id])pageOf[id]=4+i;}));
  B.pc={key,blocks,pages,pageOf};return B.pc;
}
function bookPcFresh(sc){const B=S.book;return B.pc&&B.pc.key===[B.ver||0,B.size,JSON.stringify(sc.sp||[]),JSON.stringify(sc.nouns||[])].join("|");}
function bookRender(){
  const B=S.book;if(!B||!B.parts)return;const sc=scenById(B.scid);if(!sc)return;
  // 글꼴이 다 불러와진 뒤에 쪽을 나눠야 글자가 잘리지 않아요
  if(document.fonts&&document.fonts.status!=="loaded"){document.fonts.ready.then(()=>{if(S.book===B)bookRender();});return;}
  const m=$("#bkmeasure");if(!m)return;
  PRE.book=new Set();B.parts.forEach(P=>preIds(bookItems(P).map(e=>e.b)).forEach(id=>PRE.book.add(id)));
  let pc;
  if(B.mode==="view")pc=bookPages(sc);
  else{pc=B.pc||{pages:[],pageOf:{},blocks:[]};
    // 책 고치기 중엔 고친 화면을 먼저 보여 주고, 쪽 번호는 잠시 뒤에 다시 맞춰요
    if(!bookPcFresh(sc)){clearTimeout(B.pgT);B.pgT=setTimeout(()=>{if(S.book!==B||B.mode!=="edit"||B.editing)return;bookPages(sc);bookRender();},B.pc?900:50);}}
  if(!pc)return;
  const {blocks,pages,pageOf}=pc;
  const revs=(S.revs[sc.id]||[]).filter(r=>r.html||r.text);
  const cnt=$("#bkcnt");const all=B.parts.flatMap(bookItems),nO=all.filter(e=>bkOf(e.b)===1).length,nC=all.filter(e=>bkOf(e.b)===2).length;
  if(cnt)cnt.textContent=`${all.length.toLocaleString()}줄 · 잡담 ${nO} · 빼기 ${nC}`+(pages.length?` · ${BOOK_SIZES[B.size].n} 약 ${pages.length+3+(revs.length?1:0)}쪽`:"");
  if(B.mode==="view"){
    const host=$("#bkpages");const {cover,castP}=bookFront(sc);
    // 차례: 장·단락 제목과 쪽
    const toc=[];blocks.forEach(x=>{if(x.k==="chap")toc.push({t:x.title,ch:1,id:x.id});else if(x.k==="scene"&&x.lv===2&&x.text)toc.push({t:x.text,id:x.id});});
    const revStart=4+pages.length;
    const tocP=`<div class="bpg"><div class="bbody"><h2 class="ph">CONTENTS</h2><h3 class="pt">차례</h3><ul class="btoc"><li class="ch">등장인물<span class="p">2</span></li>
      ${toc.map(t=>`<li class="${t.ch?"ch":"sc"}">${esc(t.t)}<span class="p">${pageOf[t.id]||""}</span></li>`).join("")}
      ${revs.length?`<li class="ch">플레이어 후기<span class="p">${revStart}</span></li>`:""}</ul></div><div class="bfolio"><span>${esc(sc.name)}</span><span>3</span></div></div>`;
    host.innerHTML=cover+castP+tocP;pages.forEach(p=>host.appendChild(p.el));
    if(revs.length){
      const pgs=[];let page=null;const np=()=>{page=document.createElement("div");page.className="bpg";page.innerHTML=`<div class="bbody"></div><div class="bfolio"><span>${esc(sc.name)}</span><span>${revStart+pgs.length}</span></div>`;host.appendChild(page);pgs.push(page);return page.firstChild;};
      let body=np();body.innerHTML=`<h2 class="ph">AFTERWORD</h2><h3 class="pt">플레이어 후기</h3>`;
      revs.forEach(r=>{const w=revWho(sc,r);const el=document.createElement("div");el.className="brv";el.innerHTML=`<b>${esc(w.name)}</b><small>${esc(w.gm?(themeOf(sc)==="deco"?"DM":"GM"):w.ch?w.ch+" 역":"")}</small><div class="rb">${r.html?richView(r.html):esc(r.text||"").replace(/\n/g,"<br>")}</div>`;
        body.appendChild(el);if(body.scrollHeight>body.clientHeight+1&&body.children.length>1){body.removeChild(el);body=np();body.appendChild(el);}});}
    m.innerHTML="";
  }else{
    const sh=$("#bksheet");const eb=bookBlocks(sc,true);let lastPg=0,html="",secIds=[];
    {let m0=null,o0=null;eb.forEach(x=>{if(x.k==="line"){const k=x.ooc?x.player:x.char+"|"+(x.sub||"");if(x.ooc){x.same=k===o0;o0=k;m0=null;}else{x.same=k===m0;m0=k;o0=null;}}else if(x.k!=="note"){m0=null;o0=null;}});}
    // 단락별로 묶어 '통째로 빼기' · 다 뺀 단락은 접어 둬요
    const groupsArr=[];let g={head:null,items:[]};eb.forEach(x=>{if(x.k==="chap"||x.k==="scene"){groupsArr.push(g);g={head:x,items:[]};}else g.items.push(x);});groupsArr.push(g);
    groupsArr.forEach((G,gi)=>{if(!G.head&&!G.items.length)return;
      const ids=G.items.filter(x=>x.id).map(x=>x.id),allCut=ids.length&&G.items.every(x=>!x.id||x.bk===2),open=B.unfold&&B.unfold[gi];
      if(G.head){const h=G.head;const pg=G.items.map(x=>pageOf[x.id]).filter(Boolean);
        html+=`<div class="bsec${h.k==="chap"?" chap":""}${allCut?" cut":""}"><b>${h.k==="chap"?esc(h.label)+" · ":""}${esc(h.k==="chap"?h.title:(h.text||"단락"))}</b><small>${allCut?`뺀 단락 · ${ids.length}줄`:pg.length?`완성본 ${Math.min(...pg)}${Math.max(...pg)>Math.min(...pg)?"–"+Math.max(...pg):""}쪽`:""}</small>${ids.length?`<button class="ghost" data-bsec="${gi}">${allCut?"다시 넣기":"이 단락 통째로 빼기"}</button>`:""}</div>`;}
      if(allCut&&!open){html+=`<button class="bfold" data-bfold="${gi}">뺀 단락 ${ids.length}줄은 접혀 있어요 · 펼치기 ▾</button>`;return;}
      G.items.forEach(x=>{
        const p=pageOf[x.id];if(p&&p!==lastPg){if(lastPg)html+=`<div class="bpbreak">완성본 ${p}쪽</div>`;lastPg=p;}html+=blockHTML(x,true);});
      secIds[gi]=ids;});
    // 책 앞부분 정보: 등장인물 한 줄 소개 · 고유명사 설명(처음 나오는 쪽에 메모)
    const gk=gmKey(sc),pcs=(sc.sp||[]).filter(p=>p.k!==ALL&&p.k!==gk&&(!isAnon(p)&&!/&/.test(p.name)||p.ch));
    const ng=nounGroupsOf(sc);
    html=`<details class="bkinfo"${B.infoOpen?" open":""}><summary>등장인물 소개 · 고유명사 설명</summary>
      <div class="bki-h">등장인물 한 줄 소개</div>${pcs.map(p=>`<label class="bki"><span style="color:${fixC(p.c)}">${esc(p.ch||pcSplit(p.name).name)}</span><input type="text" data-bkmemo="${esc(p.k)}" value="${esc(p.memo||"")}" placeholder="예: 안개 속에서 길을 잃은 약초꾼"></label>`).join("")||'<div class="bki-e">플레이어가 없어요.</div>'}
      <div class="bki-h">고유명사 설명 <small>설명이 있는 낱말만 처음 나오는 쪽 여백에 메모로 붙어요</small></div>${ng.map(g=>`<label class="bki"><span>${esc(g.n)}</span><input type="text" data-bknoun="${esc(g.n)}" value="${esc(g.d||"")}" placeholder="(설명 없음)"></label>`).join("")||'<div class="bki-e">로그 페이지의 고유명사 목록에서 낱말을 먼저 묶어 주세요.</div>'}
    </details>`+html;
    sh.innerHTML=html;B.secIds=secIds;
    const det=sh.querySelector(".bkinfo");det.ontoggle=()=>{B.infoOpen=det.open;};
    sh.querySelectorAll("[data-bkmemo]").forEach(i=>{i.onkeydown=e=>{e.stopPropagation();if(e.key==="Enter")i.blur();};i.onchange=()=>{const k=i.dataset.bkmemo,v=i.value.trim();
      mutateScen(sc.id,d=>{const p=(d.sp||[]).find(x=>x.k===k);if(!p)return false;if(v)p.memo=v;else delete p.memo;});};});
    sh.querySelectorAll("[data-bknoun]").forEach(i=>{i.onkeydown=e=>{e.stopPropagation();if(e.key==="Enter")i.blur();};i.onchange=()=>{const g=nounGroupsOf(sc).find(x=>x.n===i.dataset.bknoun);if(g)saveNoun(g.n,{n:g.n,a:g.a,d:i.value},sc);};});B.flat=eb.filter(x=>x.id&&x.k!=="scene"&&x.k!=="chap");
    m.innerHTML="";bindBookEdit(sc);
  }
}
function bookSelPop(){
  document.querySelectorAll(".bselpop").forEach(e=>e.remove());const B=S.book;if(!B||!B.sel.size||B.editing)return;
  const els=[...document.querySelectorAll("#bksheet [data-bid].sel")];if(!els.length)return;
  const xs=B.flat.filter(x=>B.sel.has(x.id)),speech=xs.every(x=>x.k==="line"),cur=xs.every(x=>x.bk===xs[0].bk)?xs[0].bk:-1;
  const pop=document.createElement("div");pop.className="bselpop";
  pop.innerHTML=`${xs.length>1?`<em>${xs.length}줄</em>`:""}<button data-bk="0" class="${cur===0?"on":""}">1 본문</button>${speech?`<button data-bk="1" class="${cur===1?"on":""}">2 잡담</button>`:""}<button data-bk="2" class="${cur===2?"on":""}">3 빼기</button>${xs.length===1&&xs[0].k!=="dice"?`<button data-bst="1" title="이 줄부터 본세션 · 앞은 빼기로">▶ 여기서 시작</button>`:""}`;
  // 고른 줄 안에 넣으면 빼기 줄의 흐림이 같이 먹어서, 시트 위에 따로 띄워요
  const first=els[0],sh=$("#bksheet");pop.style.top=(first.offsetTop+first.offsetHeight+4)+"px";sh.appendChild(pop);
  pop.onmousedown=e=>{const st=e.target.closest("[data-bst]");if(st){e.preventDefault();e.stopPropagation();bookSetStart(xs[0]);return;}
    const b=e.target.closest("[data-bk]");if(!b)return;e.preventDefault();e.stopPropagation();bookSetBk(+b.dataset.bk);};
}
function bookSetStart(x){
  const B=S.book,P=B.parts.find(p=>p.sid===x.sid);if(!P)return;
  const ch=bookItems(P).filter(e=>e.b.bstart&&e.b.id!==x.id).map(e=>({sid:e.sid,ci:e.ci,id:e.b.id,f:{bstart:undefined}}));
  const cur=bookItems(P).find(e=>e.b.id===x.id);if(cur&&!cur.b.bstart)ch.push({sid:x.sid,ci:x.ci,id:x.id,f:{bstart:1}});
  B.sel=new Set();if(ch.length)bookSet(ch);toast("이 줄부터 본세션 · 앞은 빼기로 돼요");
}
function bookSetBk(v){
  const B=S.book;const xs=B.flat.filter(x=>B.sel.has(x.id));if(!xs.length)return;
  const changes=xs.filter(x=>!(v===1&&x.k!=="line")).map(x=>{const P=B.parts.find(p=>p.sid===x.sid),b=P.chunks[x.ci].find(y=>y.id===x.id);
    // 따로 안 고른 값(시작 줄 앞은 빼기, 코코포리아 잡담 채널은 잡담)과 같으면 표시를 지워 둬요
    const def=PRE.book.has(b.id)?2:b.tab&&CHAT_TAB.test(b.tab)&&x.k==="line"?1:0;return {sid:x.sid,ci:x.ci,id:x.id,f:{bk:v===def?undefined:v}};});
  bookSet(changes);
}
function bindBookEdit(sc){
  const B=S.book,sh=$("#bksheet");if(!sh)return;
  sh.onclick=e=>{
    const sb=e.target.closest("[data-bsec]");if(sb){const ids=B.secIds[+sb.dataset.bsec]||[];const xs=B.flat.filter(x=>ids.includes(x.id));const allCut=xs.every(x=>x.bk===2);
      B.sel=new Set(ids);bookSetBk(allCut?0:2);B.sel=new Set();return;}
    const fb=e.target.closest("[data-bfold]");if(fb){B.unfold={...(B.unfold||{}),[fb.dataset.bfold]:true};bookRender();return;}
    const el=e.target.closest("[data-bid]");if(!el||B.editing)return;const id=el.dataset.bid;
    if(e.shiftKey&&B.anchor){const order=B.flat.map(x=>x.id),a=order.indexOf(B.anchor),z=order.indexOf(id);const [i,j]=a<z?[a,z]:[z,a];B.sel=new Set(order.slice(i,j+1));}
    else{B.sel=new Set([id]);B.anchor=id;}
    sh.querySelectorAll("[data-bid]").forEach(n=>n.classList.toggle("sel",B.sel.has(n.dataset.bid)));bookSelPop();
  };
  sh.ondblclick=e=>{const el=e.target.closest("[data-bid]");if(!el)return;const x=B.flat.find(y=>y.id===el.dataset.bid);if(!x||x.k==="dice")return;
    B.editing=x.id;B.sel=new Set([x.id]);bookRender();const t=$("#bked");if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length);t.style.height=t.scrollHeight+"px";
      t.oninput=()=>{t.style.height="auto";t.style.height=t.scrollHeight+"px";};
      t.onkeydown=ev=>{ev.stopPropagation();if(ev.key==="Escape"){B.editing=null;bookRender();}
        else if(ev.key==="Enter"&&!ev.shiftKey&&!ev.isComposing){ev.preventDefault();const v=t.value.replace(/\s+$/,"");B.editing=null;if(v!==x.text)bookSet([{sid:x.sid,ci:x.ci,id:x.id,f:{x:v}}]);else bookRender();}};}};
  bookSelPop();
}
function bindBook(){
  const B=S.book;renderAuth&&renderAuth();
  document.querySelectorAll("[data-bmode]").forEach(b=>b.onclick=()=>{B.mode=b.dataset.bmode;B.sel=new Set();B.editing=null;render();});
  const sz=$("#bksize");if(sz)sz.onchange=()=>{B.size=sz.value;try{localStorage.setItem("trpg-booksize",B.size);}catch(e){}render();};
  const pr=$("#bkprint");if(pr)pr.onclick=()=>{const st=document.getElementById("bkpage-style")||document.head.appendChild(Object.assign(document.createElement("style"),{id:"bkpage-style"}));const Z=BOOK_SIZES[B.size];st.textContent=`@page{size:${Z.w/559*148}mm ${Z.h/794*210}mm;margin:0}`;window.print();};
  if(B.parts)setTimeout(bookRender,0);
}
// 책 고치기 단축키: 1 본문 · 2 잡담 · 3 빼기 · ↑↓ 줄 옮기기 · Esc 고르기 풀기
document.addEventListener("keydown",e=>{
  const B=S.book;if(!B||B.mode!=="edit"||B.editing)return;if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||"")))return;
  if(["1","2","3"].includes(e.key)&&B.sel.size){e.preventDefault();bookSetBk(+e.key-1);return;}
  if(e.key==="Escape"&&B.sel.size){B.sel=new Set();document.querySelectorAll("#bksheet .sel").forEach(n=>n.classList.remove("sel"));bookSelPop();return;}
  if((e.key==="ArrowDown"||e.key==="ArrowUp")&&B.sel.size&&B.flat&&B.flat.length){e.preventDefault();const order=B.flat.map(x=>x.id);let i=order.indexOf(B.anchor);i=i<0?0:Math.max(0,Math.min(order.length-1,i+(e.key==="ArrowDown"?1:-1)));
    B.anchor=order[i];B.sel=new Set([order[i]]);document.querySelectorAll("#bksheet [data-bid]").forEach(n=>n.classList.toggle("sel",B.sel.has(n.dataset.bid)));const el=document.querySelector(`#bksheet [data-bid="${CSS.escape(order[i])}"]`);if(el)el.scrollIntoView({block:"nearest"});bookSelPop();}
});
