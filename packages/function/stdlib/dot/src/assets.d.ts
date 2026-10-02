export type AssetKind='audio'|'photo'|'video'|'file';
export interface AssetInput {id:string;bytes:Uint8Array;mimeType:string;name:string;kind:AssetKind}
export interface StoredAsset {id:string;url:string;mimeType:string;size:number;name:string;kind:AssetKind}
export interface SerializedAsset {id:string;bytes:string;mimeType:string;name:string;kind:AssetKind}
export interface AssetStore {put(asset:AssetInput):Promise<StoredAsset>;get(id:string):(StoredAsset&{bytes:Uint8Array})|null;delete(id:string):Promise<boolean>;clear():Promise<void>;export(ids?:string[]):Promise<SerializedAsset[]>;import(records:SerializedAsset[]):Promise<void>;readonly size:number;readonly totalBytes:number}
export function createMemoryAssetStore(options?:{maxAssetBytes?:number;maxTotalBytes?:number;maxAssets?:number;urlFor?:(id:string)=>string}):AssetStore;
