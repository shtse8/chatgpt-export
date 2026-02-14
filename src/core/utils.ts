export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

export const log = (msg: string): void => console.log(`[ChatGPT Export] ${msg}`)
export const warn = (msg: string): void => console.warn(`[ChatGPT Export] ⚠️ ${msg}`)
export const error = (msg: string): void => console.error(`[ChatGPT Export] ❌ ${msg}`)
