
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { Message, MessageType, MessageRole } from '../types';
import { CopyIcon, CheckIcon } from './icons';

declare global {
  interface Window {
    marked: {
      parse(markdown: string): string;
    };
    hljs: {
      highlightElement(element: HTMLElement): void;
    };
  }
}

interface ChatMessageProps {
  message: Message;
  onRegenerate: (originalMessage: string, suggestions: { agent: string, content: string } | null) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRegenerate }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { role, type, content, agent, isStreaming, originalUserMessage } = message;

  useEffect(() => {
    if (contentRef.current && content) {
      if (role === MessageRole.USER) {
        // For user messages, display as pre-formatted text
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = content;
        pre.className = 'bg-transparent p-0';
        pre.appendChild(code);
        contentRef.current.innerHTML = ''; // Clear previous content
        contentRef.current.appendChild(pre);
      } else {
        // For AI messages, parse as Markdown
        contentRef.current.innerHTML = window.marked.parse(content);
      }
      
      // Apply syntax highlighting and add copy buttons
      contentRef.current.querySelectorAll('pre code').forEach((codeBlock) => {
        const preElement = codeBlock.parentElement as HTMLPreElement;
        if (preElement.querySelector('.copy-btn-container')) return; // Already processed

        window.hljs.highlightElement(codeBlock as HTMLElement);
        
        const container = document.createElement('div');
        container.className = 'copy-btn-container absolute top-2 right-2';
        preElement.classList.add('relative');
        preElement.appendChild(container);

        const CopyButton: React.FC = () => {
          const [isCopied, setIsCopied] = useState(false);
          const handleClick = () => {
            navigator.clipboard.writeText(codeBlock.textContent || '').then(() => {
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            });
          };

          return (
            <button
              onClick={handleClick}
              className="copy-btn flex items-center justify-center text-xs py-1 px-2 bg-green-700/80 border border-slate-600 rounded cursor-pointer text-slate-200 hover:bg-green-600/80 disabled:opacity-50"
              disabled={isCopied}
            >
              {isCopied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          );
        };
        
        // This is a way to render React component into a vanilla DOM element
        const root = ReactDOM.createRoot(container);
        root.render(<CopyButton />);
      });
    }
  }, [content, role]);

  const handleRegenerateClick = useCallback(() => {
    if (!originalUserMessage) return;
    // Passing null for the `suggestions` parameter tells the App component
    // to start the AI interaction from the beginning (i.e., fetch new suggestions).
    // This provides a consistent and predictable user experience for regeneration.
    onRegenerate(originalUserMessage, null);
  }, [onRegenerate, originalUserMessage]);

  const baseClasses = "max-w-[90%] py-3 px-4 rounded-2xl relative break-words";
  const roleClasses = {
    [MessageRole.USER]: "bg-blue-600 text-white self-end rounded-br-md",
    [MessageRole.AI]: "bg-slate-800 self-start",
    [MessageRole.SYSTEM]: "hidden",
  };
  const typeClasses = {
    [MessageType.SUGGESTION]: "border-l-4 border-green-500",
    [MessageType.CODE]: "border-l-4 border-blue-400",
    [MessageType.ERROR]: "bg-red-500/20 border-l-4 border-red-500 text-red-200",
  };

  const finalClasses = `${baseClasses} ${roleClasses[role]} ${type ? typeClasses[type] : ''}`;

  return (
    <div className={finalClasses}>
      {agent && role === MessageRole.AI && (
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">{agent}</p>
      )}
      <div ref={contentRef} className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:bg-slate-900/70 prose-pre:my-3 prose-pre:p-3 prose-pre:rounded-lg"></div>
      {isStreaming && <span className="inline-block w-2 h-4 bg-slate-300 animate-pulse ml-1"></span>}
      {(!isStreaming && (type === MessageType.SUGGESTION || type === MessageType.CODE || type === MessageType.ERROR)) && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 text-right">
          <button onClick={handleRegenerateClick} className="text-sm py-1.5 px-3 bg-slate-700 text-slate-200 border border-slate-600 rounded-md hover:bg-green-500 hover:text-white transition-colors duration-200">
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;