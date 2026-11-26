// 코코 로그방 · 온라인 로그 가져오기 (코코포리아·롤20 html 읽기 · 올리기 창 · 회차 만들기)
// (js/ 파일들은 한 덩어리처럼 이어서 읽어요 · 순서는 index.html)
// ---------- 코코포리아 로그(html) 가져오기 ----------
// 녹음 없는 온라인 세션용. 채널은 메인 + 잡담(정보 탭만 빼요), 3시간 넘게 비면 다른 회차로 나눠요.
function parseCcfolia(text){
  const doc=new DOMParser().parseFromString(text,"text/html");
  const arts=[...doc.querySelectorAll("article.message")];
  if(!arts.length)return null;
  let last=null;
  const msgs=arts.map(a=>{
    const sp=a.querySelector(".speaker"),tm=a.querySelector("time[datetime]"),tx=a.querySelector(".message-text"),rr=a.querySelector(".roll-result");
    let x="";if(tx){const c=tx.cloneNode(true);c.querySelectorAll("br").forEach(b=>b.replaceWith("\n"));x=c.textContent.trim();}
    const t=tm?Date.parse(tm.getAttribute("datetime")):last;last=t;
    const col=sp&&(sp.getAttribute("style")||"").match(/--speaker-color:\s*([^;"]+)/);
    const cn=(a.querySelector(".channel-name")?.textContent||"").replace(/[\[\]]/g,"").trim();
    return {sys:a.classList.contains("system"),ch:a.dataset.channel||"main",cn,sp:sp?sp.textContent.trim():"",c:col?col[1].trim():"",t,x,
      rc:rr?([...rr.classList].find(c=>c!=="roll-result")||""):null,rr:rr?rr.textContent.trim():null};
  }).filter(m=>m.t);
  const use=msgs.filter(m=>m.ch!=="info");
  const days=[];
  use.forEach(m=>{if(!days.length||m.t-days[days.length-1].at(-1).t>3*3600e3)days.push([]);days[days.length-1].push(m);});
  // PC 찾기: HP 말고도 침식률·로이스 같은 상태값을 2가지 이상 기록하는 캐릭터
  const st={},order=[];
  msgs.forEach(m=>{if(!m.sys)return;const g=m.x.match(/^\[\s*(.+?)\s*\]\s*(\S+)/);if(g){(st[g[1]]=st[g[1]]||new Set()).add(g[2]);if(!order.includes(g[1]))order.push(g[1]);}});
  const pcs=order.filter(n=>st[n].size>=2);
  const cnt={};use.forEach(m=>{if(m.sp&&!m.sys)cnt[m.sp]=(cnt[m.sp]||0)+1;});
  const gmName=Object.keys(cnt).filter(n=>/(^|\W)GM(\W|$)/i.test(n)).sort((a,b)=>cnt[b]-cnt[a])[0]||"";
  const isDX=msgs.some(m=>/침식률|侵蝕率/.test(m.x))||msgs.some(m=>m.rr&&/\d+dx/i.test(m.x));
  const title=(doc.title||"").replace(/\[(すべて|全て|all|전체|ALL)\]/gi,"").replace(/^\s*\[[^\]]*\]\s*/,"").trim()||"코코포리아 로그";
  return {title,days,pcs,cnt,gmName,system:isDX?"더블크로스 3rd":""};
}
// ---------- 롤20 로그(html) 가져오기 ----------
// 게임 → Chat Archive 페이지를 '웹페이지, 완료'(또는 HTML만)로 저장한 파일. 코코포리아와 같은 모양으로 바꿔서 같은 화면으로 올려요.
// · 같은 사람이 이어 말하면 이름이 빠져 있어서 앞사람 이름을 이어 써요 · 시각은 메시지 id(파이어베이스 push id)에 ms로 들어 있어요
// · /desc·/em은 상황 묘사, 굴림은 주사위, 지워진 메시지는 빼요 · 플레이어 프로필 사진으로 말한 이름은 잡담으로 짐작해요
const R20_RES=/(대실패|대성공|극단적\s*성공|어려운\s*성공|보통\s*성공|크리티컬|스페셜|펌블|성공|실패|Critical|Fumble|Special|Success|Failure|Fail)/i;
const R20_ID="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
function r20Time(id){if(!id||id.length<8)return 0;let t=0;for(let i=0;i<8;i++){const v=R20_ID.indexOf(id[i]);if(v<0)return 0;t=t*64+v;}return t;}
function r20Text(el){const c=el.cloneNode(true);c.querySelectorAll(".spacer,.avatar,.tstamp,.by,.flyout").forEach(x=>x.remove());
  c.querySelectorAll("br").forEach(b=>b.replaceWith("\n"));
  // 롤 템플릿(표): 제목 줄 + '이름: 값' 줄
  c.querySelectorAll("table").forEach(tb=>{const L=[];const cap=tb.querySelector("caption");if(cap)L.push(cap.textContent.trim());
    tb.querySelectorAll("tr").forEach(tr=>{const cs=[...tr.children].map(x=>x.textContent.trim().replace(/\s*[:：]$/,"")).filter(Boolean);if(cs.length)L.push(cs.join(": "));});tb.replaceWith("\n"+L.join("\n")+"\n");});
  // 시트 롤 템플릿은 줄마다 들여쓰기·빈 줄이 많아서 줄을 추리고, '·'만 있는 줄은 앞뒤를 이어요
  if(el.querySelector('[class*="rolltemplate"]')){const L=c.textContent.split("\n").map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean),o=[];
    for(let i=0;i<L.length;i++){if(L[i]==="·"&&o.length&&i+1<L.length){o[o.length-1]+=" · "+L[++i];}else o.push(L[i]);}return o.join("\n");}
  return c.textContent.replace(/\t+/g," ").replace(/[ ]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();}
// 로그 글에 룰 이름이 그대로 적혀 있을 때만 채워요 (짐작으로 지어내지 않아요)
function ccGuessSys(msgs,title){const hay=title+"\n"+msgs.filter(m=>m.sys).slice(0,80).map(m=>m.x).join("\n");
  for(const [re,n] of [[/마기카로기아|マギカロギア/,"마기카로기아"],[/인세인|インセイン/,"인세인"],[/더블\s*크로스|ダブルクロス/,"더블크로스 3rd"],[/새터데이\s*나이트|サタスペ/,"사타스페"]])if(re.test(hay))return n;return "";}
function parseRoll20(text){
  if(!/textchatcontainer/.test(text)||!/class="message/.test(text))return null;
  const doc=new DOMParser().parseFromString(text,"text/html");
  const els=[...doc.querySelectorAll("#textchat .content > .message, .textchatcontainer .content > .message")];
  if(!els.length)return null;
  const userAv=src=>/(^|\/)30(\(\d+\))?(\?.*)?$|users\/avatar/.test(src||"");
  let sp="",av="",last=0;const msgs=[],avOf={},rolled=new Set(),pidOf={},youN={},allN={};
  // 롤20이 같은 메시지를 두 번 그려 둔 파일이 있어서 메시지 id로 한 번만
  const seen=new Set();
  for(const e of els){const cl=e.classList;if(cl.contains("hidden-message"))continue;
    const mid=e.dataset.messageid;if(mid){if(seen.has(mid))continue;seen.add(mid);}
    const by=e.querySelector(":scope > .by");
    if(by){sp=by.textContent.trim().replace(/\s*:\s*$/,"");const im=e.querySelector(":scope > .avatar img");av=im?im.getAttribute("src")||"":"";}
    let t=r20Time(e.dataset.messageid);if(!t){const ts=e.querySelector(":scope > .tstamp");t=ts?Date.parse(ts.textContent)||last:last;}
    if(!t)continue;last=t;
    if(cl.contains("desc")||cl.contains("emote")){const x=r20Text(e);if(x&&x!=="-")msgs.push({sys:true,ch:"main",cn:"",sp:"",c:"",t,x,rc:null,rr:null,r20:1});continue;}
    if(cl.contains("rollresult")){const f=(e.querySelector(".formula")?.textContent||"").replace(/^rolling\s*/i,"").trim();
      const dice=[...e.querySelectorAll(".diceroll .didroll")].map(d=>d.textContent.trim());const tot=(e.querySelector(".rolled")?.textContent||"").trim();
      // 롤20은 주사위 하나하나의 최대·최소 눈만 표시해서, 성공·펌블 판정은 룰마다 달라 넣지 않아요
      const crit="";
      if(sp){rolled.add(sp);const pid=e.dataset.playerid;if(pid)(pidOf[pid]=pidOf[pid]||new Set()).add(sp);}msgs.push({sys:false,ch:"main",cn:"",sp,c:"",t,x:f+(dice.length>1?` (${dice.join("+")})`:""),rc:crit,rr:tot});continue;}
    const pid=e.dataset.playerid;
    if(sp&&cl.contains("general")){allN[sp]=(allN[sp]||0)+1;if(cl.contains("you"))youN[sp]=(youN[sp]||0)+1;}
    // 시트 롤 템플릿 안에 굴린 주사위가 있으면 주사위 블록으로 (룰마다 템플릿 모양이 달라서, 글은 그대로 두고 굴린 눈만 따로 뽑아요)
    const tp=e.querySelector('[class*="rolltemplate"]');
    if(tp&&tp.querySelector(".inlinerollresult")&&sp){let x=r20Text(e).split("\n");if(x[0]===sp)x.shift();
      const dice=[...tp.querySelectorAll(".inlinerollresult")].filter(r=>/\dd\d/i.test(r.getAttribute("title")||"")).map(r=>r.textContent.trim());
      // 판정 결과 글(성공·실패 등)이 템플릿에 있으면 결과 옆에 붙이고 색도 맞춰요
      const res=x.map(l=>l.match(R20_RES)).find(Boolean);const rt=res?res[0]:"";
      const oc=!rt?"":/대실패|펌블|fumble/i.test(rt)?"fumble":/실패|fail/i.test(rt)?"failure":/대성공|극단적|크리티컬|스페셜|critical|special|extreme/i.test(rt)?"critical":"success";
      if(rt)x=x.filter(l=>!l.includes(rt));
      const prev=msgs.at(-1),xs=x.join("\n"),rr=dice.join(", ")+(rt?" ＞ "+rt:"");
      // 같은 템플릿이 두 번 찍힌 경우(귓속말 사본 등)는 하나만
      if(prev&&prev.sp===sp&&prev.x===xs&&prev.rr===rr&&t-prev.t<10000)continue;
      msgs.push({sys:false,ch:"main",cn:"",sp,c:"",t,x:xs,rc:oc,rr,r20:1});continue;}
    const x=r20Text(e);if(!x||!sp)continue;
    if(!(sp in avOf))avOf[sp]=av;
    msgs.push({sys:false,ch:"main",cn:"",sp,c:"",t,x,rc:null,rr:null});}
  if(!msgs.length)return null;
  const days=[];msgs.forEach(m=>{if(!days.length||m.t-days[days.length-1].at(-1).t>3*3600e3)days.push([]);days[days.length-1].push(m);});
  const cnt={};msgs.forEach(m=>{if(m.sp&&!m.sys)cnt[m.sp]=(cnt[m.sp]||0)+1;});
  const gms=Object.keys(cnt).filter(n=>/\(GM\)$|(^|\W)GM(\W|$)/i.test(n));
  const gmName=gms.sort((a,b)=>cnt[b]-cnt[a])[0]||"";
  const ooc=Object.keys(cnt).filter(n=>!gms.includes(n)&&userAv(avOf[n]));
  // PC 짐작: 저장한 사람(you)이 GM이면 다른 계정이 말한 캐릭터가 PC, PL이면 내가 말한 캐릭터 + 다른 계정 중 많이 말한 캐릭터
  const mine=n=>(youN[n]||0)*2>(allN[n]||0);
  const chars=Object.keys(cnt).filter(n=>!ooc.includes(n)&&!gms.includes(n)),top=Math.max(1,...chars.map(n=>cnt[n]));
  const iAmGM=gms.some(mine);
  const pcs=chars.filter(n=>iAmGM?!mine(n)&&cnt[n]>=top*.2:mine(n)||cnt[n]>=top*.2);
  // 같은 플레이어 계정으로 PC 이름과 본인 이름을 둘 다 쓴 적이 있으면 그 PC의 플레이어로 짐작
  const plOf={};Object.values(pidOf).forEach(set=>{const a=[...set],pc=a.filter(n=>pcs.includes(n)),me=a.filter(n=>ooc.includes(n));if(me.length===1)pc.forEach(n=>plOf[n]=me[0]);});
  // 내가 PL이면 내 PC의 플레이어는 내 닉네임 (사이트 설정의 '내 닉네임'에 있는 이름을 먼저)
  if(!iAmGM){const myO=ooc.filter(mine),nk=new Set((site().nicks||[]).map(x=>String(x).trim()));const me=myO.find(n=>nk.has(n))||myO.sort((a,b)=>cnt[b]-cnt[a])[0];
    if(me)pcs.filter(mine).forEach(n=>{if(!plOf[n])plOf[n]=me;});}
  const title=(doc.title||"").replace(/^\s*Chat Log for\s*/i,"").trim()||"롤20 로그";
  const sys=ccGuessSys(msgs,title)||(doc.querySelector('[class*="rolltemplate-coc"]')&&/극단적\s*성공|어려운\s*성공/.test(text)?"크툴루의 부름 7판":"");
  // 크툴루에 PC가 둘 이하이면 타이만(1:1)으로 짐작
  const tai=/크툴루|cthulhu|coc/i.test(sys+" "+title)&&pcs.length<=2;
  return {title,days,pcs,cnt,gmName,gms,ooc,plOf,system:sys,src:"roll20",tai};
}
const CC_TABLE=/^[◎「『《【◆▶]|\d*D\d+|이벤트표|정보\s*조사|주의사항|트레일러/;
function ccRole(cc,name){if(cc.gms&&cc.gms.includes(name))return "gm";if(cc.ooc&&cc.ooc.includes(name))return "ooc";if(name===cc.gmName||/^\W*GM\W*$/i.test(name))return "gm";if(cc.pcs.includes(name))return "pc";if(cc.src!=="roll20"&&CC_TABLE.test(name))return "hand";return "npc";}
function ccResult(r){let p=r.split("＞").map(x=>x.trim());if(p.length>1&&p[0].startsWith("("))p=p.slice(1);return p.filter(x=>x&&!/^(成功|失敗|ファンブル|クリティカル|スペシャル)$/.test(x)).join(" → ");}
function ccOutcome(m){const r=m.rr||"";if(m.r20)return m.rc||"";if(/ファンブル/.test(r)||m.rc==="fumble")return "fumble";if(/失敗/.test(r))return "failure";if(/成功/.test(r))return m.rc==="critical"?"critical":"success";return "";}
const kst=t=>{const d=new Date(t+9*3600e3);return d.toISOString().slice(0,10);};
// 한 회차를 로그방 블록으로
function ccBuild(day,cfg){
  const keyOf={},sp=[];
  const spk=(name,ch)=>{const id=name+"\u0001"+(ch||"");if(!keyOf[id]){const k="k"+rid();keyOf[id]=k;sp.push({k,name,...(ch?{ch}:{}),c:COLORS[sp.length%COLORS.length]});}return keyOf[id];};
  const gmK=spk(cfg.gmNick||"GM");
  const who=name=>{const r=cfg.roles[name]||"npc";
    // 타이만(1:1 자캐): 캐릭터는 플레이어 없이 캐릭터 이름만
    if(cfg.tai&&r!=="gm"&&r!=="ooc"){const k=spk(name);const o=sp.find(x=>x.k===k);if(o)o.chr=1;return {k};}
    if(r==="pc")return {k:spk(cfg.players[name]||name,name)};
    if(r==="gm")return {k:gmK};
    return {k:gmK,a:name};};
  const main0=day.find(m=>m.ch==="main"&&!m.sys)||day[0];
  const t0=main0.t,out=[];
  for(const m of day){
    const t=Math.round((m.t-t0)/1000),tab=m.ch==="main"?null:(m.cn||"잡담");
    const extra=tab?{tab}:{};
    // 코코포리아 시스템 메시지는 상태값 줄, 롤20 /desc·/em은 보통 상황 묘사
    if(m.sys){out.push({id:rid(),s:NOTE,t,x:m.x,...(m.r20?{}:{st:1}),...extra});continue;}
    const role=cfg.roles[m.sp]||"npc";
    // 롤20: 플레이어 이름으로 한 말은 잡담 탭으로
    if(role==="ooc"&&m.rr===null){if(m.x)out.push({id:rid(),s:spk(m.sp),t,x:m.x,tab:"잡담"});continue;}
    // 타이만: GM 본인 이름으로 한 말도 잡담
    if(cfg.tai&&role==="gm"&&m.rr===null){if(m.x)out.push({id:rid(),s:gmK,t,x:m.x,tab:"잡담"});continue;}
    if(m.rr!==null){const w=who(m.sp),o=ccOutcome(m);
      out.push({id:rid(),s:DICE,t,w:w.k,...(w.a?{a:w.a}:{}),x:m.x,r:ccResult(m.rr),...(o?{o}:{}),...extra});continue;}
    if(role==="hand"){const p=out.at(-1);
      if(p&&p.s===HAND&&p.ti===m.sp&&t-p.t<120)p.x+="\n"+m.x;else out.push({id:rid(),s:HAND,t,ti:m.sp,x:m.x,...extra});continue;}
    if(!m.x)continue;
    const w=who(m.sp);out.push({id:rid(),s:w.k,t,x:m.x,...(w.a?{a:w.a}:{}),...extra});
  }
  const chunks=[];for(let i=0;i<out.length;i+=CHUNK)chunks.push(out.slice(i,i+CHUNK));
  return {meta:{title:`${cfg.scen} ${kst(t0)}`,date:kst(t0),t0,created:Date.now(),n:out.length,sp,src:cfg.src||"ccfolia",scen:cfg.scen,day:kst(t0),part:cfg.part||1},chunks,gmName:cfg.gmNick||"GM"};
}
function ccForm(cc,box,opt={}){
  const ex=findScen(opt.scen||cc.title);
  const hm=t=>{const d=new Date(t+9*3600e3);return d.toISOString().slice(11,16);};
  const days=cc.days.map((d,i)=>{const talk=d.filter(m=>!m.sys&&m.x);return {i,d,n:d.filter(m=>!m.sys).length,date:kst((d.find(m=>m.ch==="main")||d[0]).t),from:hm(d[0].t),to:hm(d.at(-1).t),first:(talk.find(m=>m.x.length>4)||talk[0]||{}).x||""};});
  const ord={gm:0,pc:1,npc:2,hand:3,ooc:4},roleName={gm:"GM 본인",pc:"PC",npc:"GM 캐릭터",hand:"핸드아웃",ooc:"잡담 (PL 본인)"};
  const names=Object.keys(cc.cnt).sort((a,b)=>ord[ccRole(cc,a)]-ord[ccRole(cc,b)]||cc.cnt[b]-cc.cnt[a]);
  // 이름마다 처음 한 말 (누군지 알아보기 쉽게)
  const said={};cc.days.flat().forEach(m=>{if(!m.sys&&m.sp&&m.x&&!said[m.sp]&&m.rr===null)said[m.sp]=m.x.split("\n")[0];});
  const exSp=ex?ex.sp:[];
  const gmPrev=ex&&gmKey(ex)?(ex.sp.find(x=>x.k===gmKey(ex))||{}).name:"";
  const gmAuto=gmPrev||String(cc.gmName||"").replace(/\s*\(?\bGM\b\)?\s*/gi," ").trim();
  const opts=[["pc","PC"],["npc","GM 캐릭터"],["gm","GM 본인"],["hand","핸드아웃"],...(cc.src==="roll20"?[["ooc","잡담 (PL 본인)"]]:[])];
  const roleSel=n=>{const r=ccRole(cc,n);return `<select data-role="${esc(n)}">${opts.map(([v,l])=>`<option value="${v}"${v===r?" selected":""}>${l}</option>`).join("")}</select>`;};
  const total=days.reduce((a,x)=>a+x.n,0);
  let lastG="";
  box.innerHTML=`<div class="cc-head"><span class="cc-src">${cc.src==="roll20"?"ROLL20":"COCOFOLIA"}</span><b>${esc(cc.title)}</b><small>회차 ${days.length}개 · 대사 ${total.toLocaleString()}줄</small></div>
    <div class="cc-step"><div class="cc-h"><i>1</i>세션 정보</div>
    <div class="fields">
      <label>시나리오<input type="text" id="cc-scen" list="scenlist" value="${esc(ex?ex.name:cc.title)}"></label>
      <datalist id="scenlist">${scenList().map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
      <div class="two"><label>룰<input type="text" id="cc-sys" value="${esc(ex&&ex.system||cc.system)}" placeholder="예: 더블크로스 3rd"></label>
      <label>GM 닉네임<input type="text" id="cc-gm" value="${esc(gmAuto)}" placeholder="GM 닉네임"></label></div>
    </div></div>
    <div class="cc-step"><div class="cc-h"><i>2</i>올릴 회차<span class="tip">3시간 넘게 비는 곳에서 나눴어요</span></div>
      <div class="cc-days">${days.map(x=>`<label class="cc-day"><input type="checkbox" data-day="${x.i}" ${x.n>=30?"checked":""}><span class="cc-dd"><b>${esc(fmtDay(x.date))}</b><small>${x.from}–${x.to} · ${x.n.toLocaleString()}줄</small><em>${esc(x.first.slice(0,60))}</em></span></label>`).join("")}</div></div>
    <div class="cc-step"><div class="cc-h"><i>3</i>등장인물<span class="tip" id="cc-tip"></span></div>
      <label class="cc-tai"><input type="checkbox" id="cc-tai"${cc.tai?" checked":""}><span><b>타이만 (1:1 자캐 세션)</b><small>모든 대사를 캐릭터 이름으로만 보여주고, 플레이어·GM 본인 이름으로 한 말은 모두 잡담으로 넣어요</small></span></label>
      <div class="cc-roles">${names.map(n=>{const g=ccRole(cc,n),pc=exSp.find(x=>x.ch===n),pl=pc?pc.name:(cc.plOf&&cc.plOf[n])||"";
        const hd=g!==lastG?`<div class="cc-g">${roleName[g]}</div>`:"";lastG=g;
        return hd+`<div class="cc-r"><div class="cc-nm"><span class="cc-n" title="${esc(n)}">${esc(n)}</span><small>${cc.cnt[n].toLocaleString()}줄${said[n]?` · ${esc(said[n].slice(0,40))}`:""}</small></div>${roleSel(n)}<input type="text" data-pl="${esc(n)}" value="${esc(pl)}" placeholder="플레이어 닉네임" list="cc-pls"></div>`;}).join("")}</div>
      <datalist id="cc-pls">${[...new Set([...(cc.ooc||[]),...S.scens.flatMap(s=>(s.sp||[]).map(x=>x.name))])].map(x=>`<option value="${esc(x)}">`).join("")}</datalist></div>
    <div class="cc-go"><div id="iprog" class="tip"></div><button class="pri" id="igo">${S.db&&S.canWrite?"올리기":"미리보기"}</button></div>`;
  if(opt.scen){const cs=$("#cc-scen");cs.value=opt.scen;cs.closest("label").style.display="none";}
  if(opt.system&&!$("#cc-sys").value)$("#cc-sys").value=opt.system;
  // 타이만이면 고를 것은 '캐릭터 / 잡담' 둘뿐: 나머지 선택지는 숨기고 PC 플레이어 칸도 숨겨요
  const sync=()=>{const tai=$("#cc-tai").checked;box.classList.toggle("cc-istai",tai);
    $("#cc-tip").textContent=tai?"캐릭터는 이름만 보여요 · 플레이어·GM 본인 이름은 잡담으로 골라 주세요":'PC는 플레이어 닉네임을 넣어 주세요 · GM 캐릭터는 "GM 닉네임 · 캐릭터 이름"으로 보여요';
    box.querySelectorAll(".cc-r").forEach(r=>{const sel=r.querySelector("select");
      [...sel.options].forEach(o=>{o.hidden=tai&&!["npc","ooc","gm"].includes(o.value);o.textContent=tai?{npc:"캐릭터",ooc:"잡담 (PL 본인)",gm:"잡담 (GM 본인)"}[o.value]||o.textContent:o.dataset.l;});
      if(tai&&(sel.value==="pc"||sel.value==="hand"))sel.value="npc";
      r.querySelector("input").style.visibility=!tai&&sel.value==="pc"?"visible":"hidden";});};
  box.querySelectorAll("[data-role] option").forEach(o=>o.dataset.l=o.textContent);
  $("#cc-tai").onchange=()=>{if(!$("#cc-tai").checked)box.querySelectorAll("[data-role]").forEach(sel=>{const n=sel.dataset.role,r=ccRole(cc,n);if(sel.value==="npc")sel.value=r;});sync();};
  box.querySelectorAll("[data-role]").forEach(s=>s.onchange=sync);sync();
  $("#igo").onclick=async()=>{
    const roles={},players={};
    box.querySelectorAll("[data-role]").forEach(s=>roles[s.dataset.role]=s.value);
    box.querySelectorAll("[data-pl]").forEach(i=>{if(i.value.trim())players[i.dataset.pl]=i.value.trim();});
    const tai=$("#cc-tai").checked;
    const miss=tai?[]:Object.keys(roles).filter(n=>roles[n]==="pc"&&!players[n]);
    if(miss.length){$("#iprog").innerHTML=`<span style="color:var(--bad)">플레이어 닉네임을 넣어 주세요: ${miss.map(esc).join(", ")}</span>`;return;}
    const pick=[...box.querySelectorAll("[data-day]:checked")].map(i=>cc.days[+i.dataset.day]);
    if(!pick.length){$("#iprog").innerHTML=`<span style="color:var(--bad)">올릴 회차를 하나 이상 골라 주세요</span>`;return;}
    const cfg={scen:resolveScen($("#cc-scen").value.trim()||cc.title),system:$("#cc-sys").value.trim(),orig:opt.orig||"",camp:opt.camp||"",gaiden:!!opt.gaiden,gmNick:$("#cc-gm").value.trim()||"GM",roles,players,src:cc.src||"ccfolia",tai};
    if(!(S.db&&S.canWrite)){const b=ccBuild(pick[0],cfg);closeSession();S.local=true;S.sid="local";S.meta=b.meta;b.chunks.forEach((c,i)=>S.chunks[i]=c);rebuild();render();return;}
    let first=null;S.importing=true;
    try{for(let i=0;i<pick.length;i++){
      const d=kst((pick[i].find(m=>m.ch==="main")||pick[i][0]).t);
      const b=ccBuild(pick[i],{...cfg,part:nextPart(cfg.scen,d)});
      const sid=await importBuilt(b,`(${i+1}/${pick.length}) `,cfg);if(!sid)return;first=first||sid;
    }}finally{S.importing=false;}
    location.hash="s-"+first;
  };
}
