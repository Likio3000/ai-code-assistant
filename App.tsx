import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageRole, MessageType } from './types';
import { getStreamingResponse } from './services';
import Header from './components/Header';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentLoaderText, setCurrentLoaderText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // New state for model selection
  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-2.5-flash');

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentLoaderText]);

  const handleModelChange = useCallback((newProvider: string, newModel: string) => {
    setProvider(newProvider);
    setModel(newModel);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: text,
      type: null,
      isStreaming: false
    };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setCurrentLoaderText('Analyzing code...');

    let suggestionMessage: Message | null = null;
    let codeMessage: Message | null = null;

    try {
      const stream = getStreamingResponse(text, null, provider, model);
      for await (const event of stream) {
        if (event.type === 'suggestions_chunk') {
            setCurrentLoaderText('');
            if (!suggestionMessage) {
                const id = `${Date.now()}-sugg`;
                suggestionMessage = { id, role: MessageRole.AI, type: MessageType.SUGGESTION, content: event.content || '', agent: event.agent, isStreaming: true, originalUserMessage: text };
                setMessages(prev => [...prev, suggestionMessage!]);
            } else {
                setMessages(prev => prev.map(m => m.id === suggestionMessage!.id ? { ...m, content: m.content + (event.content || '') } : m));
            }
        } else if (event.type === 'suggestions_end') {
            if (suggestionMessage) {
                setMessages(prev => prev.map(m => m.id === suggestionMessage!.id ? { ...m, isStreaming: false, content: event.fullContent || m.content } : m));
            }
            setCurrentLoaderText('Generating implementation...');
        } else if (event.type === 'generated_code_chunk') {
            setCurrentLoaderText('');
            if (!codeMessage) {
                const id = `${Date.now()}-code`;
                codeMessage = { id, role: MessageRole.AI, type: MessageType.CODE, content: event.content || '', agent: event.agent, isStreaming: true, originalUserMessage: text };
                setMessages(prev => [...prev, codeMessage!]);
            } else {
                setMessages(prev => prev.map(m => m.id === codeMessage!.id ? { ...m, content: m.content + (event.content || '') } : m));
            }
        } else if (event.type === 'stream_end') {
            if (codeMessage) {
                setMessages(prev => prev.map(m => m.id === codeMessage!.id ? { ...m, isStreaming: false } : m));
            }
        } else if (event.type === 'error') {
            setCurrentLoaderText('');
            const errorId = `${Date.now()}-error`;
            const errorMessage: Message = { id: errorId, role: MessageRole.AI, type: MessageType.ERROR, content: event.content || "An unknown error occurred.", agent: event.agent, isStreaming: false, originalUserMessage: text };
            setMessages(prev => [...prev, errorMessage]);
            break; // Stop processing on error
        }
      }
    } catch (error) {
      const errorId = `${Date.now()}-client-error`;
      const errorMessage: Message = { id: errorId, role: MessageRole.AI, type: MessageType.ERROR, content: error instanceof Error ? error.message : "A client-side error occurred.", agent: "Application", isStreaming: false, originalUserMessage: text };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setCurrentLoaderText('');
    }
  }, [provider, model]);

  const handleRegenerate = useCallback(async (originalMessage: string, suggestions: { agent: string, content: string } | null) => {
    setIsStreaming(true);
    setCurrentLoaderText('Regenerating response...');

    // Remove previous AI responses related to this query
    setMessages(prev => prev.filter(m => m.originalUserMessage !== originalMessage || m.role === MessageRole.USER));

    let suggestionMessage: Message | null = null;
    let codeMessage: Message | null = null;
    
    try {
        const stream = getStreamingResponse(originalMessage, suggestions, provider, model);
        for await (const event of stream) {
            // Same logic as handleSend
             if (event.type === 'suggestions_chunk') {
                setCurrentLoaderText('');
                if (!suggestionMessage) {
                    const id = `${Date.now()}-sugg`;
                    suggestionMessage = { id, role: MessageRole.AI, type: MessageType.SUGGESTION, content: event.content || '', agent: event.agent, isStreaming: true, originalUserMessage: originalMessage };
                    setMessages(prev => [...prev, suggestionMessage!]);
                } else {
                    setMessages(prev => prev.map(m => m.id === suggestionMessage!.id ? { ...m, content: m.content + (event.content || '') } : m));
                }
            } else if (event.type === 'suggestions_end') {
                if (suggestionMessage) {
                    setMessages(prev => prev.map(m => m.id === suggestionMessage!.id ? { ...m, isStreaming: false, content: event.fullContent || m.content } : m));
                }
                setCurrentLoaderText('Generating implementation...');
            } else if (event.type === 'generated_code_chunk') {
                setCurrentLoaderText('');
                if (!codeMessage) {
                    const id = `${Date.now()}-code`;
                    codeMessage = { id, role: MessageRole.AI, type: MessageType.CODE, content: event.content || '', agent: event.agent, isStreaming: true, originalUserMessage: originalMessage };
                    setMessages(prev => [...prev, codeMessage!]);
                } else {
                    setMessages(prev => prev.map(m => m.id === codeMessage!.id ? { ...m, content: m.content + (event.content || '') } : m));
                }
            } else if (event.type === 'stream_end') {
                if (codeMessage) {
                    setMessages(prev => prev.map(m => m.id === codeMessage!.id ? { ...m, isStreaming: false } : m));
                }
            } else if (event.type === 'error') {
                setCurrentLoaderText('');
                const errorId = `${Date.now()}-error`;
                const errorMessage: Message = { id: errorId, role: MessageRole.AI, type: MessageType.ERROR, content: event.content || "An unknown error occurred.", agent: event.agent, isStreaming: false, originalUserMessage: originalMessage };
                setMessages(prev => [...prev, errorMessage]);
                break;
            }
        }
    } catch (error) {
        const errorId = `${Date.now()}-client-error`;
        const errorMessage: Message = { id: errorId, role: MessageRole.AI, type: MessageType.ERROR, content: error instanceof Error ? error.message : "A client-side error occurred.", agent: "Application", isStreaming: false, originalUserMessage: originalMessage };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsStreaming(false);
        setCurrentLoaderText('');
    }
  }, [provider, model]);

  return (
    <div className="bg-slate-900 text-slate-300 flex justify-center items-center min-h-screen font-sans">
      <img src="/LIKIO_FLOW.png" alt="LIKIO FLOW Logo" className="fixed top-[0.5vh] left-[1vw] w-[32vw] max-w-[500px] opacity-90 pointer-events-none z-0 hidden lg:block" />
      <img src="/cat_gato.png" alt="A friendly cat illustration" className="fixed bottom-[25vh] right-[2vw] w-[22vw] max-w-[400px] opacity-90 pointer-events-none z-0 hidden lg:block rounded-[15px]" />
      
      <div className="w-full max-w-4xl h-[96vh] flex flex-col border border-slate-700 rounded-xl bg-slate-800/80 backdrop-blur-sm overflow-hidden relative z-10 shadow-2xl shadow-black/30 sm:h-screen sm:rounded-none">
        <Header 
          provider={provider}
          model={model}
          onModelChange={handleModelChange}
          isStreaming={isStreaming}
        />
        <main ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 scroll-smooth">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} onRegenerate={handleRegenerate}/>
          ))}
          {currentLoaderText && <Loader text={currentLoaderText} />}
        </main>
        <ChatInput onSend={handleSend} isStreaming={isStreaming} />
      </div>
    </div>
  );
};

export default App;
