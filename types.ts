
export enum MessageRole {
  USER = "user",
  AI = "ai",
  SYSTEM = "system",
}

export enum MessageType {
  SUGGESTION = "suggestion",
  CODE = "code",
  ERROR = "error",
}

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType | null;
  content: string;
  agent?: string;
  isStreaming: boolean;
  originalUserMessage?: string;
}

export interface StreamEvent {
  type: 'suggestions_chunk' | 'suggestions_end' | 'generated_code_chunk' | 'stream_end' | 'error';
  content?: string;
  agent?: string;
  fullContent?: string;
}
