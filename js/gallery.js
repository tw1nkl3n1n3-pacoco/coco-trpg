// 갤러리 — 세션 페이지(세션 후기 아래)와 고정탁 페이지
// 게시물: posts/{id} = {src(시나리오 id · 고정탁 키), kind:"sc"|"fx", t, title, body, imgs:[{u(미리보기),o(원본),p,op,w,h}], cap, by, k, uid, at, nolink}
// (예전에는 scenarios/{id}.gal · fixes/{fk}.gal 배열 안 — 주인 브라우저가 posts로 옮겨요)
// 파일: Storage gal/{scid 또는 fx_이름}/{uid}/… — 원본 그대로 + 화면용 미리보기 · 댓글: comments (scid=출처, sid:"gal", bid:사진 id)
S.galCms={};S.galItems=[];S.galOpen=null;S.gEdit=null;S.fixDocs={};
const _galSubs={};let _galKey="";const _fixSubs={};
// 게시물 하나에 사진 여러 장 (imgs) · 예전 한 장짜리는 u/o를 그대로
function galImgs(p){return p&&Array.isArray(p.imgs)&&p.imgs.length?p.imgs:p?[{u:p.u,o:p.o,p:p.p,op:p.op,w:p.w,h:p.h,fn:p.fn,sz:p.sz}]:[];}
// 한 출처(시나리오 id · 고정탁 키)의 게시물: posts 컬렉션 + 아직 안 옮긴 예전 gal
function galRaw(o,id){id=id||(o&&o.id)||"";const P=(S.posts||[]).filter(p=>p.src===id),ids=new Set(P.map(p=>p.id));
  const old=Array.isArray(o&&o.gal)?o.gal.filter(p=>!ids.has(p.id)):[];return old.length?[...old,...P]:P;}
const galClean=p=>{const y={...p};["_pd","label"].forEach(k=>delete y[k]);return y;};
function galCanEdit(p){return S.canAdmin||(!!p&&!!p.uid&&p.uid===myUid());}
function galCmsOf(it){return (S.galCms[it.src]||[]).filter(c=>c.bid===it.id);}
// 출처마다 댓글 받아오기 (출처가 바뀌면 다시)
function galWatch(srcs){
  const ids=srcs.filter(s=>s.read).map(s=>s.id),key=ids.join("|");
  if(!S.db||S.local||key===_galKey)return;
  galUnwatch();_galKey=key;
  ids.forEach(id=>{_galSubs[id]=S.db.collection("comments").where("scid","==",id).where("sid","==","gal").onSnapshot(snap=>{
    S.galCms[id]=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.created||0)-(b.created||0));
    galCountsRefresh();galLBRefresh();
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
  return [{id:fk,kind:"fx",label:"",list:galRaw(S.fixDocs[fk],fk),read:true,up:S.canAdmin||fixOpen(f)},
    ...scs.map(x=>({id:x.id,kind:"sc",label:x.name,list:galRaw(x),read:isOpen(x.id),up:false}))];}
const galDate=t=>{if(!t)return "";const d=new Date(t);return `${d.getMonth()+1}.${d.getDate()}`;};
const galTime=t=>{if(!t)return "";const d=new Date(t),z=n=>String(n).padStart(2,"0");return `${d.getMonth()+1}.${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`;};
const n2=i=>String(i).padStart(2,"0");
// 게시물 종류: t = "img"(이미지, 기본 · 그림·만화·여러 장) · "txt"(텍스트) · 예전 "toon"은 이미지로 · nolink: 외부 링크 막기
const GAL_T={img:"이미지",txt:"텍스트"};
function galT(p){return p&&p.t==="txt"?"txt":"img";}
const galTitle=p=>galT(p)==="txt"?(p.title||""):(p.cap||p.title||"");
function galLink(p){const c=p.kind==="fx"?fixCode(decodeURIComponent(String(p.src).slice(3))):"";return `${location.origin+location.pathname}#p-${c||p.src}~${p.id}`;}
function galCardHTML(p){const t=galT(p),im=galImgs(p),lk=!!p.nolink;
  const media=t==="txt"?`<div class="txtc"><b>${esc(p.title||"제목 없음")}</b><p>${esc(String(p.body||"").slice(0,180))}</p></div>`
    :im.length>1?`<div class="sl">${im.map(q=>`<img src="${esc(q.u||q.o)}" alt="" loading="lazy" decoding="async">`).join("")}</div><span class="pg"><b>1</b>/${im.length}</span><span class="dots">${im.map((_,k)=>`<i class="${k?"":"on"}"></i>`).join("")}</span>`
    :`<img src="${esc(im[0]?.u||im[0]?.o||"")}" alt="${esc(p.cap||"")}" loading="lazy" decoding="async">`;
  return `<figure data-gal="${esc(p.id)}" class="gt-${t}${lk?" lock":""}"><div class="im">${media}${t==="txt"?`<span class="gk">텍스트</span>`:""}${lk?`<div class="lk"><b>LOCKED</b><span>링크 공유 안 함</span></div>`:`<button type="button" class="glnk" data-glink="${esc(p.id)}" title="이 게시물 링크 복사">🔗</button>`}${p.label?`<span class="from">${esc(p.label)}</span>`:""}</div>
      <figcaption><span class="t">${esc(galTitle(p))}</span><span class="c" data-galc="${esc(p.id)}"></span><span class="m">${esc(p.by||"")}${p.by?" · ":""}${galDate(p.at)}</span></figcaption></figure>`;}
function galAll(srcs,newest){return srcs.flatMap(s=>s.list.map(p=>({...p,src:s.id,kind:s.kind,label:s.label}))).sort((a,b)=>newest?(b.at||0)-(a.at||0):(a.at||0)-(b.at||0));}
function galHTML(srcs,o={}){
  const all=galAll(srcs,o.newest);S.galItems=all;const up=srcs.find(s=>s.up);
  if(!all.length&&!up)return "";
  const addH=!up?"":`<div class="galadd"><input type="file" accept="image/*" multiple hidden id="galfile" data-src="${esc(up.id)}" data-kind="${up.kind}">
      <button type="button" class="galup" id="galup"><i>＋</i><span id="galmsg">올리기</span></button>
      <div class="galmenu" id="galmenu" hidden><button type="button" data-gup="img"><b>이미지</b>그림 · 만화 · 여러 장<small>원본 그대로</small></button><button type="button" data-gup="txt"><b>텍스트</b>소설 · 짧은 글</button></div></div>`;
  return `<div class="sc-sec galsec"><h4 data-en="${o.en||"GALLERY"}">${o.title||"세션 갤러리"}${all.length?`<span class="gcnt">${n2(all.length)}</span>`:""}</h4>
    ${addH}<div class="galg">${all.map(galCardHTML).join("")}</div></div>`;
}
function galCountsRefresh(){document.querySelectorAll("[data-galc]").forEach(e=>{const it=S.galItems.find(x=>x.id===e.dataset.galc);const n=it?galCmsOf(it).length:0;e.textContent=n?"◦"+n:"";});}
function bindGal(srcs){
  galWatch(srcs);galCountsRefresh();
  document.querySelectorAll(".galsec [data-gal]").forEach(f=>{const sl=f.querySelector(".sl");
    f.onclick=()=>galOpenAt(f.dataset.gal,sl?Math.round(sl.scrollLeft/Math.max(1,sl.clientWidth)):0);
    if(sl)sl.onscroll=()=>{const k=Math.round(sl.scrollLeft/Math.max(1,sl.clientWidth));f.querySelector(".pg b").textContent=k+1;f.querySelectorAll(".dots i").forEach((d,x)=>d.classList.toggle("on",x===k));};});
  document.querySelectorAll(".galsec [data-glink]").forEach(b=>b.onclick=e=>{e.stopPropagation();const it=S.galItems.find(x=>x.id===b.dataset.glink);if(it)copyText(galLink(it),"게시물 링크를 복사했어요");});
  const fi=$("#galfile"),ub=$("#galup"),mn=$("#galmenu");
  if(fi&&ub){ub.onclick=e=>{e.stopPropagation();mn.hidden=!mn.hidden;};
    fi.onchange=()=>{const fs=[...fi.files];fi.value="";if(fs.length)galUpload(fi.dataset.kind,fi.dataset.src,fs);};
    mn.querySelectorAll("[data-gup]").forEach(b=>b.onclick=e=>{e.stopPropagation();mn.hidden=true;if(b.dataset.gup==="txt")galTxtNew(fi.dataset.kind,fi.dataset.src);else fi.click();});}
  // 외부 링크에서 '페이지로' 눌러 들어왔으면 그 게시물 열기
  try{const g=JSON.parse(sessionStorage.getItem("galGo")||"null");if(g&&Date.now()-g.at<6e5){const it=S.galItems.find(x=>x.id===g.id&&x.src===g.src);if(it&&(galSrcRead(srcs,it.src))){sessionStorage.removeItem("galGo");setTimeout(()=>galOpenAt(it.id),50);}}}catch(e){}
  galLBRefresh();
}
function galSrcRead(srcs,id){const x=srcs.find(s=>s.id===id);return !!(x&&x.read);}
document.addEventListener("click",e=>{const m=document.getElementById("galmenu");if(m&&!m.hidden&&!e.target.closest(".galadd"))m.hidden=true;});
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
async function galAdd(kind,src,item){
  if(S.postsOn){await S.db.doc("posts/"+item.id).set({...item,src,kind});return;}
  const ref=galRef(kind)(src),v=firebase.firestore.FieldValue.arrayUnion(item);
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
async function galUpload(kind,src,files){
  const who=galWho(kind,src);
  if(!who){toast("먼저 내가 누구인지 골라 주세요");const sc=scenById(src);sc&&mePicker(sc);return;}
  if(!S.storage){toast("저장소를 쓸 수 없어요");return;}
  const msg=$("#galmsg"),base="올리기";let done=0;
  try{if(!S.authUser)await S.auth.signInAnonymously();
    const imgs=[],pid=Date.now().toString(36)+rid4(),fs=files.filter(f=>/^image\//.test(f.type));
    for(const f of fs){
      imgs.push(await galPut(src,f,pid+"_"+imgs.length,pr=>{if(msg)msg.textContent=`올리는 중… ${done+1} / ${fs.length} · ${pr}%`;}));
      done++;
    }
    // 한 번에 고른 사진은 게시물 하나로 (옆으로 넘겨 봐요)
    if(imgs.length)await galAdd(kind,src,{id:pid,imgs,u:imgs[0].u,o:imgs[0].o,w:imgs[0].w,h:imgs[0].h,cap:"",by:who.by,k:who.k||"",uid:myUid(),at:Date.now()});
    toast(done?(done>1?`사진 ${done}장을 게시물 하나로 올렸어요`:"사진을 올렸어요"):"사진 파일만 올릴 수 있어요");
  }catch(e){const c=e&&e.code||"";toast("사진을 올리지 못했어요"+(/permission|unauthorized/.test(c)?(kind==="fx"?" (고정탁 비밀번호로 다시 열어 주세요)":" (권한이 없어요)"):""));}
  if(msg)msg.textContent=base;
}
// 사진 하나 고치기·지우기 (다른 사람이 동시에 올려도 안 사라지게 트랜잭션으로)
async function galMutate(it,fn){
  if((S.posts||[]).some(p=>p.id===it.id&&p.src===it.src)){const pr=S.db.doc("posts/"+it.id);
    await S.db.runTransaction(async tx=>{const d=await tx.get(pr);if(!d.exists)return;const cur={...d.data(),id:it.id},r=fn([cur]);
      if(!r.length)tx.delete(pr);else{const y={...r[0],src:cur.src,kind:cur.kind};delete y.id;tx.set(pr,y);}});return;}
  const ref=galRef(it.kind)(it.src);
  await S.db.runTransaction(async tx=>{const d=await tx.get(ref);const g=(d.exists&&d.data().gal)||[];tx.update(ref,{gal:fn(g)});});
}
function galIsCover(sc,p,k){return !!(sc&&sc.cover&&sc.cover.id===p.id&&(sc.cover.k||0)===(k||0));}
function galIsFxCover(p,k){const q=galImgs(p)[k||0]||{},bn=S.fix&&(S.fixDocs[fixKey(S.fix)]||{}).banner;return !!(bn&&q&&(bn.o===(q.o||q.u)||bn.u===(q.o||q.u)));}
function galCur(){const L=S.galItems;const i=L.findIndex(p=>p.id===S.galOpen);return {L,i,p:L[i]};}
function galCanUp(it){return it.kind==="fx"?(S.canAdmin||(S.fix&&fixOpen(S.fix))):(canWriteScen(it.src)||S.canAdmin);}
const galYmd=t=>{const d=new Date(t||Date.now()),z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;};
function galOpenAt(id,k){S.galOpen=id;S.galImg=k||0;S.galScrollTo=k||0;galLBRefresh(true);}
function galClose(){galEditClose();S.galOpen=null;document.querySelector(".glb")?.remove();document.body.classList.remove("glbon");}
function galLBRefresh(force){
  if(!S.galOpen)return;
  const {L,i,p}=galCur();
  if(!p){if(force||!document.querySelector(".galsec"))galClose();return;}
  let ov=document.querySelector(".glb");
  const ta=ov&&ov.querySelector("#glbnew"),draft=ta?ta.value:"",focused=ta&&document.activeElement===ta;
  if(ov&&!force&&S.gEdit)return;
  const same=ov&&ov.dataset.id===p.id,keep=same?ov.querySelector(".stage").scrollTop:0;
  if(!ov){ov=document.createElement("div");ov.className="glb";document.body.appendChild(ov);document.body.classList.add("glbon");}
  if(!same)ov.scrollTop=0;ov.dataset.id=p.id;
  const t=galT(p),cms=galCmsOf(p),can=galCanUp(p),ed=galCanEdit(p),sc=p.kind==="sc"?scenById(p.src):null;
  const IM=t==="txt"?[]:galImgs(p);if(!(S.galImg>=0&&S.galImg<IM.length))S.galImg=0;const q=IM[S.galImg]||{};
  const len=String(p.body||"").replace(/\s/g,"").length,fs=S.grdFs||17,ttl=galTitle(p);
  ov.innerHTML=`<div class="top"><span class="ac">${t==="txt"?"TEXT":"GALLERY"}</span><span>${n2(i+1)} / ${n2(L.length)}</span><span class="sp"></span>
      ${t==="txt"?`<button type="button" class="tb" data-glb="fs-">가 −</button><button type="button" class="tb" data-glb="fs+">가 +</button>`:""}
      ${p.nolink?`<span class="tb off" title="외부 링크를 막은 게시물">🔒 링크 막음</span>`:`<button type="button" class="tb" data-glb="link">🔗 링크</button>`}
      ${t==="img"?`<a id="glbo" href="${esc(q.o||q.u)}" target="_blank" rel="noopener" title="원본 열기">⤓ 원본</a>`:""}<button type="button" class="x" data-glb="x" title="닫기">✕</button></div>
    <div class="stage">${t==="txt"?`<article class="glpaper" style="--fs:${fs}px"><div class="tk">TEXT</div><h1>${esc(p.title||"제목 없음")}</h1><div class="pm">${esc(p.by||"")}${p.by?" · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""} · ${len.toLocaleString()}자</div>${galTxtHTML(p.body)}</article>`
        :`<div class="col">${IM.map((x,k)=>`<img src="${esc(x.u||x.o)}" alt="" data-k="${k}"${k>1?' loading="lazy"':""} decoding="async">`).join("")}</div>`}
      ${IM.length>1?`<div class="ipg"><b>${S.galImg+1}</b><i></i>${IM.length}</div>`:""}</div>
    ${L.length>1?`<button type="button" class="nv l" data-glb="prev" title="이전 게시물">‹</button><button type="button" class="nv r" data-glb="next" title="다음 게시물">›</button>`:""}
    <div class="side"><div class="meta"><div class="k">#${n2(i+1)}${p.label?` · <a href="#c-${esc(p.src)}">${esc(p.label)}</a>`:""}</div>
      ${ttl?`<h3>${esc(ttl)}</h3>`:""}
      <div class="by">${esc(p.by||"")}${p.by?" 올림 · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""}${IM.length>1?` · ${IM.length}장`:""}${t==="txt"?` · ${len.toLocaleString()}자`:""}</div>
      ${ed?`<div class="tools"><button type="button" data-glb="edit">✎ 수정</button>${t==="img"&&S.canAdmin&&S.fix&&!S.cid&&!S.sid?`<button type="button" data-glb="fxcover" class="${galIsFxCover(p,S.galImg)?"on":""}">${galIsFxCover(p,S.galImg)?"★ 첫 화면 그림":"☆ 첫 화면 그림으로"}</button>`:""}${t==="img"&&S.canAdmin&&p.kind==="sc"?`<button type="button" data-glb="cover" class="${galIsCover(sc,p,S.galImg)?"on":""}">${galIsCover(sc,p,S.galImg)?"★ 카드·공유 이미지":"☆ 카드·공유 이미지로"}</button>`:""}</div>`:""}</div>
      <div class="ch">COMMENTS · ${cms.length}</div>
      <div class="cl">${cms.map(c=>{const sp=(sc?.sp||[]).find(x=>x.k===c.k);return `<div class="cm"><span class="av" style="--c:${sp?.c||"#888"}">${esc((c.name||"?").slice(0,1))}</span><div><b>${esc(c.name||"")}</b><i>${galTime(c.created)}</i>${S.canAdmin||c.uid===myUid()?`<button type="button" class="cmx" data-glbcx="${esc(c.id)}" title="지우기">✕</button>`:""}<p>${esc(c.text||"")}</p></div></div>`;}).join("")||`<div class="tip" style="padding:10px 0">아직 댓글이 없어요</div>`}</div>
      ${can?`<form class="cin" id="glbf"><input type="text" id="glbnew" maxlength="2000" placeholder="댓글 달기" autocomplete="off"><button class="pri">등록</button></form>`:""}</div>
    <div class="strip">${L.map(x=>{const f=galImgs(x)[0];return `<button type="button" class="${x.id===p.id?"on":""}${galT(x)==="txt"?" tx":""}" data-glbgo="${esc(x.id)}">${galT(x)==="txt"?`<span>${esc((x.title||"T").slice(0,4))}</span>`:`<img src="${esc(f.u||f.o)}" alt="" loading="lazy">${galImgs(x).length>1?`<i>${galImgs(x).length}</i>`:""}`}</button>`;}).join("")}</div>`;
  const nt=ov.querySelector("#glbnew");if(nt&&draft){nt.value=draft;if(focused)nt.focus();}
  {const st=ov.querySelector(".strip"),on=st&&st.querySelector(".on");if(on)st.scrollLeft=on.offsetLeft-st.clientWidth/2+on.offsetWidth/2;}
  // 여러 장은 위→아래로 · 지금 보는 장 표시
  const stg=ov.querySelector(".stage"),ims=[...stg.querySelectorAll(".col img")],ipg=stg.querySelector(".ipg b"),ol=ov.querySelector("#glbo");
  const cur=()=>{if(!ims.length)return;const top=stg.getBoundingClientRect().top+stg.clientHeight*.4;let k=0;ims.forEach((x,j)=>{if(x.getBoundingClientRect().top<top)k=j;});
    if(k!==S.galImg){S.galImg=k;if(ipg)ipg.textContent=k+1;const z=IM[k];if(ol)ol.href=z.o||z.u;}};
  stg.onscroll=cur;
  {const tp=ov.querySelector(".top");if(!same){ov._ly=0;ov._hid=false;}tp.classList.toggle("hid",!!ov._hid);
    ov.onscroll=()=>{const y=ov.scrollTop,ly=ov._ly||0;if(Math.abs(y-ly)<6)return;ov._hid=y>ly&&y>60;tp.classList.toggle("hid",ov._hid);ov._ly=y;};}
  if(same)stg.scrollTop=keep;else if(S.galScrollTo&&ims[S.galScrollTo]){const k=S.galScrollTo;ims[k].addEventListener("load",()=>ims[k].scrollIntoView({block:"start"}),{once:true});ims[k].scrollIntoView({block:"start"});}
  S.galScrollTo=0;
  ov.onclick=async e=>{
    const go=e.target.closest("[data-glbgo]");if(go){galOpenAt(go.dataset.glbgo);return;}
    if(e.target.closest(".meta .k a")){galClose();return;}
    const cx=e.target.closest("[data-glbcx]");if(cx){confirmBox("이 댓글을 지울까요?","지우기",async()=>{try{await S.db.doc("comments/"+cx.dataset.glbcx).delete();}catch(err){toast("지우지 못했어요");}});return;}
    const a=e.target.closest("[data-glb]"),act=a?a.dataset.glb:(e.target===stg?"x":"");
    if(act==="x")galClose();
    else if(act==="prev")galStep(-1);else if(act==="next")galStep(1);
    else if(act==="fs-"||act==="fs+"){S.grdFs=Math.max(13,Math.min(24,fs+(act==="fs+"?1:-1)));galLBRefresh(true);}
    else if(act==="link")copyText(galLink(p),"게시물 링크를 복사했어요");
    else if(act==="edit"){if(t==="txt")galTxtEdit(p);else galEditOpen(p);}
    else if(act==="fxcover"){const on=galIsFxCover(p,S.galImg),u=q.o||q.u;
      try{await jgPut(S.fix,{banner:on?null:{u,o:u,y:40}});toast(on?"첫 화면 그림에서 뺐어요":"첫 화면 그림으로 정했어요 · 위치는 수정에서 고를 수 있어요",3200);}catch(err){toast("저장하지 못했어요");}
      render();galLBRefresh(true);}
    else if(act==="cover"&&sc){const on=galIsCover(sc,p,S.galImg);
      await mutateScen(sc.id,L=>{if(on)delete L.cover;else L.cover={id:p.id,k:S.galImg,u:q.u||q.o,w:q.w||0,h:q.h||0,y:50};});
      toast(on?"카드·공유 이미지에서 뺐어요":"카드·공유 이미지로 정했어요 · 보여줄 위치는 시나리오 수정에서 고를 수 있어요",3200);render();galLBRefresh(true);}
  };
  {let tx=null,ty=0;stg.ontouchstart=e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;};stg.ontouchend=e=>{if(tx==null)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;tx=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*2)galStep(dx<0?1:-1);};}
  const f=ov.querySelector("#glbf");if(f)f.onsubmit=async e=>{e.preventDefault();const tt=ov.querySelector("#glbnew"),text=tt.value.trim();if(!text)return;
    const who=galWho(p.kind,p.src);
    if(!who||!who.by){toast("먼저 내가 누구인지 골라 주세요");const s2=sc||S.scens.find(x=>fixOfScen(x)===S.fix);s2&&mePicker(s2);return;}
    tt.value="";
    try{if(!S.authUser)await S.auth.signInAnonymously();
      await S.db.collection("comments").add({scid:p.src,sid:"gal",bid:p.id,k:who.k,name:who.by,uid:myUid(),text:text.slice(0,2000),created:Date.now(),updated:Date.now()});}
    catch(err){tt.value=text;toast("댓글을 달지 못했어요"+(err.code==="permission-denied"?" (권한이 없어요)":""));}};
}
// 카드 이미지로 쓰던 사진이 바뀌거나 빠지면 카드도 맞춰요
async function galFixCover(p,imgs){if(p.kind!=="sc")return;const sc=scenById(p.src);const c=sc&&sc.cover;if(!c||c.id!==p.id)return;
  const k=Math.min(c.k||0,imgs.length-1),q=imgs[k];await mutateScen(sc.id,L=>{if(!q){delete L.cover;return;}L.cover={...L.cover,k,u:q.u||q.o,w:q.w||0,h:q.h||0};});}
// ---------- 게시물 수정창 ----------
// 사진 순서·바꾸기·더하기·빼기, 한 줄 설명 · 주인은 글쓴이·작성일자도
function galEditOpen(p){S.gEdit={pid:p.id,imgs:galImgs(p).map(q=>({...q})),cap:p.cap||p.title||"",nolink:!!p.nolink,by:p.by||"",at:p.at||Date.now(),busy:false};galEditRender();}
function galEditClose(){if(S.gEdit)S.gEdit.imgs.forEach(q=>q.file&&URL.revokeObjectURL(q.prev));S.gEdit=null;document.querySelector(".gedit")?.remove();}
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
    <div class="gelab">제목 · 한 줄 설명</div><input type="text" id="gecap" maxlength="80" value="${esc(E.cap)}" placeholder="(선택)">
    ${galLockRow(E.nolink)}
    ${S.canAdmin?`<div class="gerow"><div><div class="gelab">글쓴이 <span class="tip">· 주인만</span></div><select id="geby">${[...new Set([...(E.by&&!ppl.includes(E.by)?[E.by]:[]),...ppl])].map(n=>`<option value="${esc(n)}"${n===E.by?" selected":""}>${esc(n)}</option>`).join("")}${E.by?"":`<option value="" selected>(없음)</option>`}</select></div>
      <div><div class="gelab">작성일자 <span class="tip">· 주인만</span></div><input type="date" id="geat" value="${galYmd(E.at)}"></div></div>`:""}
    <div class="tip" id="gemsg"></div>
    <div class="gefoot"><button type="button" class="ghost danger" data-ge="del">게시물 지우기</button><span style="flex:1"></span><button type="button" class="ghost" data-ge="x">취소</button><button type="button" class="pri" data-ge="ok">저장</button></div></div>`;
  const pull=()=>{const c=w.querySelector("#gecap");if(c)E.cap=c.value;const nl=w.querySelector("#genl");if(nl)E.nolink=nl.checked;const b=w.querySelector("#geby");if(b)E.by=b.value;const t=w.querySelector("#geat");if(t&&/^\d{4}-\d\d-\d\d$/.test(t.value)){const [y,m,d]=t.value.split("-").map(Number),o=new Date(E.at);E.at=new Date(y,m-1,d,o.getHours(),o.getMinutes(),o.getSeconds()).getTime();}};
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
        await galMutate(p,g=>g.map(x=>{if(x.id!==p.id)return x;const y=galSetImgs(x,out);y.cap=E.cap.trim().slice(0,80);delete y.title;if(y.t==="toon")delete y.t;if(E.nolink)y.nolink=true;else delete y.nolink;if(S.canAdmin){y.by=E.by.trim().slice(0,40);y.at=E.at;const sp=p.kind==="sc"?(scenById(p.src)?.sp||[]).find(q=>pcSplit(q.name||"").name===y.by):null;y.k=sp?sp.k:"";}return y;}));
        before.filter(q=>!keep.has(q.op||q.o)).flatMap(q=>[q.p,q.op]).filter(Boolean).forEach(x=>S.storage?.ref(x).delete().catch(()=>{}));
        await galFixCover(p,out);
        galEditClose();S.galImg=Math.min(S.galImg||0,out.length-1);toast("저장했어요");galLBRefresh(true);
      }catch(err){E.busy=false;toast("저장하지 못했어요");galEditRender();}}};
  const cap=w.querySelector("#gecap");if(cap)cap.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();w.querySelector('[data-ge="ok"]').click();}};
}
function galSetImgs(x,imgs){const f=imgs[0]||{};return {...x,imgs,u:f.u,o:f.o,w:f.w||0,h:f.h||0,p:f.p||"",op:f.op||""};}
function galStep(d){const {L,i}=galCur();if(L.length<2)return;galOpenAt(L[(i+d+L.length)%L.length].id);}
document.addEventListener("keydown",e=>{if(S.gEdit){if(e.key==="Escape")galEditClose();return;}if(!S.galOpen||e.target.matches("input,textarea"))return;
  if(e.key==="Escape")galClose();else if(e.key==="ArrowLeft")galStep(-1);else if(e.key==="ArrowRight")galStep(1);});
window.addEventListener("hashchange",()=>{if(S.galOpen)galClose();galUnwatch();});

function galLockRow(on){return `<label class="gelock"><input type="checkbox" id="genl"${on?" checked":""}><span class="sw"></span><span><b>외부 링크 막기</b><small>켜면 🔗 링크가 안 나오고, 링크로 들어와도 안 보여요 · 목록에서는 흐리게 보여요</small></span></label>`;}
// ---------- 텍스트 쓰기·고치기 ----------
function galTxtNew(kind,src){galTxtBox({title:"",body:""},async v=>{const who=galWho(kind,src)||{by:"",k:""};
  try{if(!S.authUser)await S.auth.signInAnonymously();
    await galAdd(kind,src,{id:Date.now().toString(36)+rid4(),t:"txt",title:v.title,body:v.body,...(v.nolink?{nolink:true}:{}),cap:"",by:who.by,k:who.k||"",uid:myUid(),at:Date.now()});toast("텍스트를 올렸어요");return true;}
  catch(e){toast("올리지 못했어요");return false;}});}
function galTxtEdit(p){galTxtBox(p,async v=>{try{await galMutate(p,g=>g.map(x=>{if(x.id!==p.id)return x;const y={...x,title:v.title,body:v.body};if(v.nolink)y.nolink=true;else delete y.nolink;return y;}));toast("저장했어요");galLBRefresh(true);return true;}catch(err){toast("저장하지 못했어요");return false;}},
  ()=>confirmBox("이 텍스트를 지울까요? 달린 댓글도 같이 사라져요.","지우기",async()=>{try{const cms=galCmsOf(p);await galMutate(p,g=>g.filter(x=>x.id!==p.id));cms.filter(c=>S.canAdmin||c.uid===myUid()).forEach(c=>S.db.doc("comments/"+c.id).delete().catch(()=>{}));document.querySelector(".gedit")?.remove();toast("지웠어요");}catch(err){toast("지우지 못했어요");}}));}
function galTxtBox(v,onSave,onDel){const w=document.createElement("div");w.className="gedit";
  w.innerHTML=`<div class="gebox gtxt"><div class="geh"><b>텍스트</b><button type="button" class="x" data-x>✕</button></div>
    <div class="gelab">제목</div><input type="text" id="gtt" maxlength="80" value="${esc(v.title||"")}">
    <div class="gelab">본문 <span class="tip">· 문단은 빈 줄로 · *** 은 장면 구분선 · 최대 20만 자</span></div><textarea id="gtb" rows="16">${esc(v.body||"")}</textarea>
    ${galLockRow(!!v.nolink)}
    <div class="gefoot">${onDel?`<button type="button" class="ghost danger" id="gtd">지우기</button>`:""}<span class="tip" id="gtn"></span><span style="flex:1"></span><button type="button" class="ghost" data-x>취소</button><button type="button" class="pri" id="gts">저장</button></div></div>`;
  document.body.appendChild(w);const tb=w.querySelector("#gtb"),n=w.querySelector("#gtn");const cnt=()=>n.textContent=`${tb.value.replace(/\s/g,"").length.toLocaleString()}자`;cnt();tb.oninput=cnt;
  w.querySelectorAll("[data-x]").forEach(b=>b.onclick=()=>w.remove());
  const d=w.querySelector("#gtd");if(d)d.onclick=onDel;
  w.querySelector("#gts").onclick=async()=>{const t=w.querySelector("#gtt").value.trim(),b=tb.value;if(!t&&!b.trim()){toast("제목이나 본문을 써 주세요");return;}
    if(await onSave({title:t.slice(0,80),body:b.slice(0,200000),nolink:w.querySelector("#genl").checked})!==false)w.remove();};}
function galTxtHTML(b){return String(b||"").replace(/\r/g,"").split(/\n\s*\n+/).map(par=>/^\s*(\*\s*){3,}\s*$/.test(par)?`<div class="sep">◆ ◆ ◆</div>`:`<p>${esc(qfix(par.trim())).replace(/\n/g,"<br>")}</p>`).join("");}
// ---------- 게시물 하나만 보는 페이지 (#p-출처~id) — 비밀번호 없이 · 댓글은 페이지로 들어가서 ----------
async function openPostPage(key){let [src,id]=key.split("~");S.postPage={key,loading:true};render();
  // 짧은 코드면 사이트 정보가 올 때까지 잠깐 기다렸다가 고정탁 키로
  if(!src.startsWith("fx_")){for(let i=0;i<40&&!S.scensLoaded;i++)await new Promise(r=>setTimeout(r,100));const n=fixByCode(src);if(n)src=fixKey(n);}
  if(!S.postPage||S.postPage.key!==key)return;
  try{const fx=src.startsWith("fx_"),d=await S.db.doc((fx?"fixes/":"scenarios/")+src).get();
    const data=d.exists?d.data():null;let p=null;try{const pd=await S.db.doc("posts/"+id).get();if(pd.exists&&pd.data().src===src)p={...pd.data(),id};}catch(e){}
    if(!p)p=data&&(data.gal||[]).find(x=>x.id===id);
    if(!p){S.postPage={key,err:"게시물을 찾을 수 없어요."};render();return;}
    const name=fx?decodeURIComponent(src.slice(3)):(data.name||"");if(fx)S.fixDocs[src]={...(S.fixDocs[src]||{}),...data};
    S.postPage={key,src,fx,name,sc:fx?null:{id:src,...data},p:{...p,src,kind:fx?"fx":"sc"}};}
  catch(e){S.postPage={key,err:"게시물을 불러오지 못했어요."};}
  render();window.scrollTo(0,0);}
function postPageTheme(){const P=S.postPage||{};if(!P.p)return "plain";if(P.fx)return fixWord(P.name)==="페어"?"jg":"plain";return themeOf(P.sc)||"plain";}
function postPageHTML(){const P=S.postPage||{};
  if(P.loading)return `<div class="pstpage">${loaderHTML()}</div>`;
  if(P.err)return `<div class="pstpage"><div class="notice bad">${esc(P.err)}</div></div>`;
  const p=P.p,t=galT(p),IM=galImgs(p),W=P.fx?fixWord(P.name):"세션",go=P.fx?fixHref(P.name):`#c-${P.src}`;
  const ft=`<div class="pstft"><a class="pri" href="${go}" data-pstgo>${esc(W)} 페이지로 →</a><span>${esc(W)} 비밀번호로 들어가면 이 게시물의 댓글을 보고 달 수 있어요</span></div>`;
  const head="";
  if(p.nolink)return `<div class="pstpage">${head}<div class="pstlock"><div class="ic">LOCKED</div><p>이 게시물은 링크로 볼 수 없어요</p></div>${ft}</div>`;
  const len=String(p.body||"").replace(/\s/g,"").length;
  return `<div class="pstpage">${head}
    ${t==="txt"?`<article class="glpaper" style="--fs:${S.grdFs||17}px"><div class="tk">TEXT</div><h1>${esc(p.title||"제목 없음")}</h1><div class="pm">${esc(p.by||"")}${p.by?" · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""} · ${len.toLocaleString()}자</div>${galTxtHTML(p.body)}</article>`
      :`<div class="psth"><h2>${esc(galTitle(p)||"")}</h2><div class="pm">${esc(p.by||"")}${p.by?" · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""}${IM.length>1?` · ${IM.length}장`:""}</div></div><div class="pstimgs">${IM.map(q=>`<img src="${esc(q.u||q.o)}" alt="" loading="lazy" decoding="async">`).join("")}</div>`}
    ${ft}</div>`;}
function bindPostPage(){
  const a=document.querySelector("[data-pstgo]"),P=S.postPage;if(a&&P&&P.p)a.onclick=()=>{try{sessionStorage.setItem("galGo",JSON.stringify({src:P.src,id:P.p.id,at:Date.now()}));}catch(e){}};}

// ---------- 예전 게시물(시나리오·고정탁 문서 안 gal)을 posts 컬렉션으로 옮기기 · 주인 브라우저에서 한 번 ----------
let _galMig=false;
async function galMigrate(){if(_galMig||!S.canAdmin||!S.postsOn)return;
  _galMig=true;let fx=[];try{fx=(await S.db.collection("fixes").get()).docs.map(d=>[d.id,d.data()]);}catch(e){}
  const jobs=[...S.scens.filter(x=>(x.gal||[]).length).map(x=>({ref:S.db.doc("scenarios/"+x.id),src:x.id,kind:"sc",list:x.gal})),
    ...fx.filter(([k,v])=>(v.gal||[]).length).map(([k,v])=>({ref:S.db.doc("fixes/"+k),src:k,kind:"fx",list:v.gal}))];
  if(!jobs.length){_galMig=false;return;}
  try{for(const j of jobs){const b=S.db.batch();j.list.forEach(p=>{const y=galClean(p);delete y.id;b.set(S.db.doc("posts/"+p.id),{...y,src:j.src,kind:j.kind},{merge:true});});await b.commit();
      // 다 옮겨졌는지 확인한 다음에만 예전 칸을 비워요
      const ok=await Promise.all(j.list.map(p=>S.db.doc("posts/"+p.id).get().then(d=>d.exists)));if(ok.every(Boolean))await j.ref.update({gal:firebase.firestore.FieldValue.delete()});}
    console.log("[gal] posts로 옮겼어요",jobs.length);}
  catch(e){console.warn("[gal] 옮기지 못했어요",e);}
  _galMig=false;}
