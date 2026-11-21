from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from services.semantic_scholar_service import search_author as s2_author
from services.openalex_service import search_author_works as oa_author
from services.pdf_service import extract_text_from_pdf
from services.openai_service import stream_chat, PROFESSOR_SYSTEM_PROMPT
import json

router = APIRouter(prefix="/api/professor", tags=["professor"])


@router.post("/analyze/stream")
async def analyze_professor(
    professor_name: str = Form(default=""),
    professor_university: str = Form(default=""),
    professor_paper_text: str = Form(default=""),
    user_research_summary: str = Form(...),
    professor_pdf: UploadFile = File(default=None),
):
    """
    Analyze a professor's research and calculate alignment with user's work.
    Accepts: professor name + university, PDF upload, pasted paper text, or any combination.
    """
    professor_context_parts = []

    # 1. API search if name provided
    if professor_name.strip():
        s2_data, oa_data = None, None
        try:
            s2_data = await s2_author(professor_name, professor_university or None)
        except Exception:
            pass
        try:
            oa_data = await oa_author(professor_name, professor_university or None)
        except Exception:
            pass

        if s2_data:
            professor_context_parts.append(_format_s2_author(s2_data))
        if oa_data:
            professor_context_parts.append(_format_oa_author(oa_data))

    # 2. PDF upload
    if professor_pdf and professor_pdf.filename:
        try:
            content = await professor_pdf.read()
            pdf_text = extract_text_from_pdf(content)
            professor_context_parts.append(f"=== PROFESSOR'S RESEARCH PAPER (PDF Upload) ===\n{pdf_text}")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not parse uploaded PDF: {str(e)}")

    # 3. Direct paper text pasted
    if professor_paper_text.strip():
        professor_context_parts.append(f"=== PROFESSOR'S RESEARCH PAPER / WORK (Pasted Text) ===\n{professor_paper_text}")

    if not professor_context_parts:
        if professor_name.strip():
            # If APIs returned nothing, still analyze with GPT-4o's academic knowledge
            professor_context_parts.append(
                f"Professor Name: {professor_name}\nAffiliation: {professor_university or 'Not specified'}\nNote: Use your knowledge base of published literature by this scholar."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Please provide at least a professor name, upload their paper PDF, or paste their paper/abstract text.",
            )

    professor_context = "\n\n".join(professor_context_parts)

    analysis_prompt = f"""You are an elite academic advisor evaluating collaboration feasibility between an applicant/researcher and a professor.

PROFESSOR'S RESEARCH PROFILE & PAPERS:
{professor_context}

APPLICANT'S / USER'S RESEARCH WORK & INTERESTS:
{user_research_summary}

Please generate an in-depth, rigorous, and highly actionable Collaboration Alignment Report following this structure:

### 1. Professor's Research Agenda & Methodology
Summarize the professor's core research problems, theoretical foundations, tools/methods, and recent trajectory.

### 2. Alignment Score: [Score between 0 to 100]/100
State the score clearly with a 2-3 sentence justification. Be objective and honest (high scores require genuine methodological or thematic synergy).

### 3. Synergies & Overlapping Dimensions
Enumerate specific concepts, datasets, mathematical techniques, or application domains where both parties align.

### 4. Divergences & Knowledge Gaps
Where do the applicant's current skills or interests diverge from the professor's focus? What must the applicant learn or adapt?

### 5. Concrete Joint Research Proposals (2-3 Actionable Ideas)
Propose specific, novel joint research directions combining the applicant's strengths with the professor's agenda.

### 6. Tailored Cold Email Outreach Template
A polite, concise, intellectually substantive email draft citing their specific papers that the applicant can send directly.
"""

    messages = [{"role": "user", "content": analysis_prompt}]

    async def token_stream():
        async for token in stream_chat(messages, PROFESSOR_SYSTEM_PROMPT):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")


@router.post("/chat/stream")
async def professor_collab_chat(
    professor_info: str = Form(...),
    user_info: str = Form(...),
    question: str = Form(...),
    history: str = Form(default="[]"),
):
    """
    Interactive multi-turn chatbot specifically for collaboration strategy.
    Answers user questions like:
    - How can I align my work with this professor?
    - What papers or skills should I learn?
    - How to propose a joint project?
    - Refine the email or interview preparation.
    """
    try:
        prev_history = json.loads(history)
    except Exception:
        prev_history = []

    system_instruction = f"""You are an expert Academic Career & Collaboration Mentor.
You are counseling an applicant on how to successfully collaborate or work with a specific professor.

Context on Professor:
{professor_info[:4000]}

Context on User / Applicant:
{user_info[:3000]}

Your Mission:
Answer the user's specific strategic questions (e.g. how to align, what to read, what gap to pitch, interview prep, outreach tips).
Provide nuanced, actionable, and encouraging academic advice."""

    messages = [{"role": "system", "content": system_instruction}]
    for h in prev_history[-6:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": question})

    async def token_stream():
        async for token in stream_chat(messages, PROFESSOR_SYSTEM_PROMPT):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")


def _format_s2_author(data: dict) -> str:
    papers = "\n".join(
        f"  - {p['title']} ({p.get('year', 'N/A')}) — {p.get('citations', 0)} citations"
        for p in data.get("top_papers", [])[:8]
    )
    affiliations = ", ".join(
        [a.get("name", "") if isinstance(a, dict) else str(a) for a in data.get("affiliations", [])]
    )
    return f"""=== SEMANTIC SCHOLAR PROFILE ===
Name: {data.get('name')}
Affiliation: {affiliations or 'Not listed'}
H-Index: {data.get('h_index', 'N/A')}
Total Citations: {data.get('total_citations', 'N/A')}

Selected Top Publications:
{papers}"""


def _format_oa_author(data: dict) -> str:
    papers = "\n".join(
        f"  - {p['title']} ({p.get('year', 'N/A')}) — {p.get('citations', 0)} citations"
        for p in data.get("top_papers", [])[:8]
    )
    affiliations = ", ".join(data.get("affiliations", []))
    topics = ", ".join(data.get("topics", []))
    return f"""=== OPENALEX PROFILE ===
Name: {data.get('name')}
Affiliation: {affiliations or 'Not listed'}
Research Topics: {topics or 'Not listed'}
Total Citations: {data.get('total_citations', 'N/A')}

Top Publications:
{papers}"""
