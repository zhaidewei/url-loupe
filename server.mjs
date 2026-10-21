import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export async function createApp({publicOrigin=null}={}){
 const assetRoot=resolve(root,'public');
 const headerText=await readFile(resolve(assetRoot,'_headers'),'utf8');
 const headers=Object.fromEntries(headerText.split('\n').filter(line=>/^\s+[^:]+:/.test(line)).map(line=>{const at=line.indexOf(':');return [line.slice(0,at).trim(),line.slice(at+1).trim()];}));
 const server=http.createServer(async(req,res)=>{
  for(const [name,value]of Object.entries(headers))res.setHeader(name,value);
  const send=(status,error)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(req.method==='HEAD'?undefined:JSON.stringify({error}));};
  try{
   const host=req.headers.host||'';
   const permitted=publicOrigin?new URL(publicOrigin).host===host:/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host);
   if(!permitted)return send(403,'主机名未配置。');
   const url=new URL(req.url,'http://'+host);
   if(url.pathname.startsWith('/api/'))return send(404,'未找到。');
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'请求方法无效。');}
   let name;try{name=decodeURIComponent(url.pathname);}catch{return send(400,'路径无效。');}
   if(name==='/')name='/index.html';else if(!extname(name))name+='.html';
   const file=resolve(assetRoot,'.'+name);
   if(!file.startsWith(assetRoot+sep))return send(403,'禁止访问。');
   if(!(await stat(file)).isFile())return send(404,'未找到。');
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
   res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(error){if(!res.headersSent)send(error.code==='ENOENT'?404:500,'未找到资源或资源不可用。');else res.end();}
 });
 return {server};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=process.env.HOST||'127.0.0.1';
 if(!['127.0.0.1','localhost'].includes(host)&&!process.env.PUBLIC_ORIGIN)throw Error('对外监听前必须设置 PUBLIC_ORIGIN。');
 const {server}=await createApp({publicOrigin:process.env.PUBLIC_ORIGIN||null});
 server.listen(Number(process.env.PORT||4173),host,()=>console.log(`URL Loupe: http://${host}:${server.address().port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
