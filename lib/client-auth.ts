export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith('token=')) {
      return c.substring('token='.length);
    }
  }
  return null;
}
