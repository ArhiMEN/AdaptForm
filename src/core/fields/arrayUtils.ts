export function isValidArrayIndex(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length
}
