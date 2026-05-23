# ウサギBar

自宅にあるお酒・ドリンク・割材の在庫を、酒棚のような見た目で管理する個人開発Webアプリです。

## MVP初期セットアップ

- Vite + React + TypeScript
- React Router の `HashRouter`
- Tailwind CSS
- Supabase Auth / Database / Storage 前提のクライアント
- Supabase migration / seed SQL
- Vitest
- GitHub Pages 用 GitHub Actions

## セットアップ

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` には以下のみを設定します。

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Gemini APIキーはフロントエンドに置きません。将来Geminiを使う場合は、Supabase Edge Functions側のSecretとして管理し、フロントから直接呼び出さない方針です。

## Supabaseプロジェクト作成

1. Supabaseで新規プロジェクトを作成します。
2. Project Settings の API から Project URL と anon public key を確認します。
3. `.env` に以下を設定します。

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`VITE_SUPABASE_URL` には `/rest/v1` などを含めず、Supabase Project URLのルートを設定してください。`VITE_SUPABASE_ANON_KEY` は anon public key のみを使い、service_role / secret key はフロントエンドやGitHub Pagesに設定しないでください。

## migration / seed 適用

Supabase CLIを使う場合:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

SQL Editorで手動適用する場合:

1. `supabase/migrations/0001_init.sql` を実行します。
2. `supabase/migrations/0002_inventory_images_bucket_limits.sql` を実行します。
3. `supabase/seed/0001_seed_cocktails.sql` を実行します。

`0001_init.sql` はテーブル、RLS、admin判定関数、Storage policyを作成します。`0002_inventory_images_bucket_limits.sql` は `inventory-images` バケットのMVP用制限を `2MB / jpeg,png,webp` に揃えます。

適用後は [docs/supabase_checklist.md](docs/supabase_checklist.md) と [supabase/checks/rls_policy_audit.sql](supabase/checks/rls_policy_audit.sql) で確認してください。SQL Editorは管理者権限で実行されるため、RLSの実動確認はアプリ画面またはREST APIで行ってください。

## Storageバケット

画像用StorageはMVPでは公開バケット `inventory-images` を使います。画像は酒棚に公開表示する前提のため読み取り公開、アップロード・更新・削除はadminのみです。

migrationで作成できない場合は、Supabase管理画面で手動作成してください。

1. Storage で `inventory-images` バケットを作成します。
2. Public bucket を有効にします。
3. ファイルサイズ上限は2MB程度にします。
4. 許可するMIME Typeは `image/jpeg`, `image/png`, `image/webp` にします。

フロント側でも jpg / jpeg / png / webp のみ、2MB以下に制限しています。画像圧縮は今回必須ではありません。今後の課題として、アップロード前にWebP化し、長辺1024px程度に圧縮する予定です。

## ルーティング

GitHub Pagesで公開するため、SPAルーティングは `HashRouter` を使います。

- `#/` 酒棚
- `#/item/:id` アイテム詳細
- `#/admin/login` 管理者ログイン
- `#/admin` 管理者画面

## Supabase / RLS

初期スキーマは `supabase/migrations/0001_init.sql` にあります。すべてのテーブルでRLSを有効化し、在庫・レシピ系の読み取りは公開、書き込みは `profiles.role = 'admin'` のユーザーだけに制限しています。

サンプルレシピは `supabase/seed/0001_seed_cocktails.sql` にあります。

初回adminユーザーの付与は、Supabase SQL Editorなどで明示的に行ってください。通常ユーザーが自分自身をadminに昇格できないよう、`profiles` の更新はadminのみに制限しています。

## 初回adminユーザー付与

1. Supabase Authで管理者用ユーザーを作成します。
2. Dashboard > Authentication > Users で対象ユーザーの `User UID` を確認します。
3. SQL Editorで以下を実行します。

```sql
insert into public.profiles (user_id, role)
values ('00000000-0000-0000-0000-000000000000', 'admin')
on conflict (user_id) do update
set role = 'admin',
    updated_at = now();
```

`00000000-0000-0000-0000-000000000000` は実際のAuth User IDに置き換えてください。付与後、管理者アカウントで `#/admin/login` からログインし、`#/admin` に入れることを確認します。

adminではないログインユーザーは `/admin` にアクセスしても拒否表示になります。`profiles` 行が未作成のログインユーザーもadmin扱いされません。CRUD操作はフロントでもadmin判定し、RLSでもadmin以外の書き込みを拒否します。

MVPではAuthユーザー作成時に `profiles` を自動作成するtriggerは入れていません。管理者1名運用を優先し、初回admin付与を明示的なSQL操作にしています。一般ユーザーに誤って `admin` 権限を付けないでください。

## MVP方針メモ

- 詳細URLは `#/item/:id` のまま進めます。
- 残量DBは `remaining_ml` 中心、UIは `100% / 75% / 50% / 25% / 空` のプリセット更新にします。
- `near` 判定は不足1個までです。
- `recipe_matches` はMVPではDB保存せず、クライアント側で都度計算します。
- Gemini APIはMVPでは使わず、将来使う場合もSupabase Edge Functions側でSecret管理します。
- 画像判定は次フェーズ以降です。MVPでは手入力登録と通常のTypeScriptロジックによるレシピ照合を優先します。

`recipe_matches` テーブルは将来の判定キャッシュ用として残しています。MVPでは在庫更新とキャッシュ同期の複雑さを避けるため、`inventory_items`, `cocktail_recipes`, `cocktail_ingredients`, `ingredient_aliases` を取得して、クライアント側で `matchRecipes` を実行します。

`makeable` / `near` / `not_makeable` は [src/lib/recipes/matchRecipes.ts](src/lib/recipes/matchRecipes.ts) で都度計算します。`makeable` は必要材料がすべてそろっている状態、`near` は不足材料が1つだけの状態です。`not_makeable` はMVPでは詳細画面に表示しません。

Gemini APIはまだ使いません。Gemini APIキーを `.env` やフロントエンドコードに置かないでください。

## 既知課題

- 画像差し替え時、古いStorage画像は自動削除しません。次フェーズで不要画像の削除導線またはStorage整理処理を追加します。
- 画像圧縮は未実装です。次フェーズでアップロード前のWebP化と長辺1024px程度への縮小を検討します。
- `profiles` 自動作成triggerは未実装です。MVPでは初回admin手動付与で運用します。

## GitHub Pagesデプロイ

このリポジトリはGitHub ActionsからGitHub Pagesへ `dist` をデプロイする構成です。公開後の確認項目は [docs/github_pages_checklist.md](docs/github_pages_checklist.md) にまとめています。

想定公開URL:

```text
https://deraryo4559.github.io/UsAgi-Bar/
```

ownerまたはリポジトリ名が変わる場合は、実際のPages URLに読み替えてください。

### GitHub側の設定

1. Repository Settings > Pages で Source を `GitHub Actions` にします。
2. Repository Settings > Actions > General でWorkflow permissionsがPagesデプロイ可能な設定になっていることを確認します。
3. Repository Settings > Secrets and variables > Actions に以下を設定します。

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`VITE_SUPABASE_URL` はSupabase Project URLのルートを設定してください。`/rest/v1` は含めません。

```text
OK: https://your-project.supabase.co
NG: https://your-project.supabase.co/rest/v1
```

`VITE_SUPABASE_ANON_KEY` は anon public key のみを使います。service_role / secret keyはフロントエンド、GitHub Pages、GitHub ActionsのVite build envに設定しないでください。

`VITE_` 付きの値はフロントエンドビルドに埋め込まれるため、Variablesで管理してもSecretsで管理しても、公開アプリから利用される前提の値だけを入れます。

### Vite base設定

`vite.config.ts` は `base: './'` にしています。GitHub Pagesのリポジトリページ、たとえば `/UsAgi-Bar/` のようなサブパス配信でも、JS/CSSアセットを相対パスで読めるようにするためです。

リポジトリ名が `UsAgi-Bar` / `usagi-bar` のどちらでも、現在の `base: './'` のままで動かせます。絶対パスで運用したい場合だけ、以下のように実際のリポジトリ名へ変更します。

```ts
export default defineConfig({
  base: '/UsAgi-Bar/',
});
```

ただしMVPでは `base: './'` のままを推奨します。

### GitHub Actions

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) は以下を行います。

- `npm ci`
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` の存在確認
- `VITE_SUPABASE_URL` がProject URLのルートか確認
- `VITE_SUPABASE_ANON_KEY` が `anon` roleのJWTか確認
- `npm run lint`
- `npm run test`
- `npm run build`
- `dist` をGitHub Pagesへアップロード

Actionsでenv検証に失敗する場合は、Variables / Secretsの値を確認してください。

### Supabase Auth URL設定

Supabase Dashboard > Authentication > URL Configuration に公開URLを設定します。[Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) でも、Site URLはデフォルトのリダイレクト先、Redirect URLsは `redirectTo` の許可リストとして扱われます。

Site URL:

```text
https://deraryo4559.github.io/UsAgi-Bar/
```

Redirect URLs:

```text
http://127.0.0.1:5173/**
http://localhost:5173/**
https://deraryo4559.github.io/UsAgi-Bar/**
```

現在の管理者ログインはメールアドレス/パスワードなので通常ログインではredirect URLを使いません。ただし、メール確認、パスワードリセット、将来のOAuth/OTPで必要になるため、公開前に設定しておきます。

HashRouterを使うため、アプリ上の管理者ログインURLは以下です。

```text
https://deraryo4559.github.io/UsAgi-Bar/#/admin/login
```

### 公開後の確認

- トップページが開く。
- 酒棚が表示される。
- 詳細画面が開く。
- 画像が表示される。
- `#/admin/login` にアクセスできる。
- 管理者ログインできる。
- `#/admin` に入れる。
- 在庫登録、編集、削除ができる。
- 画像アップロードできる。
- makeable / near が表示される。
- 未ログインでは `#/admin` に入れない。
- anon keyだけではREST APIから直接writeできない。

詳細は [docs/github_pages_checklist.md](docs/github_pages_checklist.md) を確認してください。

### トラブルシュート

- 画面が真っ白:
  - GitHub Actionsのbuild/deployログを確認します。
  - `vite.config.ts` の `base: './'` を確認します。
  - DevTools ConsoleでJS/CSSの404を確認します。
- Supabase接続エラー:
  - `VITE_SUPABASE_URL` が `/rest/v1` を含まないProject URLか確認します。
  - `VITE_SUPABASE_ANON_KEY` が対象プロジェクトのanon public keyか確認します。
- ログインできない:
  - Supabase Authユーザーが存在するか確認します。
  - Authentication > URL Configurationに公開URLを追加します。
  - メール確認が必要な設定の場合は、対象ユーザーの確認状態を確認します。
- RLSで書き込みできない:
  - `public.profiles` にログインユーザーの `user_id` と `role = 'admin'` があるか確認します。
  - SQL Editorは管理者権限で実行されるため、RLS確認はアプリ画面またはREST APIで行います。
- 画像が表示されない:
  - `inventory-images` バケットがpublicか確認します。
  - Storage policyがpublic read / admin writeになっているか確認します。
  - `inventory_items.image_url` に公開URLが保存されているか確認します。

## コマンド

```bash
npm run dev
npm run build
npm run test
npm run lint
```
