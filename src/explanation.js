import {domainParts,diffParts} from './engine.js';
const cp=value=>Array.from(value);
function locate(host,text){
 let offset=host.lastIndexOf(text);if(offset<0&&/^[\x00-\x7F]+$/.test(text))offset=host.toLowerCase().lastIndexOf(text.toLowerCase());return offset<0?-1:cp(host.slice(0,offset)).length;
}
export function buildExplanation(data,comparison){
 const displayHost=data.originalTokens&&!/^xn--/i.test(data.originalHost)&&!data.originalHost.toLowerCase().includes('.xn--')?data.originalHost:data.unicodeHost;
 const chars=cp(displayHost);const annotations=[];
 const add=value=>annotations.push({id:'a'+annotations.length,...value});
 for(let i=0;i<chars.length;i++){
  if(chars[i].codePointAt(0)<=127)continue;
  const start=i;while(i+1<chars.length&&chars[i+1].codePointAt(0)>127)i++;
  const text=chars.slice(start,i+1).join('');
  add({type:'nonascii',start,end:i+1,title:'非 ASCII 字符：'+text,text:'这些字符来自扩展字符集；合法国际化域名也会使用。请核对它们是否与预期名称一致。',codes:chars.slice(start,i+1).map(c=>c+' · U+'+c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0'))});
 }
 const primary=comparison.matches[0];
 if(primary){
  const inputParts=domainParts(displayHost);const labelOffset=locate(displayHost,inputParts.label);
  const inputLabel=labelOffset>=0?chars.slice(labelOffset,labelOffset+cp(inputParts.label).length).join(''):inputParts.label;
  if(primary.kind==='subdomain'){
   const at=locate(displayHost,primary.domain);if(at>=0)add({type:'brand',start:at,end:at+cp(primary.domain).length,title:'熟悉的名字出现在子域中',text:'真正的注册域名是 '+inputParts.domain+'，不是 '+primary.domain+'。',match:primary});
  }else{
   const diff=diffParts(inputLabel,primary.label);const at=locate(displayHost,inputLabel);
   if(at>=0&&diff.input.change){
    const start=at+cp(diff.input.before).length;
    add({type:'brand',start,end:start+cp(diff.input.change).length,title:'可能仿冒 '+(primary.company.nameEn||primary.company.name),text:primary.reason,match:primary,diff});
   }else if(at>=0&&diff.reference.change){
    // Missing characters have no range; explain the whole label instead of inventing a character.
    add({type:'brand',start:at,end:at+cp(inputLabel).length,title:'名称可能缺少字符',text:primary.reason,match:primary,diff});
   }
   const suffixAt=locate(displayHost,'.'+inputParts.suffix);
   const referenceSuffix=domainParts(primary.domain).suffix;
   if(inputParts.suffix!==referenceSuffix&&suffixAt>=0)add({type:'suffix',start:suffixAt,end:chars.length,title:'域名后缀也不同',text:'输入使用 .'+inputParts.suffix+'；此候选记录使用 .'+referenceSuffix+'。后缀差异本身不证明仿冒。',match:primary});
  }
 }else if(comparison.references.length){
  const record=comparison.references[0];const unicodeDomain=globalThis.HostPunycode.toUnicode(record.domain);const at=locate(displayHost,unicodeDomain);
  if(at>=0)add({type:'reference',start:at,end:at+cp(unicodeDomain).length,title:'与参考库中的记录一致',text:'参考对象：'+(record.company.nameEn||record.company.name)+'。这不代表网页内容安全。',match:record});
 }
 return {displayHost,annotations};
}
