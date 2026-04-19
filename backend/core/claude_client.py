import os
import json
from groq import Groq
from dotenv import load_dotenv
import sys
sys.path.append("/workspaces/Argus/backend")

from mcp_servers.log_reader import LOG_TOOLS, execute_log_tool
from mcp_servers.prometheus_mcp import PROMETHEUS_TOOLS, execute_prometheus_tool
from mcp_servers.kubectl_mcp import KUBECTL_TOOLS, execute_kubectl_tool

load_dotenv("/workspaces/Argus/backend/.env")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

ALL_TOOLS = LOG_TOOLS + PROMETHEUS_TOOLS + KUBECTL_TOOLS

SYSTEM_PROMPT = """You are Argus — an expert AI DevOps copilot.
You have 10 tools to fully diagnose Kubernetes incidents:

LOG TOOLS: get_pod_logs, list_pods
METRICS TOOLS: get_pod_cpu, get_pod_memory, get_cluster_resources, query_metric
KUBECTL TOOLS: describe_pod, get_events, get_deployments, get_services

When diagnosing an incident follow this order:
1. list_pods — find what is running and what is broken
2. get_events — check for warnings and error events
3. describe_pod — get full details on the broken pod
4. get_pod_logs — read the actual error messages
5. get_pod_cpu / get_pod_memory — check resource usage
6. Synthesize everything into a clear diagnosis with exact fix

Always give:
- Root cause in one sentence
- Exact fix with commands or YAML
- Prevention tip"""

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
                     "function": {"name": tc.function.name,
                                  "arguments": tc.function.arguments}}
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

                if tool_name in ["get_pod_logs","list_pods","get_docker_logs"]:
                    result = execute_log_tool(tool_name, arguments)
                elif tool_name in ["query_metric","get_pod_cpu","get_pod_memory","get_cluster_resources"]:
                    result = execute_prometheus_tool(tool_name, arguments)
                elif tool_name in ["describe_pod","get_events","get_deployments","get_services"]:
                    result = execute_kubectl_tool(tool_name, arguments)
                else:
                    result = f"Unknown tool: {tool_name}"

                tool_calls_log.append({
                    "tool": tool_name,
                    "input": arguments,
                    "output": result[:300]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result
                })
        else:
            return {"answer": msg.content, "tool_calls": tool_calls_log}
