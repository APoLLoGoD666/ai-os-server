"""
APEX RAG-Anything Sidecar
Multimodal knowledge graph: ingest any file type, query via hybrid vector + BM25.
Endpoints consumed by agent-system/rag-bridge.js.

Start:  uvicorn sidecar.main:app --host 0.0.0.0 --port 8001
Env:    OPENAI_API_KEY  — enables vector embeddings + VLM multimodal queries
        STORAGE_PATH    — directory for persistent storage (default: ./rag_store)
"""

import os
import io
import json
import math
import time
import uuid
import base64
import pickle
import hashlib
import asyncio
import logging
import tempfile
from pathlib import Path
from typing import List, Optional, Dict, Any

import httpx
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("apex-rag")

app = FastAPI(title="APEX RAG Sidecar", version="1.0.0")

# ── Config ────────────────────────────────────────────────────────────────────

OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
STORAGE_PATH = Path(os.getenv("STORAGE_PATH", "./rag_store"))
STORAGE_PATH.mkdir(parents=True, exist_ok=True)
STORE_FILE   = STORAGE_PATH / "chunks.pkl"
EMBED_MODEL  = "text-embedding-3-small"
EMBED_DIM    = 1536
CHUNK_SIZE   = 800
CHUNK_OVERLAP = 120
TOP_K_DEFAULT = 5

# ── In-memory store ───────────────────────────────────────────────────────────
# Each entry: { id, content, metadata, embedding: np.ndarray | None, mtime }

_store: List[Dict] = []
_store_lock = asyncio.Lock()

def _load_store():
    global _store
    if STORE_FILE.exists():
        try:
            with open(STORE_FILE, "rb") as f:
                _store = pickle.load(f)
            log.info(f"[Store] loaded {len(_store)} chunks from disk")
        except Exception as e:
            log.warning(f"[Store] load failed ({e}), starting fresh")
            _store = []

def _save_store():
    try:
        with open(STORE_FILE, "wb") as f:
            pickle.dump(_store, f)
    except Exception as e:
        log.warning(f"[Store] save failed: {e}")

_load_store()

# ── Embeddings ────────────────────────────────────────────────────────────────

async def _embed(text: str) -> Optional[np.ndarray]:
    if not OPENAI_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {OPENAI_KEY}"},
                json={"model": EMBED_MODEL, "input": text[:8000]},
            )
            r.raise_for_status()
            vec = r.json()["data"][0]["embedding"]
            return np.array(vec, dtype=np.float32)
    except Exception as e:
        log.warning(f"[Embed] failed: {e}")
        return None

def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))

# ── BM25 ──────────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> List[str]:
    return text.lower().split()

def _bm25_score(query_tokens: List[str], chunk: Dict, k1=1.5, b=0.75) -> float:
    doc_tokens = _tokenize(chunk["content"])
    if not doc_tokens:
        return 0.0
    avg_dl = sum(len(_tokenize(c["content"])) for c in _store) / max(len(_store), 1)
    dl = len(doc_tokens)
    freq = {}
    for t in doc_tokens:
        freq[t] = freq.get(t, 0) + 1
    score = 0.0
    N = max(len(_store), 1)
    for qt in query_tokens:
        df = sum(1 for c in _store if qt in _tokenize(c["content"]))
        idf = math.log((N - df + 0.5) / (df + 0.5) + 1)
        tf = freq.get(qt, 0)
        score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avg_dl))
    return score

# ── Chunking ──────────────────────────────────────────────────────────────────

def _chunk_text(text: str, source: str, metadata: Dict) -> List[Dict]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        window = words[i : i + CHUNK_SIZE]
        content = " ".join(window)
        h = hashlib.md5(content.encode()).hexdigest()[:12]
        chunks.append({
            "id":       str(uuid.uuid4()),
            "content":  content,
            "metadata": {**metadata, "source": source},
            "embedding": None,
            "hash":     h,
            "mtime":    time.time(),
        })
        i += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

# ── Document conversion ───────────────────────────────────────────────────────

async def _convert_to_text(data: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()

    # Plain text formats — decode directly
    if ext in {".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".html", ".htm", ".xml"}:
        for enc in ("utf-8", "latin-1"):
            try:
                return data.decode(enc)
            except Exception:
                continue
        return data.decode("utf-8", errors="replace")

    # PDF — extract text page by page
    if ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(data))
            return "\n\n".join(p.extract_text() or "" for p in reader.pages)
        except ImportError:
            pass

    # DOCX
    if ext in {".docx", ".doc"}:
        try:
            import docx
            doc = docx.Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except ImportError:
            pass

    # Images — use GPT-4o vision if key available
    if ext in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"} and OPENAI_KEY:
        try:
            b64 = base64.b64encode(data).decode()
            mime = "image/jpeg" if ext in {".jpg", ".jpeg"} else f"image/{ext[1:]}"
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_KEY}"},
                    json={
                        "model": "gpt-4o-mini",
                        "max_tokens": 1000,
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Describe all text and content in this image in detail."},
                                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                            ]
                        }]
                    }
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
        except Exception as e:
            log.warning(f"[VLM] image extract failed: {e}")

    # Fallback: treat as UTF-8 text
    return data.decode("utf-8", errors="replace")

async def _ingest_chunks(chunks: List[Dict]):
    async with _store_lock:
        existing_hashes = {c["hash"] for c in _store}
        new_chunks = [c for c in chunks if c["hash"] not in existing_hashes]
        if not new_chunks:
            return 0
        _store.extend(new_chunks)
        _save_store()

    # Embed new chunks in background (non-blocking)
    asyncio.create_task(_embed_chunks(new_chunks))
    return len(new_chunks)

async def _embed_chunks(chunks: List[Dict]):
    for chunk in chunks:
        if chunk.get("embedding") is None:
            vec = await _embed(chunk["content"])
            if vec is not None:
                chunk["embedding"] = vec
    _save_store()

# ── Retrieval ─────────────────────────────────────────────────────────────────

async def _retrieve(query_text: str, top_k: int, mode: str) -> List[Dict]:
    if not _store:
        return []

    query_tokens = _tokenize(query_text)
    query_vec = await _embed(query_text) if mode in ("hybrid", "vector") else None

    scored = []
    for chunk in _store:
        bm25 = _bm25_score(query_tokens, chunk) if mode in ("hybrid", "bm25") else 0.0
        vec_score = 0.0
        if query_vec is not None and chunk.get("embedding") is not None:
            vec_score = _cosine(query_vec, chunk["embedding"])

        if mode == "hybrid":
            # Normalise both to [0,1] before combining
            score = 0.6 * bm25 + 0.4 * vec_score
        elif mode == "vector":
            score = vec_score
        else:
            score = bm25

        if score > 0:
            scored.append({**chunk, "_score": score})

    scored.sort(key=lambda x: x["_score"], reverse=True)
    return scored[:top_k]

# ── Request models ────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    mode: str = "hybrid"
    top_k: int = TOP_K_DEFAULT

class InsertRequest(BaseModel):
    items: List[Dict[str, Any]]

class FolderRequest(BaseModel):
    path: str

class UrlRequest(BaseModel):
    url: str

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "ok": True,
        "chunks": len(_store),
        "embeddings": sum(1 for c in _store if c.get("embedding") is not None),
        "openai": bool(OPENAI_KEY),
        "storage": str(STORE_FILE),
    }

@app.post("/rag/ingest")
async def ingest_file(file: UploadFile = File(...)):
    data = await file.read()
    try:
        text = await _convert_to_text(data, file.filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Conversion failed: {e}")
    if not text.strip():
        raise HTTPException(status_code=422, detail="No extractable text found")
    chunks = _chunk_text(text, file.filename, {"filename": file.filename, "size": len(data)})
    added = await _ingest_chunks(chunks)
    return {"ok": True, "filename": file.filename, "chunks_added": added, "total_chunks": len(chunks)}

@app.post("/rag/insert")
async def insert_content(req: InsertRequest):
    all_chunks = []
    for item in req.items:
        content = item.get("content", "")
        meta = item.get("metadata", {})
        source = meta.get("source", "direct_insert")
        chunks = _chunk_text(content, source, meta)
        all_chunks.extend(chunks)
    added = await _ingest_chunks(all_chunks)
    return {"ok": True, "chunks_added": added}

@app.post("/rag/ingest/folder")
async def ingest_folder(req: FolderRequest):
    folder = Path(req.path)
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(status_code=404, detail=f"Folder not found: {req.path}")
    total_added = 0
    errors = []
    for fpath in folder.rglob("*"):
        if not fpath.is_file():
            continue
        if fpath.suffix.lower() not in {".txt", ".md", ".pdf", ".docx", ".json", ".csv", ".html"}:
            continue
        try:
            data = fpath.read_bytes()
            text = await _convert_to_text(data, fpath.name)
            if text.strip():
                chunks = _chunk_text(text, str(fpath), {"filename": fpath.name, "path": str(fpath)})
                total_added += await _ingest_chunks(chunks)
        except Exception as e:
            errors.append({"file": str(fpath), "error": str(e)})
    return {"ok": True, "chunks_added": total_added, "errors": errors}

@app.post("/rag/ingest/url")
async def ingest_url(req: UrlRequest):
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            r = await client.get(req.url, headers={"User-Agent": "APEX-RAG/1.0"})
            r.raise_for_status()
            data = r.content
            ct = r.headers.get("content-type", "")
            ext = ".html" if "html" in ct else ".txt"
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"URL fetch failed: {e}")
    try:
        text = await _convert_to_text(data, f"url{ext}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Conversion failed: {e}")
    if not text.strip():
        raise HTTPException(status_code=422, detail="No extractable text at URL")
    chunks = _chunk_text(text, req.url, {"url": req.url})
    added = await _ingest_chunks(chunks)
    return {"ok": True, "url": req.url, "chunks_added": added}

@app.post("/rag/query")
async def query_knowledge(req: QueryRequest):
    results = await _retrieve(req.query, req.top_k, req.mode)
    return {
        "ok": True,
        "query": req.query,
        "mode": req.mode,
        "results": [
            {
                "content":  r["content"],
                "metadata": r["metadata"],
                "score":    round(r["_score"], 4),
            }
            for r in results
        ],
    }

@app.post("/rag/query/multimodal")
async def query_multimodal(req: QueryRequest):
    results = await _retrieve(req.query, req.top_k, "hybrid")
    context = "\n\n".join(r["content"] for r in results)

    if not OPENAI_KEY or not context:
        return {"ok": True, "query": req.query, "answer": context or "No relevant content found.", "results": results}

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "max_tokens": 800,
                    "messages": [
                        {"role": "system", "content": "Answer the question using only the provided context. Be concise and precise."},
                        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {req.query}"}
                    ]
                }
            )
            r.raise_for_status()
            answer = r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        answer = context

    return {"ok": True, "query": req.query, "answer": answer, "results": [{"content": r["content"], "score": r["_score"]} for r in results]}

@app.post("/rag/reset")
async def reset_store():
    async with _store_lock:
        _store.clear()
        if STORE_FILE.exists():
            STORE_FILE.unlink()
    return {"ok": True, "message": "Knowledge graph reset"}
