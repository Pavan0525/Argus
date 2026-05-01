interface ToolCall {
  tool: string
  input: Record<string, unknown>
  output: string
}

const toolColors: Record<string, string> = {
  list_pods: 'bg-blue-950 border-blue-700 text-blue-300',
  get_pod_logs: 'bg-green-950 border-green-700 text-green-300',
  get_pod_cpu: 'bg-orange-950 border-orange-700 text-orange-300',
  get_pod_memory: 'bg-orange-950 border-orange-700 text-orange-300',
  get_cluster_resources: 'bg-orange-950 border-orange-700 text-orange-300',
  query_metric: 'bg-yellow-950 border-yellow-700 text-yellow-300',
  describe_pod: 'bg-purple-950 border-purple-700 text-purple-300',
  get_events: 'bg-red-950 border-red-700 text-red-300',
  get_deployments: 'bg-blue-950 border-blue-700 text-blue-300',
  get_services: 'bg-teal-950 border-teal-700 text-teal-300',
}

const toolIcons: Record<string, string> = {
  list_pods: '🔍',
  get_pod_logs: '📋',
  get_pod_cpu: '⚡',
  get_pod_memory: '💾',
  get_cluster_resources: '📊',
  query_metric: '📈',
  describe_pod: '🔬',
  get_events: '⚠️',
  get_deployments: '🚀',
  get_services: '🌐',
}

export default function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const colorClass = toolColors[toolCall.tool] || 'bg-gray-900 border-gray-700 text-gray-300'
  const icon = toolIcons[toolCall.tool] || '🔧'
  const inputStr = JSON.stringify(toolCall.input, null, 2)

  return (
    <div className={`border rounded-lg p-3 my-2 text-xs font-mono ${colorClass}`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="font-semibold">{toolCall.tool}</span>
        <span className="opacity-60">({inputStr.replace(/\n/g, ' ')})</span>
      </div>
      <div className="opacity-70 max-h-20 overflow-auto whitespace-pre-wrap bg-black/20 rounded p-2">
        {toolCall.output.slice(0, 300)}
        {toolCall.output.length > 300 && '...'}
      </div>
    </div>
  )
}
