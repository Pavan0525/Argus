from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import sys
sys.path.append("/workspaces/Argus/backend")
from core.claude_client import chat_with_tools

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []

class ChatResponse(BaseModel):
    answer: str
    tool_calls: list

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in request.history]
    result = chat_with_tools(request.message, history)
    return ChatResponse(answer=result["answer"], tool_calls=result["tool_calls"])
