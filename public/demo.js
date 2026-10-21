const language=document.getElementById('language');
const notice=document.getElementById('notice');
let lang='en';
language.addEventListener('click',()=>{
  lang=lang==='en'?'zh':'en';
  document.documentElement.lang=lang==='en'?'en':'zh-CN';
  for(const el of document.querySelectorAll('[data-en]'))el.textContent=el.dataset[lang];
  language.textContent=lang==='en'?'中文':'English';notice.textContent='';
});
// Keep real hrefs for Chrome's link context menu; ordinary clicks do not navigate.
for(const link of document.querySelectorAll('.demo-link')){
  const stay=event=>{
    if(event.type==='auxclick' && event.button!==1)return;
    event.preventDefault();
    notice.textContent=lang==='en'?'Right-click the link and choose “Inspect with URL Loupe”.':'请右键点击链接，选择“使用 URL Loupe 检查”。';
  };
  link.addEventListener('click',stay);link.addEventListener('auxclick',stay);
}
