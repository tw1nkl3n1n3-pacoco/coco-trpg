// 갤러리 — 세션 페이지(세션 후기 아래)와 고정탁 페이지
// 사진 목록: scenarios/{id}.gal 또는 fixes/{fx_이름}.gal = [{id,u(미리보기),o(원본),p,op,w,h,fn,cap,by,k,uid,at}]
// 파일: Storage gal/{scid 또는 fx_이름}/{uid}/… — 원본 그대로 + 화면용 미리보기 · 댓글: comments (scid=출처, sid:"gal", bid:사진 id)
S.galCms={};S.galItems=[];S.galOpen=null;S.gEdit=null;S.fixDocs={};
const _galSubs={};let _galKey="";const _fixSubs={};
// 게시물 하나에 사진 여러 장 (imgs) · 예전 한 장짜리는 u/o를 그대로
function galImgs(p){return p&&Array.isArray(p.imgs)&&p.imgs.length?p.imgs:p?[{u:p.u,o:p.o,p:p.p,op:p.op,w:p.w,h:p.h,fn:p.fn,sz:p.sz}]:[];}
function galRaw(o){return Array.isArray(o&&o.gal)?o.gal:[];}
function galCanEdit(p){return S.canAdmin||(!!p&&!!p.uid&&p.uid===myUid());}
function galAllCms(){return Object.values(S.galCms).flat();}
function galCmsOf(it){return (S.galCms[it.src]||[]).filter(c=>c.bid===it.id);}
// 출처마다 댓글 받아오기 (출처가 바뀌면 다시)
function galWatch(srcs){
  const ids=srcs.filter(s=>s.read).map(s=>s.id),key=ids.join("|");
  if(!S.db||S.local||key===_galKey)return;
  galUnwatch();_galKey=key;
  ids.forEach(id=>{_galSubs[id]=S.db.collection("comments").where("scid","==",id).where("sid","==","gal").onSnapshot(snap=>{
    S.galCms[id]=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.created||0)-(b.created||0));
    galCountsRefresh();galLBRefresh();if(S.galRead&&!document.querySelector('.grd input:focus'))galReaderRender();
  },()=>{S.galCms[id]=[];});});
}
function galUnwatch(){Object.keys(_galSubs).forEach(k=>{try{_galSubs[k]();}catch(e){}delete _galSubs[k];});S.galCms={};_galKey="";}
// 고정탁 문서 (fixes/fx_이름)
function fixDocWatch(fk){if(!S.db||S.local||_fixSubs[fk])return;
  _fixSubs[fk]=S.db.doc("fixes/"+fk).onSnapshot(d=>{S.fixDocs[fk]=d.exists?d.data():{};if(S.fix&&fixKey(S.fix)===fk&&!S.sid&&!S.cid&&!document.querySelector(".glb input:focus"))render();},()=>{S.fixDocs[fk]={};});}
// 갤러리 출처 — 세션 페이지: 그 세션 하나 · 고정탁 페이지: 고정탁 자체 + 안에 든 세션들
function galSrcScen(sc){return [{id:sc.id,kind:"sc",label:"",list:galRaw(sc),read:isOpen(sc.id),up:canWriteScen(sc.id)||S.canAdmin}];}
function galSrcFix(f){const fk=fixKey(f);fixDocWatch(fk);
  const scs=S.scens.filter(x=>fixOfScen(x)===f);
  return [{id:fk,kind:"fx",label:"",list:galRaw(S.fixDocs[fk]),read:true,up:S.canAdmin||fixOpen(f)},
    ...scs.map(x=>({id:x.id,kind:"sc",label:x.name,list:galRaw(x),read:isOpen(x.id),up:false}))];}
const galDate=t=>{if(!t)return "";const d=new Date(t);return `${d.getMonth()+1}.${d.getDate()}`;};
const galTime=t=>{if(!t)return "";const d=new Date(t),z=n=>String(n).padStart(2,"0");return `${d.getMonth()+1}.${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`;};
const n2=i=>String(i).padStart(2,"0");
// 게시물 종류: t = "img"(그림, 기본) · "toon"(만화: 여러 장을 위에서 아래로) · "txt"(글)
const GAL_T={img:"그림",toon:"만화",txt:"글"};
function galT(p){return p&&GAL_T[p.t]?p.t:"img";}
function galCardHTML(p,i){const t=galT(p),im=galImgs(p);
  const media=t==="txt"?`<div class="txtc"><b>${esc(p.title||"제목 없음")}</b><p>${esc(String(p.body||"").slice(0,180))}</p></div>`
    :t==="toon"?`<img src="${esc(im[0]?.u||im[0]?.o||"")}" alt="" loading="lazy" decoding="async"><span class="pg">${im.length}장</span>`
    :im.length>1?`<div class="sl">${im.map(q=>`<img src="${esc(q.u||q.o)}" alt="" loading="lazy" decoding="async">`).join("")}</div><span class="pg"><b>1</b>/${im.length}</span><span class="dots">${im.map((_,k)=>`<i class="${k?"":"on"}"></i>`).join("")}</span>`
    :`<img src="${esc(im[0]?.u||im[0]?.o||"")}" alt="${esc(p.cap||"")}" loading="lazy" decoding="async">`;
  return `<figure data-gal="${esc(p.id)}" class="gt-${t}"><div class="im">${media}${t!=="img"?`<span class="gk">${GAL_T[t]}</span>`:""}${p.label?`<span class="from">${esc(p.label)}</span>`:""}</div>
      <figcaption><span class="t">${esc(t==="img"?(p.cap||""):(p.title||""))}</span><span class="c" data-galc="${esc(p.id)}"></span><span class="m">${esc(p.by||"")}${p.by?" · ":""}${galDate(p.at)}</span></figcaption></figure>`;}
function galHTML(srcs,o={}){
  const all=srcs.flatMap(s=>s.list.map(p=>({...p,src:s.id,kind:s.kind,label:s.label}))).sort((a,b)=>o.newest?(b.at||0)-(a.at||0):(a.at||0)-(b.at||0));
  const tab=o.kinds?(S.galTab||"all"):"all",items=tab==="all"?all:all.filter(p=>galT(p)===tab);
  S.galItems=items;const up=srcs.find(s=>s.up);
  if(!all.length&&!up)return "";
  const fileIn=`<input type="file" accept="image/*" multiple hidden id="galfile" data-src="${esc(up?.id||"")}" data-kind="${up?.kind||""}">`;
  const addH=!up?"":o.kinds?`<div class="galadd galkinds">${fileIn}<i>＋</i><span id="galmsg">올리기</span><button type="button" data-gup="img">그림</button><button type="button" data-gup="toon">만화</button><button type="button" data-gup="txt">글</button></div>`
    :`<label class="galadd">${fileIn}<i>＋</i><span id="galmsg">사진 올리기 <small>· 원본 그대로 · 여러 장</small></span></label>`;
  return `<div class="sc-sec galsec"><h4 data-en="${o.en||"GALLERY"}">${o.title||"세션 갤러리"}${all.length?`<span class="gcnt">${n2(all.length)}</span>`:""}</h4>
    ${o.kinds?`<div class="galtabs">${[["all","전체"],["img","그림"],["toon","만화"],["txt","글"]].map(([k,n])=>`<button type="button" data-gtab="${k}" class="${tab===k?"on":""}">${n}${k==="all"?"":` <small>${all.filter(p=>galT(p)===k).length}</small>`}</button>`).join("")}</div>`:""}
    ${addH}<div class="galg">${items.map(galCardHTML).join("")}</div>${!items.length&&all.length?`<div class="tip" style="padding:14px 0">이 종류의 게시물이 아직 없어요</div>`:""}</div>`;
}
function galCountsRefresh(){document.querySelectorAll("[data-galc]").forEach(e=>{const it=S.galItems.find(x=>x.id===e.dataset.galc);const n=it?galCmsOf(it).length:0;e.textContent=n?"◦"+n:"";});}
function bindGal(srcs){
  galWatch(srcs);galCountsRefresh();
  document.querySelectorAll(".galsec [data-gal]").forEach(f=>{const sl=f.querySelector(".sl");
    f.onclick=()=>galOpenAt(f.dataset.gal,sl?Math.round(sl.scrollLeft/Math.max(1,sl.clientWidth)):0);
    if(sl)sl.onscroll=()=>{const k=Math.round(sl.scrollLeft/Math.max(1,sl.clientWidth));f.querySelector(".pg b").textContent=k+1;f.querySelectorAll(".dots i").forEach((d,x)=>d.classList.toggle("on",x===k));};});
  document.querySelectorAll("[data-gtab]").forEach(b=>b.onclick=()=>{S.galTab=b.dataset.gtab;render();});
  const fi=$("#galfile");if(fi){let want="img";
    fi.onchange=async()=>{const fs=[...fi.files];fi.value="";if(!fs.length)return;
      if(want==="toon"){const t=await galAsk("만화 제목","");if(t===null)return;galUpload(fi.dataset.kind,fi.dataset.src,fs,{t:"toon",title:t});}
      else galUpload(fi.dataset.kind,fi.dataset.src,fs);want="img";};
    document.querySelectorAll("[data-gup]").forEach(b=>b.onclick=e=>{e.preventDefault();const k=b.dataset.gup;if(k==="txt"){galTxtNew(fi.dataset.kind,fi.dataset.src);return;}want=k;fi.click();});}
  galLBRefresh();
}
function galWho(kind,src){
  const me=kind==="sc"?meSp(src):(S.scens.filter(x=>fixOfScen(x)===S.fix).map(x=>meSp(x.id)).find(Boolean)||null);
  if(me)return {by:pcSplit(me.name||"").name,k:me.k};
  if(S.canAdmin)return {by:(site().nicks||[])[0]||"주인",k:""};
  return kind==="fx"?{by:"",k:""}:null;}
function galImg(file){return new Promise((ok,no)=>{const i=new Image(),u=URL.createObjectURL(file);i.onload=()=>ok(i);i.onerror=()=>{URL.revokeObjectURL(u);no(new Error("img"));};i.src=u;});}
async function galThumb(img){
  const r=Math.min(1,1400/Math.max(img.width,img.height)),w=Math.round(img.width*r),h=Math.round(img.height*r);
  const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(img,0,0,w,h);
  return await new Promise(ok=>c.toBlob(ok,"image/jpeg",.85));
}
const galRef=kind=>id=>S.db.doc((kind==="fx"?"fixes/":"scenarios/")+id);
async function galAdd(kind,src,item){const ref=galRef(kind)(src),v=firebase.firestore.FieldValue.arrayUnion(item);
  if(kind==="fx")await ref.set({gal:v},{merge:true});else await ref.update({gal:v});}
// 파일 하나 올리기: 원본 그대로 + 화면용 미리보기
async function galPut(src,f,id,onp){
  const dir=`gal/${src}/${myUid()}/`,ext=((f.name||"").match(/\.([a-z0-9]{2,5})$/i)||[,"jpg"])[1].toLowerCase();
  const or=S.storage.ref(dir+id+"."+ext);
  const task=or.put(f,{contentType:f.type,cacheControl:"public,max-age=31536000",customMetadata:{name:(f.name||"").slice(0,200)}});
  if(onp)task.on("state_changed",s=>onp(Math.round(s.bytesTransferred/Math.max(1,s.totalBytes)*100)));
  await task;const o=await or.getDownloadURL();
  let u=o,p="",w=0,h=0;
  try{const img=await galImg(f);w=img.naturalWidth;h=img.naturalHeight;URL.revokeObjectURL(img.src);
    if(Math.max(w,h)>1400||f.size>700*1024){const tb=await galThumb(img);const tr=S.storage.ref(dir+id+"_t.jpg");await tr.put(tb,{contentType:"image/jpeg",cacheControl:"public,max-age=31536000"});u=await tr.getDownloadURL();p=tr.fullPath;}}
  catch(e){} // 브라우저가 못 여는 형식(HEIC 등)은 원본만
  return {u,o,p,op:or.fullPath,w,h,fn:(f.name||"").slice(0,120),sz:f.size};
}
async function galUpload(kind,src,files,opt={}){
  const who=galWho(kind,src);
  if(!who){toast("먼저 내가 누구인지 골라 주세요");const sc=scenById(src);sc&&mePicker(sc);return;}
  if(!S.storage){toast("저장소를 쓸 수 없어요");return;}
  const msg=$("#galmsg"),base="사진 올리기 · 원본 그대로 · 여러 장";let done=0;
  try{if(!S.authUser)await S.auth.signInAnonymously();
    const imgs=[],pid=Date.now().toString(36)+rid4(),fs=files.filter(f=>/^image\//.test(f.type));
    for(const f of fs){
      imgs.push(await galPut(src,f,pid+"_"+imgs.length,pr=>{if(msg)msg.textContent=`올리는 중… ${done+1} / ${fs.length} · ${pr}%`;}));
      done++;
    }
    // 한 번에 고른 사진은 게시물 하나로 (옆으로 넘겨 봐요)
    if(imgs.length)await galAdd(kind,src,{id:pid,imgs,u:imgs[0].u,o:imgs[0].o,w:imgs[0].w,h:imgs[0].h,cap:"",...(opt.t?{t:opt.t,title:(opt.title||"").slice(0,80)}:{}),by:who.by,k:who.k||"",uid:myUid(),at:Date.now()});
    toast(done?(done>1?`사진 ${done}장을 게시물 하나로 올렸어요`:"사진을 올렸어요"):"사진 파일만 올릴 수 있어요");
  }catch(e){const c=e&&e.code||"";toast("사진을 올리지 못했어요"+(/permission|unauthorized/.test(c)?(kind==="fx"?" (고정탁 비밀번호로 다시 열어 주세요)":" (권한이 없어요)"):""));}
  if(msg)msg.textContent=base;
}
// 사진 하나 고치기·지우기 (다른 사람이 동시에 올려도 안 사라지게 트랜잭션으로)
async function galMutate(it,fn){
  const ref=galRef(it.kind)(it.src);
  await S.db.runTransaction(async tx=>{const d=await tx.get(ref);const g=(d.exists&&d.data().gal)||[];tx.update(ref,{gal:fn(g)});});
}
function galIsCover(sc,p,k){return !!(sc&&sc.cover&&sc.cover.id===p.id&&(sc.cover.k||0)===(k||0));}
function galIsFxCover(p,k){const c=S.fix&&(S.fixDocs[fixKey(S.fix)]||{}).cover;return !!(c&&c.id===p.id&&(c.k||0)===(k||0));}
function galCur(){const L=S.galItems;const i=L.findIndex(p=>p.id===S.galOpen);return {L,i,p:L[i]};}
function galCanUp(it){return it.kind==="fx"?(S.canAdmin||(S.fix&&fixOpen(S.fix))):(canWriteScen(it.src)||S.canAdmin);}
const galYmd=t=>{const d=new Date(t||Date.now()),z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;};
function galOpenAt(id,k){const it=S.galItems.find(x=>x.id===id);if(it&&galT(it)!=="img"){galReaderOpen(id);return;}S.galOpen=id;S.galImg=k||0;galLBRefresh(true);}
function galClose(){galEditClose();S.galOpen=null;document.querySelector(".glb")?.remove();document.body.classList.remove("glbon");}
function galLBRefresh(force){
  if(!S.galOpen||S.galRead)return;
  const {L,i,p}=galCur();
  if(!p){if(force||!document.querySelector(".galsec"))galClose();return;}
  let ov=document.querySelector(".glb");
  const ta=ov&&ov.querySelector("#glbnew"),draft=ta?ta.value:"",focused=ta&&document.activeElement===ta;
  if(ov&&!force&&S.gEdit)return;
  if(!ov){ov=document.createElement("div");ov.className="glb";document.body.appendChild(ov);document.body.classList.add("glbon");}
  const cms=galCmsOf(p),can=galCanUp(p),ed=galCanEdit(p),sc=p.kind==="sc"?scenById(p.src):null;
  const IM=galImgs(p);if(!(S.galImg>=0&&S.galImg<IM.length))S.galImg=0;const q=IM[S.galImg];
  ov.innerHTML=`<div class="top"><span class="ac">GALLERY</span><span>${n2(i+1)} / ${n2(L.length)}</span><span class="sp"></span>
      <a href="${esc(q.o||q.u)}" target="_blank" rel="noopener" title="원본 열기">⤓ 원본</a><button type="button" class="x" data-glb="x" title="닫기">✕</button></div>
    <div class="stage"><div class="fr"><img src="${esc(q.u||q.o)}" alt="">${IM.length>1?`<span class="ipg">${S.galImg+1} / ${IM.length}</span>`:""}</div>
      ${L.length>1||IM.length>1?`<button type="button" class="nv l" data-glb="prev">‹</button><button type="button" class="nv r" data-glb="next">›</button>`:""}
      ${IM.length>1?`<div class="idots">${IM.map((_,k)=>`<button type="button" class="${k===S.galImg?"on":""}" data-glbimg="${k}"></button>`).join("")}</div>`:""}</div>
    <div class="side"><div class="meta"><div class="k">#${n2(i+1)}${p.label?` · <a href="#c-${esc(p.src)}">${esc(p.label)}</a>`:""}</div>
      ${p.cap?`<h3>${esc(p.cap)}</h3>`:""}
      <div class="by">${esc(p.by||"")}${p.by?" 올림 · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""}${IM.length>1?` · ${IM.length}장`:""}${q.w?` · ${q.w}×${q.h}`:""}</div>
      ${ed?`<div class="tools"><button type="button" data-glb="edit">✎ 수정</button>${S.canAdmin&&S.fix&&!S.cid&&!S.sid?`<button type="button" data-glb="fxcover" class="${galIsFxCover(p,S.galImg)?"on":""}">${galIsFxCover(p,S.galImg)?"★ 커버":"☆ 커버로"}</button>`:""}${S.canAdmin&&p.kind==="sc"?`<button type="button" data-glb="cover" class="${galIsCover(sc,p,S.galImg)?"on":""}">${galIsCover(sc,p,S.galImg)?"★ 카드 이미지":"☆ 카드 이미지로"}</button>`:""}</div>`:""}</div>
      <div class="ch">COMMENTS · ${cms.length}</div>
      <div class="cl">${cms.map(c=>{const sp=(sc?.sp||[]).find(x=>x.k===c.k);return `<div class="cm"><span class="av" style="--c:${sp?.c||"#888"}">${esc((c.name||"?").slice(0,1))}</span><div><b>${esc(c.name||"")}</b><i>${galTime(c.created)}</i>${S.canAdmin||c.uid===myUid()?`<button type="button" class="cmx" data-glbcx="${esc(c.id)}" title="지우기">✕</button>`:""}<p>${esc(c.text||"")}</p></div></div>`;}).join("")||`<div class="tip" style="padding:10px 0">아직 댓글이 없어요</div>`}</div>
      ${can?`<form class="cin" id="glbf"><input type="text" id="glbnew" maxlength="2000" placeholder="댓글 달기" autocomplete="off"><button class="pri">등록</button></form>`:""}</div>
    <div class="strip">${L.map(x=>`<button type="button" class="${x.id===p.id?"on":""}" data-glbgo="${esc(x.id)}"><img src="${esc(galImgs(x)[0].u||galImgs(x)[0].o)}" alt="" loading="lazy">${galImgs(x).length>1?`<i>${galImgs(x).length}</i>`:""}</button>`).join("")}</div>`;
  const nt=ov.querySelector("#glbnew");if(nt&&draft){nt.value=draft;if(focused)nt.focus();}
  ov.querySelector(".strip .on")?.scrollIntoView({block:"nearest",inline:"center"});
  ov.onclick=async e=>{
    const go=e.target.closest("[data-glbgo]");if(go){galOpenAt(go.dataset.glbgo);return;}
    const di=e.target.closest("[data-glbimg]");if(di){S.galImg=+di.dataset.glbimg;galLBRefresh(true);return;}
    if(e.target.closest(".meta .k a")){galClose();return;}
    const cx=e.target.closest("[data-glbcx]");if(cx){confirmBox("이 댓글을 지울까요?","지우기",async()=>{try{await S.db.doc("comments/"+cx.dataset.glbcx).delete();}catch(err){toast("지우지 못했어요");}});return;}
    const a=e.target.closest("[data-glb]"),act=a?a.dataset.glb:(e.target.classList.contains("stage")?"x":"");
    if(act==="x")galClose();
    else if(act==="prev")galStep(-1);else if(act==="next")galStep(1);
    else if(act==="edit")galEditOpen(p);
    else if(act==="fxcover"){const fk=fixKey(S.fix),on=galIsFxCover(p,S.galImg);const cv=on?null:{id:p.id,k:S.galImg,u:q.u||q.o,y:50};
      S.fixDocs[fk]={...(S.fixDocs[fk]||{}),cover:cv||undefined};
      try{await S.db.doc("fixes/"+fk).set({cover:cv?cv:firebase.firestore.FieldValue.delete()},{merge:true});toast(on?"커버를 뺐어요":"페이지 커버로 정했어요 · 위치는 커버의 ↕ 위치로 고를 수 있어요",3200);}catch(err){toast("저장하지 못했어요");}
      render();galLBRefresh(true);}
    else if(act==="cover"&&sc){const on=galIsCover(sc,p,S.galImg);
      await mutateScen(sc.id,L=>{if(on)delete L.cover;else L.cover={id:p.id,k:S.galImg,u:q.u||q.o,w:q.w||0,h:q.h||0,y:50};});
      toast(on?"카드 이미지를 공유 이미지로 되돌렸어요":"카드 이미지로 정했어요 · 보여줄 위치는 시나리오 수정에서 고를 수 있어요",3200);render();galLBRefresh(true);}
  };
  {const stg=ov.querySelector(".stage");let tx=null;stg.ontouchstart=e=>{tx=e.touches[0].clientX;};stg.ontouchend=e=>{if(tx==null)return;const dx=e.changedTouches[0].clientX-tx;tx=null;if(Math.abs(dx)>45)galStep(dx<0?1:-1);};}
  const f=ov.querySelector("#glbf");if(f)f.onsubmit=async e=>{e.preventDefault();const t=ov.querySelector("#glbnew"),text=t.value.trim();if(!text)return;
    const who=galWho(p.kind,p.src);
    if(!who||!who.by){toast("먼저 내가 누구인지 골라 주세요");const s2=sc||S.scens.find(x=>fixOfScen(x)===S.fix);s2&&mePicker(s2);return;}
    t.value="";
    try{if(!S.authUser)await S.auth.signInAnonymously();
      await S.db.collection("comments").add({scid:p.src,sid:"gal",bid:p.id,k:who.k,name:who.by,uid:myUid(),text:text.slice(0,2000),created:Date.now(),updated:Date.now()});}
    catch(err){t.value=text;toast("댓글을 달지 못했어요"+(err.code==="permission-denied"?" (권한이 없어요)":""));}};
}
// 카드 이미지로 쓰던 사진이 바뀌거나 빠지면 카드도 맞춰요
async function galFixCover(p,imgs){if(p.kind!=="sc")return;const sc=scenById(p.src);const c=sc&&sc.cover;if(!c||c.id!==p.id)return;
  const k=Math.min(c.k||0,imgs.length-1),q=imgs[k];await mutateScen(sc.id,L=>{if(!q){delete L.cover;return;}L.cover={...L.cover,k,u:q.u||q.o,w:q.w||0,h:q.h||0};});}
// ---------- 게시물 수정창 ----------
// 사진 순서·바꾸기·더하기·빼기, 한 줄 설명 · 주인은 글쓴이·작성일자도
function galEditOpen(p){S.gEdit={pid:p.id,imgs:galImgs(p).map(q=>({...q})),cap:galT(p)==="toon"?(p.title||""):(p.cap||""),by:p.by||"",at:p.at||Date.now(),busy:false};galEditRender();}
function galEditClose(){if(S.galRead)S.galOpen=null;if(S.gEdit)S.gEdit.imgs.forEach(q=>q.file&&URL.revokeObjectURL(q.prev));S.gEdit=null;document.querySelector(".gedit")?.remove();}
function galEditRender(){const E=S.gEdit;if(!E)return;const {p}=galCur();if(!p||p.id!==E.pid){galEditClose();return;}
  let w=document.querySelector(".gedit");if(!w){w=document.createElement("div");w.className="gedit";document.body.appendChild(w);}
  const sc=p.kind==="sc"?scenById(p.src):S.scens.find(x=>fixOfScen(x)===S.fix);
  const ppl=[...new Set((p.kind==="sc"?[sc]:S.scens.filter(x=>fixOfScen(x)===S.fix)).flatMap(x=>(x?.sp||[]).filter(q=>!isAnon(q)&&!/&/.test(q.name||"")).map(q=>pcSplit(q.name).name)))];
  w.innerHTML=`<div class="gebox"><div class="geh"><b>게시물 수정</b><button type="button" class="x" data-ge="x">✕</button></div>
    <div class="gelab">사진 <span class="tip">· ← → 로 순서 · 🔄 바꾸기 · ✕ 빼기</span></div>
    <div class="geimgs">${E.imgs.map((q,k)=>`<div class="gei"><img src="${esc(q.prev||q.u||q.o)}" alt=""><span class="n">${k+1}</span>${q.file?`<span class="new">새 사진</span>`:""}
      <div class="geb"><button type="button" data-gemv="${k}:-1"${k?"":" disabled"}>←</button><button type="button" data-gerep="${k}" title="바꾸기">🔄</button><button type="button" data-gedel="${k}"${E.imgs.length>1?"":" disabled"} title="빼기">✕</button><button type="button" data-gemv="${k}:1"${k<E.imgs.length-1?"":" disabled"}>→</button></div></div>`).join("")}
      <label class="geadd"><input type="file" accept="image/*" multiple hidden id="geaddf">＋<small>더하기</small></label></div>
    <input type="file" accept="image/*" hidden id="gerepf">
    <div class="gelab">${galT(p)==="toon"?"제목":"한 줄 설명"}</div><input type="text" id="gecap" maxlength="80" value="${esc(E.cap)}" placeholder="(선택)">
    ${S.canAdmin?`<div class="gerow"><div><div class="gelab">글쓴이 <span class="tip">· 주인만</span></div><select id="geby">${[...new Set([...(E.by&&!ppl.includes(E.by)?[E.by]:[]),...ppl])].map(n=>`<option value="${esc(n)}"${n===E.by?" selected":""}>${esc(n)}</option>`).join("")}${E.by?"":`<option value="" selected>(없음)</option>`}</select></div>
      <div><div class="gelab">작성일자 <span class="tip">· 주인만</span></div><input type="date" id="geat" value="${galYmd(E.at)}"></div></div>`:""}
    <div class="tip" id="gemsg"></div>
    <div class="gefoot"><button type="button" class="ghost danger" data-ge="del">게시물 지우기</button><span style="flex:1"></span><button type="button" class="ghost" data-ge="x">취소</button><button type="button" class="pri" data-ge="ok">저장</button></div></div>`;
  const pull=()=>{const c=w.querySelector("#gecap");if(c)E.cap=c.value;const b=w.querySelector("#geby");if(b)E.by=b.value;const t=w.querySelector("#geat");if(t&&/^\d{4}-\d\d-\d\d$/.test(t.value)){const [y,m,d]=t.value.split("-").map(Number),o=new Date(E.at);E.at=new Date(y,m-1,d,o.getHours(),o.getMinutes(),o.getSeconds()).getTime();}};
  const fileObj=f=>({file:f,prev:URL.createObjectURL(f)});
  let repAt=-1;const rf=w.querySelector("#gerepf");
  rf.onchange=()=>{const f=[...rf.files].find(x=>/^image\//.test(x.type));rf.value="";if(!f||repAt<0)return;pull();const old=E.imgs[repAt];if(old.file)URL.revokeObjectURL(old.prev);E.imgs[repAt]=fileObj(f);galEditRender();};
  w.querySelector("#geaddf").onchange=e=>{const fs=[...e.target.files].filter(x=>/^image\//.test(x.type));if(!fs.length)return;pull();E.imgs.push(...fs.map(fileObj));galEditRender();};
  w.onclick=async e=>{if(E.busy)return;
    if(e.target===w){pull();galEditClose();return;}
    const mv=e.target.closest("[data-gemv]");if(mv){pull();const [k,d]=mv.dataset.gemv.split(":").map(Number),j=k+d;[E.imgs[k],E.imgs[j]]=[E.imgs[j],E.imgs[k]];galEditRender();return;}
    const rp=e.target.closest("[data-gerep]");if(rp){repAt=+rp.dataset.gerep;rf.click();return;}
    const dl=e.target.closest("[data-gedel]");if(dl){pull();const k=+dl.dataset.gedel;const q=E.imgs[k];if(q.file)URL.revokeObjectURL(q.prev);E.imgs.splice(k,1);galEditRender();return;}
    const a=e.target.closest("[data-ge]");if(!a)return;
    if(a.dataset.ge==="x"){galEditClose();return;}
    if(a.dataset.ge==="del"){const IM=galImgs(p),cms=galCmsOf(p);confirmBox(IM.length>1?`이 게시물(사진 ${IM.length}장)을 지울까요? 원본 파일과 댓글도 같이 사라져요.`:"이 사진을 지울까요? 원본 파일과 사진에 달린 댓글도 같이 사라져요.","지우기",async()=>{
      try{await galMutate(p,g=>g.filter(x=>x.id!==p.id));const sc2=p.kind==="sc"?scenById(p.src):null;
        if(sc2&&sc2.cover?.id===p.id)await mutateScen(sc2.id,L=>{delete L.cover;});
        IM.flatMap(x=>[x.p,x.op]).filter(Boolean).forEach(x=>S.storage?.ref(x).delete().catch(()=>{}));
        cms.filter(c=>S.canAdmin||c.uid===myUid()).forEach(c=>S.db.doc("comments/"+c.id).delete().catch(()=>{}));
        galEditClose();toast("지웠어요");}catch(err){toast("지우지 못했어요");}});return;}
    if(a.dataset.ge==="ok"){pull();if(!E.imgs.length){toast("사진이 한 장은 있어야 해요");return;}
      E.busy=true;const m=w.querySelector("#gemsg");w.querySelectorAll("button,input").forEach(x=>x.disabled=true);
      try{if(!S.authUser)await S.auth.signInAnonymously();
        const news=E.imgs.filter(q=>q.file).length;let n=0;const out=[];
        for(const q of E.imgs){if(!q.file){out.push(q);continue;}
          out.push(await galPut(p.src,q.file,p.id+"_"+Date.now().toString(36)+rid4(),pr=>{if(m)m.textContent=`올리는 중… ${n+1} / ${news} · ${pr}%`;}));n++;}
        const before=galImgs(p),keep=new Set(out.map(q=>q.op||q.o));
        await galMutate(p,g=>g.map(x=>{if(x.id!==p.id)return x;const y=galSetImgs(x,out);if(galT(x)==="toon")y.title=E.cap.trim().slice(0,80);else y.cap=E.cap.trim().slice(0,80);if(S.canAdmin){y.by=E.by.trim().slice(0,40);y.at=E.at;const sp=p.kind==="sc"?(scenById(p.src)?.sp||[]).find(q=>pcSplit(q.name||"").name===y.by):null;y.k=sp?sp.k:"";}return y;}));
        before.filter(q=>!keep.has(q.op||q.o)).flatMap(q=>[q.p,q.op]).filter(Boolean).forEach(x=>S.storage?.ref(x).delete().catch(()=>{}));
        await galFixCover(p,out);
        galEditClose();S.galImg=Math.min(S.galImg||0,out.length-1);toast("저장했어요");if(S.galRead){S.galOpen=null;}else galLBRefresh(true);
      }catch(err){E.busy=false;toast("저장하지 못했어요");galEditRender();}}};
  const cap=w.querySelector("#gecap");if(cap)cap.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();w.querySelector('[data-ge="ok"]').click();}};
}
function galSetImgs(x,imgs){const f=imgs[0]||{};return {...x,imgs,u:f.u,o:f.o,w:f.w||0,h:f.h||0,p:f.p||"",op:f.op||""};}
function galStep(d){const {L,i,p}=galCur();if(!L.length)return;const n=galImgs(p).length,k=(S.galImg||0)+d;
  if(k>=0&&k<n){S.galImg=k;galLBRefresh(true);return;}
  const np=L[(i+d+L.length)%L.length];galOpenAt(np.id,d<0?galImgs(np).length-1:0);}
document.addEventListener("keydown",e=>{if(S.gEdit){if(e.key==="Escape")galEditClose();return;}if(!S.galOpen||e.target.matches("input,textarea"))return;
  if(e.key==="Escape")galClose();else if(e.key==="ArrowLeft")galStep(-1);else if(e.key==="ArrowRight")galStep(1);});
window.addEventListener("hashchange",()=>{if(S.galOpen)galClose();galUnwatch();});

// ---------- 짧은 입력창 ----------
function galAsk(label,val){return new Promise(ok=>{const w=document.createElement("div");w.className="gedit";
  w.innerHTML=`<div class="gebox" style="width:min(420px,100%)"><div class="geh"><b>${esc(label)}</b></div><input type="text" id="gaskv" maxlength="80" value="${esc(val||"")}" style="width:100%"><div class="gefoot"><span style="flex:1"></span><button type="button" class="ghost" id="gaskx">취소</button><button type="button" class="pri" id="gasko">확인</button></div></div>`;
  document.body.appendChild(w);const i=w.querySelector("#gaskv");i.focus();
  const end=v=>{w.remove();ok(v);};w.querySelector("#gaskx").onclick=()=>end(null);w.querySelector("#gasko").onclick=()=>end(i.value.trim());
  i.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing)end(i.value.trim());if(e.key==="Escape")end(null);};});}
// ---------- 글 쓰기 ----------
function galTxtNew(kind,src){galTxtBox({title:"",body:""},async(v)=>{const who=galWho(kind,src)||{by:"",k:""};
  try{if(!S.authUser)await S.auth.signInAnonymously();
    await galAdd(kind,src,{id:Date.now().toString(36)+rid4(),t:"txt",title:v.title,body:v.body,cap:"",by:who.by,k:who.k||"",uid:myUid(),at:Date.now()});toast("글을 올렸어요");return true;}
  catch(e){toast("올리지 못했어요");return false;}});}
function galTxtBox(v,onSave){const w=document.createElement("div");w.className="gedit";
  w.innerHTML=`<div class="gebox gtxt"><div class="geh"><b>글</b><button type="button" class="x" data-x>✕</button></div>
    <div class="gelab">제목</div><input type="text" id="gtt" maxlength="80" value="${esc(v.title||"")}">
    <div class="gelab">본문 <span class="tip">· 문단은 빈 줄로 · *** 은 장면 구분선</span></div><textarea id="gtb" rows="16">${esc(v.body||"")}</textarea>
    <div class="gefoot"><span class="tip" id="gtn"></span><span style="flex:1"></span><button type="button" class="ghost" data-x>취소</button><button type="button" class="pri" id="gts">저장</button></div></div>`;
  document.body.appendChild(w);const tb=w.querySelector("#gtb"),n=w.querySelector("#gtn");const cnt=()=>n.textContent=`${tb.value.replace(/\s/g,"").length.toLocaleString()}자`;cnt();tb.oninput=cnt;
  w.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>w.remove());
  w.querySelector("#gts").onclick=async()=>{const t=w.querySelector("#gtt").value.trim(),b=tb.value;if(!t&&!b.trim()){toast("제목이나 본문을 써 주세요");return;}
    if(await onSave({title:t.slice(0,80),body:b.slice(0,200000)})!==false)w.remove();};}
// ---------- 만화·글 보기 ----------
function galReaderOpen(id){S.galRead=id;galReaderRender();}
function galReaderClose(){S.galRead=null;document.querySelector(".grd")?.remove();document.body.classList.remove("glbon");}
function galTxtHTML(b){return String(b||"").replace(/\r/g,"").split(/\n\s*\n+/).map(par=>/^\s*(\*\s*){3,}\s*$/.test(par)?`<div class="sep">◆ ◆ ◆</div>`:`<p>${esc(qfix(par.trim())).replace(/\n/g,"<br>")}</p>`).join("");}
function galReaderRender(){const id=S.galRead;if(!id)return;const L=S.galItems,i=L.findIndex(x=>x.id===id),p=L[i];if(!p){galReaderClose();return;}
  let w=document.querySelector(".grd");const keep=w&&w.dataset.id===id?w.scrollTop:0,ta=w&&w.querySelector("#grdnew"),draft=ta?ta.value:"";
  if(!w){w=document.createElement("div");w.className="grd";document.body.appendChild(w);document.body.classList.add("glbon");}
  w.dataset.id=id;const t=galT(p),im=galImgs(p),cms=galCmsOf(p),can=galCanUp(p),ed=galCanEdit(p);
  const len=String(p.body||"").replace(/\s/g,"").length,fs=S.grdFs||17;
  const prev=L[i-1],next=L[i+1];
  w.innerHTML=`<div class="grbar"><span class="k">${GAL_T[t]}</span><b>${esc(p.title||"제목 없음")}</b><small>${esc(p.by||"")}${p.by?" · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""} · ${t==="txt"?len.toLocaleString()+"자":im.length+"장"}</small><span class="sp"></span>
    ${t==="txt"?`<button type="button" data-gr="fs-">가 −</button><button type="button" data-gr="fs+">가 +</button>`:""}${ed?`<button type="button" data-gr="ed">✎ 수정</button>`:""}<button type="button" class="x" data-gr="x">✕</button></div>
    <div class="grprog"><i></i></div>
    ${t==="txt"?`<article class="grnov" style="--fs:${fs}px"><div class="tk">NOVEL</div><h1>${esc(p.title||"제목 없음")}</h1><div class="mt">${esc(p.by||"")} · ${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""} · ${len.toLocaleString()}자 · 약 ${Math.max(1,Math.round(len/500))}분</div>${galTxtHTML(p.body)}</article>`
      :`<div class="grtoon">${im.map(q=>`<img src="${esc(q.o||q.u)}" alt="" loading="lazy" decoding="async">`).join("")}</div><div class="grside"><b>1</b><i></i>${im.length}</div>`}
    <div class="grft"><div class="grnav">${prev?`<button type="button" data-grgo="${esc(prev.id)}"><small>← 이전 게시물</small>${esc(prev.title||prev.cap||GAL_T[galT(prev)])}</button>`:"<span></span>"}${next?`<button type="button" data-grgo="${esc(next.id)}"><small>다음 게시물 →</small>${esc(next.title||next.cap||GAL_T[galT(next)])}</button>`:"<span></span>"}</div>
      <div class="grcm"><h5>COMMENTS · ${cms.length}</h5>${cms.map(c=>`<div class="r"><b>${esc(c.name||"")}</b>${esc(c.text||"")}<i>${galTime(c.created)}</i>${S.canAdmin||c.uid===myUid()?`<button type="button" data-grcx="${esc(c.id)}">✕</button>`:""}</div>`).join("")}
      ${can?`<form class="cin" id="grdf"><input type="text" id="grdnew" maxlength="2000" placeholder="댓글 달기" autocomplete="off"><button class="pri">등록</button></form>`:""}</div></div>`;
  if(draft)w.querySelector("#grdnew").value=draft;w.scrollTop=keep;
  const bar=w.querySelector(".grprog i");const sd=w.querySelector(".grside b"),tims=[...w.querySelectorAll(".grtoon img")];
  const pr=()=>{const m=w.scrollHeight-w.clientHeight;bar.style.width=(m>0?w.scrollTop/m*100:100)+"%";if(sd){const mid=w.clientHeight/2;let n=1;tims.forEach((x,j)=>{if(x.getBoundingClientRect().top<mid)n=j+1;});sd.textContent=n;}};w.onscroll=pr;pr();
  w.onclick=async e=>{const go=e.target.closest("[data-grgo]");if(go){S.galRead=go.dataset.grgo;w.scrollTop=0;galReaderRender();return;}
    const cx=e.target.closest("[data-grcx]");if(cx){confirmBox("이 댓글을 지울까요?","지우기",async()=>{try{await S.db.doc("comments/"+cx.dataset.grcx).delete();}catch(err){toast("지우지 못했어요");}});return;}
    const a=e.target.closest("[data-gr]");if(!a)return;const k=a.dataset.gr;
    if(k==="x")galReaderClose();else if(k==="fs-"||k==="fs+"){S.grdFs=Math.max(13,Math.min(24,fs+(k==="fs+"?1:-1)));galReaderRender();}
    else if(k==="ed"){if(t==="txt")galTxtBox(p,async v=>{try{await galMutate(p,g=>g.map(x=>x.id===p.id?{...x,title:v.title,body:v.body}:x));toast("저장했어요");return true;}catch(err){toast("저장하지 못했어요");return false;}});
      else{S.galOpen=p.id;S.galImg=0;galEditOpen(p);}}};
  const f=w.querySelector("#grdf");if(f)f.onsubmit=async e=>{e.preventDefault();const tt=w.querySelector("#grdnew"),text=tt.value.trim();if(!text)return;const who=galWho(p.kind,p.src);
    if(!who||!who.by){toast("먼저 내가 누구인지 골라 주세요");return;}tt.value="";
    try{if(!S.authUser)await S.auth.signInAnonymously();await S.db.collection("comments").add({scid:p.src,sid:"gal",bid:p.id,k:who.k,name:who.by,uid:myUid(),text:text.slice(0,2000),created:Date.now(),updated:Date.now()});}
    catch(err){tt.value=text;toast("댓글을 달지 못했어요");}};}
document.addEventListener("keydown",e=>{if(S.galRead&&e.key==="Escape"&&!document.querySelector(".gedit"))galReaderClose();});
window.addEventListener("hashchange",()=>{if(S.galRead)galReaderClose();});
