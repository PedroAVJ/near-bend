// Browser media only: keys and provider sockets belong to the authenticated host.
export class MediaError extends Error { constructor(code,message) { super(message);this.name='MediaError';this.code=code; } }
const error = (code,message) => new MediaError(code,message);
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function encode(bytes) { let binary='';for(const byte of bytes) binary+=String.fromCharCode(byte);return btoa(binary); }
function decode(value) { if(typeof value!=='string'||!value||value.length>1024*1024||!BASE64.test(value))throw error('audio_protocol','Invalid PCM audio payload');const binary=atob(value);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(bytes.length%2)throw error('audio_protocol','PCM16 requires complete samples');return bytes; }
export const mediaCapabilities = Object.freeze({capture:'browser-getUserMedia-audio-worklet',format:'pcm16-mono-24000',playback:'browser-audio-context',providerConnection:'authenticated-same-origin-host',hardwareVerified:false,liveModelVerified:false});
export class BrowserVoiceSession {
  #options;#state='idle';#epoch=0;#socket;#stream;#context;#source;#worklet;#gain;#socketHandlers;#sources=new Set();#nextPlaybackAt=0;#flushCommit;#flushId=0;#finishConnect;#startPending=false;#playbackCancelled=false;#cameraPending;
  constructor(options={}) {
    this.#options={endpoint:'/api/audio',workletURL:'/api/dot/capture-worklet.mjs',connectTimeoutMs:10000,maxBufferedBytes:1024*1024,maxPlaybackSeconds:5,...options};
    for(const key of ['connectTimeoutMs','maxBufferedBytes','maxPlaybackSeconds'])if(!Number.isFinite(this.#options[key])||this.#options[key]<=0)throw new TypeError(`Positive ${key} required`);
  }
  get state(){return this.#state;}
  #notify(event){try{this.#options.onEvent?.(event);}catch{/* Host callback errors must not leak media resources. */}}
  #url(){const location=this.#options.location??globalThis.location;if(!location?.href)throw error('browser_required','Browser location required');const url=new URL(this.#options.endpoint,location.href);const origin=new URL(location.href);url.protocol=url.protocol==='https:'?'wss:':url.protocol==='http:'?'ws:':url.protocol;const normalized=url.protocol==='wss:'?'https:':url.protocol==='ws:'?'http:':url.protocol;if(normalized!==origin.protocol||url.host!==origin.host||url.username||url.password)throw error('cross_origin','Voice endpoint must use the authenticated same origin');return url.href;}
  #send(event){if(this.#socket?.readyState!==1)throw error('socket_closed','Voice host socket is not open');if((this.#socket.bufferedAmount??0)+JSON.stringify(event).length>this.#options.maxBufferedBytes)throw error('capture_backpressure','Voice upload queue exceeded its bound');this.#socket.send(JSON.stringify(event));}
  async start(){
    if(this.#startPending||!['idle','stopped','failed'].includes(this.#state))throw error('already_started','Voice session is already starting or active');
    this.#startPending=true;this.#state='starting';this.#playbackCancelled=false;const epoch=++this.#epoch;this.#notify({type:'state',state:'starting'});
    try{
      const devices=this.#options.mediaDevices??globalThis.navigator?.mediaDevices;if(!devices?.getUserMedia)throw error('capture_unavailable','Microphone capture is unavailable');
      const stream=await devices.getUserMedia({audio:{channelCount:1,sampleRate:24000,echoCancellation:true,noiseSuppression:true},video:false});
      if(epoch!==this.#epoch){for(const track of stream.getTracks())track.stop();throw error('stopped','Voice start was stopped');}this.#stream=stream;
      await this.#options.beforeConnect?.();if(epoch!==this.#epoch)throw error('stopped','Voice start was stopped');
      const factory=this.#options.socketFactory??(url=>new WebSocket(url));this.#socket=factory(this.#url());
      await new Promise((resolve,reject)=>{
        const socket=this.#socket;let settled=false,timer;const finish=(failure)=>{if(settled)return;settled=true;clearTimeout(timer);socket.removeEventListener('open',open);failure?reject(failure):resolve();};
        this.#finishConnect=finish;const open=()=>{};const message=event=>{this.#receive(event.data);try{const frame=JSON.parse(event.data);if(frame?.type==='status'&&frame.state==='ready')finish();}catch{}};const close=()=>{finish(error('socket_closed','Voice host disconnected'));if(this.#state==='active')this.#fail(error('socket_closed','Voice host disconnected'));};const failure=()=>{finish(error('socket_error','Voice host connection failed'));if(this.#state==='active')this.#fail(error('socket_error','Voice host connection failed'));};
        this.#socketHandlers={message,close,error:failure};for(const [name,handler]of Object.entries(this.#socketHandlers))socket.addEventListener(name,handler);socket.addEventListener('open',open);timer=setTimeout(()=>finish(error('connect_timeout','Voice host did not connect')),this.#options.connectTimeoutMs);
      });
      if(epoch!==this.#epoch)throw error('stopped','Voice start was stopped');
      const createContext=this.#options.createAudioContext??(()=>new AudioContext({sampleRate:24000}));this.#context=createContext();await this.#context.audioWorklet.addModule(this.#options.workletURL);
      if(epoch!==this.#epoch)throw error('stopped','Voice start was stopped');
      const createNode=this.#options.createWorkletNode??(context=>new AudioWorkletNode(context,'near-dot-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}));this.#worklet=createNode(this.#context);
      this.#worklet.port.onmessage=({data})=>{
        if(this.#state!=='active'||epoch!==this.#epoch)return;
        try{if(data?.type==='pcm'){const bytes=new Uint8Array(data.bytes);if(bytes.length>9600)throw error('capture_protocol','Capture frame exceeds 200ms');this.#send({type:'audio.append',audio:encode(bytes)});}if(data?.type==='flushed'&&this.#flushCommit!==undefined&&data.id===this.#flushCommit){this.#flushCommit=undefined;this.#send({type:'audio.commit'});}}
        catch(failure){this.#fail(failure);}
      };
      this.#source=this.#context.createMediaStreamSource(stream);this.#gain=this.#context.createGain();this.#gain.gain.value=0;this.#source.connect(this.#worklet);this.#worklet.connect(this.#gain);this.#gain.connect(this.#context.destination);
      await this.#context.resume();if(epoch!==this.#epoch)throw error('stopped','Voice start was stopped');this.#state='active';this.#notify({type:'state',state:'active'});return this;
    }catch(failure){if(epoch===this.#epoch){this.#state='failed';this.#notify({type:'error',code:failure.code??'capture_failed',message:failure instanceof MediaError?failure.message:'Microphone or audio setup failed'});await this.#cleanup();}throw failure;}finally{this.#startPending=false;}
  }
  #receive(raw){
    if(!['starting','active'].includes(this.#state))return;
    try{if(typeof raw!=='string'||raw.length>1024*1024)throw error('host_protocol','Invalid host frame');const event=JSON.parse(raw);if(!event||typeof event.type!=='string')throw error('host_protocol','Invalid host event');
      if(event.type==='audio.delta'){if(this.#state!=='active')throw error('host_protocol','Audio arrived before microphone session became active');if(!this.#playbackCancelled)this.#play(event.audio);}
      else if(event.type==='audio.clear'){this.#stopPlayback();}
      else if(event.type==='transcript'){if(!['user','assistant'].includes(event.role)||typeof event.text!=='string')throw error('host_protocol','Invalid transcript');}
      else if(event.type==='camera.status'){
        if(!['off','starting','ready','pending','sent','accepted','error'].includes(event.phase)||typeof event.active!=='boolean'||(event.id!==undefined&&(typeof event.id!=='string'||!/^camera-[A-Za-z0-9_-]{1,96}$/.test(event.id))))throw error('host_protocol','Invalid camera status');
        const pending=this.#cameraPending;
        if(event.phase==='off')this.#finishCamera(error('camera_stopped','Camera context stopped'));
        else if(pending&&event.id===pending.id){if(event.phase==='error')this.#finishCamera(error('camera_context','Camera context was rejected'));else if(['sent','accepted'].includes(event.phase)){if(typeof event.eventId!=='string'||!event.eventId||event.eventId.length>128)throw error('host_protocol','Invalid camera receipt');this.#finishCamera(null,{status:event.phase,id:event.id,eventId:event.eventId});}}
        this.#notify({type:'camera.status',phase:event.phase,active:event.active,id:event.id,eventId:event.eventId,capturedAtMs:event.capturedAtMs,code:typeof event.code==='string'?event.code.slice(0,128):undefined});return;
      }
      else if(event.type==='error')throw error(typeof event.code==='string'?event.code:'host_error','Voice host reported an error');
      this.#notify(event);
    }catch(failure){this.#fail(failure instanceof MediaError?failure:error('host_protocol','Malformed host JSON'));}
  }
  #play(audio){const bytes=decode(audio);const context=this.#context;const count=bytes.length/2;const duration=count/24000;const start=Math.max(context.currentTime,this.#nextPlaybackAt);if(start-context.currentTime+duration>this.#options.maxPlaybackSeconds)throw error('playback_backpressure','Audio playback queue exceeded its bound');const buffer=context.createBuffer(1,count,24000);const samples=buffer.getChannelData(0);const view=new DataView(bytes.buffer);for(let i=0;i<count;i++)samples[i]=view.getInt16(i*2,true)/32768;const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.onended=()=>{this.#sources.delete(source);source.disconnect();};this.#sources.add(source);source.start(start);this.#nextPlaybackAt=start+duration;}
  commit(){if(this.#state!=='active')throw error('not_active','Voice session must be active');if(this.#flushCommit!==undefined)throw error('commit_pending','Audio commit already pending');this.#playbackCancelled=false;this.#flushCommit=++this.#flushId;this.#worklet.port.postMessage({type:'flush',id:this.#flushCommit});}
  cancel(){if(this.#state!=='active')throw error('not_active','Voice session must be active');this.#flushCommit=undefined;this.#playbackCancelled=true;this.#send({type:'response.cancel'});this.#stopPlayback();}
  cameraEnable(){if(this.#state!=='active')throw error('not_active','An active audio call is required');this.#send({type:'camera.enable'});}
  cameraDisable(){this.#finishCamera(error('camera_stopped','Camera context stopped'));if(this.#state==='active')this.#send({type:'camera.disable'});}
  #finishCamera(failure,value){const pending=this.#cameraPending;if(!pending)return;this.#cameraPending=undefined;clearTimeout(pending.timer);pending.signal?.removeEventListener('abort',pending.abort);failure?pending.reject(failure):pending.resolve(value);}
  sendCameraFrame(frame,{signal}={}){
    if(this.#state!=='active')return Promise.reject(error('not_active','An active audio call is required'));
    if(this.#cameraPending)return Promise.reject(error('camera_pending','A camera frame is already pending'));
    if(signal?.aborted)return Promise.reject(error('camera_cancelled','Camera context was cancelled'));
    if(!frame||typeof frame.id!=='string'||!/^camera-[A-Za-z0-9_-]{1,96}$/.test(frame.id)||!Number.isSafeInteger(frame.capturedAtMs)||frame.capturedAtMs<0||typeof frame.dataURI!=='string'||frame.dataURI.length>349560||!/^data:image\/(png|jpeg);base64,/.test(frame.dataURI))return Promise.reject(error('camera_frame','Invalid bounded camera frame'));
    return new Promise((resolve,reject)=>{const abort=()=>this.#finishCamera(error('camera_cancelled','Camera context was cancelled'));this.#cameraPending={id:frame.id,resolve,reject,signal,abort,timer:setTimeout(()=>this.#finishCamera(error('camera_timeout','Camera host did not accept the frame')),5000)};signal?.addEventListener('abort',abort,{once:true});try{this.#send({type:'camera.frame',id:frame.id,dataURI:frame.dataURI,capturedAtMs:frame.capturedAtMs});}catch(failure){this.#finishCamera(failure);}});
  }
  #stopPlayback(){for(const source of this.#sources){try{source.stop();}catch{}source.disconnect();}this.#sources.clear();this.#nextPlaybackAt=this.#context?.currentTime??0;}
  #fail(failure){if(['failed','stopped'].includes(this.#state))return;this.#state='failed';++this.#epoch;this.#notify({type:'error',code:failure.code??'media_error',message:failure.message??'Media failed'});void this.#cleanup();}
  async #cleanup(){this.#finishCamera(error('camera_stopped','Audio call stopped'));this.#finishConnect?.(error('stopped','Voice session stopped'));this.#finishConnect=undefined;this.#flushCommit=undefined;this.#stopPlayback();if(this.#worklet){this.#worklet.port.onmessage=null;this.#worklet.port.postMessage({type:'stop'});}for(const node of [this.#source,this.#worklet,this.#gain])node?.disconnect();for(const track of this.#stream?.getTracks()??[])track.stop();if(this.#socket){for(const[name,handler]of Object.entries(this.#socketHandlers??{}))this.#socket.removeEventListener(name,handler);this.#socket.close();}const context=this.#context;this.#socket=this.#stream=this.#context=this.#source=this.#worklet=this.#gain=undefined;await context?.close();}
  async stop(){++this.#epoch;this.#state='stopped';if(this.#socket?.readyState===1){try{this.#send({type:'close'});}catch{}}await this.#cleanup();this.#notify({type:'state',state:'stopped'});}
}
