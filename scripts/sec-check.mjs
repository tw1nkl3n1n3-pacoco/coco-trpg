// 보안 점검: 로그인 안 한 사람 / 익명 사용자가 비밀번호 없이 로그를 읽을 수 있는지 확인
import fs from "node:fs";
const cfg=fs.readFileSync("firebase-config.js","utf8");
const key=cfg.match(/"?apiKey"?\s*:\s*"([^"]+)"/)[1], pid=cfg.match(/"?projectId"?\s*:\s*"([^"]+)"/)[1];
const base=`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`;
async function get(path,tok){const r=await fetch(`${base}/${path}${path.includes("?")?"&":"?"}key=${key}`,{headers:tok?{Authorization:"Bearer "+tok}:{}});return [r.status,(await r.text()).slice(0,120).replace(/\s+/g," ")];}
async function run(path,body,tok){const r=await fetch(`${base}:runQuery?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json",...(tok?{Authorization:"Bearer "+tok}:{})},body:JSON.stringify(body)});return [r.status,(await r.text()).slice(0,160).replace(/\s+/g," ")];}
const anon=await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({returnSecureToken:true})})).json();
const tok=anon.idToken;console.log("anon sign-in:",tok?"ok":JSON.stringify(anon).slice(0,200));
const sc=await (await fetch(`${base}/scenarios?key=${key}`)).json();
const ids=(sc.documents||[]).map(d=>d.name.split("/").pop()).filter(x=>!x.startsWith("_"));
console.log("scenarios:",ids.join(","));
for(const [who,t] of [["no-auth",null],["anon",tok]]){
  console.log(`[${who}] sessions list`,...await get("sessions?pageSize=1",t));
  for(const id of ids){
    console.log(`[${who}] query sessions scid==${id}`,...await run("",{structuredQuery:{from:[{collectionId:"sessions"}],where:{fieldFilter:{field:{fieldPath:"scid"},op:"EQUAL",value:{stringValue:id}}},limit:1}},t));
  }
  console.log(`[${who}] secrets`,...await get(`secrets/${ids[0]}`,t));
  console.log(`[${who}] unlocks list`,...await get("unlocks?pageSize=5",t));
}
