import { StreamEvent } from '../types';
import { getGeminiResponse } from './geminiService';
import { getOpenAIResponse } from './openaiService';

export async function* getStreamingResponse(
  userCode: string,
  cachedSuggestions: { agent: string, content: string } | null,
  provider: string,
  model: string
): AsyncGenerator<StreamEvent> {
  if (provider === 'google') {
    yield* getGeminiResponse(userCode, cachedSuggestions, model);
  } else if (provider === 'openai') {
    yield* getOpenAIResponse(userCode, cachedSuggestions, model);
  } else {
    const agentName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} / ${model}`;
    yield { type: 'error', agent: agentName, content: `The '${provider}' provider is not yet implemented in this application.` };
  }
}
