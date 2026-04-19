from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import sys
sys.path.append("/workspaces/Argus/backend")
load_dotenv("/workspaces/Argus/backend/.env")
from api.chat import router as chat_router

app = FastAPI(title="Argus API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(chat_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "argus-backend", "version": "0.2.0"}
