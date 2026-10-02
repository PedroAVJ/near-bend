export function createDotPreview(options?:{port?:number;artifactRoot?:string}):{listen():Promise<string>;close():Promise<void>};
