
import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from './icons';

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isStreaming }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedText = text.trim();
    if (trimmedText) {
      onSend(trimmedText);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  return (
    <footer className="flex gap-3 p-3 border-t border-slate-700 bg-slate-800">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste code or ask… (Shift+Enter = newline)"
        rows={1}
        className="flex-1 resize-none min-h-[3rem] max-h-40 p-3 border border-slate-700 rounded-2xl bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
        disabled={isStreaming}
      />
      <button
        onClick={handleSend}
        disabled={isStreaming || !text.trim()}
        className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full text-white flex items-center justify-center transition-colors hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Send message"
      >
        <SendIcon />
      </button>
    </footer>
  );
};

export default ChatInput;
