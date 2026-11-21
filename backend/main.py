from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import Base, engine
from routers import chat, paper, professor, auth, sessions
from config import FRONTEND_URL


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Research Assistant API",
    version="1.0.0",
    description="AI-powered research assistant backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(paper.router)
app.include_router(professor.router)


@app.get("/")
def root():
    return {"status": "Research Assistant API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
