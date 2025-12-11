import React from 'react';
import { ICONS } from '../constants';
import { AgentDef, AgentType } from '../types';

interface AgentCardProps {
  agent: AgentDef;
  isActive: boolean;
  onClick: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isActive, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden group
        ${isActive 
          ? `border-${agent.color.replace('bg-', '')} bg-white shadow-md ring-1 ring-${agent.color.replace('bg-', '')}` 
          : 'border-slate-200 bg-slate-50 hover:bg-white hover:shadow-sm'
        }
      `}
    >
      <div className={`absolute top-0 right-0 w-16 h-16 opacity-5 transform translate-x-4 -translate-y-4 rounded-full ${agent.color}`}></div>
      
      <div className="flex items-start space-x-3">
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm
          ${agent.color}
        `}>
          {ICONS[agent.icon as keyof typeof ICONS]}
        </div>
        <div>
          <h3 className={`font-semibold text-sm ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
            {agent.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {agent.description}
          </p>
        </div>
      </div>
      
      {/* Active Indicator Pulse */}
      {isActive && (
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${agent.color}`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${agent.color}`}></span>
        </span>
      )}
    </div>
  );
};

export default AgentCard;