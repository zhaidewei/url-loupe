import {createAnalyzer} from './analyzer.js';
import {createIndex,compare} from './engine.js';
import {buildExplanation} from './explanation.js';
import references from '../data/runtime-references.json' with {type:'json'};
const hosts=globalThis.HOST_LENS_KNOWN_HOSTS||[];
const analyzer=createAnalyzer();
const index=createIndex(references.companies,hosts);
globalThis.HostLens=analyzer;
globalThis.HostLensAnalysis=Object.freeze({inspect(value){
 const data=analyzer.analyze(value);const comparison=compare(data,index);
 const explanation=buildExplanation(data,comparison);
 const tokens=Array.from(explanation.displayHost,(char,i)=>{
  const annotations=explanation.annotations.filter(a=>a.start<=i&&i<a.end&&a.type!=='reference');
  return {char,code:'U+'+char.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'),nonAscii:char.codePointAt(0)>127,similar:annotations.some(a=>a.type==='brand'||a.type==='suffix'),annotations};
 });
 return {...data,comparison,explanation,displayTokens:tokens};
}});
