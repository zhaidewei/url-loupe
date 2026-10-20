import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {openStore} from './store.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const categories=new Set(['impersonation','phishing','redirect','other']);
export function normalizeHost(value){
 if(typeof value!=='string'||!value.trim()||value.length>4096)throw Error('请输入有效网址或域名。');
 const url=new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value)?value:'https://'+value);
 if(!['http:','https:'].includes(url.protocol)||!url.hostname.includes('.')||url.hostname.length>253)throw Error('请输入有效 HTTP(S) 域名。');
 return url.hostname.replace(/\.$/,'');
}
export async function createApp({dbPath=resolve(root,'runtime/reports.sqlite'),publicOrigin=null}={}){
 const store=openStore(dbPath);const salt=randomBytes(32).toString('hex');const assetRoot=resolve(root,'public');
 const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";
 const server=http.createServer(async(req,res)=>{
  const send=(status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));};
  res.setHeader('Content-Security-Policy',csp);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  let url;
  try{url=new URL(req.url,'http://'+req.headers.host);}catch{return send(400,{error:'请求无效。'});}
  const permitted=publicOrigin ? new URL(publicOrigin).host===req.headers.host : /^127\.0\.0\.1(?::\d+)?$|^localhost(?::\d+)?$|^\[::1\](?::\d+)?$/.test(req.headers.host||'');
  if(!permitted)return send(403,{error:'主机名未配置。'});
  try{
   if(req.method==='GET'&&url.pathname==='/api/blacklist')return send(200,{entries:store.published(),scope:'exact_host',updatedAt:new Date().toISOString()});
   if(url.pathname==='/api/reports'){
    if(req.method!=='POST')return send(405,{error:'此入口仅接收举报。'});
    const expected=publicOrigin||url.origin;
    if(req.headers.origin!==expected)return send(403,{error:'请从本站提交。'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'请求格式无效。'});
    const key=createHash('sha256').update(salt+(req.socket.remoteAddress||'')).digest('hex');
    if(!store.limit(key))return send(429,{error:'提交过于频繁，请十分钟后重试。'});
    let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>16384){send(413,{error:'内容过长。'});return;}body+=chunk.toString();}
    let input;try{input=JSON.parse(body);}catch{return send(400,{error:'请求格式无效。'});}
    if(input.website)return send(400,{error:'提交无效。'});
    let host;try{host=normalizeHost(input.host);}catch{return send(400,{error:'请输入有效域名。'});}
    if(!categories.has(input.category)||typeof input.evidence!=='string'||input.evidence.trim().length<10||input.evidence.length>2000)return send(400,{error:'请选择原因，并填写 10–2000 字的举报依据。'});
    return send(201,store.submit({host,category:input.category,evidence:input.evidence.trim()}));
   }
   if(url.pathname.startsWith('/api/'))return send(404,{error:'未找到。'});
   if(!['GET','HEAD'].includes(req.method))return send(405,{error:'请求方法无效。'});
   let decoded;try{decoded=decodeURIComponent(url.pathname);}catch{return send(400,{error:'路径无效。'});}
   const path=resolve(assetRoot,'.'+(decoded==='/'?'/index.html':decoded));
   if(!path.startsWith(assetRoot+sep))return send(403,{error:'禁止访问。'});
   const info=await stat(path);if(!info.isFile())return send(404,{error:'未找到。'});
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
   res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:await readFile(path));
  }catch(error){if(!res.headersSent)send(error.code==='ENOENT'?404:500,{error:error.code==='ENOENT'?'未找到。':'服务暂不可用，请稍后重试。'});else res.end();}
 });
 server.on('close',()=>store.close());return {server,store};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {server}=await createApp({dbPath:process.env.HOST_LENS_DB||resolve(root,'runtime/reports.sqlite'),publicOrigin:process.env.PUBLIC_ORIGIN||null});
 const host=process.env.HOST||'127.0.0.1';const port=Number(process.env.PORT||4173);
 if(host!=='127.0.0.1'&&host!=='localhost'&&!process.env.PUBLIC_ORIGIN)throw Error('对外监听前必须设置 PUBLIC_ORIGIN。');
 server.listen(port,host,()=>console.log(`Host Lens: http://${host}:${server.address().port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
