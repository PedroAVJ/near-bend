import {createDotClient,type DotAdapter} from 'near-dot';
declare const adapter:DotAdapter;
const client=createDotClient({adapter,platform:'browser'});
const state=client.snapshot();
const link:string|undefined=state.presentation?.manualLink;
client.subscribe(next=>{const name:string=next.phase;void name});
void link;
