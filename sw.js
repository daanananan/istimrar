const V='istimrar-v47', FONTS='istimrar-fonts';
const MUST=['./','./index.html'];
const EXTRA=['./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./apple-touch-icon-152.png','./apple-touch-icon-167.png','./apple-touch-icon-180.png'];
// ردّ نظيف: بدون علامة إعادة التوجيه التي تمنع استخدام الرد المحفوظ لتصفّح الصفحة
async function clean(res){ if(!res.redirected) return res; const b=await res.blob(); return new Response(b,{status:200,statusText:'OK',headers:res.headers}); }
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(V);
  // الصفحة نفسها إلزامية، والأيقونات اختيارية: غيابها لا يفسد التثبيت أبدًا
  for(const u of MUST){ const r=await fetch(new Request(u,{cache:'reload'})); if(!r.ok) throw new Error('fail '+u); await c.put(u,await clean(r)); }
  await Promise.all(EXTRA.map(u=>fetch(u,{cache:'reload'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null)));
  await self.skipWaiting();
})());});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return; const u=new URL(r.url);
  if(u.origin===location.origin){
    const nav=r.mode==='navigate';
    const fromCache=async()=>{ const c=await caches.open(V); let m=await c.match(r,{ignoreSearch:true}); if(!m&&nav) m=await c.match('./index.html'); if(!m) m=await c.match('./index.html'); return m||Response.error(); };
    const net=fetch(r).then(async res=>{ if(res&&res.ok&&res.type==='basic'){ const cp=await clean(res.clone()); const key=nav?'./index.html':r; e.waitUntil(caches.open(V).then(c=>c.put(key,cp)).catch(()=>{})); } return res; });
    // الشبكة أولًا لكن بمهلة قصيرة للصفحة حتى لا تعلق عند ضعف الإشارة، ثم المحفوظ
    const timed=nav?Promise.race([net,new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),3500))]):net;
    e.respondWith(timed.catch(()=>fromCache()));
  }else if(/fonts\.(googleapis|gstatic)\.com$/.test(u.host)){
    e.respondWith(caches.open(FONTS).then(c=>c.match(r).then(m=>{const f=fetch(r).then(res=>{c.put(r,res.clone());return res;}).catch(()=>m);return m||f;})));
  }
});
