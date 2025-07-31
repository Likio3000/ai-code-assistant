import { StreamEvent } from '../types';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable not set');
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SUGGESTION_PROMPT = `You are an expert code reviewer. Your task is to analyze the user's code and provide 3-5 high-impact, actionable improvement suggestions. Focus on clarity, bug prevention, and efficiency.

**Instructions:**
1.  **Do NOT rewrite the code.** Only provide suggestions.
2.  Format your response as a concise Markdown bulleted list.
3.  Keep suggestions focused and easy to implement.

Example:
*   **Refactor for Clarity:** The function \`processData\` is too long. Consider splitting it into smaller, more focused functions like \`validateInput\` and \`transformData\`.
*   **Add Type Hinting:** The function signature lacks type hints. Adding them (e.g., \`def process_data(items: list[str]) -> list[dict]:\`) will improve readability and allow static analysis.
*   **Handle Edge Cases:** The loop does not account for an empty \`items\` list, which could lead to unexpected behavior. Add a check at the beginning.`;

const GENERATION_SYSTEM_PROMPT = `You are an expert AI programmer. Your task is to refactor and improve the user's original code based on a provided list of suggestions.

**Instructions:**
1.  Implement the changes described in the suggestions.
2.  Return the **FULL, UPDATED CODE** only.
3.  Wrap the final code in a single Markdown code fence. If the language is identifiable, specify it (e.g., \`\`\`python).
4.  **Do not include any commentary, explanations, or apologies outside the code fence.** Your output should be only the code itself.`;

async function* parseOpenAIStream(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.replace(/^data:\s*/, '');
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      } catch (err) {
        console.error('OpenAI stream parse error:', err);
      }
    }
  }
}

async function* streamSuggestions(code: string, model: string): AsyncGenerator<StreamEvent> {
  let fullContent = '';
  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'user', content: code },
          { role: 'system', content: SUGGESTION_PROMPT },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error ${response.status}`);

    for await (const delta of parseOpenAIStream(response)) {
      fullContent += delta;
      yield { type: 'suggestions_chunk', agent: model, content: delta };
    }
    yield { type: 'suggestions_end', agent: model, fullContent };
  } catch (error) {
    console.error('OpenAI suggestion error:', error);
    yield { type: 'error', agent: model, content: error instanceof Error ? error.message : 'An unknown error occurred' };
  }
}

async function* streamGeneratedCode(userCode: string, suggestions: string, model: string): AsyncGenerator<StreamEvent> {
  const prompt = `${GENERATION_SYSTEM_PROMPT}\n\n<original_code>\n${userCode}\n</original_code>\n\n<suggestions>\n${suggestions}\n</suggestions>`;
  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error ${response.status}`);

    for await (const delta of parseOpenAIStream(response)) {
      yield { type: 'generated_code_chunk', agent: model, content: delta };
    }
    yield { type: 'stream_end', agent: model };
  } catch (error) {
    console.error('OpenAI generation error:', error);
    yield { type: 'error', agent: model, content: error instanceof Error ? error.message : 'An unknown error occurred' };
  }
}

export async function* getOpenAIResponse(
  userCode: string,
  cachedSuggestions: { agent: string, content: string } | null,
  model: string
): AsyncGenerator<StreamEvent> {
  if (cachedSuggestions) {
    yield* streamGeneratedCode(userCode, cachedSuggestions.content, model);
  } else {
    let suggestionText = '';
    const events: StreamEvent[] = [];
    for await (const event of streamSuggestions(userCode, model)) {
      events.push(event);
      if (event.type === 'suggestions_end' && event.fullContent) {
        suggestionText = event.fullContent;
      }
      yield event;
    }

    const hasError = events.some(e => e.type === 'error');
    if (hasError || !suggestionText) {
      console.warn('Skipping code generation due to suggestion failure or empty suggestions.');
      return;
    }

    yield* streamGeneratedCode(userCode, suggestionText, model);
  }
}
