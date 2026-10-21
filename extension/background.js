importScripts('vendor/punycode.js','vendor/confusables.js','known-hosts.js','analyzer.js','i18n.js','omnibox.js');
function updateSuggestions(text,suggest){
  const result=HostLensOmnibox.describe(text);
  chrome.omnibox.setDefaultSuggestion({description:result.description});
  if(suggest)suggest(result.suggestions);
}
const reviewTargets=new Map();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type!=='review-target' || !sender.url?.startsWith(chrome.runtime.getURL('popup.html')))return;
  const target=reviewTargets.get(message.token);reviewTargets.delete(message.token);reply({target:target || null});
});
async function openHostReview(text,disposition){
  const result=HostLensOmnibox.describe(text);
  const token=result.host ? crypto.randomUUID() : '';
  if(token){
    // Short-lived handoff: full URLs stay in memory, outside extension URLs/history.
    if(reviewTargets.size>=100)reviewTargets.delete(reviewTargets.keys().next().value);
    reviewTargets.set(token,String(text));
  }
  const url=chrome.runtime.getURL('popup.html')+(result.host ? '#host='+encodeURIComponent(result.host)+'&review='+token : '#invalid=1');
  // The address contains only the host and an opaque handoff token.
  if(disposition==='newBackgroundTab')await chrome.tabs.create({url,active:false});
  else if(disposition==='newForegroundTab')await chrome.tabs.create({url,active:true});
  else await chrome.tabs.update({url});
}
chrome.omnibox.onInputStarted.addListener(()=>updateSuggestions(''));
chrome.omnibox.onInputChanged.addListener(updateSuggestions);
chrome.omnibox.onInputEntered.addListener((text,disposition)=>{
  openHostReview(text,disposition).catch(()=>console.error('无法打开域名检查页。'));
});

const INSPECT_MENU_ID='url-loupe-inspect';
function registerInspectionMenu(){
  // Recreate on install/update; Chrome keeps the item across worker restarts.
  chrome.contextMenus.removeAll(()=>{
    if(chrome.runtime.lastError){console.error('无法创建右键检查入口。');return;}
    chrome.contextMenus.create({
      id:INSPECT_MENU_ID,
      title:HostLensI18n.lang==='zh' ? '🔍 使用 URL Loupe 检查' : '🔍 Inspect with URL Loupe',
      contexts:['link','selection','page'],
      documentUrlPatterns:['http://*/*','https://*/*']
    },()=>{if(chrome.runtime.lastError)console.error('无法创建右键检查入口。');});
  });
}
async function inspectContext(info,tab){
  if(info.menuItemId!==INSPECT_MENU_ID)return;
  // Inspect the real link destination, even when its visible text differs.
  // Invalid selected text stays invalid rather than silently checking the page.
  const text=info.linkUrl || (info.selectionText!==undefined ? info.selectionText : info.pageUrl || tab?.url || '');
  await openHostReview(text,'newForegroundTab');
}
chrome.runtime.onInstalled.addListener(registerInspectionMenu);
chrome.contextMenus.onClicked.addListener((info,tab)=>{
  inspectContext(info,tab).catch(()=>console.error('无法打开域名检查页。'));
});
