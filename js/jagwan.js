// 페어(1:1 자캐 관계) 페이지 — 고정탁 멤버가 2명이면 고정탁 페이지 대신 이 페이지
// 페어 정보: fixes/{fx_이름} = {banner:{u,p,y}, rel, colors:{bg,acc,a,b}, fields:["외모","성격",…],
//   prof:{a:{own,nm,en,rn,ren,age,ht,sex,mbti,tags:[3],icon:{u,p},cut:{u,p},sec:{항목:글}}, b:{…}}, recs:[{id,d,t,note,img}]}
const JG_F0=["외모","성격"];
function jgDoc(f){const fk=fixKey(f);fixDocWatch(fk);return S.fixDocs[fk]||{};}
// A·B: 저장된 오너 순서, 없으면 사람 목록 순서
function jgSides(f){const P=fixPeopleList(f),pr=(jgDoc(f).prof)||{};
  const A=P.find(p=>p.n===(pr.a||{}).own)||P[0],B=P.find(p=>p!==A&&p.n===(pr.b||{}).own)||P.find(p=>p!==A);
  const mk=(key,p)=>{const q=pr[key]||{},ch=p?[...p.ch][0]||p.n:"";return {key,p,pr:q,nm:q.nm||ch||(key==="a"?"A":"B"),en:q.en||q.nm||ch||"",own:p?p.n:""};};
  return [mk("a",A),mk("b",B)];}
function jgFixData(f){
  // 세션 목록이 안 보이는 사람(비밀번호 안 넣음)은 시나리오에 적힌 플레이 날짜(pdays)로
  const gs=groups().filter(g=>g.sc&&fixOfScen(g.sc)===f).map(g=>{if(g.days.length)return g;const ds=g.sc.pdays&&g.sc.pdays.length?g.sc.pdays:g.sc.lastDay?[g.sc.lastDay]:[];return ds.length?{...g,days:ds.map(d=>({day:d,parts:[],nolog:false})),last:ds.at(-1)}:g;});
  const days=gs.flatMap(g=>g.days.map(d=>d.day)).filter(Boolean).sort();
  const cs=S.camps.filter(c=>(c.fix||"")===f);
  return {gs,days,cs,stories:gs.filter(g=>!g.sc.camp).length+cs.length};}
const jgDot=d=>String(d||"").replace(/-/g,".");
function jgDaysSince(d){if(!d)return 0;const t=new Date(d.replace(/\./g,"-")+"T00:00:00");return Math.max(0,Math.round((Date.now()-t)/864e5));}
// 타임라인 날짜 맞추기: "2026.06.29" "2026-06" "2025.3" → 정렬용 "2026-06-29"
function jgNorm(d){const m=String(d||"").match(/(\d{4})\D*(\d{1,2})?\D*(\d{1,2})?/);if(!m)return "";return m[1]+(m[2]?"-"+m[2].padStart(2,"0"):"")+(m[3]?"-"+m[3].padStart(2,"0"):"");}
// 타임라인은 다 그리고, 화면에서 LOG 높이만큼만 보이게 잘라요 (bindJgPage) · 펼치면 맨 아래 '접기'
function jgFold(list,key,render){return render(list)+((S.jgAll||{})[key]?`<li class="fold"><button type="button" data-jgfold="${key}">▴ 접기</button></li>`:"");}
function jgTimelineHTML(f,data,items){const d=jgDoc(f),tab=S.jgTl||"main",canRec=S.canAdmin||fixOpen(f);
  // 메인: 세션 날짜 + 갤러리 날짜 (자동)
  const M=[];data.gs.forEach(g=>{const n=g.days.length;g.days.forEach((x,i)=>M.push({k:x.day||"",type:"s",g,i:i+1,n,sid:x.parts[0]?.id}));});
  const byDay={},scPosts={};items.forEach(p=>{const day=p.at?new Date(p.at).toISOString().slice(0,10):"";if(!day)return;const t=galT(p);
    if(p.kind==="sc"&&data.gs.some(g=>g.sc.id===p.src)){(scPosts[p.src]=scPosts[p.src]||[]).push(p);return;}
    if(t==="img"){const key=day+"|"+(p.by||"");(byDay[key]=byDay[key]||{k:day,type:"g",by:p.by||"",posts:[]}).posts.push(p);}else M.push({k:day,type:"p",p});});
  M.push(...Object.values(byDay));M.sort((a,b)=>b.k.localeCompare(a.k));M.forEach(e=>e.dl=jgDot(e.k.slice(0,7)));
  const lastOf={};M.forEach(e=>{if(e.type==="s"&&!lastOf[e.g.sc.id])lastOf[e.g.sc.id]=e;});
  const mainLi=list=>{let ym="";return list.map(e=>{const m=e.k.slice(0,7),mh=m!==ym?(ym=m,`<li class="m"><div class="d">${esc(jgDot(m))}</div></li>`):"";const dd=esc(jgDot(e.k.slice(5)));
    if(e.type==="s"){const sc=e.g.sc,cm=campOf(sc),last=lastOf[sc.id]===e,done=last&&(sc.done||cm&&cm.done&&!isCamp(cm)),ps=last?scPosts[sc.id]||[]:[];
      const ims=ps.filter(p=>galT(p)==="img").flatMap(p=>galImgs(p).map(q=>({p,q}))),txs=ps.filter(p=>galT(p)==="txt");
      return mh+`<li><div class="d">${dd}</div><div class="t"><a href="#c-${esc(sc.id)}">${esc(sc.name)}</a>${cm?`<span class="cp">${isCamp(cm)?"CAMP":"CAMPAIGN"}</span>`:""} <small>${cm&&!isCamp(cm)?esc(epLabel(cm,sc))+" · ":""}${e.n>1?`${e.i}회차 / ${e.n}`:"1회차"}${effSys(sc)?" · "+esc(sysLabel(effSys(sc))):""}</small>${done?"<em>완주</em>":""}</div>
        ${ims.length?`<div class="th">${ims.slice(0,8).map(x=>`<img src="${esc(x.q.u||x.q.o)}" alt="" loading="lazy" data-gal="${esc(x.p.id)}">`).join("")}${ims.length>8?`<span>+${ims.length-8}</span>`:""}</div>`:""}${txs.map(p=>`<a href="#" class="tcard sm" data-gal="${esc(p.id)}"><b>${esc(p.title||"텍스트")}</b>${esc(String(p.body||"").slice(0,70))}…</a>`).join("")}</li>`;}
    if(e.type==="g"){const ims=e.posts.flatMap(p=>galImgs(p).map(q=>({p,q})));
      return mh+`<li><div class="d">${dd}</div><div class="t">갤러리 <small>사진 ${ims.length}장${e.by?" · "+esc(e.by):""}</small></div><div class="th">${ims.slice(0,8).map(x=>`<img src="${esc(x.q.u||x.q.o)}" alt="" loading="lazy" data-gal="${esc(x.p.id)}">`).join("")}${ims.length>8?`<span>+${ims.length-8}</span>`:""}</div></li>`;}
    const p=e.p;
    return mh+`<li><div class="d">${dd}</div><div class="t"><a href="#" data-gal="${esc(p.id)}">${esc(p.title||"텍스트")}</a> <small>텍스트${p.by?" · "+esc(p.by):""}</small></div><div class="note">${esc(String(p.body||"").slice(0,90))}…</div></li>`;}).join("");};
  // 서브: 직접 쓰는 기록
  const R=(d.recs||[]).map(r=>({...r,k:jgNorm(r.d),dl:r.d})).sort((a,b)=>b.k.localeCompare(a.k));
  const subLi=list=>list.map(r=>{const p=jgRecPost(r,items),pt=p&&galT(p);
    const att=p?(pt==="txt"?`<a href="#" class="tcard" data-gal="${esc(p.id)}"><b>${esc(p.title||"텍스트")}</b>${esc(String(p.body||"").slice(0,110))}…</a>`:`<div class="th big"><img src="${esc(galImgs(p)[0].u||galImgs(p)[0].o)}" alt="" loading="lazy" data-gal="${esc(p.id)}" style="cursor:zoom-in">${galImgs(p).length>1?`<span>+${galImgs(p).length-1}</span>`:""}</div>`):r.img?`<div class="th big"><img src="${esc(r.img)}" alt="" loading="lazy"></div>`:"";
    return `<li><div class="d">${esc(r.d||"")}</div><div class="t">${esc(r.t||"")}${canRec?`<button type="button" class="rx" data-jgrecx="${esc(r.id)}" title="지우기">✕</button><button type="button" class="rx" data-jgrece="${esc(r.id)}" title="고치기">✎</button>`:""}</div>${r.note?`<div class="note">${esc(r.note).replace(/\n/g,"<br>")}</div>`:""}${att}</li>`;}).join("");
  return `<section class="jgsec jgtl"><h4>TIMELINE<span class="jgtabs"><button type="button" data-jgtl="main" class="${tab==="main"?"on":""}">메인</button><button type="button" data-jgtl="sub" class="${tab==="sub"?"on":""}">서브</button></span>${tab==="sub"&&canRec?`<button type="button" class="jgadd" id="jgaddrec">＋ 기록 더하기</button>`:""}</h4>
    ${tab==="main"?`<div class="tip2">세션 날짜와 갤러리 날짜로 자동으로 만들어져요</div>${M.length?`<ol class="tl">${jgFold(M,"main",mainLi)}</ol>`:`<div class="empty">아직 기록이 없어요</div>`}`
      :`<div class="tip2">＋ 기록 더하기로 직접 쓰는 타임라인 · 글이나 갤러리 그림을 끼워 넣어요</div>${R.length?`<ol class="tl">${jgFold(R,"sub",subLi)}</ol>`:`<div class="empty">아직 기록이 없어요</div>`}`}</section>`;}
// LOG: 단편 + 캠페인(편 목록이 접혀 들어가요 · 완주한 캠페인은 접혀서)
function jgLogHTML(f,data){const G=id=>data.gs.find(g=>g.sc.id===id),dt=d=>jgDot((d||"").slice(5));
  const one=data.gs.filter(g=>!g.sc.camp||!data.cs.some(c=>c.id===g.sc.camp)).map(g=>({k:g.last||"",h:`<li><div class="h"><a href="#c-${esc(g.sc.id)}">${esc(g.sc.name)}</a><small>${esc(jgDot(g.days[0]?.day||""))}${g.days.length>1?` – ${esc(dt(g.last))}`:""} · ${g.days.length}세션${g.sc.done?" · 완주":""}</small></div></li>`}));
  const camp=data.cs.map(c=>{const es=campEps(c),cm=isCamp(c),done=!cm&&!!c.done,fin=es.filter(e=>e.done||done).length,last=campLast(c);
    const lastEp=es.filter(e=>!e.gaiden).at(-1);const rows=es.map(e=>{const g=G(e.id),now=!cm&&!done&&!e.done&&e===lastEp;return `<li class="${now?"now":""}"><span>${cm?esc(dt(e.lastDay)):esc(epLabel(c,e).replace("편",""))||"·"}</span><a href="#c-${esc(e.id)}">${esc(e.name)}</a><small>${now?"진행 중":esc(dt(g?.last||e.lastDay))}</small></li>`;}).join("");
    const head=`<span class="tg${done?"":" c"}">${cm?"CAMP":"CAMPAIGN"}</span><a href="#g-${esc(c.id)}">${esc(c.name)}</a><small>${cm?`탁 ${es.length}개`:`${es.filter(e=>!e.gaiden).length}편 · ${done?"완주":"진행 중"}`}</small>`;
    const bar=cm?"":`<div class="jgbar${done?" full":""}"><i style="width:${es.length?Math.round(fin/es.length*100):0}%"></i></div>`;
    return {k:last,h:done||cm?`<li class="cg"><details><summary class="h">${head}<b class="car"></b></summary>${bar}<ul class="eps">${rows}</ul></details></li>`:`<li class="cg"><div class="h">${head}</div>${bar}<ul class="eps">${rows}</ul></li>`};});
  const all=[...camp,...one].sort((a,b)=>b.k.localeCompare(a.k));
  return `<section class="jgsec jglog"><h4>LOG<small class="cnt">${String(all.length).padStart(2,"0")}</small></h4><ul>${all.map(x=>x.h).join("")||`<li class="empty">아직 세션이 없어요</li>`}</ul></section>`;}
function jgCardHTML(s,fields){const q=s.pr,dl=[["나이",q.age&&(/\D/.test(q.age)?q.age:q.age+"세")],["키",q.ht&&(/\D/.test(q.ht)?q.ht:q.ht+"cm")],["성별",q.sex],["MBTI",q.mbti]].filter(x=>x[1]);
  const secs=fields.filter(k=>(q.sec||{})[k]);
  return `<div class="jgcd ${s.key}"><div class="hd">${q.icon?.u?`<img src="${esc(q.icon.u)}" alt="">`:`<span class="ph"></span>`}<div><b>${esc(s.nm)}</b><small>${[q.ren||q.rn,s.own].filter(Boolean).map(esc).join(" · ")}</small></div></div>
    ${q.rn&&q.ren?`<div class="rn">${esc(q.rn)}</div>`:""}
    ${dl.length?`<dl>${dl.map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`:""}
    ${secs.map(k=>`<details><summary>${esc(k)}</summary><p>${esc(q.sec[k]).replace(/\n/g,"<br>")}</p></details>`).join("")}</div>`;}
function jgRO(f){return !(S.canAdmin||fixOpen(f));}
function jgSrcs(f){const ss=S.db?galSrcFix(f):[];return jgRO(f)?ss.map(x=>({...x,list:x.list.filter(p=>!p.nolink)})):ss;}
function jgPageHTML(f){const d=jgDoc(f),[A,B]=jgSides(f),fields=d.fields&&d.fields.length?d.fields:JG_F0,data=jgFixData(f),ban=d.banner;
  const srcs=jgSrcs(f),postsH=S.db?galHTML(srcs,{newest:1,title:"POSTS",en:"POSTS"}):"",items=galAll(srcs,1);
  return `<div class="jgp">
    <section class="jgposter">
      <div class="jgban${ban?.u?"":" empty"}">${ban?.u?`<img src="${esc(ban.u)}" alt="" style="object-position:50% ${+ban.y>=0?+ban.y:40}%">`:`<div class="fb"><span>${esc(A.en)}</span><span>${esc(B.en)}</span></div>`}</div>
      <div class="jgunder">
        ${A.pr.cut?.u?`<div class="jgcut a"><img src="${esc(A.pr.cut.u)}" alt=""></div>`:""}${B.pr.cut?.u?`<div class="jgcut b"><img src="${esc(B.pr.cut.u)}" alt=""></div>`:""}
        <div class="jgtitle"><h1>${esc(f)}</h1><p>${esc(A.en)} × ${esc(B.en)}</p></div>
      </div></section>
    <div class="jgwrap">
      <div class="jgtri">${jgCardHTML(A,fields)}
        <div class="jgmid"><div class="k">RELATION</div><div class="rel">${d.rel?esc(d.rel):`<span class="tip">관계 한 줄을 적어 주세요</span>`}</div>
          <div class="nums"><div><b>${data.stories}</b><span>이야기</span></div><div><b>${data.days.length}</b><span>세션</span></div><div><b>${jgDaysSince(data.days[0])}</b><span>함께한 날</span></div></div>
          ${data.days.length?`<div class="vs"><i></i>${esc(jgDot(data.days[0]))} — ${esc(jgDot(data.days.at(-1)))}<i></i></div>`:""}</div>
        ${jgCardHTML(B,fields)}</div>
      <div class="jgsplit">${jgTimelineHTML(f,data,items)}${jgLogHTML(f,data)}</div>
      ${postsH}
      ${S.canAdmin?`<div class="jgtop jgbot"><a class="ghost ownonly" href="#">← 첫 화면</a><span style="flex:1"></span><button type="button" class="jged" id="jgedit">${S.jgEdit?"✕ 수정 닫기":"✎ 페어 수정"}</button></div>`:""}
      ${S.jgEdit&&S.canAdmin?jgEditHTML(f):""}
      ${fixAccHTML(f)}${jgRO(f)?`<div class="sc-sec fxacc jgacc"><h4 data-en="ACCESS">페어 비밀번호</h4><div class="tip">페어 비밀번호를 넣으면 글을 올리고, 기록을 더하고, 댓글을 달 수 있어요. 안의 모든 세션도 같이 열려요.</div>
        <form class="pwrow" id="jgunlock"><input type="text" id="jgpw" placeholder="페어 비밀번호" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="pri">열기</button></form><div class="tip" id="jgmsg"></div></div>`:""}
    </div></div>`;}
// fixes 문서에 합쳐 쓰고 화면 쪽 사본도 맞추기
async function jgPut(f,upd){const fk=fixKey(f);if(!S.authUser)await S.auth.signInAnonymously();await S.db.doc("fixes/"+fk).set(upd,{merge:true});S.fixDocs[fk]={...(S.fixDocs[fk]||{}),...upd};}
// ---------- 페어 수정 (주인) ----------
function jgDraft(f){if(!S.jgDraftF||S.jgDraftF!==f||!S.jgDraft){const d=jgDoc(f),[A,B]=jgSides(f);
  S.jgDraftF=f;S.jgDraft=JSON.parse(JSON.stringify({banner:d.banner||null,rel:d.rel||"",colors:d.colors||{},fields:d.fields&&d.fields.length?d.fields:JG_F0,
    prof:{a:{own:A.own,...(d.prof||{}).a},b:{own:B.own,...(d.prof||{}).b}}}));}return S.jgDraft;}
function jgEditHTML(f){const D=jgDraft(f),[A,B]=jgSides(f),c=D.colors||{};
  const cv=(k,def,lb)=>`<label class="jgsw"><input type="color" data-jgc="${k}" value="${esc(c[k]||def)}"><b>${lb}</b><code>${esc((c[k]||def).toUpperCase())}</code></label>`;
  const ppl=fixPeopleList(f).map(p=>p.n);
  const pf=(key,s)=>{const q=D.prof[key]||{},v=k=>esc(q[k]||"");return `<div class="jgpf ${key}"><div class="pft"><b>${key.toUpperCase()} 캐릭터 프로필</b><select data-jgp="${key}.own">${ppl.map(n=>`<option${n===q.own?" selected":""}>${esc(n)}</option>`).join("")}</select></div>
    <div class="pfg"><div class="pimgs"><label class="pi">${q.icon?.u?`<img src="${esc(q.icon.u)}">`:`<span class="ph">＋</span>`}<small>아이콘</small><input type="file" accept="image/*" hidden data-jgimg="${key}.icon"></label>
      <label class="pi cutbg">${q.cut?.u?`<img src="${esc(q.cut.u)}">`:`<span class="ph tall">＋</span>`}<small>전신 (투명 PNG)</small><input type="file" accept="image/*" hidden data-jgimg="${key}.cut"></label></div>
    <div class="pff"><div class="f2"><span>이명<input data-jgp="${key}.nm" value="${v("nm")}" placeholder="${esc(s.nm)}"></span><span>이명 영문<input data-jgp="${key}.en" value="${v("en")}" placeholder="ROUGE"></span></div>
      <div class="f2"><span>본명<input data-jgp="${key}.rn" value="${v("rn")}"></span><span>본명 영문<input data-jgp="${key}.ren" value="${v("ren")}"></span></div>
      <div class="f4"><span>나이<input data-jgp="${key}.age" value="${v("age")}"></span><span>키<input data-jgp="${key}.ht" value="${v("ht")}"></span><span>성별<input data-jgp="${key}.sex" value="${v("sex")}"></span><span>MBTI<input data-jgp="${key}.mbti" value="${v("mbti")}"></span></div>
</div></div>
    <div class="pfs">${D.fields.map((k,i)=>`<div><div class="fh"><b>${esc(k)}</b>${D.fields.length>1?`<button type="button" data-jgfdel="${i}" title="이 항목 지우기 (양쪽)">✕</button>`:""}</div><textarea rows="3" data-jgsec="${key}|${esc(k)}">${esc((q.sec||{})[k]||"")}</textarea></div>`).join("")}
      <div class="addf"><input id="jgfnew-${key}" placeholder="새 항목 이름 (예: 능력)"><button type="button" data-jgfadd="${key}">＋ 항목 더하기</button><small>양쪽에 같이 생겨요</small></div></div></div>`;};
  return `<section class="jgedit"><div class="eh">페어 수정 <small>· 주인만</small></div>
    <div class="erow"><label>첫 화면 그림<span>가로로 긴 그림</span></label><label class="eup">${D.banner?.u?"바꾸기":"＋ 올리기"}<input type="file" accept="image/*" hidden data-jgimg="banner"></label>
      ${(()=>{const ims=galAll(galSrcFix(f),1).filter(p=>galT(p)==="img").flatMap(p=>galImgs(p).map(q=>q.o||q.u)).filter(Boolean);return ims.length?`<div class="jgbpick"><span class="tip">또는 갤러리에서</span>${ims.map(u=>`<button type="button" class="${D.banner&&(D.banner.o===u||D.banner.u===u)?"on":""}" data-jgbpick="${esc(u)}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join("")}</div>`:"";})()}
      ${D.banner?.u?`<span class="eup2">위치 <input type="range" min="0" max="100" value="${+D.banner.y>=0?+D.banner.y:40}" data-jgby></span><button type="button" class="ghost" data-jgbandel>빼기</button>`:""}<span class="tip" id="jgupmsg"></span></div>
    <div class="erow"><label>관계 한 줄</label><input class="ein" data-jgrel value="${esc(D.rel||"")}" placeholder="두 캐릭터가 어떤 사이인지"></div>
    <div class="erow"><label>색<span>테마 2 + 캐릭터 2</span></label>${cv("bg","#1b1b1c","테마 바탕")}${cv("acc","#efc11a","테마 포인트")}${cv("a",fixC(A.p?.c)||"#d9577d","A")}${cv("b",fixC(B.p?.c)||"#2e9a8c","B")}<button type="button" class="ghost" data-jgcreset>기본으로</button></div>
    <div class="jgpfs">${pf("a",A)}${pf("b",B)}</div>
    <div class="eft"><span>비워 둔 칸은 페이지에 안 나와요 · 이 색은 페어에 묶인 모든 세션 페이지·로그에도 적용돼요</span><button type="button" class="pri" id="jgsave">저장</button></div></section>`;}
async function jgUpImg(f,file){const fk=fixKey(f);if(!S.authUser)await S.auth.signInAnonymously();
  const q=await galPut(fk,file,"jg"+Date.now().toString(36)+rid4());return {u:q.o,o:q.o,p:q.p,op:q.op,w:q.w,h:q.h};}
function bindJgEdit(f){const box=document.querySelector(".jgedit");if(!box)return;const D=jgDraft(f);
  const setPath=(path,val)=>{const [k,fld]=path.split(".");D.prof[k]=D.prof[k]||{};if(val)D.prof[k][fld]=val;else delete D.prof[k][fld];};
  box.querySelectorAll("[data-jgp]").forEach(i=>i.oninput=i.onchange=()=>setPath(i.dataset.jgp,i.value.trim()));
  box.querySelectorAll("[data-jgsec]").forEach(t=>t.oninput=()=>{const [k,fld]=t.dataset.jgsec.split("|");D.prof[k].sec=D.prof[k].sec||{};D.prof[k].sec[fld]=t.value;});
  const rel=box.querySelector("[data-jgrel]");rel.oninput=()=>D.rel=rel.value;
  box.querySelectorAll("[data-jgc]").forEach(i=>i.oninput=()=>{D.colors={...D.colors,[i.dataset.jgc]:i.value};i.nextElementSibling.nextElementSibling.textContent=i.value.toUpperCase();
    const st=document.body.style,m={bg:"--jbg",acc:"--jacc",a:"--ja",b:"--jb"};st.setProperty(m[i.dataset.jgc],i.value);jgTextColor();});
  const cr=box.querySelector("[data-jgcreset]");cr.onclick=()=>{D.colors={};jgColors(f,D.colors);render();};
  const by=box.querySelector("[data-jgby]");if(by)by.oninput=()=>{D.banner={...D.banner,y:+by.value};const im=document.querySelector(".jgban img");if(im)im.style.objectPosition=`50% ${by.value}%`;};
  box.querySelectorAll("[data-jgbpick]").forEach(b=>b.onclick=()=>{const u=b.dataset.jgbpick,on=D.banner&&(D.banner.o===u||D.banner.u===u);D.banner=on?null:{u,o:u,y:40};render();});
  const bd=box.querySelector("[data-jgbandel]");if(bd)bd.onclick=()=>{D.banner=null;render();};
  box.querySelectorAll("[data-jgimg]").forEach(i=>i.onchange=async()=>{const file=i.files[0];i.value="";if(!file)return;const m=$("#jgupmsg");if(m)m.textContent="올리는 중…";
    try{const q=await jgUpImg(f,file),k=i.dataset.jgimg;if(k==="banner")D.banner={...q,y:40};else{const [s,fld]=k.split(".");D.prof[s][fld]=q;}render();}catch(e){toast("그림을 올리지 못했어요");if(m)m.textContent="";}});
  box.querySelectorAll("[data-jgfadd]").forEach(b=>b.onclick=()=>{const i=$("#jgfnew-"+b.dataset.jgfadd),v=(i.value||"").trim();if(!v)return;if(D.fields.includes(v)){toast("이미 있는 항목이에요");return;}D.fields=[...D.fields,v];render();});
  box.querySelectorAll("[data-jgfdel]").forEach(b=>b.onclick=()=>{const k=D.fields[+b.dataset.jgfdel];confirmBox(`'${k}' 항목을 양쪽에서 지울까요? 적어 둔 글도 같이 지워져요.`,"지우기",()=>{D.fields=D.fields.filter(x=>x!==k);["a","b"].forEach(s=>{if(D.prof[s]?.sec)delete D.prof[s].sec[k];});render();});});
  $("#jgsave").onclick=async()=>{const clean=JSON.parse(JSON.stringify(D));
    ["a","b"].forEach(s=>{const q=clean.prof[s]||{};if(q.sec)Object.keys(q.sec).forEach(k=>{if(!clean.fields.includes(k)||!String(q.sec[k]).trim())delete q.sec[k];});if(q.tags&&!q.tags.some(Boolean))delete q.tags;});
    const upd={rel:clean.rel||"",colors:clean.colors||{},fields:clean.fields,prof:clean.prof,banner:clean.banner||null};
    try{await jgPut(f,upd);S.jgEdit=false;S.jgDraft=null;toast("저장했어요");render();}catch(e){writeFail(e);}};}
// ---------- 서브 타임라인 기록 ----------
// 서브 타임라인 기록: 날짜·제목·메모 + 게시물 하나(이미지·텍스트 다) 끼워 넣기 · rec.post={src,id}
function jgRecPost(r,items){return r.post?items.find(p=>p.id===r.post.id&&p.src===r.post.src):null;}
function jgRecBox(f,rec){const w=document.createElement("div");w.className="gedit";const items=galAll(jgSrcs(f),1);
  let pick=rec?.post||null;const today=jgDot(galYmd());
  const tile=p=>{const on=pick&&pick.id===p.id&&pick.src===p.src,t=galT(p),q=galImgs(p)[0];
    return `<button type="button" class="jrt${on?" on":""}${t==="txt"?" tx":""}" data-src="${esc(p.src)}" data-id="${esc(p.id)}">${t==="txt"?`<span class="tt"><b>${esc(p.title||"텍스트")}</b>${esc(String(p.body||"").slice(0,60))}</span>`:`<img src="${esc(q.u||q.o)}" alt="" loading="lazy">${galImgs(p).length>1?`<i>${galImgs(p).length}</i>`:""}`}<span class="cap">${esc(galTitle(p)||GAL_T[t])}<small>${galDate(p.at)}</small></span></button>`;};
  w.innerHTML=`<div class="gebox jgrec"><div class="geh"><b>${rec?"기록 고치기":"기록 더하기"}</b><button type="button" class="x" data-x>✕</button></div>
    <div class="jrf"><label><span>날짜</span><input type="text" id="jrd" value="${esc(rec?.d||today)}" placeholder="2026.06.29"><small>2026.06.29 · 2025.03 처럼</small></label>
      <label class="w"><span>제목</span><input type="text" id="jrt" maxlength="80" value="${esc(rec?.t||"")}" placeholder="그날 있었던 일"></label></div>
    <label class="jrm"><span>메모</span><textarea id="jrn" rows="3" placeholder="(선택)">${esc(rec?.note||"")}</textarea></label>
    <div class="jrh"><b>게시물 끼워 넣기</b><span class="tip">이미지 · 텍스트 중 하나 (다시 누르면 빼기)</span></div>
    <div class="jrgrid">${items.map(tile).join("")||`<span class="tip">아직 게시물이 없어요</span>`}</div>
    <div class="gefoot"><span class="tip" id="jrsel"></span><span style="flex:1"></span><button type="button" class="ghost" data-x>취소</button><button type="button" class="pri" id="jrs">저장</button></div></div>`;
  document.body.appendChild(w);w.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>w.remove());w.onclick=e=>{if(e.target===w)w.remove();};
  const sel=()=>{const p=pick&&items.find(x=>x.id===pick.id&&x.src===pick.src);w.querySelector("#jrsel").textContent=p?`끼워 넣을 게시물: ${galTitle(p)||GAL_T[galT(p)]}`:"";};sel();
  w.querySelectorAll(".jrt").forEach(b=>b.onclick=()=>{const k={src:b.dataset.src,id:b.dataset.id};const same=pick&&pick.id===k.id&&pick.src===k.src;pick=same?null:k;
    w.querySelectorAll(".jrt").forEach(x=>x.classList.toggle("on",!!pick&&x.dataset.id===pick.id&&x.dataset.src===pick.src));
    if(pick){const p=items.find(x=>x.id===k.id&&x.src===k.src),ti=w.querySelector("#jrt");if(p&&!ti.value.trim())ti.value=galTitle(p);}sel();});
  w.querySelector("#jrs").onclick=async()=>{const d=w.querySelector("#jrd").value.trim(),t=w.querySelector("#jrt").value.trim(),note=w.querySelector("#jrn").value.trim();
    if(!jgNorm(d)){toast("날짜를 2026.06.29 처럼 써 주세요");return;}if(!t&&!note&&!pick){toast("제목이나 메모를 써 주세요");return;}
    const cur=(jgDoc(f).recs||[]).slice(),r={id:rec?.id||Date.now().toString(36)+rid4(),d,t,note,...(pick?{post:pick}:{})};
    const recs=rec?cur.map(x=>x.id===rec.id?r:x):[...cur,r];
    try{await jgPut(f,{recs});w.remove();render();}catch(e){toast("저장하지 못했어요"+(e.code==="permission-denied"?" (페어 비밀번호로 다시 열어 주세요)":""));}};}
function bindJgPage(f){
  const e=$("#jgedit");if(e)e.onclick=()=>{S.jgEdit=!S.jgEdit;S.jgDraft=null;if(!S.jgEdit)jgColors(f);render();if(S.jgEdit)document.querySelector(".jgedit")?.scrollIntoView({block:"start",behavior:"smooth"});};
  if(S.jgEdit)bindJgEdit(f);
  document.querySelectorAll("[data-jgtl]").forEach(b=>b.onclick=()=>{S.jgTl=b.dataset.jgtl;render();});
  document.querySelectorAll("[data-jgfold]").forEach(b=>b.onclick=()=>{S.jgAll={...(S.jgAll||{}),[b.dataset.jgfold]:!(S.jgAll||{})[b.dataset.jgfold]};render();});
  // 타임라인 높이를 LOG에 맞춰 접기 (한 줄로 쌓이는 모바일은 560px)
  {const tl=document.querySelector(".jgtl"),lg=document.querySelector(".jglog"),key=S.jgTl||"main";
    if(tl&&lg&&!(S.jgAll||{})[key]){const two=getComputedStyle(tl.parentElement).gridTemplateColumns.split(" ").length>1,cap=two?Math.max(lg.offsetHeight,380):560;
      if(tl.scrollHeight>cap+60){tl.style.maxHeight=cap+"px";tl.classList.add("clamp");const n=tl.querySelectorAll(".tl>li:not(.m)").length;
        const b=document.createElement("button");b.type="button";b.className="jgmore";b.textContent="▾ 타임라인 더 보기";b.onclick=()=>{S.jgAll={...(S.jgAll||{}),[key]:true};render();};tl.appendChild(b);}}}
  const ar=$("#jgaddrec");if(ar)ar.onclick=()=>jgRecBox(f);
  document.querySelectorAll("[data-jgrece]").forEach(b=>b.onclick=()=>jgRecBox(f,(jgDoc(f).recs||[]).find(r=>r.id===b.dataset.jgrece)));
  document.querySelectorAll("[data-jgrecx]").forEach(b=>b.onclick=()=>confirmBox("이 기록을 지울까요?","지우기",async()=>{const recs=(jgDoc(f).recs||[]).filter(r=>r.id!==b.dataset.jgrecx);
    try{await jgPut(f,{recs});render();}catch(err){toast("지우지 못했어요");}}));
  document.querySelectorAll(".jgtl [data-gal]").forEach(x=>x.onclick=ev=>{ev.preventDefault();galOpenAt(x.dataset.gal);});
  if(S.db)bindGal(jgSrcs(f));
  {const u=$("#jgunlock");if(u)u.onsubmit=ev=>{ev.preventDefault();fixUnlock(f,$("#jgpw").value.trim(),$("#jgmsg"));};}
  bindFixAcc(f);
}
// 바탕색 밝기에 맞춰 글자색
function jgTextColor(){const st=document.body.style,bg=(st.getPropertyValue("--jbg")||"#1b1b1c").trim();const m=bg.match(/^#?([0-9a-f]{6})$/i);let lum=0.1;
  if(m){const n=parseInt(m[1],16),r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255;lum=0.2126*r+0.7152*g+0.0722*b;}
  st.setProperty("--jtx",lum>0.55?"#141414":"#f1efe9");st.setProperty("--jdk",lum>0.55?"1":"0");}
