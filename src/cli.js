/*! Google CrUX September 2026 domain data, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://developer.chrome.com/docs/crux/bigquery ; changes: extracted and deduplicated hostnames, merged references. No Google endorsement. */
import '../public/vendor/punycode.js';
import '../public/vendor/confusables.js';
import '../public/analyzer.js';
import dataset from '../public/companies.json' with {type:'json'};
import aliases from '../public/brand-aliases.json' with {type:'json'};
import knownHosts from '../public/known-hosts.json' with {type:'json'};
import {createIndex,compare} from './engine.js';
import {buildExplanation} from './explanation.js';
import {createInterface} from 'node:readline';

const args=process.argv.slice(2);
if(args.includes('--help')||args.includes('-h')){
 console.log(`URL Loupe CLI — 本地检查域名字符与品牌相似线索\n\n用法：\n  url-loupe [--json | --text] [--fail-on-findings] URL...\n  url-loupe [--json | --text] [--fail-on-findings] --stdin\n\n默认 JSON Lines：每个输入输出一个 JSON 对象，支持混合有效与无效输入。\n--stdin             从标准输入逐行读取 URL；空行跳过\n--text              输出中文摘要\n--json              显式选择默认 JSON Lines\n--fail-on-findings  发现非 ASCII 或品牌候选时退出 1\n--                  后续参数全部视为输入\n\n退出码：0 完成；1 发现线索（需启用上述选项）；2 参数、输入或执行错误。\n有无提示均不构成安全判定。不联网，不访问目标网站；输出不回显完整 URL。`);
 process.exit(0);
}
let text=false,stdin=false,fail=false,literal=false;const inputs=[];
for(const arg of args){
 if(!literal&&arg==='--'){literal=true;continue;}
 if(!literal&&arg==='--text'){text=true;continue;}
 if(!literal&&arg==='--json'){text=false;continue;}
 if(!literal&&arg==='--stdin'){stdin=true;continue;}
 if(!literal&&arg==='--fail-on-findings'){fail=true;continue;}
 if(!literal&&arg.startsWith('-')){console.error('未知选项；运行 --help 查看用法。');process.exit(2);}
 inputs.push(arg);
}
if((!stdin&&!inputs.length)||(stdin&&inputs.length)){console.error('请提供 URL 参数，或单独使用 --stdin。');process.exit(2);}
const index=createIndex([...dataset.companies,...aliases.brands],knownHosts);let number=0,hadError=false,hadFindings=false;
function record(value){
 number++;
 let result;
 try{
  if(value.length>8192)throw Error('网址过长');
  const data=HostLens.analyze(value);const comparison=compare(data,index);const explanation=buildExplanation(data,comparison);
  const nonAscii=Array.from(explanation.displayHost,(char,index)=>({char,index,codePoint:'U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')})).filter(c=>c.char.codePointAt(0)>127);
  const brief=r=>({companyId:r.company.id,company:r.company.name,host:r.host,sourceUrl:r.company.sourceUrl});
  const matches=comparison.matches.map(r=>({...brief(r),kind:r.kind,reason:r.reason}));
  const findings=nonAscii.length>0||matches.length>0;hadFindings ||= findings;
  result={schemaVersion:1,record:number,ok:true,hasFindings:findings,knownHostMatch:!!comparison.knownHostMatch,host:{ascii:data.asciiHost,unicode:data.unicodeHost,original:data.originalHost},nonAscii,matches,references:comparison.references.map(brief),annotations:explanation.annotations,referenceData:{companies:dataset.metadata.companyCount,hosts:dataset.metadata.domainCount,knownHosts:knownHosts.length,retrievedAt:dataset.metadata.retrievedAt},scope:'local_host_analysis_only',safetyVerdict:'not_assessed'};
 }catch{hadError=true;result={schemaVersion:1,record:number,ok:false,error:{code:'INVALID_INPUT',message:'无法解析为有效的 HTTP(S) 网址，或输入超过 8192 字符。'}};}
 if(!text)console.log(JSON.stringify(result));
 else if(!result.ok)console.log(`#${number} 输入错误：${result.error.message}`);
 else console.log([`#${number} ${result.host.unicode} [${result.host.ascii}]`,`非 ASCII：${result.nonAscii.map(c=>c.char+' '+c.codePoint).join('，')||'无'}`,`品牌候选：${result.matches.map(m=>m.company+' → '+m.host+'（'+m.reason+'）').join('；')||'无'}`,'仅供核对，未评估网站安全。'].join('\n'));
}
if(stdin){for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){if(line.trim())record(line);}}
else for(const input of inputs)record(input);
if(!number){console.error('没有收到非空输入。');hadError=true;}
process.exitCode=hadError?2:fail&&hadFindings?1:0;
