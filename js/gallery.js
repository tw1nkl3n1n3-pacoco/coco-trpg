// 세션 갤러리 — 세션 페이지 '세션 후기' 아래
// 사진: scenarios/{id}.gal = [{id,u,p,w,h,cap,by,k,uid,at}] (세션을 연 사람이 올리고, 올린 사람·주인이 고치고 지워요)
// 파일: Storage img/{scid}/{uid}/… (후기 사진과 같은 칸) · 댓글: comments (sid:"gal", bid:사진 id)
S.galCms=[];S.galScid=null;S.galOpen=null;S.galEditCap=false;
function galList(sc){return (sc&&Array.isArray(sc.gal)?sc.gal:[]).slice().sort((a,b)=>(a.at||0)-(b.at||0));}
function galCanEdit(p){return S.canAdmin||(!!p&&!!p.uid&&p.uid===myUid());}
function galCmCount(id){return S.galCms.filter(c=>c.bid===id).length;}
function galWatch(scid){
  if(!S.db||S.local||!scid||S.galScid===scid||!isOpen(scid))return;
  S.galScid=scid;S.galCms=[];
  const u=S.db.collection("comments").where("scid","==",scid).where("sid","==","gal").onSnapshot(snap=>{
    S.galCms=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.created||0)-(b.created||0));
    galCountsRefresh();galLBRefresh();
  },()=>{S.galCms=[];});
  S.unsub.push(()=>{u();S.galScid=null;S.galCms=[];galClose(true);});
}
const galDate=t=>{if(!t)return "";const d=new Date(t);return `${d.getMonth()+1}.${d.getDate()}`;};
const galTime=t=>{if(!t)return "";const d=new Date(t),z=n=>String(n).padStart(2,"0");return `${d.getMonth()+1}.${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}`;};
function galHTML(sc){
  const L=galList(sc),can=canWriteScen(sc.id)||S.canAdmin;
  if(!L.length&&!can)return "";
  return `<div class="sc-sec galsec"><h4 data-en="GALLERY">세션 갤러리${L.length?`<span class="gcnt">${String(L.length).padStart(2,"0")}</span>`:""}</h4>
    <div class="gm">${L.map((p,i)=>`<figure data-gal="${esc(p.id)}"><div class="im" style="--r:${p.w&&p.h?p.w+"/"+p.h:"4/3"}"><img src="${esc(p.u)}" alt="${esc(p.cap||"")}" loading="lazy"><span class="no">${String(i+1).padStart(2,"0")}</span></div>
      <figcaption><span class="t${p.cap?"":" empty"}">${p.cap?esc(p.cap):"설명 없음"}</span><span class="c" data-galc="${esc(p.id)}"></span><span class="m">${esc(p.by||"")}${p.by?" · ":""}${galDate(p.at)}</span></figcaption></figure>`).join("")}
    ${can?`<label class="gadd"><input type="file" accept="image/*" multiple hidden id="galfile"><i>＋</i><b>UPLOAD</b><span id="galmsg">사진 올리기 · 여러 장 가능</span></label>`:""}</div></div>`;
}
function galCountsRefresh(){document.querySelectorAll("[data-galc]").forEach(e=>{const n=galCmCount(e.dataset.galc);e.textContent=n?"◦"+n:"";});}
function bindGal(sc){
  galWatch(sc.id);galCountsRefresh();
  document.querySelectorAll(".galsec [data-gal]").forEach(f=>f.onclick=()=>galOpenAt(f.dataset.gal));
  const fi=$("#galfile");if(fi)fi.onchange=()=>{const fs=[...fi.files];fi.value="";if(fs.length)galUpload(sc.id,fs);};
  galLBRefresh();
}
function galWho(scid){const me=meSp(scid);if(me)return {by:pcSplit(me.name||"").name,k:me.k};
  if(S.canAdmin)return {by:(site().nicks||[])[0]||"주인",k:""};return null;}
async function galShrink(file){
  const img=await new Promise((ok,no)=>{const i=new Image(),u=URL.createObjectURL(file);i.onload=()=>ok(i);i.onerror=no;i.src=u;});
  const r=Math.min(1,1800/Math.max(img.width,img.height)),w=Math.round(img.width*r),h=Math.round(img.height*r);
  const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(img,0,0,w,h);URL.revokeObjectURL(img.src);
  let q=.88,blob=await new Promise(ok=>c.toBlob(ok,"image/jpeg",q));
  while(blob&&blob.size>3.8*1024*1024&&q>.5){q-=.12;blob=await new Promise(ok=>c.toBlob(ok,"image/jpeg",q));}
  return {blob,w,h};
}
async function galUpload(scid,files){
  const who=galWho(scid);
  if(!who){toast("먼저 내가 누구인지 골라 주세요");const sc=scenById(scid);sc&&mePicker(sc);return;}
  if(!S.storage){toast("저장소를 쓸 수 없어요");return;}
  const msg=$("#galmsg");let done=0;
  try{if(!S.authUser)await S.auth.signInAnonymously();
    for(const f of files){
      if(!/^image\//.test(f.type))continue;
      if(msg)msg.textContent=`올리는 중… ${done+1} / ${files.length}`;
      const {blob,w,h}=await galShrink(f);
      const id=Date.now().toString(36)+rid4(),p=`img/${scid}/${myUid()}/g${id}.jpg`,ref=S.storage.ref(p);
      await ref.put(blob,{contentType:"image/jpeg",cacheControl:"public,max-age=31536000"});
      const u=await ref.getDownloadURL();
      await S.db.doc("scenarios/"+scid).update({gal:firebase.firestore.FieldValue.arrayUnion({id,u,p,w,h,cap:"",by:who.by,k:who.k||"",uid:myUid(),at:Date.now()})});
      done++;
    }
    toast(done?`사진 ${done}장을 올렸어요`:"사진 파일만 올릴 수 있어요");
  }catch(e){toast("사진을 올리지 못했어요"+(e&&e.code&&/permission|unauthorized/.test(e.code)?" (권한이 없어요)":""));if(msg)msg.textContent="사진 올리기 · 여러 장 가능";}
}
// 사진 하나 고치기·지우기 (다른 사람이 동시에 올려도 안 사라지게 트랜잭션으로)
async function galMutate(scid,fn){
  const ref=S.db.doc("scenarios/"+scid);
  await S.db.runTransaction(async tx=>{const d=await tx.get(ref);const g=(d.data()||{}).gal||[];tx.update(ref,{gal:fn(g)});});
}
function galCur(){const sc=scenById(S.galScid);const L=galList(sc);const i=L.findIndex(p=>p.id===S.galOpen);return {sc,L,i,p:L[i]};}
function galOpenAt(id){S.galOpen=id;S.galEditCap=false;galLBRefresh(true);}
function galClose(quiet){S.galOpen=null;S.galEditCap=false;document.querySelector(".glb")?.remove();document.body.classList.remove("glbon");}
function galLBRefresh(force){
  if(!S.galOpen)return;
  const {sc,L,i,p}=galCur();
  if(!p){galClose();return;}
  let ov=document.querySelector(".glb");
  const ta=ov&&ov.querySelector("#glbnew"),draft=ta?ta.value:"",focused=ta&&document.activeElement===ta;
  if(ov&&!force&&ov.dataset.id===p.id&&ov.contains(document.activeElement)&&document.activeElement.matches("input,textarea")&&S.galEditCap)return;
  if(!ov){ov=document.createElement("div");ov.className="glb";document.body.appendChild(ov);document.body.classList.add("glbon");}
  ov.dataset.id=p.id;
  const cms=S.galCms.filter(c=>c.bid===p.id),can=canWriteScen(sc.id)||S.canAdmin,ed=galCanEdit(p);
  ov.innerHTML=`<div class="top"><span class="ac">GALLERY</span><span>${String(i+1).padStart(2,"0")} / ${String(L.length).padStart(2,"0")}</span><span class="sp"></span>
      <a href="${esc(p.u)}" target="_blank" rel="noopener" title="원본 열기">⤓</a><button type="button" class="x" data-glb="x" title="닫기">✕</button></div>
    <div class="stage" data-glb="bg"><div class="fr"><img src="${esc(p.u)}" alt=""></div>
      ${L.length>1?`<button type="button" class="nv l" data-glb="prev">‹</button><button type="button" class="nv r" data-glb="next">›</button>`:""}</div>
    <div class="side"><div class="meta"><div class="k">#${String(i+1).padStart(2,"0")}</div>
      ${S.galEditCap?`<div class="capf"><input type="text" id="glbcap" maxlength="80" value="${esc(p.cap||"")}" placeholder="한 줄 설명"><button type="button" class="pri" data-glb="capok">저장</button><button type="button" class="ghost" data-glb="capx">취소</button></div>`
        :`<h3 class="${p.cap?"":"empty"}">${p.cap?esc(p.cap):"설명 없음"}</h3>`}
      <div class="by">${esc(p.by||"")}${p.by?" 올림 · ":""}${p.at?new Date(p.at).toLocaleDateString("ko-KR"):""}</div>
      ${ed&&!S.galEditCap?`<div class="tools"><button type="button" data-glb="cap">✎ 설명</button><button type="button" data-glb="del">지우기</button></div>`:""}</div>
      <div class="ch">COMMENTS · ${cms.length}</div>
      <div class="cl">${cms.map(c=>{const sp=(sc.sp||[]).find(x=>x.k===c.k);return `<div class="cm"><span class="av" style="--c:${sp?.c||"#888"}">${esc((c.name||"?").slice(0,1))}</span><div><b>${esc(c.name||"")}</b><i>${galTime(c.created)}</i>${S.canAdmin||c.uid===myUid()?`<button type="button" class="cmx" data-glbcx="${esc(c.id)}" title="지우기">✕</button>`:""}<p>${esc(c.text||"")}</p></div></div>`;}).join("")||`<div class="tip" style="padding:10px 0">아직 댓글이 없어요</div>`}</div>
      ${can?`<form class="cin" id="glbf"><input type="text" id="glbnew" maxlength="2000" placeholder="댓글 달기" autocomplete="off"><button class="pri">등록</button></form>`:""}</div>
    <div class="strip">${L.map(q=>`<button type="button" class="${q.id===p.id?"on":""}" data-glbgo="${esc(q.id)}"><img src="${esc(q.u)}" alt="" loading="lazy"></button>`).join("")}</div>`;
  const nt=ov.querySelector("#glbnew");if(nt&&draft){nt.value=draft;if(focused)nt.focus();}
  ov.querySelector(".strip .on")?.scrollIntoView({block:"nearest",inline:"center"});
  const cap=ov.querySelector("#glbcap");if(cap){cap.focus();cap.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();ov.querySelector('[data-glb="capok"]').click();}};}
  ov.onclick=async e=>{
    const go=e.target.closest("[data-glbgo]");if(go){galOpenAt(go.dataset.glbgo);return;}
    const cx=e.target.closest("[data-glbcx]");if(cx){confirmBox("이 댓글을 지울까요?","지우기",async()=>{try{await S.db.doc("comments/"+cx.dataset.glbcx).delete();}catch(err){toast("지우지 못했어요");}});return;}
    const a=e.target.closest("[data-glb]");const act=a?a.dataset.glb:(e.target.classList.contains("stage")?"bg":"");
    if(act==="x"||act==="bg"&&e.target===e.currentTarget.querySelector(".stage"))galClose();
    else if(act==="prev")galStep(-1);else if(act==="next")galStep(1);
    else if(act==="cap"){S.galEditCap=true;galLBRefresh(true);}
    else if(act==="capx"){S.galEditCap=false;galLBRefresh(true);}
    else if(act==="capok"){const v=(ov.querySelector("#glbcap").value||"").trim().slice(0,80);S.galEditCap=false;
      try{await galMutate(sc.id,g=>g.map(x=>x.id===p.id?{...x,cap:v}:x));}catch(err){toast("저장하지 못했어요");}galLBRefresh(true);}
    else if(act==="del")confirmBox("이 사진을 지울까요? 사진에 달린 댓글도 같이 사라져요.","지우기",async()=>{
      try{await galMutate(sc.id,g=>g.filter(x=>x.id!==p.id));
        if(p.p)S.storage?.ref(p.p).delete().catch(()=>{});
        S.galCms.filter(c=>c.bid===p.id&&(S.canAdmin||c.uid===myUid())).forEach(c=>S.db.doc("comments/"+c.id).delete().catch(()=>{}));
        toast("지웠어요");}catch(err){toast("지우지 못했어요");}});
  };
  const f=ov.querySelector("#glbf");if(f)f.onsubmit=async e=>{e.preventDefault();const t=ov.querySelector("#glbnew"),text=t.value.trim();if(!text)return;
    const me=meSp(sc.id);const who=me?{k:me.k,name:pcSplit(me.name||"").name}:S.canAdmin?{k:"",name:(site().nicks||[])[0]||"주인"}:null;
    if(!who){toast("먼저 내가 누구인지 골라 주세요");mePicker(sc);return;}
    t.value="";
    try{if(!S.authUser)await S.auth.signInAnonymously();
      await S.db.collection("comments").add({scid:sc.id,sid:"gal",bid:p.id,k:who.k,name:who.name,uid:myUid(),text:text.slice(0,2000),created:Date.now(),updated:Date.now()});}
    catch(err){t.value=text;toast("댓글을 달지 못했어요"+(err.code==="permission-denied"?" (권한이 없어요)":""));}};
}
function galStep(d){const {L,i}=galCur();if(!L.length)return;galOpenAt(L[(i+d+L.length)%L.length].id);}
document.addEventListener("keydown",e=>{if(!S.galOpen||e.target.matches("input,textarea"))return;
  if(e.key==="Escape")galClose();else if(e.key==="ArrowLeft")galStep(-1);else if(e.key==="ArrowRight")galStep(1);});
window.addEventListener("hashchange",()=>{if(S.galOpen)galClose();});
