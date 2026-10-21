const input=document.getElementById('url');
const error=document.getElementById('error');
let userEdited=false;
const result=document.getElementById('result').attachShadow({mode:'open'});
function check(value){
  error.textContent='';
  if(!value.trim()){result.replaceChildren();return;}
  try{HostLensView.render(result,HostLens.analyze(value));}
  catch(err){result.replaceChildren();error.textContent=HostLensI18n.text(err.message);}
}
input.addEventListener('input',event=>{userEdited=true;if(!event.isComposing)check(input.value);});
input.addEventListener('compositionend',()=>{userEdited=true;check(input.value);});
for(const button of document.querySelectorAll('[data-example]'))button.addEventListener('click',()=>{userEdited=true;input.value=button.dataset.example;check(input.value);});
(async()=>{
  const params=new URLSearchParams(location.hash.slice(1));
  if(params.has('host')){
    input.value=params.get('host');check(input.value);return;
  }
  if(params.has('invalid')){
    error.textContent=HostLensI18n.text('无法解析输入，请在此输入 HTTP(S) 网址或域名。');return;
  }
  if(!globalThis.chrome?.tabs?.query)return;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(userEdited)return;
    if(tab?.url && /^https?:\/\//i.test(tab.url)){input.value=tab.url;check(tab.url);}
    else error.textContent=HostLensI18n.text('当前页面无法检查，请粘贴 HTTP(S) 网址。');
  }catch{if(userEdited)return;error.textContent=HostLensI18n.text('无法读取当前页，请手动粘贴网址。');}
})();

const originalText=new Map();for(const el of document.querySelectorAll('header p,label,.examples span,.examples button'))originalText.set(el,el.textContent);const originalPlaceholder=input.placeholder;
function applyLanguage(){document.documentElement.lang=HostLensI18n.lang==='en'?'en':'zh-CN';for(const [el,text]of originalText)el.textContent=HostLensI18n.text(text);input.placeholder=HostLensI18n.text(originalPlaceholder);document.getElementById('language').textContent=HostLensI18n.lang==='en'?'中文':'English';document.getElementById('examples-label').textContent=HostLensI18n.lang==='en'?'Examples':'示例';document.getElementById('help-label').textContent=HostLensI18n.lang==='en'?'Help':'帮助';document.getElementById('privacy').textContent=HostLensI18n.lang==='en'?'Privacy':'隐私政策';document.getElementById('usage').textContent=HostLensI18n.lang==='en'?'Type host + Tab in the address bar, or hover a webpage link. Pink: non-ASCII. Gold: lookalikes.':'地址栏输入 host 后按 Tab，或悬停网页链接。粉色＝非 ASCII；金框＝形似字符。';if(input.value.trim())check(input.value);}
document.getElementById('language').addEventListener('click',()=>{HostLensI18n.lang=HostLensI18n.lang==='en'?'zh':'en';applyLanguage();});applyLanguage();
