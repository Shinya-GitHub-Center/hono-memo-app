import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'

// props第2引数を追加するため型定義を拡張
declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: { title?: string }
    ): Response | Promise<Response>
  }
}

export const renderer = jsxRenderer(({ children, title }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || 'Memo App'}</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div class="header">
          <h1>適当に作ったメモ帳アプリ</h1>
        </div>
        {children}
      </body>
    </html>
  )
})
