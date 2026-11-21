from openai import AsyncOpenAI
from config import OPENAI_API_KEY, OPENAI_MODEL
from typing import List, AsyncIterator

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

RESEARCH_SYSTEM_PROMPT = """You are a knowledgeable and thoughtful research assistant. Your role is to help researchers discover relevant academic papers and understand their research interests.

Guidelines:
- Be conversational and natural. Never use bullet points or numbered lists in your responses unless showing paper results.
- After responding to the user, ask ONE focused follow-up question to better understand their research intent, domain specifics, or scope.
- When you have gathered enough context (usually after 3-4 exchanges), inform the user you are ready to search for papers and present results.
- When presenting paper results, use a clean structured format.
- Be concise but warm. Avoid jargon unless the user uses it first.
- Never ask multiple questions at once.
- Do not use emojis.
"""

PAPER_SYSTEM_PROMPT = """You are an expert at reading and explaining academic research papers. Your task is to help users understand complex research papers.

Guidelines:
- Explain clearly, without unnecessary jargon.
- When simplifying, use plain language that a smart non-expert can understand.
- For deep explanations, go section by section: Abstract, Introduction, Methodology, Results, Conclusion.
- For summaries, be concise and highlight the core contribution and findings.
- Do not use emojis.
- Be direct and informative.
"""

PROFESSOR_SYSTEM_PROMPT = """You are a research collaboration advisor. Your role is to help researchers evaluate whether their work aligns with a professor's research for potential collaboration.

Guidelines:
- When given professor information, extract: research domains, key contributions, methodology preferences, and notable publications.
- When analyzing alignment, be honest and nuanced. Not everything needs to align perfectly.
- Provide actionable insights about collaboration opportunities.
- Write naturally, not in bullet-point overload mode.
- Do not use emojis.
"""


async def stream_chat(
    messages: List[dict],
    system_prompt: str = RESEARCH_SYSTEM_PROMPT,
) -> AsyncIterator[str]:
    """Stream a chat completion response token by token."""
    kwargs = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": True,
    }
    # gpt-6-luna only supports default temperature (1) and uses max_completion_tokens
    if "luna" not in OPENAI_MODEL.lower() and "o1" not in OPENAI_MODEL.lower() and "o3" not in OPENAI_MODEL.lower():
        kwargs["temperature"] = 0.7
        kwargs["max_tokens"] = 1500

    stream = await client.chat.completions.create(**kwargs)
    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def complete_chat(
    messages: List[dict],
    system_prompt: str = RESEARCH_SYSTEM_PROMPT,
    temperature: float = 1.0,
    max_tokens: int = 2000,
) -> str:
    """Get a complete (non-streaming) chat response."""
    kwargs = {
        "model": OPENAI_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
    }
    if "luna" in OPENAI_MODEL.lower() or "o1" in OPENAI_MODEL.lower() or "o3" in OPENAI_MODEL.lower():
        kwargs["max_completion_tokens"] = max_tokens
    else:
        kwargs["temperature"] = temperature
        kwargs["max_tokens"] = max_tokens

    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


async def extract_search_queries(conversation: List[dict]) -> dict:
    """Extract search keywords and filters from conversation history."""
    extraction_prompt = """Based on this conversation, extract research search parameters as JSON:
{
  "keywords": ["keyword1", "keyword2"],
  "domains": ["domain1"],
  "year_from": null or year,
  "year_to": null or year,
  "paper_type": "any" or "survey" or "original",
  "ready_to_search": true or false
}

Only set ready_to_search=true if the user has clearly expressed their research interest and you have enough info to search."""

    kwargs = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": extraction_prompt},
            *conversation,
        ],
        "response_format": {"type": "json_object"},
    }
    if "luna" not in OPENAI_MODEL.lower() and "o1" not in OPENAI_MODEL.lower() and "o3" not in OPENAI_MODEL.lower():
        kwargs["temperature"] = 0.1

    response = await client.chat.completions.create(**kwargs)
    import json
    return json.loads(response.choices[0].message.content)
