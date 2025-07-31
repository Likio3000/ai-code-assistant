import React from 'react';
import ModelSelector from './ModelSelector';

interface HeaderProps {
  provider: string;
  model: string;
  onModelChange: (provider: string, model: string) => void;
  isStreaming: boolean;
}

const Header: React.FC<HeaderProps> = ({ provider, model, onModelChange, isStreaming }) => {
  return (
    <header className="flex items-center justify-between p-3 bg-green-500 text-white shadow-md flex-wrap gap-2">
      <h1 className="m-0 text-lg font-medium">AI Code Assistant</h1>
      <ModelSelector
        provider={provider}
        model={model}
        onModelChange={onModelChange}
        isStreaming={isStreaming}
      />
    </header>
  );
};

export default Header;
