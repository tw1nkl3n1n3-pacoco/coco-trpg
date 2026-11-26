// 갤러리 — 세션 페이지(세션 후기 아래)와 고정탁 페이지
// 사진 목록: scenarios/{id}.gal 또는 fixes/{fx_이름}.gal = [{id,u(미리보기),o(원본),p,op,w,h,fn,cap,by,k,uid,at}]
// 파일: Storage gal/{scid 또는 fx_이름}/{uid}/… — 원본 그대로 + 화면용 미리보기 · 댓글: comments (scid=출처, sid:"gal", bid:사진 id)
S.galCms={};S.galItems=[];S.galOpen=null;S.galEditCap=false;S.fixDocs={};
const _galSubs={};let _galKey="";const _fixSubs={};
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
  return [{id:fk,kind:"fx",label:"",list:galRaw(S.fixDocs[fk]),read:true,up:S.canAdmin||fixOpen(f)},
    ...scs.map(x=>({id:x.id,kind:"sc",label:x.name,list:galRaw(x),read:isOpen(x.id),up:false}))];}
const galDate=t=>{if(!t)return "";const d=new Date(t);return `${d.getMonth()+1}.${d.getDate()}`;};
const galTime=t=>{if(!t)return "";const d=new Date(t),z=n=>String(n).padStart(2,"0");return `${d.getMonth()+1}.${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`;};
const n2=i=>String(i).padStart(2,"0");
function galHTML(srcs,o={}){
  const items=srcs.flatMap(s=>s.list.map(p=>({...p,src:s.id,kind:s.kind,label:s.label}))).sort((a,b)=>o.newest?(b.at||0)-(a.at||0):(a.at||0)-(b.at||0));
  S.galItems=items;const up=srcs.find(s=>s.up);
  if(!items.length&&!up)return "";
  const addH=up?`<label class="gadd"><input type="file" accept="image/*" multiple hidden id="galfile" data-src="${esc(up.id)}" data-kind="${up.kind}"><i>＋</i><b>UPLOAD</b><span id="galmsg">사진 올리기 · 원본 그대로 · 여러 장 가능</span></label>`:"";
  return `<div class="sc-sec galsec"><h4 data-en="GALLERY">${o.title||"세션 갤러리"}${items.length?`<span class="gcnt">${n2(items.length)}</span>`:""}</h4>
    <div class="gm">${o.newest?addH:""}
    ${items.map((p,i)=>`<figure data-gal="${esc(p.id)}"><div class="im" style="--r:${p.w&&p.h?p.w+"/"+p.h:"4/3"}"><img src="${esc(p.u||p.o)}" alt="${esc(p.cap||"")}" loading="lazy"><span class="no">${n2(i+1)}</span>${p.label?`<span class="from">${esc(p.label)}</span>`:""}</div>
      <figcaption><span class="t${p.cap?"":" empty"}">${p.cap?esc(p.cap):"설명 없음"}</span><span class="c" data-galc="${esc(p.id)}"></span><span class="m">${esc(p.by||"")}${p.by?" · ":""}${galDate(p.at)}</span></figcaption></figure>`).join("")}${o.newest?"":addH}</div></div>`;
}
function galCountsRefresh(){document.querySelectorAll("[data-galc]").forEach(e=>{const it=S.galItems.find(x=>x.id===e.dataset.galc);const n=it?galCmsOf(it).length:0;e.textContent=n?"◦"+n:"";});}
function bindGal(srcs){
  galWatch(srcs);galCountsRefresh();
  document.querySelectorAll(".galsec [data-gal]").forEach(f=>f.onclick=()=>galOpenAt(f.dataset.gal));
  const fi=$("#galfile");if(fi)fi.onchange=()=>{const fs=[...fi.files];fi.value="";if(fs.length)galUpload(fi.dataset.kind,fi.dataset.src,fs);};
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
async function galUpload(kind,src,files){
  const who=galWho(kind,src);
  if(!who){toast("먼저 내가 누구인지 골라 주세요");const sc=scenById(src);sc&&mePicker(sc);return;}
  if(!S.storage){toast("저장소를 쓸 수 없어요");return;}
  const msg=$("#galmsg"),base="사진 올리기 · 원본 그대로 · 여러 장 가능";let done=0;
  try{if(!S.authUser)await S.auth.signInAnonymously();
    for(const f of files){
      if(!/^image\//.test(f.type))continue;
      const id=Date.now().toString(36)+rid4(),dir=`gal/${src}/${myUid()}/`,ext=((f.name||"").match(/\.([a-z0-9]{2,5})$/i)||[,"jpg"])[1].toLowerCase();
      // 원본은 그대로 · 화면에는 가벼운 미리보기
      const or=S.storage.ref(dir+id+"."+ext);
      const task=or.put(f,{contentType:f.type,cacheControl:"public,max-age=31536000",customMetadata:{name:(f.name||"").slice(0,200)}});
      task.on("state_changed",s=>{if(msg)msg.textContent=`올리는 중… ${done+1} / ${files.length} · ${Math.round(s.bytesTransferred/Math.max(1,s.totalBytes)*100)}%`;});
      await task;const o=await or.getDownloadURL();
      let u=o,p="",w=0,h=0;
      try{const img=await galImg(f);w=img.naturalWidth;h=img.naturalHeight;URL.revokeObjectURL(img.src);
        if(Math.max(w,h)>1400||f.size>700*1024){const tb=await galThumb(img);const tr=S.storage.ref(dir+id+"_t.jpg");await tr.put(tb,{contentType:"image/jpeg",cacheControl:"public,max-age=31536000"});u=await tr.getDownloadURL();p=tr.fullPath;}}
      catch(e){} // 브라우저가 못 여는 형식(HEIC 등)은 원본만
      await galAdd(kind,src,{id,u,o,p,op:or.fullPath,w,h,fn:(f.name||"").slice(0,120),sz:f.size,cap:"",by:who.by,k:who.k||"",uid:myUid(),at:Date.now()});
      done++;
    }
    toast(done?`사진 ${done}장을 올렸어요`:"사진 파일만 올릴 수 있어요");
  }catch(e){const c=e&&e.code||"";toast("사진을 올리지 못했어요"+(/permission|unauthorized/.test(c)?(kind==="fx"?" (고정탁 비밀번호로 다시 열어 주세요)":" (권한이 없어요)"):""));}
  if(msg)msg.textContent=base;
}
// 사진 하나 고치기·지우기 (다른 사람이 동시에 올려도 안 사라지게 트랜잭션으로)
async function galMutate(it,fn){
  const ref=galRef(it.kind)(it.src);
  await S.db.runTransaction(async tx=>{const d=await tx.get(ref);const g=(d.exists&&d.data().gal)||[];tx.update(ref,{gal:fn(g)});});
}
function galCur(){const L=S.galItems;const i=L.findIndex(p=>p.id===S.galOpen);return {L,i,p:L[i]};}
function galCanUp(it){return it.kind==="fx"?(S.canAdmin||(S.fix&&fixOpen(S.fix))):(canWriteScen(it.src)||S.canAdmin);}
function galOpenAt(id){S.galOpen=id;S.galEditCap=false;galLBRefresh(true);}
function galClose(){S.galOpen=null;S.galEditCap=false;document.querySelector(".glb")?.remove();document.body.classList.remove("glbon");}
function galLBRefresh(force){
  if(!S.galOpen)return;
  const {L,i,p}=galCur();
  if(!p){if(force||!document.querySelector(".galsec"))galClose();return;}
  let ov=document.querySelector(".glb");
  const ta=ov&&ov.querySelector("#glbnew"),draft=ta?ta.value:"",focused=ta&&document.activeElement===ta;
  if(ov&&!force&&S.galEditCap)return;
  if(!ov){ov=document.createElement("div");ov.className="glb";document.body.appendChild(ov);document.body.classList.add("glbon");}
  const cms=galCmsOf(p),can=galCanUp(p),ed=galCanEdit(p),sc=p.kind==="sc"?scenById(p.src):null;
  ov.innerHTML=`<div class="top"><span class="ac">GALLERY</span><span>${n2(i+1)} / ${n2(L.length)}</span><span class="sp"></span>
      <a href="${esc(p.o||p.u)}" target="_blank" rel="noopener" title="원본 열기">⤓ 원본</a><button type="button" class="x" data-glb="x" title="닫기">✕</button></div>
    <div class="stage"><div class="fr"><img src="${esc(p.u||p.o)}" alt=""></div>
      ${L.length>1?`<button type="button" class="nv l" data-glb="prev">‹</button><button type="button" class="nv r" data-glb="next">›</button>`:""}</div>
    <div class="side"><div class="meta"><div class="k">#${n2(i+1)}${p.label?` · <a href="#c-${esc(p.src)}">${esc(p.label)}</a>`:""}</div>
      ${S.galEditCap?`<div class="capf"><input type="text" id="glbcap" maxlength="80" value="${esc(p.cap||"")}" placeholder="한 줄 설명"><button type="button" class="pri" data-glb="capok">저장</button><button type="button" class="ghost" data-glb="capx">취소</button></div>`
        :`<h3 class="${p.cap?"":"empty"}">${p.cap?esc(p.cap):"설명 없음"}</h3>`}
      <div class="by">${esc(p.by||"")}${p.by?" 올림 · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""}${p.w?` · ${p.w}×${p.h}`:""}</div>
      ${ed&&!S.galEditCap?`<div class="tools"><button type="button" data-glb="cap">✎ 설명</button><button type="button" data-glb="del">지우기</button></div>`:""}</div>
      <div class="ch">COMMENTS · ${cms.length}</div>
      <div class="cl">${cms.map(c=>{const sp=(sc?.sp||[]).find(x=>x.k===c.k);return `<div class="cm"><span class="av" style="--c:${sp?.c||"#888"}">${esc((c.name||"?").slice(0,1))}</span><div><b>${esc(c.name||"")}</b><i>${galTime(c.created)}</i>${S.canAdmin||c.uid===myUid()?`<button type="button" class="cmx" data-glbcx="${esc(c.id)}" title="지우기">✕</button>`:""}<p>${esc(c.text||"")}</p></div></div>`;}).join("")||`<div class="tip" style="padding:10px 0">아직 댓글이 없어요</div>`}</div>
      ${can?`<form class="cin" id="glbf"><input type="text" id="glbnew" maxlength="2000" placeholder="댓글 달기" autocomplete="off"><button class="pri">등록</button></form>`:""}</div>
    <div class="strip">${L.map(q=>`<button type="button" class="${q.id===p.id?"on":""}" data-glbgo="${esc(q.id)}"><img src="${esc(q.u||q.o)}" alt="" loading="lazy"></button>`).join("")}</div>`;
  const nt=ov.querySelector("#glbnew");if(nt&&draft){nt.value=draft;if(focused)nt.focus();}
  ov.querySelector(".strip .on")?.scrollIntoView({block:"nearest",inline:"center"});
  const cap=ov.querySelector("#glbcap");if(cap){cap.focus();cap.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();ov.querySelector('[data-glb="capok"]').click();}};}
  ov.onclick=async e=>{
    const go=e.target.closest("[data-glbgo]");if(go){galOpenAt(go.dataset.glbgo);return;}
    if(e.target.closest(".meta .k a")){galClose();return;}
    const cx=e.target.closest("[data-glbcx]");if(cx){confirmBox("이 댓글을 지울까요?","지우기",async()=>{try{await S.db.doc("comments/"+cx.dataset.glbcx).delete();}catch(err){toast("지우지 못했어요");}});return;}
    const a=e.target.closest("[data-glb]"),act=a?a.dataset.glb:(e.target.classList.contains("stage")?"x":"");
    if(act==="x")galClose();
    else if(act==="prev")galStep(-1);else if(act==="next")galStep(1);
    else if(act==="cap"){S.galEditCap=true;galLBRefresh(true);}
    else if(act==="capx"){S.galEditCap=false;galLBRefresh(true);}
    else if(act==="capok"){const v=(ov.querySelector("#glbcap").value||"").trim().slice(0,80);S.galEditCap=false;
      try{await galMutate(p,g=>g.map(x=>x.id===p.id?{...x,cap:v}:x));}catch(err){toast("저장하지 못했어요");}galLBRefresh(true);}
    else if(act==="del")confirmBox("이 사진을 지울까요? 원본 파일과 사진에 달린 댓글도 같이 사라져요.","지우기",async()=>{
      try{await galMutate(p,g=>g.filter(x=>x.id!==p.id));
        [p.p,p.op].filter(Boolean).forEach(x=>S.storage?.ref(x).delete().catch(()=>{}));
        cms.filter(c=>S.canAdmin||c.uid===myUid()).forEach(c=>S.db.doc("comments/"+c.id).delete().catch(()=>{}));
        toast("지웠어요");}catch(err){toast("지우지 못했어요");}});
  };
  const f=ov.querySelector("#glbf");if(f)f.onsubmit=async e=>{e.preventDefault();const t=ov.querySelector("#glbnew"),text=t.value.trim();if(!text)return;
    const who=galWho(p.kind,p.src);
    if(!who||!who.by){toast("먼저 내가 누구인지 골라 주세요");const s2=sc||S.scens.find(x=>fixOfScen(x)===S.fix);s2&&mePicker(s2);return;}
    t.value="";
    try{if(!S.authUser)await S.auth.signInAnonymously();
      await S.db.collection("comments").add({scid:p.src,sid:"gal",bid:p.id,k:who.k,name:who.by,uid:myUid(),text:text.slice(0,2000),created:Date.now(),updated:Date.now()});}
    catch(err){t.value=text;toast("댓글을 달지 못했어요"+(err.code==="permission-denied"?" (권한이 없어요)":""));}};
}
function galStep(d){const {L,i}=galCur();if(!L.length)return;galOpenAt(L[(i+d+L.length)%L.length].id);}
document.addEventListener("keydown",e=>{if(!S.galOpen||e.target.matches("input,textarea"))return;
  if(e.key==="Escape")galClose();else if(e.key==="ArrowLeft")galStep(-1);else if(e.key==="ArrowRight")galStep(1);});
window.addEventListener("hashchange",()=>{if(S.galOpen)galClose();galUnwatch();});
