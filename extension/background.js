importScripts('vendor/punycode.js','vendor/confusables.js','analyzer.js','i18n.js','omnibox.js');
function updateSuggestions(text,suggest){
  const result=HostLensOmnibox.describe(text);
  chrome.omnibox.setDefaultSuggestion({description:result.description});
  if(suggest)suggest(result.suggestions);
}
async function openHostReview(text,disposition){
  const result=HostLensOmnibox.describe(text);
  const url=chrome.runtime.getURL('popup.html')+(result.host ? '#host='+encodeURIComponent(result.host) : '#invalid=1');
  // Only the extracted host reaches the extension page, never passwords or URL paths.
  if(disposition==='newBackgroundTab')await chrome.tabs.create({url,active:false});
  else if(disposition==='newForegroundTab')await chrome.tabs.create({url,active:true});
  else await chrome.tabs.update({url});
}
chrome.omnibox.onInputStarted.addListener(()=>updateSuggestions(''));
chrome.omnibox.onInputChanged.addListener(updateSuggestions);
chrome.omnibox.onInputEntered.addListener((text,disposition)=>{
  openHostReview(text,disposition).catch(()=>console.error('无法打开域名检查页。'));
});
