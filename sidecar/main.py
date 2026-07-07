"""
Apex AI OS Python sidecar — FastAPI wrapper for:
  - markitdown: any file/URL → markdown (PDF, DOCX, PPTX, XLSX, images, audio, YouTube, etc.)
  - RAG-Anything: multimodal knowledge graph ingest + hybrid vector/graph query

Start:  uvicorn sidecar.main:app --port 8001 --host 0.0.0.0
Env:
  OPENAI_API_KEY      — required for RAG-Anything LLM + embeddings
  OPENAI_BASE_URL     — optional (point at Anthropic OpenAI-compat endpoint)
  RAG_WORKING_DIR     — where the knowledge graph is persisted (default: ./rag-data)
  MARKITDOWN_LLM      — 'true' to enable LLM image descriptions (needs OPENAI_API_KEY)
"""

import os, io, tempfile, asyncio, json
from pathlib import Path
from typing import Optional, List, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# ── markitdown ──────────────────────────────────────────────────────────────────
try:
    from markitdown import MarkItDown
    _llm_client = None
    if os.environ.get("MARKITDOWN_LLM") == "true" and os.environ.get("OPENAI_API_KEY"):
        try:
            from openai import OpenAI
            _llm_client = OpenAI(
                api_key=os.environ["OPENAI_API_KEY"],
                base_url=os.environ.get("OPENAI_BASE_URL")
            )
        except ImportError:
            pass
    _md = MarkItDown(llm_client=_llm_client, llm_model=os.environ.get("MARKITDOWN_MODEL", "gpt-4o-mini")) if _llm_client else MarkItDown()
    MARKITDOWN_OK = True
except ImportError:
    MARKITDOWN_OK = False
    _md = None

# ── RAG-Anything ────────────────────────────────────────────────────────────────
RAG_OK = False
_rag = None
_rag_dir = os.environ.get("RAG_WORKING_DIR", "./rag-data")

def _make_llm_func():
    """Create async LLM function for RAG-Anything using OpenAI-compatible API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=os.environ.get("OPENAI_BASE_URL")
        )
        model = os.environ.get("RAG_LLM_MODEL", "gpt-4o-mini")

        async def llm_func(prompt, system_prompt=None, **kwargs):
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            resp = await client.chat.completions.create(model=model, messages=messages)
            return resp.choices[0].message.content

        return llm_func
    except ImportError:
        return None

def _make_embed_func():
    """Create async embedding function for RAG-Anything."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key, base_url=os.environ.get("OPENAI_BASE_URL"))
        embed_model = os.environ.get("RAG_EMBED_MODEL", "text-embedding-3-small")

        async def embed_func(texts, **kwargs):
            resp = await client.embeddings.create(model=embed_model, input=texts)
            return [e.embedding for e in resp.data]

        return embed_func
    except ImportError:
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rag, RAG_OK
    llm_fn = _make_llm_func()
    embed_fn = _make_embed_func()
    if llm_fn and embed_fn:
        try:
            from raganything import RAGAnything
            Path(_rag_dir).mkdir(parents=True, exist_ok=True)
            _rag = RAGAnything(
                working_dir=_rag_dir,
                llm_model_func=llm_fn,
                embedding_func=embed_fn,
            )
            RAG_OK = True
            print(f"[Sidecar] RAG-Anything initialized — working dir: {_rag_dir}")
        except Exception as e:
            print(f"[Sidecar] RAG-Anything init failed: {e}")
    else:
        print("[Sidecar] RAG-Anything disabled — set OPENAI_API_KEY to enable")
    yield

app = FastAPI(title="Apex AI OS Sidecar", version="2.0.0", lifespan=lifespan)

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True, "markitdown": MARKITDOWN_OK, "rag": RAG_OK, "rag_dir": _rag_dir}

# ── markitdown: single file ───────────────────────────────────────────────────
@app.post("/convert/file")
async def convert_file(file: UploadFile = File(...)):
    if not MARKITDOWN_OK:
        raise HTTPException(503, "markitdown not installed — pip install 'markitdown[all]'")
    content = await file.read()
    suffix = Path(file.filename or "upload").suffix or ".bin"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = _md.convert(tmp_path)
        return {"ok": True, "markdown": result.text_content, "filename": file.filename}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        os.unlink(tmp_path)

# ── markitdown: URL (supports YouTube, web pages, etc.) ──────────────────────
@app.post("/convert/url")
async def convert_url(url: str = Form(...)):
    if not MARKITDOWN_OK:
        raise HTTPException(503, "markitdown not installed")
    try:
        result = _md.convert(url)
        return {"ok": True, "markdown": result.text_content, "url": url}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── markitdown: batch files ───────────────────────────────────────────────────
@app.post("/convert/batch")
async def convert_batch(files: List[UploadFile] = File(...)):
    if not MARKITDOWN_OK:
        raise HTTPException(503, "markitdown not installed")
    results = []
    for file in files:
        content = await file.read()
        suffix = Path(file.filename or "upload").suffix or ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            r = _md.convert(tmp_path)
            results.append({"ok": True, "filename": file.filename, "markdown": r.text_content})
        except Exception as e:
            results.append({"ok": False, "filename": file.filename, "error": str(e)})
        finally:
            os.unlink(tmp_path)
    return {"ok": True, "results": results}

# ── RAG: ingest single file ───────────────────────────────────────────────────
# parser param: "auto" (default) | "mineru" | "docling" | "paddleocr"
@app.post("/rag/ingest")
async def rag_ingest(
    file: UploadFile = File(...),
    parser: str = Form("auto")
):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available — set OPENAI_API_KEY")
    content = await file.read()
    suffix = Path(file.filename or "doc").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        # RAG-Anything supports parse_method kwarg for MinerU/Docling/PaddleOCR
        kwargs = {}
        if parser and parser != "auto":
            kwargs["parse_method"] = parser
        await _rag.process_document_complete(tmp_path, **kwargs)
        return {"ok": True, "filename": file.filename, "parser": parser, "message": "ingested"}
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        os.unlink(tmp_path)

# ── RAG: ingest folder ────────────────────────────────────────────────────────
class FolderIngestBody(BaseModel):
    path: str

@app.post("/rag/ingest/folder")
async def rag_ingest_folder(body: FolderIngestBody, background_tasks: BackgroundTasks):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    folder = Path(body.path)
    if not folder.exists():
        raise HTTPException(400, f"Folder not found: {body.path}")

    async def _do_ingest():
        await _rag.process_folder_complete(str(folder))

    background_tasks.add_task(_do_ingest)
    return {"ok": True, "path": body.path, "message": "folder ingestion started in background"}

# ── RAG: ingest URL via markitdown ───────────────────────────────────────────
class UrlIngestBody(BaseModel):
    url: str

@app.post("/rag/ingest/url")
async def rag_ingest_url(body: UrlIngestBody):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    if not MARKITDOWN_OK:
        raise HTTPException(503, "markitdown not available — can't convert URL to markdown")
    try:
        result = _md.convert(body.url)
        markdown = result.text_content
        await _rag.insert_content_list([{"type": "text", "content": markdown, "metadata": {"source": body.url}}])
        return {"ok": True, "url": body.url, "chars": len(markdown), "message": "ingested"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── RAG: insert pre-parsed content ────────────────────────────────────────────
class InsertBody(BaseModel):
    items: List[dict]  # [{content: str, metadata: dict}]

@app.post("/rag/insert")
async def rag_insert(body: InsertBody):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    try:
        content_list = [{"type": "text", "content": item.get("content", ""), "metadata": item.get("metadata", {})} for item in body.items]
        await _rag.insert_content_list(content_list)
        return {"ok": True, "count": len(content_list), "message": "inserted"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── RAG: text query ───────────────────────────────────────────────────────────
class RagQuery(BaseModel):
    query: str
    mode: Optional[str] = "hybrid"
    top_k: Optional[int] = 5
    language: Optional[str] = None  # multilingual support

@app.post("/rag/query")
async def rag_query(body: RagQuery):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    try:
        params = {"mode": body.mode, "top_k": body.top_k}
        if body.language:
            params["language"] = body.language
        answer = await _rag.aquery(body.query, param=params)
        return {"ok": True, "answer": answer, "query": body.query}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── RAG: multimodal query ─────────────────────────────────────────────────────
@app.post("/rag/query/multimodal")
async def rag_query_multimodal(body: RagQuery):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    try:
        answer = await _rag.aquery_with_multimodal(body.query)
        return {"ok": True, "answer": answer, "query": body.query}
    except Exception as e:
        raise HTTPException(500, str(e))

# ── RAG: streaming query — server-sent events ────────────────────────────────
@app.post("/rag/query/stream")
async def rag_query_stream(body: RagQuery):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")

    async def _generator():
        try:
            params = {"mode": body.mode, "top_k": body.top_k}
            if body.language:
                params["language"] = body.language
            answer = await _rag.aquery(body.query, param=params)
            # Stream in ~100-char chunks so the client can render progressively
            chunk_size = 100
            for i in range(0, len(answer), chunk_size):
                chunk = answer[i:i + chunk_size]
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True, 'query': body.query})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(_generator(), media_type="text/event-stream")

# ── RAG: ingest with progress via SSE ────────────────────────────────────────
@app.post("/rag/ingest/progress")
async def rag_ingest_progress(file: UploadFile = File(...), parser: str = Form("auto")):
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    content = await file.read()
    suffix = Path(file.filename or "doc").suffix or ".pdf"

    async def _progress_generator():
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        try:
            yield f"data: {json.dumps({'status': 'processing', 'filename': file.filename})}\n\n"
            kwargs = {} if parser == "auto" else {"parse_method": parser}
            await _rag.process_document_complete(tmp_path, **kwargs)
            yield f"data: {json.dumps({'status': 'done', 'filename': file.filename})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    return StreamingResponse(_progress_generator(), media_type="text/event-stream")

# ── RAG: reset ────────────────────────────────────────────────────────────────
@app.post("/rag/reset")
async def rag_reset():
    import shutil
    if not RAG_OK or _rag is None:
        raise HTTPException(503, "RAG-Anything not available")
    try:
        shutil.rmtree(_rag_dir, ignore_errors=True)
        Path(_rag_dir).mkdir(parents=True, exist_ok=True)
        return {"ok": True, "message": "knowledge graph cleared"}
    except Exception as e:
        raise HTTPException(500, str(e))
