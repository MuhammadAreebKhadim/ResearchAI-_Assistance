import httpx
from typing import List, Optional
from models.schemas import PaperResult
from config import OPENALEX_EMAIL

BASE_URL = "https://api.openalex.org"
HEADERS = {"User-Agent": f"ResearchAssistant/1.0 (mailto:{OPENALEX_EMAIL})"}


async def search_papers(
    keywords: List[str],
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    limit: int = 5,
) -> List[PaperResult]:
    """Search OpenAlex for papers."""
    query = " ".join(keywords)
    params = {
        "search": query,
        "per-page": limit,
        "select": "id,title,authorships,publication_year,abstract_inverted_index,doi,cited_by_count,primary_location",
    }

    filters = []
    if year_from:
        filters.append(f"publication_year:>{year_from - 1}")
    if year_to:
        filters.append(f"publication_year:<{year_to + 1}")
    if filters:
        params["filter"] = ",".join(filters)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{BASE_URL}/works", params=params, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()

    papers = []
    for item in data.get("results", []):
        authors = [
            a["author"]["display_name"]
            for a in item.get("authorships", [])
            if a.get("author")
        ][:4]

        doi = item.get("doi")
        location = item.get("primary_location") or {}
        url = location.get("landing_page_url") or (f"https://doi.org/{doi.replace('https://doi.org/', '')}" if doi else "")

        # Reconstruct abstract from inverted index
        abstract = _reconstruct_abstract(item.get("abstract_inverted_index"))

        papers.append(
            PaperResult(
                title=item.get("title", ""),
                authors=authors,
                year=item.get("publication_year"),
                abstract=abstract[:400] if abstract else None,
                url=url,
                source="OpenAlex",
                citation_count=item.get("cited_by_count"),
                doi=doi,
            )
        )
    return papers


async def search_author_works(name: str, affiliation: Optional[str] = None) -> Optional[dict]:
    """Search OpenAlex for an author and their works."""
    query = name
    if affiliation:
        query += f" {affiliation}"

    params = {
        "search": query,
        "per-page": 1,
        "select": "id,display_name,affiliations,works_count,cited_by_count,summary_stats,topics",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{BASE_URL}/authors", params=params, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()

    authors = data.get("results", [])
    if not authors:
        return None

    author = authors[0]
    author_id = author["id"].split("/")[-1]

    # Fetch their recent papers
    works_params = {
        "filter": f"author.id:{author_id}",
        "sort": "cited_by_count:desc",
        "per-page": 10,
        "select": "title,publication_year,cited_by_count,topics,doi",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        works_resp = await client.get(f"{BASE_URL}/works", params=works_params, headers=HEADERS)
        works_data = works_resp.json()

    works = works_data.get("results", [])
    topics = [t["display_name"] for t in author.get("topics", [])[:8] if t.get("display_name")]

    return {
        "name": author.get("display_name"),
        "affiliations": [a["institution"]["display_name"] for a in author.get("affiliations", []) if a.get("institution")],
        "works_count": author.get("works_count"),
        "total_citations": author.get("cited_by_count"),
        "topics": topics,
        "top_papers": [
            {
                "title": w.get("title"),
                "year": w.get("publication_year"),
                "citations": w.get("cited_by_count"),
                "topics": [t["display_name"] for t in w.get("topics", [])[:3] if t.get("display_name")],
            }
            for w in works
        ],
    }


def _reconstruct_abstract(inverted_index: Optional[dict]) -> Optional[str]:
    """Reconstruct abstract from OpenAlex inverted index format."""
    if not inverted_index:
        return None
    words = {}
    for word, positions in inverted_index.items():
        for pos in positions:
            words[pos] = word
    if not words:
        return None
    return " ".join(words[i] for i in sorted(words.keys()))
