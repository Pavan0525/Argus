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
You have access to 10 tools to diagnose Kubernetes incidents.

AVAILABLE TOOLS:
- list_pods: list all pods and their status
- get_pod_logs: read logs from a pod
- get_pod_cpu: get CPU usage of a pod
- get_pod_memory: get memory usage of a pod
- get_cluster_resources: get overall cluster CPU and memory
- query_metric: run a PromQL query
- describe_pod: get detailed pod info and events
- get_events: get recent cluster events
- get_deployments: list all deployments
- get_services: list all services

When diagnosing issues:
1. Start with list_pods to see what is running
2. Use get_events to check for warnings
3. Use describe_pod for detailed info
4. Use get_pod_logs to read error messages
5. Give a clear diagnosis with exact fix

Always respond with:
- Root cause in one sentence
- Exact fix command or YAML
- Prevention tip"""

def chat_with_tools(user_message: str, history: list = []) -> dict:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += history
    messages.append({"role": "user", "content": user_message})
    tool_calls_log = []
    max_iterations = 8
    iteration = 0

    while iteration < max_iterations:
        iteration += 1
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=ALL_TOOLS,
                tool_choice="auto",
                max_tokens=2048
            )
        except Exception as e:
            # If tool calling fails, retry without tools
            print(f"[Argus] Tool call error: {e}, retrying without tools")
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=2048
            )
            return {
                "answer": response.choices[0].message.content,
                "tool_calls": tool_calls_log
            }

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

    return {"answer": "Max iterations reached", "tool_calls": tool_calls_log}
