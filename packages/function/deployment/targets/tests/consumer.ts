import {planReleaseTargets,type ReleaseObservations,type ReleasePlan,type ReleaseTarget} from '../index.mjs';
const selected:readonly ReleaseTarget[]=['github-source'];
const observations:ReleaseObservations={'github-source':{authentication:{status:'not-observed',reason:'Offline: no auth probe'}}};
const plan:ReleasePlan=planReleaseTargets(selected,observations);
const noExecutor:false=plan.executable;
// @ts-expect-error Unknown release target.
planReleaseTargets(['dns']);
// @ts-expect-error Success is a checked status, not an arbitrary string.
const invalid:ReleaseObservations={web:{artifact:{status:'done',reason:'bad'}}};
void [noExecutor,invalid];
