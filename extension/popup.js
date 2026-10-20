const input=document.getElementById('url');
const error=document.getElementById('error');
let userEdited=false;
const result=document.getElementById('result').attachShadow({mode:'open'});
function check(value){
  error.textContent='';
  if(!value.trim()){result.replaceChildren();return;}
  try{HostLensView.render(result,HostLens.analyze(value));}
  catch(err){result.replaceChildren();error.textContent=err.message;}
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
    error.textContent='无法解析输入，请在此输入 HTTP(S) 网址或域名。';return;
  }
  if(!globalThis.chrome?.tabs?.query)return;
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(userEdited)return;
    if(tab?.url && /^https?:\/\//i.test(tab.url)){input.value=tab.url;check(tab.url);}
    else error.textContent='当前页面无法检查，请粘贴 HTTP(S) 网址。';
  }catch{if(userEdited)return;error.textContent='无法读取当前页，请手动粘贴网址。';}
})();
