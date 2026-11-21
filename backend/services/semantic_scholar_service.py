import httpx
from typing import List, Optional
from config import SEMANTIC_SCHOLAR_API_KEY
from models.schemas import PaperResult

BASE_URL = "https://api.semanticscholar.org/graph/v1"

HEADERS = {}
if SEMANTIC_SCHOLAR_API_KEY:
    HEADERS["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

FIELDS = "title,authors,year,abstract,externalIds,citationCount,url,fieldsOfStudy,publicationTypes"


async def search_papers(
    keywords: List[str],
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    limit: int = 10,
) -> List[PaperResult]:
    """Search Semantic Scholar for papers matching keywords."""
    query = " ".join(keywords)
    params = {
        "query": query,
        "fields": FIELDS,
        "limit": limit,
    }
    if year_from and year_to:
        params["year"] = f"{year_from}-{year_to}"
    elif year_from:
        params["year"] = f"{year_from}-"
    elif year_to:
        params["year"] = f"-{year_to}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{BASE_URL}/paper/search", params=params, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()

    papers = []
    for item in data.get("data", []):
        authors = [a.get("name", "") for a in item.get("authors", [])]
        external = item.get("externalIds", {}) or {}
        doi = external.get("DOI")
        url = item.get("url") or (f"https://doi.org/{doi}" if doi else "")
        papers.append(
            PaperResult(
                title=item.get("title", ""),
                authors=authors[:4],
                year=item.get("year"),
                abstract=item.get("abstract", "")[:400] if item.get("abstract") else None,
                url=url,
                source="Semantic Scholar",
                citation_count=item.get("citationCount"),
                doi=doi,
            )
        )
    return papers


async def search_author(name: str, affiliation: Optional[str] = None) -> Optional[dict]:
    """Search for a professor/author by name."""
    query = name
    if affiliation:
        query += f" {affiliation}"

    params = {
        "query": query,
        "fields": "name,affiliations,hIndex,paperCount,citationCount,papers.title,papers.year,papers.citationCount,papers.fieldsOfStudy",
        "limit": 5,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{BASE_URL}/author/search", params=params, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()

    authors = data.get("data", [])
    if not authors:
        return None

    # Return the best match (first result)
    author = authors[0]
    papers = sorted(
        author.get("papers", []),
        key=lambda p: p.get("citationCount", 0),
        reverse=True,
    )[:10]

    return {
        "name": author.get("name"),
        "affiliations": author.get("affiliations", []),
        "h_index": author.get("hIndex"),
        "paper_count": author.get("paperCount"),
        "total_citations": author.get("citationCount"),
        "top_papers": [
            {
                "title": p.get("title"),
                "year": p.get("year"),
                "citations": p.get("citationCount"),
                "fields": p.get("fieldsOfStudy", []),
            }
            for p in papers
        ],
    }
