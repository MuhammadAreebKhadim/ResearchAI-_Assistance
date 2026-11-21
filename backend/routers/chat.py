from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import ChatRequest
from services.openai_service import (
    stream_chat,
    RESEARCH_SYSTEM_PROMPT,
)
from services.semantic_scholar_service import search_papers as s2_search
from services.openalex_service import search_papers as oa_search
import json
import asyncio
import re

router = APIRouter(prefix="/api/chat", tags=["chat"])

CHATGPT_RESEARCH_SYSTEM = """You are an elite AI Research Assistant and Academic Mentor, powered by OpenAI GPT-6 Luna.
Your mission is to understand the researcher's intent, explore their ideas, help them identify promising research areas or problem statements, explain complex scientific concepts clearly, and guide them in formulating sharp research questions and methodologies.

Core Guidelines:
1. Intent Exploration & Mentorship:
   - When a user brings up a topic or asks questions, analyze what they want to achieve and help them navigate sub-domains, realistic assumptions, and novelty.
   - Do not dump bibliographic paper lists unless the user explicitly demands papers to read. Instead, focus on conceptual clarity, trade-offs, and research gap formulation.
2. Structured & Crystal Clear Formatting:
   - Use bold section headings (### Heading) to segment your response logically.
   - Use clean bullet points for easy scanning.
   - Whenever comparing research gaps, trade-offs, or methodologies, ALWAYS format them as a clean Markdown table (| Column 1 | Column 2 | ...) with explicit newlines between rows so it renders as a crisp academic table.
3. Engaging Follow-Up:
   - Conclude with ONE or TWO insightful, thought-provoking questions to help the user narrow down their specific interest (e.g. theoretical vs simulation vs experimental, specific algorithms, or datasets).
4. Invitation to Explore Literature:
   - Conclude your answer with an invitation to fetch papers: "💡 When you're ready to explore published literature on any specific direction, just ask: 'Give me papers on [topic]' and I will retrieve verified papers directly from OpenAlex and ArXiv."
"""


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream a research mentor chat response.
    Understands intent, provides deep explanations, and queries verified research APIs when explicitly requested.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    latest_query = messages[-1]["content"] if messages else ""

    # Precise Intent Detection: only triggers paper search when user actually demands or requests papers
    paper_demand_patterns = [
        r"\b(give me|show me|find me|fetch|search for|pull|get me|provide|recommend|list|send me|look for)\b.*?\b(papers?|articles?|preprints?|publications?|literature)\b",
        r"\b(latest|recent|sota|top|seminal|landmark)?\s*(research\s+)?(papers?|articles?|publications?|literature)\s+(on|about|for|regarding|in)\b",
        r"\b(want|need|looking)\s+to\s+(read|see|find|explore)\s+(papers?|articles?|publications?|literature)\b",
        r"^(papers?|find papers?|fetch papers?|search papers?|give papers?|show papers?)\b",
        r"\b(what|which|any)\s+papers?\s+(on|about|discussing|evaluating)\b",
    ]
    search_intent = any(re.search(pat, latest_query, re.IGNORECASE) for pat in paper_demand_patterns)

    if search_intent and len(latest_query.split()) > 1:
        return StreamingResponse(
            _search_and_stream(messages, latest_query),
            media_type="text/event-stream",
        )

    # Standard exploratory research mentoring and domain guidance
    return StreamingResponse(
        _normal_stream(messages),
        media_type="text/event-stream",
    )


async def _normal_stream(messages: list):
    try:
        async for token in stream_chat(messages, CHATGPT_RESEARCH_SYSTEM):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"


async def _search_and_stream(messages: list, query: str):
    # Notify frontend that live academic search is running
    yield f"data: {json.dumps({'type': 'searching'})}\n\n"

    # Clean query for search
    cleaned_query = re.sub(
        r"(?i)\b(find|search|give me|show me|recommend|look for|list|get|fetch|pull|research|papers?|articles?|preprints?|publications?|literature|about|on|for|regarding|latest|recent|sota|state of the art|domain|please|can you|i want|i need|to read|to see)\b",
        " ",
        query,
    )
    cleaned_query = re.sub(r"(?i)\b(a|an|the|of|in|to)\b", " ", cleaned_query)
    cleaned_query = re.sub(r"[^\w\s-]", " ", cleaned_query).strip()
    keywords = [k for k in cleaned_query.split() if len(k) > 2][:5]
    if not keywords:
        keywords = query.split()[:4]

    papers = []
    try:
        s2_results, oa_results = await asyncio.gather(
            s2_search(keywords, limit=6),
            oa_search(keywords, limit=4),
            return_exceptions=True,
        )
        if not isinstance(s2_results, Exception) and s2_results:
            papers.extend([p.model_dump() for p in s2_results])
        if not isinstance(oa_results, Exception) and oa_results:
            papers.extend([p.model_dump() for p in oa_results])
    except Exception:
        pass

    if papers:
        yield f"data: {json.dumps({'type': 'papers', 'papers': papers})}\n\n"
        paper_context_str = "\n\n".join(
            [
                f"[Paper {i+1}] Title: \"{p['title']}\"\nAuthors: {', '.join(p.get('authors', [])[:3])} ({p.get('year', 'N/A')})\nVenue: {p.get('source', 'Academic Venue')}\nDOI/URL: {p.get('url', '')}\nAbstract: {p.get('abstract', '')[:250]}..."
                for i, p in enumerate(papers[:5])
            ]
        )
        summary_messages = messages + [
            {
                "role": "user",
                "content": f"The academic databases returned {len(papers)} verified papers for query '{' '.join(keywords)}':\n\n{paper_context_str}\n\nSynthesize and discuss THESE exact real-world papers. Compare their methodologies or findings, and ask a thoughtful follow-up question. Do not hallucinate fake papers or URLs.",
            }
        ]
    else:
        summary_messages = messages
    try:
        async for token in stream_chat(summary_messages, CHATGPT_RESEARCH_SYSTEM):
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'token', 'content': f'\\n(Note: {str(e)})'})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"
