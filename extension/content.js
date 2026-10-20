(() => {
  // Delegate events so dynamically inserted links work without scanning the DOM.
  let host = null, current = null, timer = null;
  function hide() { clearTimeout(timer); host?.remove(); host=null; current=null; }
  function show(anchor, x, y) {
    hide(); current=anchor;
    let data;
    try { data=HostLens.analyze(anchor.getAttribute('href'), document.baseURI); } catch { return; }
    if (!data.nonAsciiCount && !data.similarCount) return;
    host=document.createElement('host-lens-inspector');
    host.style.cssText='all:initial!important;position:fixed!important;z-index:2147483647!important;display:block!important;width:min(440px,calc(100vw - 24px))!important;pointer-events:none!important;';
    const shadow=host.attachShadow({mode:'closed'});
    HostLensView.render(shadow,data);
    // Avoid duplicate announcements; the action popup provides accessible inspection.
    host.setAttribute('aria-hidden','true');
    document.documentElement.append(host);
    const rect=host.getBoundingClientRect();
    const left=Math.max(12,Math.min(x,innerWidth-rect.width-12));
    const top=y+18+rect.height < innerHeight ? y+18 : Math.max(12,y-rect.height-12);
    host.style.setProperty('left',left+'px','important'); host.style.setProperty('top',top+'px','important');
  }
  function linkFrom(event) { return event.composedPath().find(node=>node instanceof HTMLAnchorElement && node.hasAttribute('href')); }
  document.addEventListener('pointerover', event=>{
    const anchor=linkFrom(event); if(!anchor) return;
    if(anchor===current) return;
    clearTimeout(timer);
    timer=setTimeout(()=>show(anchor,event.clientX,event.clientY),250);
  },true);
  document.addEventListener('pointerout', event=>{
    const anchor=linkFrom(event);
    if(anchor && !anchor.contains(event.relatedTarget)) hide();
  },true);
  document.addEventListener('focusin',event=>{
    const anchor=linkFrom(event); if(!anchor)return;
    const rect=anchor.getBoundingClientRect(); show(anchor,rect.left,rect.bottom);
  },true);
  document.addEventListener('focusout',hide,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},true);
  document.addEventListener('scroll',hide,true);
  window.addEventListener('blur',hide);
})();
