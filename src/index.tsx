import { Hono } from 'hono'
import { renderer } from './renderer'
import { dbMiddleware } from './middleware/db'
import { memoItems } from './middleware/db/schema'
import { desc, eq } from 'drizzle-orm'

import type { Env, Variables } from './types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

// ミドルウェアの設定（appに注入）
//  レンダラー設定（レイアウト提供）
app.use(renderer)
// DB接続の注入
// ミドルウェア関数への「参照」を登録しリクエスト時に適宜実行
app.use('*', dbMiddleware)

// ルーティング設定
// 一覧ページ
app.get('/', async (c) => {
  const db = c.get('db')
  const items = await db.select().from(memoItems).orderBy(desc(memoItems.createdAt))

  return c.render(
    <div class="card p-3">
      <div class="header-row">
        <span>編集したいメモを選んで下さい</span>
        <button
          class="button is-primary refresh-button"
          onclick="window.location.reload()"
        >
          更新
        </button>
      </div>
      <ul class="grid">
        <li class="cell card p-4 m-2">
          <a href="/memo/0" class="memo-preview"> 🖌️ 新規作成 </a>
        </li>
        {items.map(
          (item) => (
            <li class="cell card p-4 m-2">
              <a href={`/memo/${item.id}`} class="memo-preview"> {item.body} </a>
            </li>
          )
        )}
      </ul>
    </div>
  )
})

// メモ編集ページ（GET）
app.get('/memo/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const db = c.get('db')

  let memo;

  if (id === 0) {
    // 新規メモ
    memo = {
      id: 0,
      body: '',
      createdAt: new Date()
    }
  } else {
    const result = await db.select().from(memoItems).where(eq(memoItems.id, id)).limit(1)

    if (result.length === 0) {
      // メモが見つからない場合は新規メモとして扱う
      memo = {
        id: 0,
        body: '',
        createdAt: new Date()
      }
    } else {
      memo = result[0]
    }
  }

  return c.render(
    <div class="card p-3">
      <form method="post" action={`/memo/${memo.id}/save`}>
        <label class="label" for="body">本文:</label>
        <textarea id="body" name="body" class="textarea">{memo.body}</textarea>
        <div class="button-container">
          <input type="submit" value="保存" class="button is-primary" />
          {memo.id && memo.id !== 0 && (
            <button type="submit" formaction={`/memo/${memo.id}/delete`} class="delete-button" title="削除">
              <span class="icon">🗑️</span>
            </button>
          )}
        </div>
      </form>
    </div>
  )
})

// メモ保存（POST）
app.post('/memo/:id/save', async (c) => {
  const id = parseInt(c.req.param('id'))
  const formData = await c.req.formData()
  const body = formData.get('body') as string

  if (!body) {
    return c.text('メモの内容を入力してください', 400)
  }

  const db = c.get('db')

  if (id === 0) {
    // 新規作成
    await db.insert(memoItems).values({
      body,
      createdAt: new Date()
    })
  } else {
    // 更新
    await db
      .update(memoItems)
      .set({
        body,
        createdAt: new Date()
      })
      .where(eq(memoItems.id, id))
  }

  return c.redirect('/')
})

// メモ削除（POST）
app.post('/memo/:id/delete', async (c) => {
  const id = parseInt(c.req.param('id'))

  if (id === 0) {
    return c.text('新規メモは削除できません', 400)
  }

  const db = c.get('db')
  await db.delete(memoItems).where(eq(memoItems.id, id))

  return c.redirect('/')
})

export default app
