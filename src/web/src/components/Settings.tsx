/**
 * Settings - Configuration page for AI providers
 * Beautiful, modern design for managing API keys and models
 */

import { useState, useEffect } from 'react';
import { trpc } from '../trpc';
import { useToast } from './Toast';

interface SettingsProps {
  onClose: () => void;
}

type Provider = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'zai';

interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

export default function Settings({ onClose }: SettingsProps) {
  const toast = useToast();
  const [config, setConfig] = useState<any>({
    defaultProvider: 'anthropic',
    providers: {},
  });
  const [activeProvider, setActiveProvider] = useState<Provider>('anthropic');
  const [isSaving, setIsSaving] = useState(false);

  // Load config
  const { data: configData } = trpc.config.load.useQuery({});
  const saveMutation = trpc.config.save.useMutation();

  useEffect(() => {
    if (configData?.config) {
      setConfig(configData.config);
    }
  }, [configData]);

  const providers: { id: Provider; name: string; defaultModel: string }[] = [
    { id: 'anthropic', name: 'Anthropic (Claude)', defaultModel: 'claude-3-5-sonnet-20241022' },
    { id: 'openai', name: 'OpenAI (GPT)', defaultModel: 'gpt-4o' },
    { id: 'google', name: 'Google (Gemini)', defaultModel: 'gemini-2.0-flash-exp' },
    { id: 'openrouter', name: 'OpenRouter', defaultModel: 'anthropic/claude-3.5-sonnet' },
    { id: 'zai', name: 'Zai (Local/Custom)', defaultModel: 'zai-default' },
  ];

  const currentProviderConfig: ProviderConfig = config.providers?.[activeProvider] || {};

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveMutation.mutateAsync({
        config,
      });

      if (result.success) {
        toast.success('Configuration saved successfully!');
      } else {
        toast.error(`Failed to save: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Error saving configuration: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateProviderConfig = (field: string, value: string) => {
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [activeProvider]: {
          ...currentProviderConfig,
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[90vh] bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gray-800/50 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Settings</h2>
            <p className="text-sm text-gray-400 mt-1">Configure AI providers and models</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Provider list sidebar */}
          <div className="w-64 bg-gray-800/30 border-r border-gray-700 overflow-y-auto p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
              AI Providers
            </div>
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setActiveProvider(provider.id)}
                className={`
                  w-full text-left p-3 mb-2 rounded-lg transition-all
                  ${
                    activeProvider === provider.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                  }
                `}
              >
                <div className="font-medium">{provider.name}</div>
                <div className="text-xs mt-1 opacity-70">{provider.id}</div>
              </button>
            ))}

            {/* Default provider */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
                Default Provider
              </div>
              <select
                value={config.defaultProvider || 'anthropic'}
                onChange={(e) =>
                  setConfig({ ...config, defaultProvider: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Configuration panel */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-gray-100 mb-6">
                {providers.find((p) => p.id === activeProvider)?.name} Configuration
              </h3>

              {/* API Key */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={currentProviderConfig.apiKey || ''}
                  onChange={(e) => updateProviderConfig('apiKey', e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-3 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-600"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>

              {/* Base URL (for OpenRouter, Zai, etc.) */}
              {(activeProvider === 'openrouter' || activeProvider === 'zai') && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={currentProviderConfig.baseURL || ''}
                    onChange={(e) => updateProviderConfig('baseURL', e.target.value)}
                    placeholder={
                      activeProvider === 'openrouter'
                        ? 'https://openrouter.ai/api/v1'
                        : 'http://localhost:11434/v1'
                    }
                    className="w-full px-4 py-3 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-600"
                  />
                </div>
              )}

              {/* Default Model */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Model
                </label>
                <input
                  type="text"
                  value={
                    currentProviderConfig.defaultModel ||
                    providers.find((p) => p.id === activeProvider)?.defaultModel ||
                    ''
                  }
                  onChange={(e) => updateProviderConfig('defaultModel', e.target.value)}
                  placeholder={
                    providers.find((p) => p.id === activeProvider)?.defaultModel
                  }
                  className="w-full px-4 py-3 bg-gray-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-600"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Model to use when creating new sessions
                </p>
              </div>

              {/* Provider-specific help */}
              <div className="mt-8 p-4 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                <div className="flex gap-3">
                  <svg
                    className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-200">
                    {activeProvider === 'anthropic' && (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://console.anthropic.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-100"
                        >
                          console.anthropic.com
                        </a>
                      </>
                    )}
                    {activeProvider === 'openai' && (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-100"
                        >
                          platform.openai.com
                        </a>
                      </>
                    )}
                    {activeProvider === 'google' && (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-100"
                        >
                          Google AI Studio
                        </a>
                      </>
                    )}
                    {activeProvider === 'openrouter' && (
                      <>
                        Get your API key from{' '}
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-100"
                        >
                          openrouter.ai/keys
                        </a>
                      </>
                    )}
                    {activeProvider === 'zai' && (
                      <>
                        Zai is a local/custom provider. Configure your base URL to point to
                        your AI service.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-800/50 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
