# Supabase実環境チェックリスト

このチェックリストは、ウサギBar MVPを実Supabase環境で動かす前後に確認するためのものです。

## 1. 事前準備

- Supabaseプロジェクトを作成する。
- Project Settings > API で Project URL と anon public key を確認する。
- `.env` に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定する。
- `VITE_SUPABASE_URL` は `/rest/v1` を含まないProject URLのルートにする。
- `VITE_SUPABASE_ANON_KEY` は anon public key にする。service_role / secret keyは使わない。
- Gemini APIキーは設定しない。フロントエンドに置かない。

## 2. migration / seed

SQL Editorで順番に実行する場合:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_inventory_images_bucket_limits.sql`
3. `supabase/seed/0001_seed_cocktails.sql`

Supabase CLIを使う場合:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

seedはSQL Editorで `supabase/seed/0001_seed_cocktails.sql` を実行するか、CLIのseed運用に合わせて投入してください。

## 3. migration適用後のSQL確認

SQL Editorは管理者権限で実行されるため、RLSの可否検証には使えません。ここではスキーマ・policyが存在するかだけ確認します。

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'inventory_items',
    'cocktail_recipes',
    'cocktail_ingredients',
    'ingredient_aliases',
    'recipe_matches'
  )
order by tablename;
```

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public', 'storage')
  and tablename in (
    'profiles',
    'inventory_items',
    'cocktail_recipes',
    'cocktail_ingredients',
    'ingredient_aliases',
    'recipe_matches',
    'objects'
  )
order by schemaname, tablename, policyname;
```

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'inventory-images';
```

期待値:

- publicテーブル6つの `rowsecurity` が `true`
- `inventory_items` / レシピ系 / `recipe_matches` はpublic read + admin write policyがある
- `profiles` は本人またはadmin read、admin update/delete policyがある
- `inventory-images` は public=true、file_size_limit=2097152、MIMEが jpeg/png/webp

## 4. 初回admin付与

1. Supabase Dashboard > Authentication > Users で管理者用ユーザーを作成する。
2. ユーザー詳細または一覧で `User UID` をコピーする。
3. SQL Editorで以下を実行する。

```sql
insert into public.profiles (user_id, role)
values ('AUTH_USER_IDをここに入れる', 'admin')
on conflict (user_id) do update
set role = 'admin',
    updated_at = now();
```

確認:

```sql
select user_id, role, created_at, updated_at
from public.profiles
where user_id = 'AUTH_USER_IDをここに入れる';
```

注意:

- `profiles` 行がないログインユーザーはadmin扱いされません。
- 一般ユーザーへ `admin` を付けないでください。
- MVPではAuthユーザー作成時のprofiles自動作成triggerは入れていません。

## 5. RLS実動確認

RLSの実動確認はSQL Editorではなく、アプリ画面またはREST APIで行ってください。

環境変数:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
```

### 未ログイン read

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items?select=id,name&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

期待: `200 OK`

```bash
curl -i "$SUPABASE_URL/rest/v1/cocktail_recipes?select=id,name&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

期待: `200 OK`

### 未ログイン write拒否

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items" \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"RLS anon test","item_type":"other"}'
```

期待: `401` / `403` / RLS拒否系エラー

### viewer / admin token取得

```bash
curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@example.com","password":"password"}'
```

返ってきた `access_token` を `VIEWER_TOKEN` に入れます。adminも同様に `ADMIN_TOKEN` を取得します。

```bash
export VIEWER_TOKEN="viewer-access-token"
export ADMIN_TOKEN="admin-access-token"
```

### viewer write拒否

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items" \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"RLS viewer test","item_type":"other"}'
```

期待: `403` / RLS拒否系エラー

### admin CRUD許可

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items" \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"RLS admin test","item_type":"other","volume_ml":100,"remaining_ml":100}'
```

期待: `201 Created`

返却された `id` を使ってupdate/deleteも確認します。

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items?id=eq.ITEM_ID" \
  -X PATCH \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"remaining_ml":50}'
```

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items?id=eq.ITEM_ID" \
  -X DELETE \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 6. Storage確認

### 公開読み取り

管理画面から画像を1枚アップロードし、保存された `image_url` をブラウザで直接開けることを確認します。

期待: 未ログインのブラウザでも画像が表示される。

### viewerアップロード拒否

```bash
curl -i "$SUPABASE_URL/storage/v1/object/inventory-images/check/viewer-test.png" \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @test.png
```

期待: `403` / RLS拒否系エラー

### adminアップロード許可

```bash
curl -i "$SUPABASE_URL/storage/v1/object/inventory-images/check/admin-test.png" \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: image/png" \
  --data-binary @test.png
```

期待: `200` 系レスポンス

フロント側確認:

- 2MBを超える画像はアップロード前に拒否される
- jpg / jpeg / png / webp 以外は拒否される
- バケットがない場合はエラー表示にStorage確認のヒントが出る
- 画像差し替え時、古いStorage画像は残る。自動削除は次フェーズ

## 7. 画面確認

- 未ログインで `#/` の酒棚が表示できる。
- 未ログインで `#/item/:id` の詳細が表示できる。
- 未ログインで `#/admin` に行くと `#/admin/login` に戻る。
- profilesがないログインユーザーは `/admin` でadmin権限なし表示になる。
- adminユーザーは `/admin` で在庫CRUDができる。
- adminユーザーは画像アップロード後、`inventory_items.image_url` に公開URLを保存できる。
- RLS拒否時、画面にRLS/admin権限確認のヒントが出る。

## 8. GitHub Pagesデプロイ前

- GitHub repository settings > Pages でGitHub ActionsからのPages公開を有効化する。
- Actions permissionsでPages deployに必要な権限を許可する。
- GitHub Actions VariablesまたはSecretsに `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定する。
- `.env` はcommitしない。
- `vite.config.ts` の `base: './'` を確認する。
- `HashRouter` を使っているため、リロード時の404は避けられる。
- Supabase Authentication > URL Configuration にGitHub PagesのURLを追加する。
- 必要に応じて Site URL と Redirect URLs に以下を入れる。

```text
https://<owner>.github.io/<repo>/
https://<owner>.github.io/<repo>/#/
https://<owner>.github.io/<repo>/#/admin
```

## 9. MVPでまだやらないこと

- Gemini API連携
- Gemini APIキーのフロント配置
- `recipe_matches` への保存
- 古いStorage画像の自動削除
- 画像圧縮
- profiles自動作成trigger
