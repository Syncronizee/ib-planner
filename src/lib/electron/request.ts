export function isElectronUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) {
    return false
  }

  return /\belectron\//i.test(userAgent)
}

export function isElectronRequestHeaders(headers: Pick<Headers, 'get'>) {
  const runtimeHeader = headers.get('x-electron-runtime')
  if (runtimeHeader === '1' || runtimeHeader === 'true') {
    return true
  }

  return isElectronUserAgent(headers.get('user-agent'))
}
