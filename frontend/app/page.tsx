'use client'
import {useState,useRef,useEffect,useCallback} from 'react'

interface ToolCall{tool:string;input:Record<string,unknown>;output:string}
interface Message{id:string;role:'user'|'assistant';content:string;toolCalls?:ToolCall[];loading?:boolean}
interface Chat{id:string;title:string;messages:Message[]}

const TOOLS_META:Record<string,{label:string;color:string}> = {
  list_pods:            {label:'List pods',           color:'#6366F1'},
  get_pod_logs:         {label:'Pod logs',            color:'#10B981'},
  get_pod_cpu:          {label:'CPU usage',           color:'#F59E0B'},
  get_pod_memory:       {label:'Memory usage',        color:'#F59E0B'},
  get_cluster_resources:{label:'Cluster resources',   color:'#F59E0B'},
  query_metric:         {label:'Prometheus query',    color:'#8B5CF6'},
  describe_pod:         {label:'Describe pod',        color:'#EC4899'},
  get_events:           {label:'Cluster events',      color:'#EF4444'},
  get_deployments:      {label:'Deployments',         color:'#3B82F6'},
  get_services:         {label:'Services',            color:'#14B8A6'},
}

const SUGGESTED=[
  'Why is broken-app crashing?',
  'Full cluster health check',
  'What pods are running?',
  'How much memory is demo-app using?',
  'Show me recent cluster events',
  'List all deployments',
]

function ToolCallCard({tc,dark}:{tc:ToolCall;dark:boolean}){
  const [open,setOpen]=useState(false)
  const meta=TOOLS_META[tc.tool]||{label:tc.tool,color:'#6366F1'}
  return(
    <button onClick={()=>setOpen(o=>!o)}
      style={{display:'block',width:'100%',textAlign:'left',padding:'8px 12px',borderRadius:8,border:`1px solid ${dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)'}`,background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)',cursor:'pointer',marginBottom:6,fontFamily:'inherit'}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{width:6,height:6,borderRadius:'50%',background:meta.color,flexShrink:0,display:'inline-block'}}/>
        <span style={{fontSize:12,fontWeight:500,color:dark?'rgba(255,255,255,0.7)':'rgba(0,0,0,0.6)',fontFamily:"'Geist Mono',monospace"}}>{meta.label}</span>
        <span style={{fontSize:11,color:dark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200,fontFamily:"'Geist Mono',monospace"}}>{JSON.stringify(tc.input).slice(0,50)}</span>
        <span style={{marginLeft:'auto',fontSize:11,color:dark?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.3)'}}>{open?'▲':'▼'}</span>
      </div>
      {open&&<pre style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}`,fontSize:11,fontFamily:"'Geist Mono',monospace",color:dark?'rgba(255,255,255,0.45)':'rgba(0,0,0,0.5)',whiteSpace:'pre-wrap',maxHeight:120,overflowY:'auto',lineHeight:1.6}}>{tc.output.slice(0,400)}</pre>}
    </button>
  )
}

function Dots(){
  return(
    <div style={{display:'flex',alignItems:'center',gap:4,padding:'12px 16px'}}>
      {[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:'50%',background:'#6366F1',display:'inline-block',animation:`bounce 1.2s ${i*0.15}s ease-in-out infinite`}}/>)}
    </div>
  )
}

export default function App(){
  const [dark,setDark]=useState(true)
  const [sidebar,setSidebar]=useState(true)
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [showPlans,setShowPlans]=useState(false)
  const [chats,setChats]=useState<Chat[]>([{
    id:'1',title:'New conversation',
    messages:[{id:'0',role:'assistant',content:"Hello, I'm Argus — your AI DevOps copilot.\n\nI have live access to your Kubernetes cluster, Prometheus metrics, and pod logs. Ask me anything about your infrastructure and I'll diagnose it for you."}]
  }])
  const [activeId,setActiveId]=useState('1')
  const bottomRef=useRef<HTMLDivElement>(null)
  const textareaRef=useRef<HTMLTextAreaElement>(null)
  const [mounted,setMounted]=useState(false)

  useEffect(()=>setMounted(true),[])
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[chats,activeId])

  const activeChat=chats.find(c=>c.id===activeId)!
  const messages=activeChat?.messages||[]

  const newChat=useCallback(()=>{
    const id=`c${Date.now()}`
    setChats(p=>[{id,title:'New conversation',messages:[{id:'0',role:'assistant',content:'New session. What would you like to investigate?'}]},...p])
    setActiveId(id)
  },[])

  const send=useCallback(async(text?:string)=>{
    const msg=text||input.trim()
    if(!msg||loading) return
    setInput('')
    if(textareaRef.current) textareaRef.current.style.height='auto'
    const uid=`u${Date.now()}`
    const lid=`l${Date.now()}`
    setChats(p=>p.map(c=>c.id===activeId?{...c,title:c.messages.length===1?msg.slice(0,36):c.title,messages:[...c.messages,{id:uid,role:'user',content:msg},{id:lid,role:'assistant',content:'',loading:true}]}:c))
    setLoading(true)
    try{
      const history=messages.filter(m=>!m.loading).map(m=>({role:m.role,content:m.content}))
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history})})
      const data=await res.json()
      const ai:Message={id:`a${Date.now()}`,role:'assistant',content:data.answer||data.error||'No response',toolCalls:data.tool_calls||[]}
      setChats(p=>p.map(c=>c.id===activeId?{...c,messages:[...c.messages.filter(m=>m.id!==lid),ai]}:c))
    }catch{
      setChats(p=>p.map(c=>c.id===activeId?{...c,messages:[...c.messages.filter(m=>m.id!==lid),{id:`e${Date.now()}`,role:'assistant',content:'Connection error — is the backend running on port 8000?'}]}:c))
    }
    setLoading(false)
  },[input,loading,messages,activeId])

  if(!mounted) return null

  const C={
    bg:    dark?'#0F0F13':'#FAFAFA',
    side:  dark?'#0A0A0E':'#FFFFFF',
    bdr:   dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)',
    txt:   dark?'#EDEDED':'#111111',
    muted: dark?'rgba(255,255,255,0.38)':'rgba(0,0,0,0.4)',
    hover: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.03)',
    inp:   dark?'#18181C':'#FFFFFF',
    aiMsg: dark?'#18181C':'#FFFFFF',
    aiBdr: dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)',
    active:dark?'rgba(99,102,241,0.12)':'rgba(99,102,241,0.07)',
    actTxt:dark?'#818CF8':'#4F46E5',
  }

  const font="'Geist',system-ui,sans-serif"

  return(
    <div style={{display:'flex',height:'100vh',background:C.bg,color:C.txt,fontFamily:font,fontSize:14,overflow:'hidden'}}>

      {/* Plans modal */}
      {showPlans&&(
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16,background:'rgba(0,0,0,0.6)'}}>
          <div style={{width:'100%',maxWidth:640,background:C.side,borderRadius:16,border:`1px solid ${C.bdr}`,overflow:'hidden'}}>
            <div style={{padding:'28px 28px 0',borderBottom:`1px solid ${C.bdr}`}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4}}>
                <div>
                  <p style={{fontSize:11,fontWeight:500,letterSpacing:1,textTransform:'uppercase',color:'#6366F1',marginBottom:6}}>Argus plans</p>
                  <h2 style={{fontSize:22,fontWeight:600,color:C.txt,marginBottom:6}}>Choose your plan</h2>
                  <p style={{fontSize:14,color:C.muted,marginBottom:24}}>Start free, upgrade when your team needs more.</p>
                </div>
                <button onClick={()=>setShowPlans(false)} style={{background:'transparent',border:'none',cursor:'pointer',color:C.muted,fontSize:20,lineHeight:1,padding:4}}>×</button>
              </div>
            </div>
            <div style={{padding:24,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              {[
                {name:'Free',price:'₹0',sub:'Forever',features:['10 queries / day','Pod logs + kubectl','Basic metrics'],current:true,accent:false},
                {name:'Pro',price:'₹499',sub:'per month',features:['Unlimited queries','All 10 tools','Prometheus metrics','Priority support'],current:false,accent:true},
                {name:'Team',price:'₹1,999',sub:'per month',features:['Everything in Pro','10 team members','Shared history','Admin controls'],current:false,accent:false},
              ].map(p=>(
                <div key={p.name} className="plan-card" style={{borderRadius:12,border:`1px solid ${p.accent?'#6366F1':C.bdr}`,padding:20,display:'flex',flexDirection:'column',background:p.accent?dark?'rgba(99,102,241,0.08)':'rgba(99,102,241,0.04)':'transparent'}}>
                  <p style={{fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:p.accent?'#6366F1':C.muted,marginBottom:8}}>{p.name}</p>
                  <div style={{marginBottom:16}}>
                    <span style={{fontSize:26,fontWeight:600,color:C.txt}}>{p.price}</span>
                    <span style={{fontSize:12,color:C.muted,marginLeft:4}}>{p.sub}</span>
                  </div>
                  <ul style={{flex:1,marginBottom:16,listStyle:'none'}}>
                    {p.features.map(f=>(
                      <li key={f} style={{fontSize:13,color:C.muted,marginBottom:6,display:'flex',alignItems:'flex-start',gap:6}}>
                        <span style={{color:'#10B981',flexShrink:0,marginTop:1}}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button style={{width:'100%',padding:'9px 0',borderRadius:8,border:`1px solid ${p.accent?'#6366F1':C.bdr}`,background:p.accent?'#6366F1':'transparent',color:p.accent?'#fff':p.current?C.muted:C.txt,fontSize:13,fontWeight:500,cursor:p.current?'default':'pointer',fontFamily:font}}>
                    {p.current?'Current plan':p.name==='Team'?'Contact sales':'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{width:sidebar?240:0,flexShrink:0,overflow:'hidden',transition:'width 0.25s ease',display:'flex',flexDirection:'column',background:C.side,borderRight:`1px solid ${C.bdr}`}}>
        {/* Logo */}
        <div style={{padding:'18px 16px 14px',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,borderRadius:8,background:'#6366F1',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="15" height="15" viewBox="0 0 36 36" fill="none">
              <ellipse cx="18" cy="18" rx="14" ry="8" stroke="#C7D2FE" strokeWidth="2" fill="none"/>
              <circle cx="18" cy="18" r="4" fill="#A5B4FC"/>
              <circle cx="18" cy="18" r="1.8" fill="#0DD3A5"/>
            </svg>
          </div>
          <span style={{fontWeight:600,fontSize:15,letterSpacing:-0.3,whiteSpace:'nowrap'}}>Argus</span>
          <div style={{display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'#10B981',display:'inline-block'}}/>
            <span style={{fontSize:11,color:C.muted}}>live</span>
          </div>
        </div>

        {/* New chat */}
        <div style={{padding:'0 10px 8px'}}>
          <button onClick={newChat} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:8,border:`1px solid ${C.bdr}`,background:'transparent',color:C.txt,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:font}}>
            <span style={{fontSize:16,lineHeight:1}}>+</span> New conversation
          </button>
        </div>

        {/* Chat list */}
        <div style={{flex:1,overflowY:'auto',padding:'4px 8px'}}>
          <p style={{fontSize:10,fontWeight:500,letterSpacing:1.2,textTransform:'uppercase',color:C.muted,padding:'8px 8px 5px'}}>Recents</p>
          {chats.map(c=>(
            <button key={c.id} onClick={()=>setActiveId(c.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,border:'none',background:c.id===activeId?C.active:'transparent',color:c.id===activeId?C.actTxt:C.muted,fontSize:13,fontWeight:c.id===activeId?500:400,cursor:'pointer',fontFamily:font,textAlign:'left',marginBottom:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
              <span style={{fontSize:12,flexShrink:0}}>💬</span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{c.title}</span>
            </button>
          ))}
        </div>

        {/* Bottom */}
        <div style={{padding:'10px 10px 16px',borderTop:`1px solid ${C.bdr}`}}>
          <button onClick={()=>setShowPlans(true)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,border:`1px solid ${C.bdr}`,background:'transparent',color:C.txt,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:font,marginBottom:4}}>
            <span>⭐</span> Upgrade to Pro
          </button>
          <button onClick={()=>setDark(d=>!d)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,border:'none',background:'transparent',color:C.muted,fontSize:13,cursor:'pointer',fontFamily:font,marginBottom:2}}>
            <span>{dark?'☀️':'🌙'}</span> {dark?'Light mode':'Dark mode'}
          </button>
          <button style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,border:'none',background:'transparent',color:C.muted,fontSize:13,cursor:'pointer',fontFamily:font}}>
            <span>⚙️</span> Settings
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 18px',borderBottom:`1px solid ${C.bdr}`,flexShrink:0}}>
          <button onClick={()=>setSidebar(s=>!s)} style={{width:32,height:32,borderRadius:7,border:`1px solid ${C.bdr}`,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.muted,fontSize:16,flexShrink:0}}>
            {sidebar?'←':'→'}
          </button>
          <span style={{fontSize:13,fontWeight:500,color:C.muted,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeChat?.title}</span>
          <button onClick={()=>setShowPlans(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:20,border:'1px solid #6366F1',background:'transparent',color:'#6366F1',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:font,flexShrink:0}}>
            ⭐ Upgrade
          </button>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{maxWidth:700,margin:'0 auto',padding:'32px 20px 16px'}}>
            {messages.map(msg=>(
              <div key={msg.id} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',marginBottom:28}}>
                {msg.role==='assistant'&&(
                  <div style={{width:28,height:28,borderRadius:7,background:'#6366F1',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:10,marginTop:2}}>
                    <svg width="13" height="13" viewBox="0 0 36 36" fill="none">
                      <ellipse cx="18" cy="18" rx="14" ry="8" stroke="#C7D2FE" strokeWidth="2" fill="none"/>
                      <circle cx="18" cy="18" r="4" fill="#A5B4FC"/>
                      <circle cx="18" cy="18" r="1.8" fill="#0DD3A5"/>
                    </svg>
                  </div>
                )}
                <div style={{maxWidth:'82%',display:'flex',flexDirection:'column',alignItems:msg.role==='user'?'flex-end':'flex-start'}}>
                  <span style={{fontSize:11,fontWeight:500,color:msg.role==='user'?C.muted:'#818CF8',marginBottom:5}}>
                    {msg.role==='user'?'You':'Argus'}
                  </span>
                  {msg.toolCalls&&msg.toolCalls.length>0&&(
                    <div style={{width:'100%',marginBottom:8}}>
                      {msg.toolCalls.map((tc,j)=><ToolCallCard key={j} tc={tc} dark={dark}/>)}
                    </div>
                  )}
                  {msg.loading?<Dots/>:msg.content&&(
                    <div style={{
                      padding:'12px 16px',
                      borderRadius:msg.role==='user'?'16px 4px 16px 16px':'4px 16px 16px 16px',
                      background:msg.role==='user'?'#6366F1':C.aiMsg,
                      color:msg.role==='user'?'#FFFFFF':C.txt,
                      border:msg.role==='user'?'none':`1px solid ${C.aiBdr}`,
                      fontSize:14,lineHeight:1.65,
                    }}>
                      <pre style={{whiteSpace:'pre-wrap',fontFamily:font,fontSize:14,lineHeight:1.65,margin:0}}>{msg.content}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
        </div>

        {/* Suggested */}
        {messages.length<=1&&(
          <div style={{maxWidth:700,margin:'0 auto',width:'100%',padding:'0 20px 10px'}}>
            <p style={{fontSize:11,fontWeight:500,letterSpacing:0.8,textTransform:'uppercase',color:C.muted,marginBottom:8}}>Suggested</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {SUGGESTED.map((s,i)=>(
                <button key={i} onClick={()=>send(s)} style={{fontSize:12.5,padding:'7px 13px',borderRadius:20,border:`1px solid ${C.bdr}`,background:'transparent',color:C.muted,cursor:'pointer',fontFamily:font,transition:'color 0.15s'}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{maxWidth:700,margin:'0 auto',width:'100%',padding:'8px 20px 24px'}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:10,padding:'12px 14px',borderRadius:12,border:`1px solid ${C.bdr}`,background:C.inp,transition:'border-color 0.15s'}}>
            <textarea ref={textareaRef} value={input} rows={1} disabled={loading}
              placeholder="Ask Argus about your Kubernetes cluster..."
              onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,160)+'px'}}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),send())}
              onFocus={e=>{const p=e.target.parentElement;if(p)p.style.borderColor=dark?'rgba(99,102,241,0.5)':'rgba(99,102,241,0.4)'}}
              onBlur={e=>{const p=e.target.parentElement;if(p)p.style.borderColor=C.bdr}}
              style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:14,lineHeight:1.55,color:C.txt,resize:'none',maxHeight:160,fontFamily:font}}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()}
              style={{width:34,height:34,borderRadius:8,border:'none',background:input.trim()&&!loading?'#6366F1':dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)',color:input.trim()&&!loading?'#fff':C.muted,cursor:input.trim()&&!loading?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.15s',fontFamily:font}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <p style={{textAlign:'center',fontSize:11,color:C.muted,marginTop:7}}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
