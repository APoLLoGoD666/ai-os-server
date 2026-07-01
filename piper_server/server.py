from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from piper.voice import PiperVoice
import wave, io, os, time

DIR = os.path.dirname(os.path.abspath(__file__))
VOICE_MODEL = os.path.join(DIR, "voices", "en_US-amy-medium.onnx")

print(f"[piper] Loading voice model...", flush=True)
_voice = PiperVoice.load(VOICE_MODEL)
print(f"[piper] Ready — {_voice.config.sample_rate}Hz", flush=True)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["POST", "GET"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/tts")
async def tts(req: Request):
    body = await req.json()
    text = body.get("text", "").strip()
    if not text:
        return Response(status_code=400)
    t0 = time.time()
    chunks = list(_voice.synthesize(text))
    if not chunks:
        return Response(status_code=500)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(chunks[0].sample_channels)
        wf.setsampwidth(chunks[0].sample_width)
        wf.setframerate(chunks[0].sample_rate)
        for c in chunks:
            wf.writeframes(c.audio_int16_bytes)
    print(f"[piper] {len(text)}ch -> {len(buf.getvalue())}B WAV in {time.time()-t0:.2f}s", flush=True)
    return Response(buf.getvalue(), media_type="audio/wav")
