from fastapi import FastAPI
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ping, audio, transcriptions, summaries, users, prompts
from app.routers.websocket_manager import router as websocket_router, websocket_manager



load_dotenv()

origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in origins.split(",") if origin.strip()]

app = FastAPI() 

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permetti tutti i metodi (GET, POST, ecc.)
    allow_headers=["*"],  # Permetti tutti gli headers
)
print(f"✅ CORS attivi per: {allowed_origins}")

app.include_router(ping.router)
app.include_router(audio.router)
app.include_router(transcriptions.router)
app.include_router(summaries.router)
app.include_router(users.router)
app.include_router(websocket_router)
app.include_router(prompts.router)