# イベント出欠アプリ（React + Hono + TypeScript / pnpm）

担当: 01 イベントを作る / 02 出欠を回答する

## 要件対応
1. イベントにはタイトル・開催日時・定員がある → `POST /api/events`
2. 締め切りはイベントごとに主催者が自由に決める → `deadline` を作成時に指定・更新可
3. 定員はあとから増やせる → `PATCH /api/events/:id { capacity }`（減員は400で拒否）
4. 名前だけで回答（登録・メール不要） → `POST /api/events/:id/rsvps { name, status }`
5. 選べるのは「参加」「不参加」「未定」 → `status: attend | decline | maybe`
6. 締め切りまでは何度でも変更可・最後で上書き → 同一名は upsert、締め切り後は403

## 構成
- `apps/backend` Hono API (`:3000`)
- `apps/frontend` React + Vite (`:5173`, `/api` をプロキシ)
- `packages/shared` 共有型

## 開発
```sh
pnpm install
pnpm --filter backend dev    # http://localhost:3000
pnpm --filter frontend dev   # http://localhost:5173
```

## テスト・ビルド
```sh
pnpm --filter backend test
pnpm --filter backend build
pnpm --filter frontend build
```

## API
- `POST /api/events` {title, datetime, capacity, deadline}
- `GET /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id` {title?, datetime?, capacity?, deadline?}
- `GET /api/events/:id/rsvps`
- `POST /api/events/:id/rsvps` {name, status}
