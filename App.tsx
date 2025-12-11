import React, { useState, useRef, useEffect } from 'react';
import { AgentType, Message } from './types';
import { AGENTS, ICONS } from './constants';
import AgentCard from './components/AgentCard';
import MessageBubble from './components/MessageBubble';
import { checkApiKey, coordinateRequest, executeAgent } from './services/geminiService';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Selamat datang di Sistem Rumah Sakit Terpadu. Saya adalah **Koordinator**. Silakan ajukan permintaan Anda, dan saya akan menghubungkan Anda dengan spesialis yang tepat (Info Pasien, Dokumen Medis, Visual, atau Riset Klinis).',
      agent: AgentType.COORDINATOR,
      timestamp: Date.now(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [activeAgent, setActiveAgent] = useState<AgentType>(AgentType.COORDINATOR);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, statusMessage]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    
    if (!checkApiKey()) {
        alert("API Key is missing. Please check your configuration.");
        return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);
    
    // Step 1: Coordinator Analysis
    setActiveAgent(AgentType.COORDINATOR);
    setStatusMessage('Koordinator sedang menganalisis permintaan...');

    try {
      const coordination = await coordinateRequest(userMsg.content);
      
      // Update UI to show handover
      const targetAgent = AGENTS[coordination.agent];
      setActiveAgent(coordination.agent);
      setStatusMessage(`Mengalihkan ke ${targetAgent.name}... (${coordination.reasoning})`);
      
      // Short artificial delay for UX to let user read the status change
      await new Promise(r => setTimeout(r, 800));
      
      setStatusMessage(`${targetAgent.name} sedang memproses...`);

      // Step 2: Sub-Agent Execution
      const result = await executeAgent(coordination.agent, coordination.refinedPrompt);
      
      const responseMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: result.text,
        agent: coordination.agent,
        timestamp: Date.now(),
        imageUrl: result.imageUrl,
        groundingSources: result.groundingSources
      };

      setMessages(prev => [...prev, responseMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: "Maaf, terjadi kesalahan sistem. Mohon coba lagi.",
        agent: AgentType.COORDINATOR,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
      // Reset back to coordinator visually after task is done, or keep agent active? 
      // Requirement implies Coordinator is central dispatch. 
      // We will keep the last active agent highlighted but effectively the system resets for next query.
      setTimeout(() => setActiveAgent(AgentType.COORDINATOR), 3000); 
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar / Agent Panel */}
      <aside className="w-80 bg-white border-r border-slate-200 hidden md:flex flex-col z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-800">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div>
                <h1 className="font-bold text-lg leading-none">MediSys AI</h1>
                <p className="text-xs text-slate-500 mt-1">Sistem Rumah Sakit Terpadu</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Status Agen</h2>
          {Object.values(AGENTS).map(agent => (
            <AgentCard 
              key={agent.id}
              agent={agent}
              isActive={activeAgent === agent.id}
              onClick={() => {}} // Agents are selected automatically
            />
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
            Didukung oleh Gemini 2.5 Flash & Pro
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center shadow-sm z-20">
           <div className="font-bold text-slate-800">MediSys AI</div>
           <div className="ml-auto text-xs px-2 py-1 bg-slate-100 rounded text-slate-500">
             {AGENTS[activeAgent].name}
           </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-2 scrollbar-hide">
          <div className="max-w-3xl mx-auto w-full">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            
            {/* Thinking / Status Indicator */}
            {isProcessing && (
              <div className="flex items-center space-x-3 text-slate-500 text-sm py-4 animate-pulse ml-2">
                 <div className={`w-2 h-2 rounded-full ${AGENTS[activeAgent].color}`}></div>
                 <span>{statusMessage}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200">
           <div className="max-w-3xl mx-auto w-full">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <div className="absolute left-4 text-slate-400">
                  {/* Dynamic Icon based on Active Agent (Coordinator usually) */}
                  {ICONS[AGENTS[activeAgent].icon as keyof typeof ICONS]}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik permintaan Anda di sini..."
                  disabled={isProcessing}
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm text-slate-800 placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isProcessing}
                  className={`
                    absolute right-2 p-2 rounded-xl transition-all
                    ${!inputText.trim() || isProcessing 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    }
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </form>
              <div className="text-center mt-3 text-xs text-slate-400">
                Sistem AI dapat melakukan kesalahan. Harap verifikasi informasi penting.
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}