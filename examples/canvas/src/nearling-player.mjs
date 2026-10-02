export function createSpritePlayer(App){
// Host timing/projection only. Animation states, durations and crop coordinates come from Bend.
function draw(element,elapsedMs,reducedMotion){
 const input=JSON.parse(element.dataset.nearling),time=(Number(element.dataset.petTime||0)+Math.max(0,Math.floor(elapsedMs)))>>>0;
 const frame=App['nearling.sample'](input,time,reducedMotion||element.dataset.petReduced==='true');
 const sheet=element.querySelector('.sprite-sheet');
 if(!sheet)throw Error('Missing caller-supplied sprite sheet');
 sheet.style.transform='translate(-'+frame.x+'px,-'+frame.y+'px)';
 element.dataset.row=String(frame.row);element.dataset.frame=String(frame.column);
 return frame;
}
function paintNearling(root,elapsedMs,reducedMotion=false){return [...root.querySelectorAll('[data-nearling]')].map(element=>draw(element,elapsedMs,reducedMotion));}
function startNearling(root){
 if(typeof requestAnimationFrame!=='function')return ()=>{};
 const starts=new WeakMap(),media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;let active=true,handle=0;
 function tick(now){if(!active)return;for(const element of root.querySelectorAll('[data-nearling]')){const signature=element.dataset.nearling+'|'+element.dataset.petTime;let start=starts.get(element);if(!start||start.signature!==signature){start={signature,at:now};starts.set(element,start);}draw(element,now-start.at,Boolean(media?.matches));}handle=requestAnimationFrame(tick);}
 handle=requestAnimationFrame(tick);
 return ()=>{active=false;if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(handle);};
}


return {paintNearling,startNearling};
}
