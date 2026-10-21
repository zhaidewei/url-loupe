const input=document.getElementById('url');
const error=document.getElementById('error');
let userEdited=false;
let reviewHost=null,reviewTarget=null,reviewHandoff=false;
const openLink=document.getElementById('open-url');
const result=document.getElementById('result').attachShadow({mode:'open'});
function check(value){
  error.textContent='';openLink.hidden=true;openLink.removeAttribute('href');
  if(!value.trim()){result.replaceChildren();return;}
  try{HostLensView.render(result,HostLens.analyze(value));
    const target=reviewHandoff && value===reviewHost ? reviewTarget : value;
    if(target){
      const text=target.trim();
      const url=new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(text)?text:'https://'+text);
      if(['http:','https:'].includes(url.protocol)){
        // Do not expose embedded credentials in a clickable URL.
        url.username='';url.password='';openLink.href=url.href;openLink.hidden=false;
      }
    }
  }
  catch(err){result.replaceChildren();error.textContent=HostLensI18n.text(err.message);}
}
input.addEventListener('input',event=>{userEdited=true;reviewHandoff=false;openLink.hidden=true;openLink.removeAttribute('href');if(!event.isComposing)check(input.value);});
input.addEventListener('compositionend',()=>{userEdited=true;reviewHandoff=false;check(input.value);});
for(const button of document.querySelectorAll('[data-example]'))button.addEventListener('click',()=>{userEdited=true;reviewHandoff=false;input.value=button.dataset.example;check(input.value);});
(async()=>{
  const ownTab=await chrome.tabs.getCurrent();
  if(ownTab)document.documentElement.classList.add('standalone');
  const params=new URLSearchParams(location.hash.slice(1));
  if(params.has('host')){
    reviewHost=params.get('host');reviewHandoff=params.has('review');
    if(reviewHandoff){
      try{const reply=await chrome.runtime.sendMessage({type:'review-target',token:params.get('review')});reviewTarget=reply?.target || null;}catch{}
    }
    if(userEdited)return;input.value=reviewHost;check(input.value);return;
  }
  if(params.has('invalid')){
    error.textContent=HostLensI18n.text('无法解析输入，请在此输入 HTTP(S) 网址或域名。');return;
  }
  if(!globalThis.chrome?.tabs?.query)return;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const pending=tab && await chrome.runtime.sendMessage({type:'context-review',tabId:tab.id});
    if(userEdited)return;
    if(pending?.target!==null && pending?.target!==undefined){input.value=pending.target;check(input.value);return;}
    if(tab?.url && /^https?:\/\//i.test(tab.url)){input.value=tab.url;check(tab.url);}
    else error.textContent=HostLensI18n.text('当前页面无法检查，请粘贴 HTTP(S) 网址。');
  }catch{if(userEdited)return;error.textContent=HostLensI18n.text('无法读取当前页，请手动粘贴网址。');}
})();

const originalText=new Map();for(const el of document.querySelectorAll('header p,label,.examples span,.examples button'))originalText.set(el,el.textContent);const originalPlaceholder=input.placeholder;
function applyLanguage(){openLink.textContent=HostLensI18n.lang==='en'?'Open original URL ↗':'打开原网址 ↗';document.documentElement.lang=HostLensI18n.lang==='en'?'en':'zh-CN';for(const [el,text]of originalText)el.textContent=HostLensI18n.text(text);input.placeholder=HostLensI18n.text(originalPlaceholder);document.getElementById('language').textContent=HostLensI18n.lang==='en'?'中文':'English';document.getElementById('examples-label').textContent=HostLensI18n.lang==='en'?'Examples':'示例';document.getElementById('help-label').textContent=HostLensI18n.lang==='en'?'Help':'帮助';document.getElementById('privacy').textContent=HostLensI18n.lang==='en'?'Privacy':'隐私政策';document.getElementById('usage').textContent=HostLensI18n.lang==='en'?'Right-click a link → Inspect with URL Loupe. Also supports host + Tab. Pink: non-ASCII. Gold: lookalikes.':'右键链接 → 使用 URL Loupe 检查。也支持 host + Tab。粉色＝非 ASCII；金框＝形似字符。';if(input.value.trim())check(input.value);}
document.getElementById('language').addEventListener('click',()=>{HostLensI18n.lang=HostLensI18n.lang==='en'?'zh':'en';applyLanguage();});applyLanguage();
