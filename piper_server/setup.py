#!/usr/bin/env python3
"""Downloads Piper binary + en_US-amy-medium voice, installs FastAPI/uvicorn."""
import urllib.request, zipfile, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
PIPER_DIR = os.path.join(DIR, "piper")
VOICES_DIR = os.path.join(DIR, "voices")

def dl(url, dest):
    print(f"  Downloading {os.path.basename(dest)} ...", flush=True)
    urllib.request.urlretrieve(url, dest)

print("=== Piper TTS Setup ===\n")

# Python deps
print("[1/3] Installing fastapi + uvicorn + piper-tts ...")
os.system(f'"{sys.executable}" -m pip install fastapi uvicorn piper-tts --quiet')

# Piper binary
print("[2/3] Piper binary ...")
os.makedirs(PIPER_DIR, exist_ok=True)
if not os.path.exists(os.path.join(PIPER_DIR, "piper.exe")):
    zip_path = os.path.join(DIR, "_piper.zip")
    dl("https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip", zip_path)
    with zipfile.ZipFile(zip_path, "r") as z:
        for member in z.namelist():
            fname = os.path.basename(member)
            if fname:
                with z.open(member) as src, open(os.path.join(PIPER_DIR, fname), "wb") as dst:
                    dst.write(src.read())
    os.remove(zip_path)
    print("  piper.exe ready.")
else:
    print("  piper.exe already present, skipping.")

# Voice model
print("[3/3] Voice model (en_US-amy-medium) ...")
os.makedirs(VOICES_DIR, exist_ok=True)
BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium"
for fname in ["en_US-amy-medium.onnx", "en_US-amy-medium.onnx.json"]:
    dest = os.path.join(VOICES_DIR, fname)
    if not os.path.exists(dest):
        dl(f"{BASE}/{fname}", dest)
    else:
        print(f"  {fname} already present, skipping.")

print("\nDone. Run start.bat to launch the server.")
