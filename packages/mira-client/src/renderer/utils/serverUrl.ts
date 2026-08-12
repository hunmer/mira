export function resolveServerUrl(value: unknown, serverUrl: string | undefined): unknown {
  if (typeof value !== 'string' || !value || /^https?:\/\//i.test(value) || !serverUrl) return value
  return new URL(value, `${serverUrl.replace(/\/+$/, '')}/`).toString()
}
