import React from 'react';
import { Message, AgentType } from '../types';
import { AGENTS, ICONS } from '../constants';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const agent = message.agent ? AGENTS[message.agent] : null;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-white text-xs
          ${isUser ? 'bg-slate-700' : (agent ? agent.color : 'bg-slate-500')}
        `}>
          {isUser ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          ) : (
            agent ? ICONS[agent.icon as keyof typeof ICONS] : 'AI'
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Sender Name */}
          {!isUser && agent && (
            <span className={`text-xs font-medium mb-1 ml-1 ${agent.color.replace('bg-', 'text-')}`}>
              {agent.fullName}
            </span>
          )}

          <div className={`
            px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed overflow-hidden
            ${isUser 
              ? 'bg-slate-800 text-white rounded-tr-sm' 
              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'
            }
          `}>
            {message.imageUrl ? (
               <div className="space-y-3">
                  <p>{message.content}</p>
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img src={message.imageUrl} alt="Generated Medical Visual" className="w-full h-auto object-cover" />
                  </div>
               </div>
            ) : (
                <div className="prose prose-sm max-w-none prose-slate">
                   <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
            )}
          </div>

          {/* Sources/Footnotes */}
          {!isUser && message.groundingSources && message.groundingSources.length > 0 && (
            <div className="mt-2 ml-1 text-xs text-slate-400 bg-white p-2 rounded border border-slate-100 max-w-full">
              <span className="font-semibold block mb-1">Sumber Referensi:</span>
              <ul className="list-disc list-inside space-y-1">
                {message.groundingSources.slice(0, 3).map((source, idx) => (
                  <li key={idx} className="truncate max-w-[300px]">
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MessageBubble;