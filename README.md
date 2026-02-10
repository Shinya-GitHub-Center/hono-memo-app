# hono-memo-app

Cloudflare Workers + Hono + D1 + Drizzle ORMを使用したメモアプリケーション

## 技術スタック

- **Hono**: サーバーサイドWebフレームワーク
- **Cloudflare Workers**: エッジコンピューティングプラットフォーム
- **Cloudflare D1**: SQLiteベースのサーバーレスデータベース
- **Drizzle ORM**: TypeScript ORMライブラリ
- **Vite**: ビルドツール
- **JSX/TSX**: HTMLテンプレート構文

## アーキテクチャ解説

### 1. ReactとHonoの根本的な違い

#### React（クライアントサイドレンダリング）
- **実行環境**: ブラウザ（クライアント）
- **処理**: `ReactDOM.render()`でDOMを操作して画面を構築
- **JSXの役割**: 仮想DOMを生成し、実際のDOMに反映
- **配信**: 空のHTML + 大きなJavaScriptバンドル

#### Hono（サーバーサイドレンダリング）
- **実行環境**: Cloudflare Workers（サーバー/エッジ）
- **処理**: サーバー側でJSXを**HTML文字列**に変換してレスポンス
- **JSXの役割**: HTMLのテンプレート構文
- **配信**: 完成したHTML

```typescript
// Hono の例
app.get('/', async (c) => {
  const items = await db.select().from(memoItems)
  
  // JSXをHTML文字列に変換してレスポンス
  return c.render(
    <div class="card">
      <ul>
        {items.map(item => (
          <li><a href={`/memo/${item.id}`}>{item.body}</a></li>
        ))}
      </ul>
    </div>
  )
})
```

### 2. なぜ`export default app`だけで動くのか

Cloudflare Workersの実行モデル：

```typescript
// 内部的な動作（簡略化）
import app from './src/index.tsx' // wrangler.tomlのmainで指定

addEventListener('fetch', (event) => {
  event.respondWith(app.fetch(event.request))
})
```

- **Workers仕様**: エクスポートされたオブジェクトが`fetch`メソッドを持っていればHTTPハンドラーとして機能
- **Honoの設計**: `app`オブジェクトが`fetch(request)`メソッドを実装
- **自動統合**: Workersランタイムが`app.fetch()`を呼び出してリクエストを処理

React の`ReactDOM.render()`のような明示的なマウント処理は不要です。

### 3. Vite + Cloudflare Pluginの統合

#### ビルドプロセス

```bash
bun run build  # vite build を実行
```

`@cloudflare/vite-plugin`が以下を自動的に処理：

1. **TypeScript/JSXのコンパイル**: TSX → JavaScript
2. **バンドル**: すべての依存関係を1つのファイルにまとめる
3. **CSSの抽出**: JSX内のCSSを静的ファイルとして出力
4. **最適化**: ミニファイ、ツリーシェイキング

#### ビルド結果

```
dist/
├── client/
│   └── assets/
│       └── style-a5bfgdE1.css  # 静的CSS（ハッシュ付き）
└── hono_memo_app/
    └── index.js                 # バンドル済みWorkerコード（約3,677行）
```

#### なぜ`wrangler.toml`に`[assets]`設定が不要なのか

`@cloudflare/vite-plugin`がビルド時に：
- `dist/`に静的ファイルを出力
- 内部的に`wrangler.toml`に相当する設定を自動生成
- `wrangler deploy`時に自動的にアップロード対象に含める

### 4. デプロイ時のアップロード先

```bash
bun run deploy  # vite build && wrangler deploy
```

#### 2つの異なるアップロード先

| 対象 | アップロード先 | 役割 | ログ表示 |
|------|--------------|------|---------|
| **index.js** | Workers Runtime（実行環境） | アプリケーションロジックの実行 | 簡潔 |
| **style-xxx.css** | Assets Storage（CDN/R2/KV） | 静的コンテンツの配信 | 詳細表示 |

#### アーキテクチャ図

```
ブラウザからのリクエスト
         ↓
┌─────────────────────────────────┐
│ Cloudflare Edge Network         │
└────┬─────────────────────────┬──┘
     ↓                          ↓
┌──────────────────┐   ┌──────────────────┐
│ Workers Runtime  │   │ Assets Storage   │
│                  │   │ (CDN)            │
│ index.js を実行  │   │                  │
│ - ルーティング   │   │ style-xxx.css    │
│ - DB操作         │   │ その他の静的     │
│ - HTMLレンダリング│   │ ファイル        │
└──────────────────┘   └──────────────────┘
```

### 5. バンドルの内容

**アップロードされるもの**:
- `dist/index.js`: すべてのコードを1つにまとめたファイル
  - あなたのアプリケーションコード（`src/index.tsx`等）
  - Honoフレームワーク
  - Drizzle ORM
  - すべての`node_modules`依存関係

**アップロードされないもの**:
- `src/`ディレクトリのソースコード
- `node_modules/`
- `package.json`
- `tsconfig.json`

#### なぜバンドルするのか？

Cloudflare Workersの制約：
- Node.jsランタイムがない
- ファイルシステムがない
- `require()`や動的`import`が使えない
- **単一のJavaScriptファイルとして実行される必要がある**

### 6. リクエスト処理フロー

#### HTMLページの取得
```
GET /
  ↓
Workers Runtime
  ↓
index.js実行（DBクエリ、HTMLレンダリング）
  ↓
HTMLレスポンス（<link href="/assets/style-xxx.css">を含む）
  ↓
ブラウザ
```

#### 静的ファイルの取得
```
GET /assets/style-xxx.css
  ↓
Assets Storage（CDN）から直接配信
  ↓
Workers Runtimeは通らない（高速）
  ↓
ブラウザ
```

## 開発コマンド

```bash
# データベースマイグレーション生成
bun run gen

# ローカルDBにマイグレーション適用
bun run push:local <DB_NAME>

# ローカル開発サーバー起動
bun run dev

# クリーンアップ
bun run clear  # .wrangler/ と dist/ を削除
bun run reset  # node_modules/ も含めて削除
```

## 本番デプロイ手順

```bash
#リモートにデータベースを作成後、IDを`wrangler.toml`にコピペ

# リモートDBにマイグレーション適用
bun run push:remote <DB_NAME>

# デプロイ（ビルド含む）
bun run deploy

# リモートにシークレットを注入（`.dev.vars.remote`を参照）
bun run secret <ENV_NAME>
```

## `wrangler.toml`について
- 現在はローカル環境とリモート本番環境で、同一ワーカー名かつ同一データベース名にしている（ローカル環境x1および本番環境x1なのでシンプルなtomlファイルで済む）
- ローカルとリモートで異なる名前にしたい場合（特にリモート環境にstaging用とproduction用等2つ以上の環境を必要とする場合）は、[ここ](https://developers.cloudflare.com/workers/vite-plugin/reference/migrating-from-wrangler-dev/#cloudflare-environments)を参照にしてビルドコマンドを`"build": "CLOUDFLARE_ENV=staging vite build",`のようにすればよい。その場合は`wrangler.toml`は以前のローカルと本番で設定がそれぞれ存在するバージョンにする。
- Honoプロジェクトのvite統合バージョンは、vite-pluginが自動で統合されているので、wranglerコマンド実行時に`--env`オプションが利用できないため、上記の方法をとっている。

## プロジェクト構造

```
hono-memo-app/
├── src/
│   ├── index.tsx              # メインアプリケーション（エントリーポイント）
│   ├── renderer.tsx           # HTMLレンダラー
│   ├── style.css              # スタイルシート
│   ├── types.ts               # 型定義
│   └── middleware/
│       └── db/
│           ├── index.ts       # DBミドルウェア
│           ├── schema.ts      # DBスキーマ定義
│           └── migrations/    # マイグレーションファイル
├── dist/                      # ビルド出力（デプロイされる）
├── vite.config.ts             # Vite設定
├── wrangler.toml              # Cloudflare Workers設定
├── drizzle.config.ts          # Drizzle ORM設定
└── package.json
```

※Basic認証も追加しているので、middlewareにauth.tsを追加している。これはローカル開発環境では無視されるが、本番環境では別途secretコマンドでシークレットを注入することで、`IS_PROD`が存在することによって認証が動作する仕組みになっている。

## 類似フレームワークとの比較

| フレームワーク | 言語 | 実行環境 | レンダリング |
|--------------|------|---------|------------|
| **Hono** | TypeScript/JavaScript | サーバー（Workers） | SSR |
| **Flask** | Python | サーバー | SSR |
| **Ruby on Rails** | Ruby | サーバー | SSR |
| **Django** | Python | サーバー | SSR |
| **React** | JavaScript | ブラウザ | CSR |
| **Vue** | JavaScript | ブラウザ | CSR |

SSR = Server-Side Rendering（サーバーサイドレンダリング）  
CSR = Client-Side Rendering（クライアントサイドレンダリング）

## まとめ

このプロジェクトは：
1. **Vite**がTypeScript/JSXをビルドし、すべてを1つのファイルにバンドル
2. **@cloudflare/vite-plugin**がCloudflare Workersとの統合を自動化
3. **Wrangler**がWorkerコードと静的ファイルを別々の場所にデプロイ
4. **Cloudflare Workers**がエッジでコードを実行し、HTMLを動的生成
5. **静的アセット**はCDN経由で高速配信

開発者は複雑な設定を意識することなく、TypeScriptでサーバーサイドアプリケーションを構築できます。
