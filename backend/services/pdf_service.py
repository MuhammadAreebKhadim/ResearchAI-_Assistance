import io
from pypdf import PdfReader
from typing import Optional, List, Dict


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF file using pure-Python pypdf."""
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts: List[str] = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text.strip())
    return "\n\n".join(text_parts)


def chunk_text(text: str, chunk_size: int = 3000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks for processing."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def extract_sections(text: str) -> Dict[str, str]:
    """
    Attempt to extract named sections from a paper or pasted text.
    Returns a dict with section names as keys.
    """
    import re

    section_patterns = [
        r"(?i)(abstract|introduction|related work|background|methodology|method|approach|experiment|evaluation|results|discussion|conclusion|references)"
    ]

    lines = text.split("\n")
    sections: Dict[str, List[str]] = {}
    current_section = "overview"
    sections[current_section] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        is_heading = False
        for pattern in section_patterns:
            if re.match(r"^(\d+[\.\s]*)?" + pattern + r"s?[:\s]*$", stripped, re.IGNORECASE) and len(stripped) < 60:
                clean_name = re.sub(r"^[\d\.\s]+", "", stripped).lower().strip(":")
                current_section = clean_name
                sections[current_section] = []
                is_heading = True
                break
        if not is_heading:
            sections[current_section].append(stripped)

    result = {k: " ".join(v) for k, v in sections.items() if v}
    if not result:
        result["overview"] = text[:4000]
    return result
