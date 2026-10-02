// Mono PCM16 little-endian, streaming box-filter resampling to 24 kHz.
export class PCM24kResampler {
  constructor(inputRate, emit, chunkSamples = 480) {
    if (!Number.isInteger(chunkSamples) || chunkSamples < 1 || chunkSamples > 4800) throw new TypeError('chunkSamples must be an integer from 1 to 4800');
    if (!Number.isFinite(inputRate) || inputRate < 8000 || inputRate > 192000) throw new TypeError('Supported input sample rate is 8000 to 192000 Hz');
    this.ratio = 24000 / inputRate; this.emit = emit; this.chunkSamples = chunkSamples;
    this.sum = 0; this.weight = 0; this.samples = [];
  }
  push(channels) {
    if (!channels?.length) return;
    const length = channels[0].length;
    for (let i = 0; i < length; i++) {
      let sample = 0; for (const channel of channels) sample += channel[i] ?? 0; sample /= channels.length;
      sample = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0));
      let remaining = this.ratio;
      while (remaining > 1e-10) {
        const portion = Math.min(1 - this.weight, remaining); this.sum += sample * portion; this.weight += portion; remaining -= portion;
        if (this.weight >= 1 - 1e-10) {
          this.samples.push(Math.round(this.sum * (this.sum < 0 ? 32768 : 32767))); this.sum = 0; this.weight = 0;
          if (this.samples.length === this.chunkSamples) this.flush();
        }
      }
    }
  }
  flush() {
    if (!this.samples.length) return;
    const bytes = new Uint8Array(this.samples.length * 2); const view = new DataView(bytes.buffer);
    this.samples.forEach((value, index) => view.setInt16(index * 2, value, true)); this.samples = []; this.emit(bytes);
  }
}
const ProcessorBase = globalThis.AudioWorkletProcessor ?? class {};
class DotCaptureProcessor extends ProcessorBase {
  constructor() {
    super(); this.active = true;
    this.resampler = new PCM24kResampler(globalThis.sampleRate, bytes => this.port.postMessage({type:'pcm',bytes:bytes.buffer},[bytes.buffer]));
    this.port.onmessage = ({data}) => { if (data?.type === 'flush') { this.resampler.flush(); this.port.postMessage({type:'flushed',id:data.id}); } if (data?.type === 'stop') { this.active = false; this.resampler.samples = []; } };
  }
  process(inputs) { if (!this.active) return false; this.resampler.push(inputs[0]); return true; }
}
if (typeof globalThis.registerProcessor === 'function') globalThis.registerProcessor('near-dot-capture', DotCaptureProcessor);
