import { rateLimit } from '../lib/rateLimit'

const limiter = rateLimit({ intervalMs: 60000, maxRequests: 30 })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await limiter.check(res, 1, req.ip || 'unknown')
  } catch {
    return res.status(429).json({ error: 'Rate limit exceeded' })
  }

  const { provider, model, prompt, aspectRatio, apiKey } = req.body

  if (!provider || !prompt || !apiKey) {
    return res.status(400).json({ error: 'Provider, prompt, and API key are required' })
  }

  try {
    const result = await generateImage(provider, model, prompt, aspectRatio, apiKey)
    return res.status(200).json(result)
  } catch (error) {
    console.error(`[${provider}] Generation failed:`, error.message)
    return res.status(500).json({ 
      error: error.message,
      provider,
      model 
    })
  }
}

async function generateImage(provider, model, prompt, aspectRatio, apiKey) {
  const endpoints = {
    openai: 'https://api.openai.com/v1/images/generations',
    qwen: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    deepseek: 'https://api.deepseek.com/v1/images/generations',
    gemini: 'https://generativelanguage.googleapis.com/v1/models/imagen-3.0-generate-preview:predict',
    stability: 'https://api.stability.ai/v2beta/stable-image/generate/sd3',
    replicate: 'https://api.replicate.com/v1/predictions',
    huggingface: 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev',
    together: 'https://api.together.xyz/v1/images/generations',
    fireworks: 'https://api.fireworks.ai/inference/v1/images/generations',
    nvidia: 'https://integrate.api.nvidia.com/v1/images/generations',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    perplexity: 'https://api.perplexity.ai/chat/completions',
    midjourney: 'https://api.midjourney.com/v1/generate',
    leonardo: 'https://cloud.leonardo.ai/api/rest/v1/generations',
  }

  const endpoint = endpoints[provider]
  if (!endpoint) {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  switch (provider) {
    case 'openai':
    case 'qwen':
    case 'deepseek':
    case 'stability':
    case 'together':
    case 'fireworks':
    case 'nvidia':
    case 'groq':
    case 'perplexity':
    case 'midjourney':
    case 'leonardo':
      headers['Authorization'] = `Bearer ${apiKey}`
      break
    case 'replicate':
      headers['Authorization'] = `Token ${apiKey}`
      break
    case 'huggingface':
      headers['Authorization'] = `Bearer ${apiKey}`
      break
    case 'gemini':
      break
    default:
      throw new Error(`Authentication not configured for ${provider}`)
  }

  const dimensions = getDimensions(aspectRatio)
  const body = buildRequestBody(provider, model, prompt, dimensions)

  const url = provider === 'gemini' ? `${endpoint}?key=${apiKey}` : endpoint

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`${provider} API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return extractImageUrl(provider, data)
}

function getDimensions(aspectRatio) {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1024, height: 576, size: '1792x1024' }
    case '1:1':
      return { width: 1024, height: 1024, size: '1024x1024' }
    case '9:16':
    default:
      return { width: 576, height: 1024, size: '1024x1792' }
  }
}

function buildRequestBody(provider, model, prompt, dimensions) {
  switch (provider) {
    case 'openai':
      return {
        model: model || 'dall-e-3',
        prompt,
        n: 1,
        size: dimensions.size,
      }
    case 'qwen':
      return {
        model: model || 'wanx-v1',
        input: { prompt },
        parameters: {
          size: `${dimensions.width}*${dimensions.height}`,
          n: 1,
        }
      }
    case 'deepseek':
      return {
        model: model || 'deepseek-image',
        prompt,
        size: dimensions.size,
      }
    case 'gemini':
      return {
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '9:16',
        }
      }
    case 'stability':
      return {
        prompt,
        model: model || 'sd3-medium',
        aspect_ratio: '9:16',
        output_format: 'png',
      }
    case 'replicate':
      return {
        version: model || 'black-forest-labs/flux-pro',
        input: {
          prompt,
          aspect_ratio: '9:16',
        }
      }
    case 'huggingface':
      return {
        inputs: prompt,
        parameters: {
          width: dimensions.width,
          height: dimensions.height,
        }
      }
    case 'together':
      return {
        model: model || 'black-forest-labs/FLUX.1-dev',
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: 28,
        n: 1,
      }
    case 'fireworks':
      return {
        model: model || 'accounts/fireworks/models/flux-1-dev',
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: 28,
        n: 1,
      }
    case 'nvidia':
      return {
        model: model || 'black-forest-labs/flux-dev',
        prompt,
        width: dimensions.width,
        height: dimensions.height,
        steps: 28,
      }
    case 'groq':
      return {
        model: model || 'llava-v1.6-34b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }
    case 'perplexity':
      return {
        model: model || 'sonar',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }
    case 'midjourney':
      return {
        prompt,
        aspect_ratio: '9:16',
        model: model || 'midjourney-v6',
      }
    case 'leonardo':
      return {
        prompt,
        modelId: model || '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
        width: dimensions.width,
        height: dimensions.height,
        num_images: 1,
      }
    default:
      throw new Error(`Request builder not implemented for ${provider}`)
  }
}

function extractImageUrl(provider, data) {
  switch (provider) {
    case 'openai':
    case 'deepseek':
    case 'together':
    case 'fireworks':
    case 'nvidia':
      return { url: data.data?.[0]?.url }
    case 'qwen':
      return { url: data.output?.results?.[0]?.url }
    case 'gemini':
      if (data.predictions?.[0]?.bytesBase64Encoded) {
        return { url: `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}` }
      }
      return { url: null }
    case 'stability':
      if (data.artifacts?.[0]?.base64) {
        return { url: `data:image/png;base64,${data.artifacts[0].base64}` }
      }
      return { url: null }
    case 'replicate':
      return { predictionId: data.id, status: data.status }
    case 'huggingface':
      return { requiresBlobHandling: true }
    case 'groq':
    case 'perplexity':
      return { url: data.choices?.[0]?.message?.content }
    case 'midjourney':
      return { url: data.imageUrl || data.result?.url }
    case 'leonardo':
      return { url: data.generations_by_pk?.generated_images?.[0]?.url }
    default:
      throw new Error(`Response parser not implemented for ${provider}`)
  }
}