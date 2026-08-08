/** Random int in [min, max] inclusive. */
export function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Scroll delay between list steps (ms). Fast-test shortens. */
export function scrollDelayMs(fastTest: boolean): number {
  return fastTest ? randomInt(400, 800) : randomInt(1500, 4000)
}

/** Occasional longer pause to look less bot-like. */
export function longPauseMs(fastTest: boolean): number {
  return fastTest ? randomInt(1500, 3000) : randomInt(8000, 20_000)
}

export function scrollsBetweenLongPauses(): number {
  return randomInt(8, 12)
}
