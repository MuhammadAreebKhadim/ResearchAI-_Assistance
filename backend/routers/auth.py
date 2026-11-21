from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import User
from models.schemas import GoogleAuthRequest, AuthResponse, UserResponse
from services.auth_service import create_access_token, decode_access_token, verify_google_id_token
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to require an authenticated user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency for endpoints that can work with either authenticated users or guests.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    try:
        user_id = int(payload.get("sub"))
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


@router.post("/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Google OAuth Sign-in / Sign-up endpoint.
    Verifies Google ID token or accepts verified payload.
    Creates user if not exists; returns JWT token + user profile.
    """
    email = None
    name = None
    avatar_url = None
    google_id = None

    if request.id_token:
        # Verify directly with Google
        verified = await verify_google_id_token(request.id_token)
        if not verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google ID token"
            )
        email = verified["email"]
        name = verified["name"]
        avatar_url = verified["avatar_url"]
        google_id = verified["google_id"]
    elif request.email:
        # Test / Demo mode or client-side verified payload
        email = request.email.strip().lower()
        name = request.name or email.split("@")[0].title()
        avatar_url = request.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={email}"
        google_id = request.google_id or f"demo_{email}"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either id_token or email must be provided"
        )

    # Check if user already exists
    user = db.query(User).filter((User.email == email) | (User.google_id == google_id)).first()
    if not user:
        # Sign-up: create new user
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            google_id=google_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Sign-in: update latest profile info if provided
        if name and not user.name:
            user.name = name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        if google_id and not user.google_id:
            user.google_id = google_id
        db.commit()
        db.refresh(user)

    # Generate JWT access token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user profile.
    """
    return UserResponse.model_validate(current_user)
