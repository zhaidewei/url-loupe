import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const ext=path.join(root,'extension');const manifest=JSON.parse(fs.readFileSync(path.join(ext,'manifest.json')));const out=path.resolve(process.argv[2]||path.join(root,'..',`url-loupe-chrome-${manifest.version}.zip`));
const files=['manifest.json','analyzer.js','render.js','i18n.js','content.js','background.js','omnibox.js','popup.html','popup.css','popup.js','LICENSE'];
function add(dir){for(const entry of fs.readdirSync(path.join(ext,dir),{withFileTypes:true})){const rel=dir+'/'+entry.name;if(entry.isDirectory())add(rel);else files.push(rel);}}
for(const dir of ['vendor','icons','_locales'])add(dir);
fs.rmSync(out,{force:true});execFileSync('zip',['-q','-X',out,...files],{cwd:ext});console.log(out);
