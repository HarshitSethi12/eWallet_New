export function generateMockAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return '1' + Array.from(
    { length: 33 }, 
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export function generateMockPrivateKey(): string {
  return Array.from(
    { length: 64 },
    () => Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
