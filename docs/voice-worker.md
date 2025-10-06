# Voice Worker (FastAPI)

This worker previously handled real-time speech for the public chat. Whisper (faster-whisper) and Coqui TTS have been removed from this codespace.

Current status (no STT/TTS engines installed):
- You can still proxy mic audio over WebSocket if desired, but there is no on-device transcription or synthesis.
- For text-only chat, the Next.js API endpoints remain unchanged.
- To re-enable voice, reintroduce an STT engine and a TTS engine of your choice and wire them into the pipeline described below.

## WebSocket protocol
1) Client connects and immediately sends a JSON session message:
   { "slug": "<bot-slug>", "voice_mode": "text|text+audio|audio", "userId"?: string }
2) Client streams binary WebM/Opus chunks (e.g., 300ms MediaRecorder slices)
3) Server may send (when voice is re-enabled):
   - Partial transcripts as JSON { "text": string } (client shows only in text or text+audio modes)
   - Raw Float32 PCM mono frames at 16kHz as binary (played by the AudioWorklet)

## Local development
- App dev server runs at http://localhost:4010
- Worker default WS endpoint: ws://127.0.0.1:8765/ws
- The browser connects to /api/chat/voice-stream (Next.js proxy) in dev, which forwards to the worker.

## Environment variables
- PORT: Worker HTTP/WS port (default 8765)
- NEXT_API_BASE: Base URL to reach the Next.js app (default http://localhost:4010)
- VOICE_WORKER_WS_URL (in Next.js): Set in production to point the client directly to the worker ws URL

## Dependencies
- System: ffmpeg in PATH for WebM/Opus decode (optional if you do not process audio)
- Python packages: see voice_worker.requirements.txt (now without Whisper/TTS packages)

## Notes
- STT/TTS are removed from this environment. If you add back engines, consider streaming implementations for low latency and ensure the client expects Float32 PCM @ 16kHz.
