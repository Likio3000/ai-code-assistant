import React from 'react';

interface ModelSelectorProps {
  provider: string;
  model: string;
  onModelChange: (provider: string, model: string) => void;
  isStreaming: boolean;
}

const MODELS: { [key: string]: string[] } = {
  google: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  openai: ['gpt-4.1-nano-2025-04-14', 'o4-mini-2025-04-16'],
};

const ModelSelector: React.FC<ModelSelectorProps> = ({ provider, model, onModelChange, isStreaming }) => {
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    const newModel = MODELS[newProvider][0]; // default to the first model of the new provider
    onModelChange(newProvider, newModel);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    onModelChange(provider, newModel);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        <label htmlFor="provider-select" className="text-xs text-green-100/80 capitalize">Provider</label>
        <select
          id="provider-select"
          value={provider}
          onChange={handleProviderChange}
          disabled={isStreaming}
          className="bg-green-600 border border-green-700 text-white text-sm rounded-md focus:ring-green-400 focus:border-green-400 block p-1.5 disabled:opacity-70"
          aria-label="Select AI Provider"
        >
          {Object.keys(MODELS).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label htmlFor="model-select" className="text-xs text-green-100/80 capitalize">Model</label>
        <select
          id="model-select"
          value={model}
          onChange={handleModelChange}
          disabled={isStreaming}
          className="bg-green-600 border border-green-700 text-white text-sm rounded-md focus:ring-green-400 focus:border-green-400 block p-1.5 disabled:opacity-70"
          aria-label="Select AI Model"
        >
          {MODELS[provider].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
};

export default ModelSelector;
