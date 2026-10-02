/** Offline state/RPC semantics. The host supplies reducer, authorization and transport. */
export class RevisionConflict extends Error {
  constructor(expected, actual) { super(`Expected revision ${expected}, actual ${actual}`); this.name = 'RevisionConflict'; this.expected = expected; this.actual = actual; }
}
export function createStateChannel({initial, reduce, authorize = () => true}) {
  let state = structuredClone(initial), revision = 0;
  const subscriptions = new Set();
  const snapshot = () => ({revision, state: structuredClone(state)});
  return {
    snapshot,
    async mutate(command, {expectedRevision, principal, signal} = {}) {
      signal?.throwIfAborted();
      if (!await authorize(principal, command)) throw new Error('Permission denied');
      signal?.throwIfAborted();
      if (expectedRevision !== undefined && expectedRevision !== revision) throw new RevisionConflict(expectedRevision, revision);
      // Reducers are synchronous and pure: no race can occur between revision check and commit.
      const next = reduce(structuredClone(state), structuredClone(command));
      if (next && typeof next.then === 'function') throw new TypeError('Reducer must be synchronous');
      const cloned = structuredClone(next);
      state = cloned; revision++;
      const event = snapshot();
      for (const subscription of subscriptions) subscription.push(structuredClone(event));
      return event;
    },
    subscribe({signal} = {}) {
      signal?.throwIfAborted();
      const queue = [snapshot()]; let waiter, closed = false;
      const entry = {push(value) { if (closed) return; if (waiter) {const resolve = waiter; waiter = undefined; resolve({value, done: false});} else queue.push(value); }};
      subscriptions.add(entry);
      const close = () => {closed = true; subscriptions.delete(entry); signal?.removeEventListener('abort', close); queue.length = 0; if (waiter) {waiter({done: true}); waiter = undefined;} return {done: true};};
      signal?.addEventListener('abort', close, {once: true});
      return { [Symbol.asyncIterator]() {return this;}, next() { if (closed) return Promise.resolve({done: true}); if (queue.length) return Promise.resolve({value: queue.shift(), done: false}); if(waiter) return Promise.reject(new Error('Concurrent next() unsupported')); return new Promise(resolve => {waiter = resolve;}); }, return() {return Promise.resolve(close());} };
    },
  };
}
