export interface AnalystConfig {
  groqApiKey: string | undefined
  groqModel: string
}

export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'

export const ANALYST_CONFIG: AnalystConfig = {
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
}
