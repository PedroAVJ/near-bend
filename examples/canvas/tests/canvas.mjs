import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import App from '../dist/build/app.mjs';
import {drive} from '../src/drive.mjs';
import {rows} from '../src/schema.mjs';
import {model,route,breadcrumbs,fit,zoomAt,gesture,openingCamera} from '../src/canvas-layout.mjs';
let workspace;await drive(App.paint_workspace(),{workspace:w=>{workspace=w;return {$:'Unit'}}});
const list=x=>rows(x,50000),m=model(workspace);
assert.deepEqual(m.pages.map(p=>p.id),['primitives','components']);
assert.equal(list(workspace.previews).length,0);
assert.equal(list(workspace.specimens).filter(s=>s.section==='kit').length,14);
assert.equal(new Set(m.frames.map(f=>f.id)).size,m.frames.length);
for(const edge of list(workspace.edges)){assert(m.frames.some(f=>f.id===edge.from));assert(m.frames.some(f=>f.id===edge.to));assert(edge.x2>edge.x1)}
for(const frame of m.frames){assert(frame.width>0&&frame.height>0);assert.equal(route(m,'#'+frame.id).frame.id,frame.id);assert(breadcrumbs(route(m,'#'+frame.id)).length>=2)}
assert.equal(route(m,'#unknown').page.id,'primitives');
for(const [w,h]of [[1440,1000],[390,844]])for(const page of m.pages){const view=openingCamera(page,w,h);assert(view.scale>0&&view.scale<=1);assert(Number.isFinite(view.x)&&Number.isFinite(view.y))}
const initial=fit(m.pages[0],1440,1000),zoomed=zoomAt(initial,1.2,400,300);assert(zoomed.scale>initial.scale);
assert(gesture([{x:0,y:0},{x:6,y:8}]).distance>0);
// Project the actual compiled workspace into a DOM, then exercise its controls.
const {window}=parseHTML(readFileSync('src/index.html','utf8'));let location=new URL('http://localhost/');
Object.assign(globalThis,{window,document:window.document,location,history:{replaceState(_a,_b,next){location=new URL(next,location);globalThis.location=location}},matchMedia:()=>({matches:false,addEventListener(){}})});
for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{writable:true,value:''});
const viewport=document.querySelector('#viewport');viewport.getBoundingClientRect=()=>({width:1200,height:900,left:0,top:0,right:1200,bottom:900});
Object.defineProperties(viewport,{clientWidth:{value:1200},clientHeight:{value:900}});
await import('../dist/src/library-client.mjs');await new Promise(resolve=>setImmediate(resolve));
assert.equal(document.querySelectorAll('#pages a').length,2);assert(document.querySelectorAll('#world .frame').length>=25);
const toggle=document.querySelector('#layout-toggle');toggle.click();assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(document.documentElement.dataset.layout,'on');
const before=document.querySelector('#world').style.transform;document.querySelector('#zoom-in').click();assert.notEqual(document.querySelector('#world').style.transform,before);
const light=document.querySelector('[data-scheme="light"]');light.click();assert.equal(light.getAttribute('aria-pressed'),'true');assert.equal(document.querySelector('[data-scheme="dark"]').getAttribute('aria-pressed'),'false');
console.log('PASS reusable canvas: typed workspace/edges/routes, desktop/mobile camera math, DOM projection, layout inspector, zoom and scheme interactions.');
