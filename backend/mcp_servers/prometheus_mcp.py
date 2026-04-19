import os
from prometheus_api_client import PrometheusConnect

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

def get_prometheus_client():
    return PrometheusConnect(url=PROMETHEUS_URL, disable_ssl=True)

PROMETHEUS_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "query_metric",
            "description": "Run a raw PromQL query against Prometheus.",
            "parameters": {
                "type": "object",
                "properties": {
                    "promql": {"type": "string", "description": "The PromQL query to run"}
                },
                "required": ["promql"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pod_cpu",
            "description": "Get current CPU usage for a specific Kubernetes pod.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pod_name": {"type": "string", "description": "Name of the pod"}
                },
                "required": ["pod_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pod_memory",
            "description": "Get current memory usage for a specific Kubernetes pod.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pod_name": {"type": "string", "description": "Name of the pod"}
                },
                "required": ["pod_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_cluster_resources",
            "description": "Get overall cluster CPU and memory usage summary.",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

def query_metric(promql: str) -> str:
    try:
        prom = get_prometheus_client()
        result = prom.custom_query(query=promql)
        if not result:
            return f"No data for query: {promql}"
        formatted = []
        for item in result[:10]:
            metric = item.get("metric", {})
            value = item.get("value", [None, "N/A"])[1]
            formatted.append(f"{metric}: {value}")
        return "\n".join(formatted)
    except Exception as e:
        return f"Prometheus error: {str(e)}"

def get_pod_cpu(pod_name: str) -> str:
    try:
        prom = get_prometheus_client()
        query = f'rate(container_cpu_usage_seconds_total{{pod="{pod_name}",container!="POD",container!=""}}[5m])'
        result = prom.custom_query(query=query)
        if not result:
            return f"No CPU data for pod '{pod_name}' yet. Wait 5 minutes and retry."
        values = []
        for item in result:
            container = item["metric"].get("container", "unknown")
            cpu_milli = float(item["value"][1]) * 1000
            values.append(f"Container '{container}': {cpu_milli:.2f}m CPU")
        return "\n".join(values)
    except Exception as e:
        return f"Error fetching CPU: {str(e)}"

def get_pod_memory(pod_name: str) -> str:
    try:
        prom = get_prometheus_client()
        query = f'container_memory_usage_bytes{{pod="{pod_name}",container!="POD",container!=""}}'
        result = prom.custom_query(query=query)
        if not result:
            return f"No memory data for pod '{pod_name}'."
        values = []
        for item in result:
            container = item["metric"].get("container", "unknown")
            mem_mb = float(item["value"][1]) / (1024 * 1024)
            values.append(f"Container '{container}': {mem_mb:.1f} MB")
        return "\n".join(values)
    except Exception as e:
        return f"Error fetching memory: {str(e)}"

def get_cluster_resources() -> str:
    try:
        prom = get_prometheus_client()
        cpu_result = prom.custom_query('sum(rate(container_cpu_usage_seconds_total{container!="POD",container!=""}[5m]))')
        mem_result = prom.custom_query('sum(container_memory_usage_bytes{container!="POD",container!=""})')
        cpu = float(cpu_result[0]["value"][1]) * 1000 if cpu_result else 0
        mem = float(mem_result[0]["value"][1]) / (1024*1024) if mem_result else 0
        return f"Cluster total CPU: {cpu:.1f}m cores\nCluster total Memory: {mem:.1f} MB"
    except Exception as e:
        return f"Error: {str(e)}"

def execute_prometheus_tool(tool_name: str, arguments: dict) -> str:
    if tool_name == "query_metric":
        return query_metric(arguments["promql"])
    elif tool_name == "get_pod_cpu":
        return get_pod_cpu(arguments["pod_name"])
    elif tool_name == "get_pod_memory":
        return get_pod_memory(arguments["pod_name"])
    elif tool_name == "get_cluster_resources":
        return get_cluster_resources()
    return f"Unknown tool: {tool_name}"
