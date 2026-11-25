// 녹음 줄이기: 올리기 전에 브라우저 안에서 녹음을 opus(webm, 모노 24kbps)로 바꿔요.
// 말소리는 이 정도로도 충분히 또렷하고, 보통 원본의 1/2~1/3 크기가 돼요.
// 지원 안 되는 브라우저·형식이거나 별로 안 줄어들면 null을 돌려주고, 그럼 원본을 그대로 올려요.
(function(){
const OUT_RATE=48000,BITRATE=24000;
const base=(document.currentScript&&document.currentScript.src||"").replace(/[^/]*$/,"");
const loaded={};
function load(src){return loaded[src]||(loaded[src]=new Promise((ok,no)=>{const s=document.createElement("script");s.src=base+src;s.onload=ok;s.onerror=()=>{delete loaded[src];no(new Error(src+" 를 불러오지 못했어요"));};document.head.appendChild(s);}));}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function canEncode(){
  if(typeof AudioEncoder==="undefined"||typeof AudioDecoder==="undefined"||typeof AudioData==="undefined")return false;
  try{return !!(await AudioEncoder.isConfigSupported({codec:"opus",sampleRate:OUT_RATE,numberOfChannels:1,bitrate:BITRATE})).supported;}catch(e){return false;}
}

// ----- 출력: 모노로 섞고 48kHz로 맞춰서 opus로 -----
function makeSink(inRate,onErr){
  const muxer=new WebMMuxer.Muxer({target:new WebMMuxer.ArrayBufferTarget(),audio:{codec:"A_OPUS",sampleRate:OUT_RATE,numberOfChannels:1},firstTimestampBehavior:"offset"});
  const enc=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m),error:onErr});
  enc.configure({codec:"opus",sampleRate:OUT_RATE,numberOfChannels:1,bitrate:BITRATE});
  const step=inRate/OUT_RATE;let t=0,carry=null,frame=new Float32Array(OUT_RATE),fill=0,ts=0;
  const push=()=>{if(!fill)return;const d=frame.slice(0,fill);
    const ad=new AudioData({format:"f32",sampleRate:OUT_RATE,numberOfFrames:fill,numberOfChannels:1,timestamp:Math.round(ts),data:d});
    enc.encode(ad);ad.close();ts+=fill/OUT_RATE*1e6;fill=0;};
  return {
    enc,
    // mono: 새로 들어온 입력 샘플(입력 샘플레이트)
    write(mono){
      let buf=mono;if(carry!==null){buf=new Float32Array(mono.length+1);buf[0]=carry;buf.set(mono,1);}
      if(step===1&&carry===null){for(let i=0;i<buf.length;i++){frame[fill++]=buf[i];if(fill===frame.length)push();}return;}
      const last=buf.length-1;
      while(t<=last-1){const i=Math.floor(t),f=t-i;frame[fill++]=buf[i]*(1-f)+buf[i+1]*f;if(fill===frame.length)push();t+=step;}
      t-=last;carry=buf[last];
    },
    async idle(){while(enc.encodeQueueSize>8)await sleep(5);},
    async finish(){push();await enc.flush();enc.close();muxer.finalize();return new Blob([muxer.target.buffer],{type:"audio/webm"});}
  };
}
function toMono(ad){
  const n=ad.numberOfFrames,ch=ad.numberOfChannels,out=new Float32Array(n);
  const tmp=ch>1?new Float32Array(n):out;
  for(let c=0;c<ch;c++){ad.copyTo(tmp,{planeIndex:c,format:"f32-planar"});if(ch>1)for(let i=0;i<n;i++)out[i]+=tmp[i]/ch;}
  return out;
}
// 디코더 하나로 압축된 덩어리들을 풀어서 sink로
async function viaDecoder(cfg,chunks,inRate,onProg){
  if(!(await AudioDecoder.isConfigSupported(cfg)).supported)return null;
  let err=null;const sink=makeSink(inRate,e=>err=e);
  const dec=new AudioDecoder({output:ad=>{try{sink.write(toMono(ad));}catch(e){err=e;}ad.close();},error:e=>err=e});
  dec.configure(cfg);
  for(let i=0;i<chunks.length;i++){
    if(err)throw err;
    dec.decode(chunks[i]);
    if(dec.decodeQueueSize>16||sink.enc.encodeQueueSize>8){while(dec.decodeQueueSize>4)await sleep(2);await sink.idle();}
    if(i%400===0){onProg&&onProg(i/chunks.length);await sleep(0);}
  }
  await dec.flush();dec.close();if(err)throw err;
  return await sink.finish();
}

// ----- m4a / mp4 (클로바노트·휴대폰 녹음) -----
async function fromMp4(file,onProg){
  await load("vendor/mp4box.all.min.js");
  const buf=await file.arrayBuffer();buf.fileStart=0;
  const mp4=MP4Box.createFile();let info=null,trackId=null;const samples=[];
  mp4.onReady=i=>{info=i;const t=i.audioTracks[0];if(!t)return;trackId=t.id;mp4.setExtractionOptions(t.id,null,{nbSamples:1e9});mp4.start();};
  mp4.onSamples=(id,u,ss)=>{for(const s of ss)samples.push(s);};
  mp4.appendBuffer(buf);mp4.flush();
  if(!info||trackId===null||!samples.length)return null;
  const t=info.audioTracks[0],trak=mp4.getTrackById(trackId);
  const entry=trak.mdia.minf.stbl.stsd.entries[0];
  let desc=entry&&entry.esds&&entry.esds.esd&&entry.esds.esd.descs&&entry.esds.esd.descs[0]&&entry.esds.esd.descs[0].descs&&entry.esds.esd.descs[0].descs[0]&&entry.esds.esd.descs[0].descs[0].data;
  const rate=t.audio.sample_rate,ch=t.audio.channel_count;
  const cfg={codec:t.codec==="mp4a.40"?"mp4a.40.2":t.codec,sampleRate:rate,numberOfChannels:ch,...(desc?{description:desc}:{})};
  const chunks=samples.map(s=>new EncodedAudioChunk({type:"key",timestamp:Math.round(s.cts*1e6/s.timescale),duration:Math.round(s.duration*1e6/s.timescale),data:s.data}));
  return viaDecoder(cfg,chunks,rate,onProg);
}

// ----- mp3 -----
const BR={1:[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],2:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]};
const SR={3:[44100,48000,32000],2:[22050,24000,16000],0:[11025,12000,8000]};
async function fromMp3(file,onProg){
  const b=new Uint8Array(await file.arrayBuffer());let p=0;
  if(b[0]===0x49&&b[1]===0x44&&b[2]===0x33)p=10+((b[6]&127)<<21|(b[7]&127)<<14|(b[8]&127)<<7|(b[9]&127));
  const chunks=[];let rate=0,ch=0,ts=0;
  while(p+4<=b.length){
    if(b[p]!==0xFF||(b[p+1]&0xE0)!==0xE0){p++;continue;}
    const ver=(b[p+1]>>3)&3,layer=(b[p+1]>>1)&3,bri=b[p+2]>>4,sri=(b[p+2]>>2)&3,pad=(b[p+2]>>1)&1,mode=b[p+3]>>6;
    if(ver===1||layer!==1||bri===0||bri===15||sri===3){p++;continue;}
    const kbps=BR[ver===3?1:2][bri],sr=SR[ver][sri],spf=ver===3?1152:576;
    const len=Math.floor((ver===3?144:72)*kbps*1000/sr)+pad;
    if(len<4||p+len>b.length)break;
    if(!rate){rate=sr;ch=mode===3?1:2;}
    chunks.push(new EncodedAudioChunk({type:"key",timestamp:Math.round(ts),duration:Math.round(spf/sr*1e6),data:b.subarray(p,p+len)}));
    ts+=spf/sr*1e6;p+=len;
  }
  if(!chunks.length)return null;
  return viaDecoder({codec:"mp3",sampleRate:rate,numberOfChannels:ch},chunks,rate,onProg);
}

// ----- wav (PCM) -----
async function fromWav(file,onProg){
  const ab=await file.arrayBuffer(),v=new DataView(ab);
  if(v.getUint32(0,false)!==0x52494646||v.getUint32(8,false)!==0x57415645)return null;
  let p=12,fmt=null,data=null;
  while(p+8<=v.byteLength){const id=v.getUint32(p,false),sz=v.getUint32(p+4,true);
    if(id===0x666d7420)fmt={tag:v.getUint16(p+8,true),ch:v.getUint16(p+10,true),rate:v.getUint32(p+12,true),bits:v.getUint16(p+22,true)};
    else if(id===0x64617461)data={o:p+8,n:Math.min(sz,v.byteLength-p-8)};
    p+=8+sz+(sz&1);}
  if(!fmt||!data||!(fmt.tag===1&&(fmt.bits===16||fmt.bits===24)||fmt.tag===3&&fmt.bits===32))return null;
  let err=null;const sink=makeSink(fmt.rate,e=>err=e);
  const bps=fmt.bits/8,frameB=bps*fmt.ch,total=Math.floor(data.n/frameB),BLK=fmt.rate;
  for(let f0=0;f0<total;f0+=BLK){
    const n=Math.min(BLK,total-f0),m=new Float32Array(n);
    for(let i=0;i<n;i++){let s=0;for(let c=0;c<fmt.ch;c++){const o=data.o+(f0+i)*frameB+c*bps;
      s+=fmt.tag===3?v.getFloat32(o,true):fmt.bits===16?v.getInt16(o,true)/32768:((v.getUint8(o)|v.getUint8(o+1)<<8|v.getInt8(o+2)<<16)/8388608);}
      m[i]=s/fmt.ch;}
    sink.write(m);await sink.idle();if(err)throw err;onProg&&onProg(f0/total);
  }
  return await sink.finish();
}

// 바꿀 수 있으면 {blob, name}, 아니면 null
window.compressAudio=async function(file,onProg){
  const ext=(file.name.match(/\.([a-z0-9]+)$/i)||[,""])[1].toLowerCase();
  if(!/^(m4a|mp4|aac|mp3|wav)$/.test(ext))return null;
  if(!(await canEncode()))return null;
  await load("vendor/webm-muxer.js");
  let blob=null;
  try{
    blob=ext==="mp3"?await fromMp3(file,onProg):ext==="wav"?await fromWav(file,onProg):await fromMp4(file,onProg);
  }catch(e){console.warn("녹음 줄이기 실패, 원본을 올려요",e);return null;}
  if(!blob||blob.size<1000)return null;
  // 거의 안 줄면 원본이 낫다
  if(blob.size>file.size*0.85)return null;
  onProg&&onProg(1);
  return {blob,name:file.name.replace(/\.[^.]+$/,"")+".webm"};
};
})();
