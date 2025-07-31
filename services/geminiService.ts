import { GoogleGenAI } from "@google/genai";
import { StreamEvent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SUGGESTION_PROMPT = `You are an expert code reviewer. Your task is to analyze the user's code and provide 3-5 high-impact, actionable improvement suggestions. Focus on clarity, bug prevention, and efficiency.

**Instructions:**
1.  **Do NOT rewrite the code.** Only provide suggestions.
2.  Format your response as a concise Markdown bulleted list.
3.  Keep suggestions focused and easy to implement.

Example:
*   **Refactor for Clarity:** The function \`processData\` is too long. Consider splitting it into smaller, more focused functions like \`validateInput\` and \`transformData\`.
*   **Add Type Hinting:** The function signature lacks type hints. Adding them (e.g., \`def process_data(items: list[str]) -> list[dict]:\`) will improve readability and allow static analysis.
*   **Handle Edge Cases:** The loop does not account for an empty \`items\` list, which could lead to unexpected behavior. Add a check at the beginning.
`;

const GENERATION_SYSTEM_PROMPT = `You are an expert AI programmer. Your task is to refactor and improve the user's original code based on a provided list of suggestions.

**Instructions:**
1.  Implement the changes described in the suggestions.
2.  Return the **FULL, UPDATED CODE** only.
3.  Wrap the final code in a single Markdown code fence. If the language is identifiable, specify it (e.g., \`\`\`python).
4.  **Do not include any commentary, explanations, or apologies outside the code fence.** Your output should be only the code itself.
`;

async function* streamSuggestions(code: string, model: string): AsyncGenerator<StreamEvent> {
  let fullContent = "";
  try {
    const stream = await ai.models.generateContentStream({
      model: model,
      contents: [{ role: 'user', parts: [{text: code}] }, { role: 'model', parts: [{text: SUGGESTION_PROMPT}] }],
    });

    for await (const chunk of stream) {
      const delta = chunk.text;
      if (delta) {
        fullContent += delta;
        yield { type: 'suggestions_chunk', agent: model, content: delta };
      }
    }
    yield { type: 'suggestions_end', agent: model, fullContent };
  } catch (error) {
    console.error("Gemini suggestion error:", error);
    yield { type: 'error', agent: model, content: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

async function* streamGeneratedCode(userCode: string, suggestions: string, model: string): AsyncGenerator<StreamEvent> {
  const prompt = `
${GENERATION_SYSTEM_PROMPT}

<original_code>
${userCode}
</original_code>

<suggestions>
${suggestions}
</suggestions>
`;

  try {
    const stream = await ai.models.generateContentStream({
        model: model,
        contents: prompt
    });

    for await (const chunk of stream) {
      const delta = chunk.text;
      if (delta) {
        yield { type: 'generated_code_chunk', agent: model, content: delta };
      }
    }
    yield { type: 'stream_end', agent: model };
  } catch (error) {
    console.error("Gemini generation error:", error);
    yield { type: 'error', agent: model, content: error instanceof Error ? error.message : "An unknown error occurred" };
  }
}

export async function* getStreamingResponse(
  userCode: string,
  cachedSuggestions: { agent: string, content: string } | null,
  provider: string,
  model: string
): AsyncGenerator<StreamEvent> {
    if (provider !== 'google') {
        const agentName = `${provider.charAt(0).toUpperCase() + provider.slice(1)} / ${model}`;
        yield { type: 'error', agent: agentName, content: `The '${provider}' provider is not yet implemented in this application.` };
        return;
    }
  
    if (cachedSuggestions) {
    // Phase 2 only: Generate code from cached suggestions
    yield* streamGeneratedCode(userCode, cachedSuggestions.content, model);
  } else {
    // Phase 1: Get suggestions
    let suggestionText = '';
    const suggestionEvents: StreamEvent[] = [];
    for await (const event of streamSuggestions(userCode, model)) {
      suggestionEvents.push(event);
      if (event.type === 'suggestions_end' && event.fullContent) {
        suggestionText = event.fullContent;
      }
      yield event;
    }

    // Check if suggestion phase ended in an error
    const hasError = suggestionEvents.some(e => e.type === 'error');
    if (hasError || !suggestionText) {
      console.warn("Skipping code generation due to suggestion failure or empty suggestions.");
      return;
    }

    // Phase 2: Generate code
    yield* streamGeneratedCode(userCode, suggestionText, model);
  }
}
