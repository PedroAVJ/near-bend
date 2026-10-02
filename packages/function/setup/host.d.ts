import type {createWorkspaceRuntime} from './workspace.js';
import type {Dot,Pairing,Permission,Grant,Failure} from './client.js';
import type {UIResource,UIHost} from '../protocol/mcp-ui.js';
import type {IncomingMessage,ServerResponse} from 'node:http';
export const setupProtocol: 'near-function.setup.v1';
export interface SetupState {version:1; grants: unknown[]; pairings: unknown[]; sessions: unknown[]}
export interface SetupStore {transaction<T>(operation:(state:SetupState)=>Promise<T>|T):Promise<T>}
export function createFileSetupStore(directory:string):SetupStore;
export interface SetupSession {token:string;expiresAt:number}
export function createDurableSetupAuthority(options:{store:SetupStore; dots:readonly Dot[]; callbackURLs:readonly string[]; now?:()=>number; maxTTL?:number;sessionTTL?:number}): {
 issue(request:{dotId:string;ownerId:string;audience:string;consent:boolean;callback:string;ttl?:number}):Promise<Grant>;
 redeem(request:{link:string;audience:string;consent:boolean;acceptedPermissions:readonly Permission[];signal?:AbortSignal}):Promise<{ok:true;pairing:Pairing;callback:string;session:SetupSession}|Failure>;
 cancel(request:{link:string;ownerId:string}):Promise<{ok:true}|Failure>;
 choose(request:{dotId:string;audience:string}):Promise<{ok:true;pairing:Pairing}|Failure>;
 session(token?:string):Promise<{ok:true;pairing:Pairing;expiresAt:number}|Failure>;
 revoke(token?:string):Promise<{ok:true}|Failure>;
};
export function createSetupHttpHandler(options:{authority:ReturnType<typeof createDurableSetupAuthority>;authenticate:(request:IncomingMessage)=>Promise<{id:string}|null>|{id:string}|null;origins?:readonly string[];getServiceUI?:(pairing:Pairing,serviceId:string)=>Promise<{resource:UIResource;host:UIHost}>|{resource:UIResource;host:UIHost};workspace?:ReturnType<typeof createWorkspaceRuntime>;dispatchAction?:(request:{pairing:Pairing;serviceId:string;action:string;input:unknown})=>Promise<unknown>|unknown}):(request:IncomingMessage,response:ServerResponse)=>Promise<void>;
