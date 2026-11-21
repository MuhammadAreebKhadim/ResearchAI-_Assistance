from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.pdf_service import extract_text_from_pdf, extract_sections
from services.openai_service import stream_chat, PAPER_SYSTEM_PROMPT
import json
import hashlib
import time

router = APIRouter(prefix="/api/paper", tags=["paper"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
_paper_cache: dict = {}


class PastePaperRequest(BaseModel):
    title: str = "Pasted Paper"
    text: str


@router.post("/upload")
async def upload_paper(file: UploadFile = File(...)):
    """Upload any PDF from computer and extract its text."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50MB.")

    try:
        text = extract_text_from_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF appears to be empty or contains scanned images without OCR text.")

    sections = extract_sections(text)
    word_count = len(text.split())

    paper_id = hashlib.md5(f"{file.filename}{time.time()}".encode()).hexdigest()[:12]
    _paper_cache[paper_id] = {
        "filename": file.filename,
        "text": text,
        "sections": sections,
        "word_count": word_count,
    }

    return {
        "paper_id": paper_id,
        "filename": file.filename,
        "word_count": word_count,
        "sections_found": list(sections.keys()),
    }


@router.post("/paste")
async def paste_paper(payload: PastePaperRequest):
    """Paste raw text of any paper directly."""
    text = payload.text.strip()
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Pasted text is too short. Please provide at least an abstract or section.")

    sections = extract_sections(text)
    word_count = len(text.split())

    paper_id = hashlib.md5(f"{payload.title}{time.time()}".encode()).hexdigest()[:12]
    _paper_cache[paper_id] = {
        "filename": payload.title or "Pasted Research Text",
        "text": text,
        "sections": sections,
        "word_count": word_count,
    }

    return {
        "paper_id": paper_id,
        "filename": payload.title or "Pasted Research Text",
        "word_count": word_count,
        "sections_found": list(sections.keys()),
    }


@router.post("/explain/stream")
async def explain_stream(
    paper_id: str = Form(...),
    mode: str = Form(...),  # summary | simplify | deep | qa
    question: str = Form(default=""),
):
    """Stream an explanation or answer any question about the paper."""
    paper = _paper_cache.get(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found in active session. Please upload or paste it again.")

    text = paper["text"]
    filename = paper["filename"]
    sections = paper["sections"]

    if mode == "summary":
        prompt = f"""Paper: "{filename}"\nFull Paper Content:\n{text}\n\nProvide an executive summary of this research paper covering: 1. Core Problem & Motivation, 2. Proposed Methodology/Architecture, 3. Main Empirical Results & Key Metrics, 4. Research Implications."""
    elif mode == "simplify":
        prompt = f"""Paper: "{filename}"\nFull Paper Content:\n{text}\n\nExplain this paper in plain, intuitive language for an educated non-specialist (ELI15). Use clear analogies where appropriate, unpack technical acronyms, and focus on intuition and 'why it matters'."""
    elif mode == "deep":
        sections_excerpt = "\n\n".join(f"[{k.upper()}]\n{v}" for k, v in sections.items())
        prompt = f"""Paper: "{filename}"\nSections:\n{sections_excerpt or text}\n\nProvide a rigorous, section-by-section breakdown of this paper. Explain the technical formulations, assumptions, experimental setup, and critical evaluation."""
    elif mode == "qa":
        prompt = f"""Paper: "{filename}"\nFull Paper Content:\n{text}\n\nUser Question: {question}\n\nAnswer the user's question with precise references to the text. If the paper does not mention something, clearly state so."""
    else:
        prompt = f"""Paper: "{filename}"\nFull Paper Content:\n{text}\n\nAnalyze this paper and provide key takeaways."""

    messages = [{"role": "user", "content": prompt}]

    async def token_stream():
        async for token in stream_chat(messages, PAPER_SYSTEM_PROMPT):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")


@router.post("/chat/stream")
async def paper_chat_stream(
    paper_id: str = Form(...),
    question: str = Form(...),
    history: str = Form(default="[]"),
):
    """Interactive multi-turn conversation with the uploaded/pasted paper."""
    paper = _paper_cache.get(paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper session expired. Please re-upload or re-paste.")

    try:
        prev_history = json.loads(history)
    except Exception:
        prev_history = []

    context_prompt = f"You are analyzing the research paper '{paper['filename']}'. Here is the paper content for reference:\n\n{paper['text'][:7000]}\n\nAlways ground your answers in the content of this paper."

    messages = [{"role": "system", "content": context_prompt}]
    for h in prev_history[-6:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": question})

    async def token_stream():
        async for token in stream_chat(messages, PAPER_SYSTEM_PROMPT):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")
