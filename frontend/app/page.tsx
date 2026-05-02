'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Moon, Sun, ChevronRight, X, Check, MessageSquare, Plus, Cpu, HardDrive, Activity, Search, Settings, Crown, Sparkles, BarChart3, Terminal, AlertTriangle, Layers, Globe, Rocket, Zap } from 'lucide-react'

interface ToolCall { tool: string; input: Record<string,unknown>; output: string }
interface Message { id: string; role:'user'|'assistant'; content:string; toolCalls?:ToolCall[]; loading?:boolean }
interface Chat { id:string; title:string; messages:Message[] }

const TOOL_META: Record<string,{icon:React.ReactNode;label:string;color:string}> = {
  list_pods:             {icon:<Search size={12}/>,        label:'List Pods',          color:'#818CF8'},
  get_pod_logs:          {icon:<Terminal size={12}/>,      label:'Pod Logs',           color:'#34D399'},
  get_pod_cpu:           {icon:<Cpu size={12}/>,           label:'CPU Metrics',        color:'#FBBF24'},
  get_pod_memory:        {icon:<HardDrive size={12}/>,     label:'Memory Metrics',     color:'#FBBF24'},
  get_cluster_resources: {icon:<BarChart3 size={12}/>,     label:'Cluster Resources',  color:'#FBBF24'},
  query_metric:          {icon:<Activity size={12}/>,      label:'Prometheus Query',   color:'#FDE68A'},
  describe_pod:          {icon:<Layers size={12}/>,        label:'Describe Pod',       color:'#C084FC'},
  get_events:            {icon:<AlertTriangle size={12}/>, label:'K8s Events',         color:'#F87171'},
  get_deployments:       {icon:<Rocket size={12}/>,        label:'Deployments',        color:'#60A5FA'},
  get_services:          {icon:<Globe size={12}/>,         label:'Services',           color:'#2DD4BF'},
}

const SUGGESTED = [
  {text:'Why is broken-app crashing?',     icon:'💥'},
  {text:'Full cluster health check',        icon:'🏥'},
  {text:'What pods are running?',           icon:'🔍'},
  {text:'Memory usage of demo-app',         icon:'💾'},
  {text:'Show recent cluster events',       icon:'⚠️'},
  {text:'List all deployments',             icon:'🚀'},
]

const PLANS = [
  {name:'Free',    price:'₹0',    period:'forever',  highlight:false, current:true,
   features:['10 queries / day','Basic pod inspection','Log reading','Community support'],
   cta:'Current plan'},
  {name:'Pro',     price:'₹499',  period:'/ month',  highlight:true,  current:false,
   features:['Unlimited queries','All 10 diagnostic tools','Prometheus metrics','Priority support','Export reports','Custom alerts'],
   cta:'Upgrade to Pro'},
  {name:'Team',    price:'₹1,999',period:'/ month',  highlight:false, current:false,
   features:['Everything in Pro','Up to 10 members','Shared chat history','Admin dashboard','SLA guarantee','Dedicated support'],
   cta:'Start free trial'},
]

function ToolCard({tc,dark}:{tc:ToolCall;dark:boolean}) {
  const [open,setOpen]=useState(false)
  const meta=TOOL_META[tc.tool]||{icon:<Zap size={12}/>,label:tc.tool,color:'#818CF8'}
  return (
    <button onClick={()=>setOpen(o=>!o)} className={`w-full text-left rounded-xl border px-3 py-2.5 mb-1.5 transition-all ${dark?'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]':'bg-black/[0.03] border-black/[0.08] hover:bg-black/[0.05]'}`}>
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center" style={{background:`${meta.color}22`,color:meta.color}}>{meta.icon}</span>
        <span className={`text-xs font-bold tracking-wide ${dark?'text-white/80':'text-gray-700'}`}>{meta.label}</span>
        <span className={`text-xs font-mono truncate max-w-[180px] ${dark?'text-white/30':'text-gray-400'}`}>{JSON.stringify(tc.input).slice(0,60)}</span>
        <span className={`ml-auto text-xs transition-transform duration-200 ${open?'rotate-90':''} ${dark?'text-white/30':'text-gray-400'}`}>›</span>
      </div>
      {open&&<pre className={`mt-2 pt-2 border-t text-xs font-mono leading-relaxed max-h-32 overflow-auto whitespace-pre-wrap ${dark?'border-white/[0.06] text-white/50':'border-black/[0.06] text-gray-500'}`}>{tc.output.slice(0,500)}</pre>}
    </button>
  )
}

function Loader({dark}:{dark:boolean}) {
  return (
    <div className={`flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-tl-sm w-fit ${dark?'bg-white/[0.04] border border-white/[0.08]':'bg-black/[0.03] border border-black/[0.08]'}`}>
      {[0,1,2].map(i=><span key={i} className="w-2 h-2 rounded-full bg-indigo-500" style={{display:'inline-block',animation:`bounce 1.2s ${i*0.2}s ease-in-out infinite`}}/>)}
      <span className={`ml-2 text-xs font-medium ${dark?'text-white/40':'text-gray-400'}`}>Calling tools...</span>
    </div>
  )
}

function PricingModal({dark,onClose}:{dark:boolean;onClose:()=>void}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)'}}>
      <div className={`relative w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden ${dark?'bg-[#13131F] border border-white/10':'bg-white border border-gray-200'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10 ${dark?'bg-white/10 hover:bg-white/20 text-white':'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}><X size={14}/></button>
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles size={16} className="text-indigo-500"/>
            <span className={`text-xs font-bold tracking-widest uppercase ${dark?'text-indigo-400':'text-indigo-600'}`}>Argus Plans</span>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${dark?'text-white':'text-gray-900'}`}>Diagnose faster. Ship with confidence.</h2>
          <p className={`text-sm ${dark?'text-white/50':'text-gray-500'}`}>From solo engineers to platform teams — pick your plan.</p>
        </div>
        <div className="px-6 pb-8 grid md:grid-cols-3 gap-4">
          {PLANS.map(p=>(
            <div key={p.name} className={`relative rounded-2xl p-5 flex flex-col ${p.highlight?'bg-indigo-600 text-white shadow-xl shadow-indigo-600/25':dark?'bg-white/[0.04] border border-white/10':'bg-gray-50 border border-gray-200'}`}>
              {p.highlight&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</div>}
              <p className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${p.highlight?'text-indigo-200':dark?'text-white/40':'text-gray-400'}`}>{p.name}</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black">{p.price}</span>
                <span className={`text-xs ${p.highlight?'text-indigo-200':dark?'text-white/40':'text-gray-400'}`}>{p.period}</span>
              </div>
              <ul className="flex-1 space-y-2.5 mb-5">
                {p.features.map(f=>(
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={13} className={`mt-0.5 shrink-0 ${p.highlight?'text-indigo-200':'text-indigo-500'}`}/>
                    <span className={p.highlight?'text-indigo-100':dark?'text-white/70':'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                p.highlight?'bg-white text-indigo-600 hover:bg-indigo-50':
                p.current?dark?'bg-white/10 text-white/40 cursor-default':'bg-gray-200 text-gray-400 cursor-default':
                dark?'bg-indigo-600 text-white hover:bg-indigo-500':'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}>
                {p.current&&<Crown size={12} className="inline mr-1.5"/>}{p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

let chatCounter = 1

export default function ArgusApp() {
  const [dark,setDark]=useState(true)
  const [showPricing,setShowPricing]=useState(false)
  const [sidebarOpen,setSidebarOpen]=useState(true)
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const [mounted,setMounted]=useState(false)
  const [chats,setChats]=useState<Chat[]>([{
    id:'1', title:'New conversation',
    messages:[{id:'init',role:'assistant',content:'Hello! I\'m Argus, your AI DevOps copilot.\n\nI have live access to your Kubernetes cluster, Prometheus metrics, and pod logs. I can diagnose incidents, explain errors, and suggest fixes in plain English.\n\nWhat would you like to investigate?'}]
  }])
  const [activeChatId,setActiveChatId]=useState('1')
  const bottomRef=useRef<HTMLDivElement>(null)
  const textareaRef=useRef<HTMLTextAreaElement>(null)

  useEffect(()=>setMounted(true),[])
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[chats,activeChatId])

  const activeChat=chats.find(c=>c.id===activeChatId)!
  const messages=activeChat?.messages||[]

  function newChat(){
    chatCounter++
    const id=`chat-${Date.now()}`
    setChats(prev=>[{id,title:'New conversation',messages:[{id:'init',role:'assistant',content:'New session started. What would you like to diagnose?'}]},...prev])
    setActiveChatId(id)
  }

  async function send(text?:string){
    const msg=text||input.trim()
    if(!msg||loading) return
    setInput('')
    if(textareaRef.current){textareaRef.current.style.height='auto'}
    const uid=`u${Date.now()}`
    const lid=`l${Date.now()}`
    const userMsg:Message={id:uid,role:'user',content:msg}
    const loadMsg:Message={id:lid,role:'assistant',content:'',loading:true}
    setChats(prev=>prev.map(c=>c.id===activeChatId
      ?{...c,title:c.messages.length===1?msg.slice(0,38)+'...':c.title,messages:[...c.messages,userMsg,loadMsg]}:c))
    setLoading(true)
    try {
      const history=messages.filter(m=>!m.loading).map(m=>({role:m.role,content:m.content}))
      const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history})})
      const data=await res.json()
      const aiMsg:Message={id:`a${Date.now()}`,role:'assistant',content:data.answer||data.error||'No response',toolCalls:data.tool_calls||[]}
      setChats(prev=>prev.map(c=>c.id===activeChatId?{...c,messages:[...c.messages.filter(m=>m.id!==lid),aiMsg]}:c))
    } catch {
      setChats(prev=>prev.map(c=>c.id===activeChatId?{...c,messages:[...c.messages.filter(m=>m.id!==lid),{id:`e${Date.now()}`,role:'assistant',content:'Connection error. Make sure the Argus backend is running on port 8000.'}]}:c))
    }
    setLoading(false)
  }

  if(!mounted) return null

  const D={
    bg:    dark?'#0C0C14':'#F5F5F7',
    side:  dark?'#080810':'#FFFFFF',
    bdr:   dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)',
    text:  dark?'#F1F1F3':'#111827',
    muted: dark?'rgba(255,255,255,0.4)':'#6B7280',
    hover: dark?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.04)',
    inp:   dark?'#16161F':'#FFFFFF',
    inpBdr:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.1)',
    msgAi: dark?'#1C1C2A':'#FFFFFF',
    msgAiBdr:dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.08)',
  }

  return (
    <div style={{display:'flex',height:'100vh',background:D.bg,color:D.text,fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",overflow:'hidden'}}>
      {showPricing&&<PricingModal dark={dark} onClose={()=>setShowPricing(false)}/>}

      {/* ── Sidebar ── */}
      <div style={{width:sidebarOpen?256:0,minWidth:0,overflow:'hidden',transition:'width 0.3s ease',display:'flex',flexDirection:'column',background:D.side,borderRight:`1px solid ${D.bdr}`,flexShrink:0}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'20px 16px 14px'}}>
          <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#4F46E5,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(79,70,229,0.35)'}}>
            <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
              <ellipse cx="18" cy="18" rx="14" ry="8.5" stroke="#C7D2FE" strokeWidth="1.8" fill="none"/>
              <circle cx="18" cy="18" r="4.5" fill="#818CF8"/>
              <circle cx="18" cy="18" r="2" fill="#0DD3A5"/>
            </svg>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:15,letterSpacing:-0.3}}>Argus</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:1}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#34D399',boxShadow:'0 0 6px #34D399',display:'inline-block'}}/>
              <span style={{fontSize:10,color:D.muted,fontWeight:500}}>10 tools active</span>
            </div>
          </div>
        </div>

        {/* New chat btn */}
        <div style={{padding:'0 12px 8px'}}>
          <button onClick={newChat} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:12,background:'#4F46E5',color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',boxShadow:'0 4px 12px rgba(79,70,229,0.3)'}}>
            <Plus size={14}/> New conversation
          </button>
        </div>

        {/* Chat list */}
        <div style={{flex:1,overflowY:'auto',padding:'0 8px'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:D.muted,padding:'8px 8px 6px'}}>Recent</div>
          {chats.map(c=>(
            <button key={c.id} onClick={()=>setActiveChatId(c.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',fontSize:12.5,fontWeight:500,fontFamily:'inherit',textAlign:'left',marginBottom:1,background:c.id===activeChatId?dark?'rgba(79,70,229,0.15)':'rgba(79,70,229,0.08)':'transparent',color:c.id===activeChatId?dark?'#A5B4FC':'#4F46E5':D.muted}}>
              <MessageSquare size={12} style={{flexShrink:0}}/>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</span>
            </button>
          ))}
        </div>

        {/* Bottom */}
        <div style={{padding:'12px',borderTop:`1px solid ${D.bdr}`}}>
          <button onClick={()=>setShowPricing(true)} style={{width:'100%',padding:'12px',borderRadius:12,border:`1px solid ${dark?'rgba(79,70,229,0.25)':'rgba(79,70,229,0.2)'}`,background:dark?'rgba(79,70,229,0.08)':'rgba(79,70,229,0.04)',cursor:'pointer',textAlign:'left',marginBottom:6,fontFamily:'inherit'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
              <Crown size={12} style={{color:'#FBBF24'}}/>
              <span style={{fontSize:12,fontWeight:700,color:dark?'#A5B4FC':'#4F46E5'}}>Upgrade to Pro</span>
            </div>
            <div style={{fontSize:11,color:D.muted}}>Unlimited queries + all tools</div>
          </button>
          <button onClick={()=>setDark(d=>!d)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',fontSize:12.5,fontFamily:'inherit',background:'transparent',color:D.muted}}>
            {dark?<Sun size={13}/>:<Moon size={13}/>}{dark?'Light mode':'Dark mode'}
          </button>
          <button style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:10,border:'none',cursor:'pointer',fontSize:12.5,fontFamily:'inherit',background:'transparent',color:D.muted}}>
            <Settings size={13}/>Settings
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,background:D.bg}}>
        {/* Topbar */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:`1px solid ${D.bdr}`,flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{width:32,height:32,borderRadius:8,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',color:D.muted}}>
            <ChevronRight size={16} style={{transform:sidebarOpen?'rotate(180deg)':'none',transition:'transform 0.3s'}}/>
          </button>
          <span style={{fontSize:13.5,fontWeight:500,color:D.muted,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeChat?.title}</span>
          <button onClick={()=>setShowPricing(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:20,background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit',boxShadow:'0 4px 12px rgba(79,70,229,0.25)'}}>
            <Crown size={11}/> Upgrade
          </button>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'0 16px'}}>
          <div style={{maxWidth:720,margin:'0 auto',paddingTop:32,paddingBottom:8}}>
            {messages.map(msg=>(
              <div key={msg.id} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',marginBottom:24}}>
                {msg.role==='assistant'&&(
                  <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#4F46E5,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginRight:10,marginTop:2,boxShadow:'0 4px 10px rgba(79,70,229,0.3)'}}>
                    <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
                      <ellipse cx="18" cy="18" rx="14" ry="8.5" stroke="#C7D2FE" strokeWidth="2" fill="none"/>
                      <circle cx="18" cy="18" r="4.5" fill="#818CF8"/>
                      <circle cx="18" cy="18" r="2" fill="#0DD3A5"/>
                    </svg>
                  </div>
                )}
                <div style={{maxWidth:'80%',display:'flex',flexDirection:'column',alignItems:msg.role==='user'?'flex-end':'flex-start'}}>
                  <div style={{fontSize:11.5,fontWeight:600,color:msg.role==='user'?D.muted:'#818CF8',marginBottom:5}}>
                    {msg.role==='user'?'You':'Argus'}
                  </div>
                  {msg.toolCalls&&msg.toolCalls.length>0&&(
                    <div style={{width:'100%',marginBottom:8}}>
                      {msg.toolCalls.map((tc,j)=><ToolCard key={j} tc={tc} dark={dark}/>)}
                    </div>
                  )}
                  {msg.loading?<Loader dark={dark}/>:msg.content&&(
                    <div style={{
                      borderRadius:msg.role==='user'?'18px 4px 18px 18px':'4px 18px 18px 18px',
                      padding:'12px 16px',
                      fontSize:14,
                      lineHeight:1.65,
                      background:msg.role==='user'?'linear-gradient(135deg,#4F46E5,#6366F1)':D.msgAi,
                      color:msg.role==='user'?'white':D.text,
                      border:msg.role==='user'?'none':`1px solid ${D.msgAiBdr}`,
                      boxShadow:msg.role==='user'?'0 4px 14px rgba(79,70,229,0.25)':dark?'none':'0 1px 4px rgba(0,0,0,0.06)'
                    }}>
                      <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:14,lineHeight:1.65,margin:0}}>{msg.content}</pre>
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
          <div style={{maxWidth:720,margin:'0 auto',width:'100%',padding:'0 16px 12px'}}>
            <div style={{fontSize:11,fontWeight:600,color:D.muted,marginBottom:8,letterSpacing:0.5}}>SUGGESTED</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {SUGGESTED.map((s,i)=>(
                <button key={i} onClick={()=>send(s.text)} style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,padding:'7px 14px',borderRadius:20,border:`1px solid ${D.bdr}`,background:'transparent',color:D.muted,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>
                  <span>{s.icon}</span><span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{maxWidth:720,margin:'0 auto',width:'100%',padding:'0 16px 24px'}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:10,padding:'12px 16px',borderRadius:16,background:D.inp,border:`1.5px solid ${D.inpBdr}`,transition:'border-color 0.2s',boxShadow:dark?'0 4px 20px rgba(0,0,0,0.3)':'0 4px 20px rgba(0,0,0,0.06)'}}>
            <textarea ref={textareaRef} value={input}
              onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,160)+'px'}}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),send())}
              onFocus={e=>(e.target.parentElement!.style.borderColor='rgba(99,102,241,0.6)')}
              onBlur={e=>(e.target.parentElement!.style.borderColor=D.inpBdr)}
              placeholder="Ask Argus about your Kubernetes cluster..."
              rows={1} disabled={loading}
              style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:14,lineHeight:1.5,color:D.text,resize:'none',maxHeight:160,fontFamily:'inherit'}}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()} style={{width:36,height:36,borderRadius:10,border:'none',cursor:input.trim()&&!loading?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:input.trim()&&!loading?'linear-gradient(135deg,#4F46E5,#6366F1)':dark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.07)',color:input.trim()&&!loading?'white':D.muted,boxShadow:input.trim()&&!loading?'0 4px 12px rgba(79,70,229,0.3)':'none',transition:'all 0.2s'}}>
              <Send size={15}/>
            </button>
          </div>
          <div style={{textAlign:'center',fontSize:11,color:D.muted,marginTop:8}}>
            Press <kbd style={{padding:'1px 6px',borderRadius:4,background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)',fontSize:10,fontFamily:'monospace'}}>Enter</kbd> to send · <kbd style={{padding:'1px 6px',borderRadius:4,background:dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.07)',fontSize:10,fontFamily:'monospace'}}>Shift+Enter</kbd> for newline
          </div>
        </div>
      </div>
    </div>
  )
}
