export function wait<T>(value: T, delay = 420): Promise<T> {
  return new Promise(resolve => {
    window.setTimeout(() => resolve(value), delay)
  })
}

export function clone<T>(value: T): T {
  return structuredClone(value)
}
