export interface Component { $: string; [key: string]: unknown }
export interface CompiledBend { [key: string]: (...args: any[]) => any }
export function createRenderer(app: CompiledBend): (component: Component) => string;
export function createShapePainter(app: CompiledBend, options?:Record<string,unknown>): (...args:any[])=>HTMLElement;
export function place(element:HTMLElement,box:Record<string,number>,dx?:number,dy?:number):HTMLElement;
export function createSpritePlayer(app:CompiledBend):{paintNearling:(root:HTMLElement,elapsedMs:number,reducedMotion?:boolean)=>unknown[];startNearling:(root:HTMLElement)=>()=>void};
export function glassTier(search?:string,nav?:unknown,css?:unknown):string;
export function refractionSupported(nav?:unknown,css?:unknown):boolean;
export function rows<T>(list:unknown,max?:number):T[];
