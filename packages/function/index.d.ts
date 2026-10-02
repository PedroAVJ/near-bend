export interface Snapshot<S> { revision: number; state: S }
export class RevisionConflict extends Error { expected: number; actual: number; constructor(expected: number, actual: number) }
export function createStateChannel<S,C,P=unknown>(options: {initial:S; reduce:(state:S,command:C)=>S; authorize?:(principal:P|undefined,command:C)=>boolean|Promise<boolean>}): {
 snapshot(): Snapshot<S>;
 mutate(command:C, options?:{expectedRevision?:number;principal?:P;signal?:AbortSignal}):Promise<Snapshot<S>>;
 subscribe(options?:{signal?:AbortSignal}):AsyncIterableIterator<Snapshot<S>>;
};
