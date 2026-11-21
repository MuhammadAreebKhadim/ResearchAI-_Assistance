from pydantic import BaseModel
from typing import Optional, List, Any


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    conversation_id: Optional[int] = None


class PaperResult(BaseModel):
    title: str
    authors: List[str]
    year: Optional[int]
    abstract: Optional[str]
    url: str
    source: str
    citation_count: Optional[int] = None
    doi: Optional[str] = None


class ProfessorAnalysisRequest(BaseModel):
    professor_name: Optional[str] = None
    professor_university: Optional[str] = None
    user_research_summary: str
    messages: List[Message]
    conversation_id: Optional[int] = None


class AlignmentReport(BaseModel):
    alignment_score: int
    shared_topics: List[str]
    collaboration_opportunities: List[str]
    divergence_areas: List[str]
    suggested_email: str
    professor_summary: str
    professor_domains: List[str]
    professor_key_papers: List[str]


# --- Authentication & Session Storage Schemas ---

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True


class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    google_id: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class SessionCreate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = "research"


class SessionUpdate(BaseModel):
    title: str


class SessionResponse(BaseModel):
    id: int
    title: Optional[str]
    type: str
    message_count: int
    created_at: Optional[Any]
    updated_at: Optional[Any]

    class Config:
        from_attributes = True


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]
    count: int
    max_limit: int = 8


class SessionDetailResponse(BaseModel):
    id: int
    title: Optional[str]
    type: str
    messages: List[Message]
    created_at: Optional[Any]
    updated_at: Optional[Any]


class SaveMessagesRequest(BaseModel):
    messages: List[Message]
    title: Optional[str] = None
