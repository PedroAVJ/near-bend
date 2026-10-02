# Browser composer and media messages

Import `mountComposer`, `createVoiceRecorder`, `createCameraAttachmentCapture` and
`mountVoiceMessage` from `near-v/dot/browser`. Include `composer.css` alongside the
existing assistant styles. Browser module routes must serve its relative imports
`composer.mjs` and `voice-message.mjs`.

`mountComposer(container, options)` preserves `#message` and `#prompt` and calls:

- `onText(text)` for explicit text submission.
- `onVoiceMessage({blob, mimeType, durationMs})` for a completed audio recording.
- `onAttachment({file, kind})`, where kind is photo, video, or file.
- `onError(error)` for recoverable capture/upload errors.

The caller converts Blob/File bytes and invokes the server-side Dot domain APIs.
Audio send records the original audio asset and starts mandatory transcription.
It does not submit a text-agent request. The browser contains no provider keys.

The camera shortcut opens an actual browser camera preview after the user clicks.
Photo capture is JPEG bounded to 640 by 480. Video attachments are explicitly
labelled **silent video**: this camera path requests video only. Call camera context
is a separate controller. Library and file actions use the native file chooser.
Recording support depends on browser MediaRecorder codecs; unsupported capture
fails visibly. Construction requests no device permissions.

`mountVoiceMessage(container, message, options)` uses native audio playback,
keeps transcription collapsed, and accepts pending/running/ready/failed/cancelled
statuses. Retry and cancel callbacks receive the stable message ID. Original audio
remains playable after transcription failure. Provider/model provenance is inside
the collapsed transcript. Retry is disabled after three attempts. Server assets
should use owned `/api/assets/<id>` URLs. Updating transcription with the same URL
preserves playback; dispose pauses audio and releases locally created object URLs.
Dispose the composer to stop tracks and cancel unfinished recording/camera work.

Tests inject device, recorder, playback, and canvas APIs. They do not request real
permissions or invoke paid providers.

Bundler consumers can import `near-v/dot/composer.css` for the standard controls.
