import type {Backend, Pairing, Grant, Failure, Permission} from 'near-function/setup';
import type {UIHost, UIResource} from 'near-function/mcp-ui';
type Evidence = Parameters<typeof import('near-function/setup').checkConnection>[2];
export interface IssueInput {dotId:string;audience:string;consent:boolean}
export interface RedeemInput {link:string;audience:string;consent:boolean;acceptedPermissions:Permission[]}
export type RedeemResult = {ok:true;pairing:Pairing;callback:string}|Failure;
export interface DotAdapter {
 issue(input:IssueInput,signal:AbortSignal):Promise<Grant>;
 redeem(input:RedeemInput,signal:AbortSignal):Promise<RedeemResult>;
 connect(input:{backend:Backend;pairing:Pairing},signal:AbortSignal):Promise<{authenticated:boolean;evidence:Evidence;host:UIHost;resource:UIResource}>;
 observeHost(input:{backend:Backend},signal:AbortSignal):Promise<UIHost>;
 action(input:{serviceId:string;action:string;backend:Backend},signal:AbortSignal):Promise<unknown>;
}
export interface DotSnapshot {phase:string;deployment:Backend|null;pairing:Pairing|null;presentation:{qrPayload:string;manualLink:string;expiresAt:number}|null;ui:UIResource|null;host:UIHost|null;error:string|null}
export function createDotClient(options:{adapter:DotAdapter;platform?:'desktop'|'ios'|'android'|'browser'}):{
 snapshot():DotSnapshot;subscribe(fn:(snapshot:DotSnapshot)=>void):()=>void;cancel():void;disconnect():void;
 issue(input:IssueInput):Promise<{ok:true;presentation:NonNullable<DotSnapshot['presentation']>}|Failure>;
 redeem(input:RedeemInput):Promise<RedeemResult>;
 connect(input:{backend:Backend;trusted:boolean}):Promise<{ok:true}|Failure>;
 action(nodeId:string):Promise<{ok:true;result:unknown}|Failure>;
};
