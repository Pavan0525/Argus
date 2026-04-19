import os
import json
from groq import Groq
from dotenv import load_dotenv
import sys
sys.path.append("/workspaces/Argus/backend")
from mcp_servers.log_reader import LOG_TOOLS, execute_log_tool

load_dotenv("/workspaces/Argus/backend/.env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

ALL_TOOLS = LOG_TOOLS

SYSTEM_PROMPT = """You are Argus — an expert AI DevOps copilot.
You have access to tools that can inspect a Kubernetes cluster and read logs.
When a user asks about a pod, service, or cluster issue:
1. Always list pods first to find the right pod name
2. Then fetch logs if needed
3. Give a clear diagnosis with exact fix suggestions
Be concise, technical, and actionable."""

def chat_with_tools(user_message: str, history: list = []) -> dict:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history
    messages.append({"role": "user", "content": user_message})
    tool_calls_log = []

    while True:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            tools=ALL_TOOLS,
            tool_choice="auto",
            max_tokens=2048
        )
        msg = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        if finish_reason == "tool_calls" and msg.tool_calls:
            messages.append({
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {"id": tc.id, "type": "function",
                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in msg.tool_calls
                ]
            })
            for tc in msg.tool_calls:
                tool_name = tc.function.name
                try:
                    arguments = json.loads(tc.function.arguments)
                except:
                    arguments = {}
                print(f"[Argus] Calling tool: {tool_name}({arguments})")
                result = execute_log_tool(tool_name, arguments)
                tool_calls_log.append({"tool": tool_name, "input": arguments, "output": result[:200]})
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})
        else:
            return {"answer": msg.content, "tool_calls": tool_calls_log}
