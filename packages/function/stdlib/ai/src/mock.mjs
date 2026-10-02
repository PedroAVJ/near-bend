// Browser-safe deterministic offline adapter; no provider keys or persistence.
export class MockAgent {
  async *run({ prompt }, { signal } = {}) {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new TypeError('prompt must be a nonempty string');
    signal?.throwIfAborted();
    yield { type: 'text_delta', text: `Local preview: ${prompt}` };
    signal?.throwIfAborted();
    yield { type: 'result', text: `Local preview: ${prompt}`, sessionId: 'offline-preview' };
  }
}
