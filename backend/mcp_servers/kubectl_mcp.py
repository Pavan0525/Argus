import subprocess
import shlex

KUBECTL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "describe_pod",
            "description": "Get detailed information about a Kubernetes pod including events, resource limits, and status. Use this to diagnose CrashLoopBackOff, OOMKilled, or pending pods.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pod_name": {"type": "string", "description": "Full name of the pod"},
                    "namespace": {"type": "string", "default": "default"}
                },
                "required": ["pod_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_events",
            "description": "Get recent Kubernetes events sorted by time. Shows warnings, CrashLoopBackOff, OOMKilled events.",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": {"type": "string", "default": "default"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_deployments",
            "description": "List all Kubernetes deployments and their replica status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": {"type": "string", "default": "default"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_services",
            "description": "List all Kubernetes services and their ports.",
            "parameters": {
                "type": "object",
                "properties": {
                    "namespace": {"type": "string", "default": "default"}
                }
            }
        }
    }
]

def run_kubectl(cmd: str) -> str:
    try:
        result = subprocess.run(
            cmd, shell=True,
            capture_output=True, text=True, timeout=15
        )
        if result.returncode != 0:
            return f"kubectl error: {result.stderr.strip()}"
        return result.stdout if result.stdout.strip() else "No output returned"
    except subprocess.TimeoutExpired:
        return "Error: kubectl timed out after 15 seconds"
    except Exception as e:
        return f"Error: {str(e)}"

def describe_pod(pod_name: str, namespace: str = "default") -> str:
    return run_kubectl(f"kubectl describe pod {shlex.quote(pod_name)} -n {shlex.quote(namespace)}")

def get_events(namespace: str = "default") -> str:
    if namespace == "all":
        return run_kubectl("kubectl get events -A --sort-by=.lastTimestamp")
    return run_kubectl(f"kubectl get events -n {shlex.quote(namespace)} --sort-by=.lastTimestamp")

def get_deployments(namespace: str = "default") -> str:
    return run_kubectl(f"kubectl get deployments -n {shlex.quote(namespace)} -o wide")

def get_services(namespace: str = "default") -> str:
    return run_kubectl(f"kubectl get svc -n {shlex.quote(namespace)} -o wide")

def execute_kubectl_tool(tool_name: str, arguments: dict) -> str:
    if tool_name == "describe_pod":
        return describe_pod(arguments["pod_name"], arguments.get("namespace","default"))
    elif tool_name == "get_events":
        return get_events(arguments.get("namespace","default"))
    elif tool_name == "get_deployments":
        return get_deployments(arguments.get("namespace","default"))
    elif tool_name == "get_services":
        return get_services(arguments.get("namespace","default"))
    return f"Unknown tool: {tool_name}"
