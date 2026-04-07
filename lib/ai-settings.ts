"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

export interface AIModel {
  id: string
  label: string
  shortLabel: string
  description: string
  supportsGrounding: boolean
  /** For OpenAI models: the search-preview variant to use when grounding is enabled */
  groundingModelId?: string
}

export type AIProvider = "openrouter" | "openai" | "pollinations"

export interface AIProviderPreset {
  id: AIProvider
  label: string
  baseUrl: string
  keyUrl: string
  keyPlaceholder: string
}

export const AI_PROVIDER_PRESETS: AIProviderPreset[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keyUrl: "https://openrouter.ai/settings/keys",
    keyPlaceholder: "sk-or-v1-...",
  },
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-...",
  },
  // ========== FIX: 添加 Pollinations.ai 支援 ==========
  {
    id: "pollinations",
    label: "Pollinations.ai",
    baseUrl: "https://gen.pollinations.ai/v1",
    keyUrl: "https://enter.pollinations.ai",
    keyPlaceholder: "Get API key from enter.pollinations.ai",
  },
]

export function getPreset(provider: AIProvider): AIProviderPreset {
  return AI_PROVIDER_PRESETS.find(p => p.id === provider) || AI_PROVIDER_PRESETS[0]
}

export const AI_MODELS: AIModel[] = [
  // ========== FIX: 添加更多 OpenRouter 模型，包括免費選項 ==========
  {
    id: "qwen/qwen3.6-plus:free",
    label: "Qwen 3.6 Plus (Free)",
    shortLabel: "Qwen",
    description: "Free model, good balance of quality and speed",
    supportsGrounding: false,
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    shortLabel: "Claude",
    description: "Best reasoning & annotation quality",
    supportsGrounding: false,
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    shortLabel: "GPT-4o",
    description: "Strong structured output, broad knowledge",
    supportsGrounding: true,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    shortLabel: "GPT-4o Mini",
    description: "Fast and affordable, good for quick tasks",
    supportsGrounding: false,
  },
  {
    id: "google/gemini-2.5-pro-preview-03-25",
    label: "Gemini 2.5 Pro",
    shortLabel: "Gemini",
    description: "Long-context, web grounding available",
    supportsGrounding: true,
  },
  {
    id: "google/gemini-2.5-flash-preview",
    label: "Gemini 2.5 Flash",
    shortLabel: "Gemini Flash",
    description: "Fast, good for quick iterations",
    supportsGrounding: false,
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
    shortLabel: "DeepSeek",
    description: "Cost-efficient frontier model",
    supportsGrounding: false,
  },
  {
    id: "deepseek/deepseek-chat:free",
    label: "DeepSeek V3 (Free)",
    shortLabel: "DeepSeek",
    description: "Free tier with good reasoning capabilities",
    supportsGrounding: false,
  },
  {
    id: "mistralai/mistral-small-3.2-24b-instruct",
    label: "Mistral Small 3.2",
    shortLabel: "Mistral",
    description: "Fast, excellent structured outputs",
    supportsGrounding: false,
  },
  {
    id: "meta-llama/llama-4-maverick",
    label: "Llama 4 Maverick",
    shortLabel: "Llama",
    description: "Meta's latest open model",
    supportsGrounding: false,
  },
  {
    id: "meta-llama/llama-4-scout",
    label: "Llama 4 Scout",
    shortLabel: "Llama Scout",
    description: "Efficient open source model",
    supportsGrounding: false,
  },
  {
    id: "nvidia/llama-3.1-nemotron-ultra",
    label: "Llama 3.1 Nemotron Ultra",
    shortLabel: "Nemotron",
    description: "NVIDIA's optimized variant",
    supportsGrounding: false,
  },
]

// ========== FIX: 添加 Pollinations.ai 模型動態獲取 ==========
// 默認模型列表（當 API 無法訪問時使用）
export const POLLINATIONS_MODELS: AIModel[] = [
  { id: "openai", label: "GPT-4o (via Pollinations)", shortLabel: "GPT-4o", description: "OpenAI GPT-4o via Pollinations.ai", supportsGrounding: false },
  { id: "openai-large", label: "GPT-4o Large (via Pollinations)", shortLabel: "GPT-4o Large", description: "OpenAI GPT-4o Large via Pollinations.ai", supportsGrounding: false },
  { id: "claude", label: "Claude (via Pollinations)", shortLabel: "Claude", description: "Anthropic Claude via Pollinations.ai", supportsGrounding: false },
  { id: "deepseek", label: "DeepSeek (via Pollinations)", shortLabel: "DeepSeek", description: "DeepSeek via Pollinations.ai", supportsGrounding: false },
]

// Pollinations.ai 模型響應格式
interface PollinationsModel {
  id: string
  name?: string
  description?: string
  context_length?: number
  // 根據文件，模型可能有這些特性
  tools?: boolean
  reasoning?: boolean
  search?: boolean
  supported_endpoints?: string[]
  output_modalities?: string[]
  [key: string]: unknown
}

// ========== FIX: 從 Pollinations.ai API 動態獲取模型列表 ==========
export async function fetchPollinationsModels(apiKey?: string): Promise<AIModel[]> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }
    
    const response = await fetch("https://gen.pollinations.ai/v1/models", { headers })
    if (!response.ok) {
      console.warn("[Pollinations] Failed to fetch models, using defaults")
      return POLLINATIONS_MODELS
    }
    
    const data = await response.json()
    const models: PollinationsModel[] = data.data || []
    
    // ========== FIX: 更精確地過濾文本模型 ==========
    // 根據文件，text models 支持 chat completions (有 tools/reasoning/search 標記)
    // 排除 image/video/audio 模型
    const imageVideoModels = new Set([
      "kontext", "nanobanana", "nanobanana-2", "nanobanana-pro", "seedream5", "seedream",
      "gptimage", "gptimage-large", "flux", "zimage", "wan-image", "wan-image-pro",
      "qwen-image", "grok-imagine", "grok-imagine-pro", "klein", "p-image", "p-image-edit",
      "nova-canvas", "veo", "seedance", "seedance-pro", "wan", "wan-fast", "grok-video-pro",
      "ltx-2", "p-video", "nova-reel"
    ])
    const audioModels = new Set([
      "elevenlabs", "elevenmusic", "whisper", "scribe", "acestep"
    ])
    
    const textModels = models.filter((m: PollinationsModel) => {
      // 排除已知的圖像/視頻/音頻模型
      if (imageVideoModels.has(m.id)) return false
      if (audioModels.has(m.id)) return false
      // 只保留支持 chat completions 的模型
      // 根據文件，這些模型有 tools/reasoning/search 標記
      return m.tools || m.reasoning || m.search || 
             m.supported_endpoints?.includes("chat.completions") ||
             // 或者根據名稱判斷（常見的文本模型）
             ["openai", "claude", "gemini", "deepseek", "mistral", "grok", 
              "qwen", "kimi", "perplexity", "nova", "glm", "minimax"].some(
               prefix => m.id.toLowerCase().includes(prefix)
             )
    })
    
    return textModels.map((m: PollinationsModel) => {
      // 構建描述，包含模型特性
      const features: string[] = []
      if (m.tools) features.push("tools")
      if (m.reasoning) features.push("reasoning")
      if (m.search) features.push("search")
      
      const featureStr = features.length > 0 ? ` [${features.join(", ")}]` : ""
      
      return {
        id: m.id,
        label: m.name || m.id,
        shortLabel: m.id.split("-").slice(0, 2).join("-"),
        description: `${m.description || m.id} via Pollinations.ai${featureStr}`,
        supportsGrounding: m.search || false,
      }
    })
  } catch (error) {
    console.warn("[Pollinations] Error fetching models:", error)
    return POLLINATIONS_MODELS
  }
}

export const OPENAI_MODELS: AIModel[] = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    shortLabel: "GPT-4o",
    description: "Strong structured output, broad knowledge",
    supportsGrounding: true,
    groundingModelId: "gpt-4o-search-preview",
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o Mini",
    shortLabel: "GPT-4o Mini",
    description: "Fast and capable, web grounding available",
    supportsGrounding: true,
    groundingModelId: "gpt-4o-mini-search-preview",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    shortLabel: "GPT-4.1",
    description: "Latest GPT-4, improved instruction following",
    supportsGrounding: false,
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    shortLabel: "GPT-4.1 Mini",
    description: "Fast and capable, good balance",
    supportsGrounding: false,
  },
  {
    id: "o4-mini",
    label: "o4-mini",
    shortLabel: "o4-mini",
    description: "Fast reasoning model",
    supportsGrounding: false,
  },
]

// ========== FIX: 添加 Pollinations.ai 模型支援 ==========
export function getModelsForProvider(provider: AIProvider): AIModel[] {
  if (provider === "openai") return OPENAI_MODELS
  if (provider === "pollinations") return POLLINATIONS_MODELS
  return AI_MODELS // openrouter + safe fallback for any stale localStorage value
}

export const DEFAULT_MODEL_ID = "openai/gpt-4o"
export const DEFAULT_PROVIDER: AIProvider = "openrouter"

export interface AISettings {
  apiKey: string
  modelId: string
  webGrounding: boolean
  provider: AIProvider
  customBaseUrl: string
  /** Per-provider key store so switching back to a provider restores its key */
  providerKeys?: Partial<Record<AIProvider, string>>
}

const STORAGE_KEY = "nodepad-ai-settings"

function loadSettings(): AISettings {
  if (typeof window === "undefined") {
    return { apiKey: "", modelId: DEFAULT_MODEL_ID, webGrounding: false, provider: DEFAULT_PROVIDER, customBaseUrl: "" }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { apiKey: "", modelId: DEFAULT_MODEL_ID, webGrounding: false, provider: DEFAULT_PROVIDER, customBaseUrl: "" }
    return { apiKey: "", modelId: DEFAULT_MODEL_ID, webGrounding: false, provider: DEFAULT_PROVIDER, customBaseUrl: "", ...JSON.parse(raw) }
  } catch {
    return { apiKey: "", modelId: DEFAULT_MODEL_ID, webGrounding: false, provider: DEFAULT_PROVIDER, customBaseUrl: "" }
  }
}

export interface AIConfig {
  apiKey: string
  modelId: string
  supportsGrounding: boolean
  provider: AIProvider
  customBaseUrl: string
}

// ========== FIX: Pollinations.ai 支援無 API Key 匿名訪問 ==========
export function loadAIConfig(): AIConfig | null {
  const s = loadSettings()
  if (!s.apiKey) return null
  const models = getModelsForProvider(s.provider)
  const model = models.find(m => m.id === s.modelId)
  // Use the matched model's id if found; otherwise fall back to the first model
  // for this provider.  This handles the case where localStorage still holds an
  // OpenRouter-prefixed id (e.g. "openai/gpt-4o") after switching to OpenAI —
  // that string won't match any entry in OPENAI_MODELS so we fall back to "gpt-4o".
  const modelId = model?.id ?? models[0]?.id ?? s.modelId ?? DEFAULT_MODEL_ID
  const supportsGrounding =
    (s.provider === "openrouter" || s.provider === "openai") &&
    s.webGrounding &&
    (model?.supportsGrounding ?? false)
  return { apiKey: s.apiKey, modelId, supportsGrounding, provider: s.provider, customBaseUrl: s.customBaseUrl }
}

export function getBaseUrl(config: AIConfig): string {
  return getPreset(config.provider).baseUrl
}

// ========== FIX: Pollinations.ai 支援無 API Key 匿名訪問 ==========
export function getProviderHeaders(config: AIConfig): Record<string, string> {
  const base: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  }
  if (config.provider === "openrouter") {
    base["HTTP-Referer"] = "https://nodepad.space"
    base["X-Title"] = "nodepad"
  }
  return base
}

/** @deprecated Use loadAIConfig() for direct browser → provider calls.
 *  Kept for any remaining server-route usage during transition. */
export function getAIHeaders(): Record<string, string> {
  const config = loadAIConfig()
  if (!config) return {}
  const models = getModelsForProvider(config.provider)
  const model = models.find(m => m.id === config.modelId) || AI_MODELS.find(m => m.id === DEFAULT_MODEL_ID)!
  return {
    "x-or-key": config.apiKey,
    "x-or-model": config.modelId,
    "x-or-supports-grounding": model.supportsGrounding ? "true" : "false",
  }
}

// ========== FIX: 添加動態獲取 Pollinations 模型的 hook ==========
export function useAISettings() {
  // Always start with the SSR-safe default so server and client render identically.
  // Load the real localStorage value after mount to avoid hydration mismatches
  // caused by settings.apiKey toggling conditional DOM blocks (API key banner,
  // modelLabel prop, etc.) between the server render and client hydration.
  const [settings, setSettings] = useState<AISettings>({
    apiKey: "", modelId: DEFAULT_MODEL_ID, webGrounding: false,
    provider: DEFAULT_PROVIDER, customBaseUrl: "",
  })
  
  // ========== FIX: 動態獲取 Pollinations 模型 ==========
  const [pollinationsModels, setPollinationsModels] = useState<AIModel[]>(POLLINATIONS_MODELS)
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])
  
  // 當 provider 變為 pollinations 時，動態獲取模型列表
  useEffect(() => {
    if (settings.provider === "pollinations") {
      setIsLoadingModels(true)
      fetchPollinationsModels(settings.apiKey)
        .then(models => {
          setPollinationsModels(models)
          // 如果當前選擇的模型不在新列表中，選擇第一個
          if (models.length > 0 && !models.find(m => m.id === settings.modelId)) {
            updateSettings({ modelId: models[0].id })
          }
        })
        .finally(() => setIsLoadingModels(false))
    }
  }, [settings.provider, settings.apiKey])

  const updateSettings = useCallback((patch: Partial<AISettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])
  
  // ========== FIX: 根據 provider 返回對應的模型列表 ==========
  const models = useMemo(() => {
    if (settings.provider === "pollinations") {
      return pollinationsModels
    }
    return getModelsForProvider(settings.provider)
  }, [settings.provider, pollinationsModels])

  const resolvedModelId = (() => {
    const model = models.find(m => m.id === settings.modelId) || models[0]
    if (!model) return settings.modelId
    if (settings.provider === "openrouter" && settings.webGrounding && model.supportsGrounding) {
      return `${model.id}:online`
    }
    return model.id
  })()

  const currentModel: AIModel = models.find(m => m.id === settings.modelId) || models[0] || {
    id: settings.modelId,
    label: settings.modelId,
    shortLabel: settings.modelId.split("/").pop() || settings.modelId,
    description: "Custom model",
    supportsGrounding: false,
  }

  return { settings, updateSettings, resolvedModelId, currentModel, models, isLoadingModels }
}
