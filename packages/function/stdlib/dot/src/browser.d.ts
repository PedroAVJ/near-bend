import type {Snapshot} from 'near-v/dot';
export type AssistantComponent = { $: 'components.Group'; kind: string; children: unknown };
export function assistantView(snapshot: Snapshot): AssistantComponent;
export function renderAssistant(snapshot: Snapshot): string;
export {createVoiceRecorder,mountVoiceMessage,VoiceMessageError} from './voice-message.js';
export {mountComposer,createCameraAttachmentCapture} from './composer.js';
