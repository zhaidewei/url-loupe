import {openStore} from './store.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [action='list',...args]=process.argv.slice(2);const options={};
for(let i=0;i<args.length;i+=2)options[args[i].replace(/^--/,'')]=args[i+1];
const store=openStore(process.env.HOST_LENS_DB||resolve(root,'runtime/reports.sqlite'));
try{
 if(action==='list')console.log(JSON.stringify(store.list(options.status||'pending'),null,2));
 else console.log(JSON.stringify(store.review(options.id,action,options.reviewer,options.reason),null,2));
}catch(error){console.error(error.message);process.exitCode=1;}finally{store.close();}
