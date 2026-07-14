import { callChatWithSystem } from './chatProviders.js'
import { buildCommandSystemPrompt, parseCommandResponse } from './appCommands.js'

export async function interpretCommands(provider, apiKey, messages, context) {
  const system = buildCommandSystemPrompt(context)
  const { text } = await callChatWithSystem(provider, apiKey, messages, system)
  return parseCommandResponse(text, context)
}