import subprocess
import shlex

LOG_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_pod_logs",
            "description": "Get recent logs from a Kubernetes pod. Use this when the user asks about pod errors, crashes, or behaviour.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pod_name": {"type": "string", "description": "Name of the Kubernetes pod"},
                    "namespace": {"type": "string", "description": "Kubernetes namespace. Default is default", "default": "default"},
                    "lines": {"type": "integer", "description": "Number of log lines to fetch.", "default": 50}
                },
                "required": ["pod_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_pods",
            "description": "List all pods in a Kubernetes namespace with their status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": {"type": "string", "default": "default"}
                }
            }
        }
    }
]

def get_pod_logs(pod_name, namespace="default", lines=50):
    try:
        cmd = f"kubectl logs {shlex.quote(pod_name)} -n {shlex.quote(namespace)} --tail={lines}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
        return result.stdout if result.stdout.strip() else f"No logs for pod '{pod_name}'"
    except Exception as e:
        return f"Error: {str(e)}"

def list_pods(namespace="default"):
    try:
        cmd = f"kubectl get pods -n {shlex.quote(namespace)} -o wide"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
        return result.stdout
    except Exception as e:
        return f"Error: {str(e)}"

def execute_log_tool(tool_name, arguments):
    if tool_name == "get_pod_logs":
        return get_pod_logs(arguments["pod_name"], arguments.get("namespace","default"), arguments.get("lines",50))
    elif tool_name == "list_pods":
        return list_pods(arguments.get("namespace","default"))
    return f"Unknown tool: {tool_name}"
