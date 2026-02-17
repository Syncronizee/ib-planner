import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { DEFAULT_THEME, THEME_STORAGE_KEY, themeVars } from '@/components/theme/themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scholar Board',
  description: 'Plan and track your IB Diploma journey',
}

const themeInitScript = `
(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const fallback = ${JSON.stringify(DEFAULT_THEME)};
    const vars = ${JSON.stringify(themeVars)};
    const stored = window.localStorage.getItem(key);
    const theme = stored && vars[stored] ? stored : fallback;
    const root = window.document.documentElement;
    root.dataset.theme = theme;
    const selected = vars[theme];
    for (const token in selected) {
      root.style.setProperty(token, selected[token]);
    }
  } catch (error) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased app-bg`}>
        <ThemeProvider defaultTheme={DEFAULT_THEME} storageKey={THEME_STORAGE_KEY}>
          {/* Animated Mesh Gradient Background */}
          <div className="mesh-gradient-bg" />
          
          {/* Main Content */}
          <div className="relative min-h-screen app-bg">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
