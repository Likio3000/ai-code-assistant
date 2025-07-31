
import React from 'react';

interface LoaderProps {
  text: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="self-start flex items-center gap-3 bg-slate-900 border border-slate-700 py-3 px-4 rounded-2xl w-fit">
      <div className="flex space-x-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '-0.3s' }}></span>
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: '-0.15s' }}></span>
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse"></span>
      </div>
      <span className="text-slate-400 text-sm">{text}</span>
    </div>
  );
};

export default Loader;
