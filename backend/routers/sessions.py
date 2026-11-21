from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import get_db
from models.db_models import User, Conversation, Message as DbMessage
from models.schemas import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    SessionListResponse,
    SessionDetailResponse,
    SaveMessagesRequest,
    Message as SchemaMessage
)
from routers.auth import get_current_user, get_optional_user
from typing import Optional, List
import re

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

MAX_SESSIONS_PER_USER = 8


def get_or_create_default_user(db: Session) -> User:
    """Helper to get or create a default guest researcher if no user is signed in"""
    user = db.query(User).filter(User.email == "guest@researchai.local").first()
    if not user:
        user = User(
            email="guest@researchai.local",
            name="Guest Researcher",
            avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=guest",
            google_id="guest_local"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    List all chat sessions for the current user.
    Enforces visibility and reports quota usage (e.g. count / 8).
    """
    user = current_user or get_or_create_default_user(db)
    
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )

    session_items = []
    for conv in conversations:
        msg_count = db.query(DbMessage).filter(DbMessage.conversation_id == conv.id).count()
        session_items.append(
            SessionResponse(
                id=conv.id,
                title=conv.title or "Untitled Research",
                type=conv.type or "research",
                message_count=msg_count,
                created_at=conv.created_at,
                updated_at=conv.updated_at or conv.created_at
            )
        )

    return SessionListResponse(
        sessions=session_items,
        count=len(session_items),
        max_limit=MAX_SESSIONS_PER_USER
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Create a new chat session.
    STRICT QUOTA: If user already has 8 sessions, rejects with 400 until one is deleted.
    """
    user = current_user or get_or_create_default_user(db)

    # Check 8-session quota limit
    count = db.query(Conversation).filter(Conversation.user_id == user.id).count()
    if count >= MAX_SESSIONS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storage limit reached ({MAX_SESSIONS_PER_USER}/{MAX_SESSIONS_PER_USER} sessions). Please delete an existing research session to start a new chat."
        )

    new_conv = Conversation(
        user_id=user.id,
        title=request.title or "New Research Session",
        type=request.type or "research"
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)

    return SessionResponse(
        id=new_conv.id,
        title=new_conv.title,
        type=new_conv.type,
        message_count=0,
        created_at=new_conv.created_at,
        updated_at=new_conv.updated_at
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve full message history for a specific session.
    """
    user = current_user or get_or_create_default_user(db)

    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user.id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found"
        )

    messages = (
        db.query(DbMessage)
        .filter(DbMessage.conversation_id == conv.id)
        .order_by(DbMessage.created_at.asc())
        .all()
    )

    return SessionDetailResponse(
        id=conv.id,
        title=conv.title or "Untitled Research",
        type=conv.type or "research",
        messages=[SchemaMessage(role=m.role, content=m.content) for m in messages],
        created_at=conv.created_at,
        updated_at=conv.updated_at
    )


@router.post("/{session_id}/messages")
async def save_messages(
    session_id: int,
    request: SaveMessagesRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Save messages to an existing session and auto-update title if needed.
    """
    user = current_user or get_or_create_default_user(db)

    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user.id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found"
        )

    # Save messages
    for msg in request.messages:
        db_msg = DbMessage(
            conversation_id=conv.id,
            role=msg.role,
            content=msg.content
        )
        db.add(db_msg)

    # Auto-title session if it's currently default and we have user messages
    if (not conv.title or conv.title == "New Research Session") and request.messages:
        first_user_msg = next((m.content for m in request.messages if m.role == "user"), None)
        if first_user_msg:
            # Generate a clean short title (up to 35 chars)
            clean_title = re.sub(r"[^\w\s-]", "", first_user_msg).strip()
            clean_title = re.sub(r"\s+", " ", clean_title)
            words = clean_title.split()[:5]
            conv.title = " ".join(words) if words else "Research Inquiry"

    if request.title:
        conv.title = request.title

    conv.updated_at = func.now()
    db.commit()
    db.refresh(conv)

    return {"status": "saved", "session_id": conv.id, "title": conv.title}


@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Delete a session and all its messages.
    Frees up a storage slot in the 8-session quota.
    """
    user = current_user or get_or_create_default_user(db)

    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user.id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found"
        )

    db.delete(conv)
    db.commit()

    remaining_count = db.query(Conversation).filter(Conversation.user_id == user.id).count()

    return {
        "deleted": True,
        "session_id": session_id,
        "remaining_count": remaining_count,
        "max_limit": MAX_SESSIONS_PER_USER
    }


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session_title(
    session_id: int,
    request: SessionUpdate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Rename a research session title.
    """
    user = current_user or get_or_create_default_user(db)

    conv = db.query(Conversation).filter(
        Conversation.id == session_id,
        Conversation.user_id == user.id
    ).first()

    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research session not found"
        )

    conv.title = request.title.strip()
    conv.updated_at = func.now()
    db.commit()
    db.refresh(conv)

    msg_count = db.query(DbMessage).filter(DbMessage.conversation_id == conv.id).count()

    return SessionResponse(
        id=conv.id,
        title=conv.title,
        type=conv.type or "research",
        message_count=msg_count,
        created_at=conv.created_at,
        updated_at=conv.updated_at
    )
