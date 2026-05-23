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

Gemini APIキーはフロントエンドに置きません。Geminiを使う場合はSupabase Edge Functions側のSecretとして管理し、フロントから直接呼び出さない方針です。

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
4. 必要に応じて `supabase/seed/0003_seed_aliases_and_home_bar_recipes.sql` を実行し、ブランド名aliasと宅飲みレシピを追加します。

`0001_init.sql` はテーブル、RLS、admin判定関数、Storage policyを作成します。`0002_inventory_images_bucket_limits.sql` は `inventory-images` バケットのMVP用制限を `2MB / jpeg,png,webp` に揃えます。`0003_seed_aliases_and_home_bar_recipes.sql` は `SUNTORY SUI -> ジン`、`カルーア -> コーヒーリキュール`、`三岳 -> 焼酎` などの商品名aliasと、焼酎・日本酒を含む宅飲みレシピを追加します。

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

サンプルレシピは `supabase/seed/0001_seed_cocktails.sql` にあります。ブランド名aliasと宅飲みレシピの追加seedは `supabase/seed/0003_seed_aliases_and_home_bar_recipes.sql` にあります。

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
- カクテル照合にはGemini APIを使わず、通常のTypeScriptロジックによるレシピ照合を優先します。
- Gemini APIはAI登録補助でのみ使い、APIキーはSupabase Edge Functions側でSecret管理します。
- AI登録補助はGemini Visionを主方式にします。管理者が明示実行したStorage画像だけをEdge Function経由でGeminiへ送ります。
- 物体検出や複数本の自動分割は次フェーズ以降です。

`recipe_matches` テーブルは将来の判定キャッシュ用として残しています。MVPでは在庫更新とキャッシュ同期の複雑さを避けるため、`inventory_items`, `cocktail_recipes`, `cocktail_ingredients`, `ingredient_aliases` を取得して、クライアント側で `matchRecipes` を実行します。

`makeable` / `near` / `not_makeable` は [src/lib/recipes/matchRecipes.ts](src/lib/recipes/matchRecipes.ts) で都度計算します。`makeable` は必要材料がすべてそろっている状態、`near` は不足材料が1つだけの状態です。`not_makeable` はMVPでは詳細画面に表示しません。

Gemini APIキーをReact/Viteの環境変数やフロントエンドコードに置かないでください。

## 材料名の正規化

`inventory_items.name` は酒棚や詳細画面で見せる商品名です。`inventory_items.category` はレシピ照合に使う標準材料名として扱います。たとえば `SUNTORY SUI` や `翠` は `name` に残しつつ、`category` は `ジン` に寄せます。

商品名・ブランド名・英語表記のゆれは `ingredient_aliases` で標準材料名に寄せます。aliasを増やすほど、AI登録後の在庫が `cocktail_ingredients` と自然に照合され、作れるカクテルや割り方が表示されやすくなります。

`supabase/seed/0003_seed_aliases_and_home_bar_recipes.sql` では、`SUNTORY SUI / 翠 -> ジン`、`カルーア / KAHLUA -> コーヒーリキュール`、`三岳 / みたけ -> 焼酎`、`浦霞 -> 日本酒`、`角瓶 -> ウイスキー` などを追加します。焼酎・日本酒はクラシックカクテルに限らず、宅飲みの割り方として `焼酎ソーダ割り`、`焼酎水割り`、`日本酒ソーダ`、`日本酒トニック` などのレシピに使います。

このseedは重複回避を入れているため、aliasやレシピを追加した後に同じSQLを再実行できます。`Kahlúa` や `SUNTORY GIN SUI` など後から足した表記ゆれを実Supabaseへ反映したい場合も、SQL Editorで `0003_seed_aliases_and_home_bar_recipes.sql` を再適用してください。

追加seedを適用しても、すでに保存済みの `inventory_items.category` は自動更新されません。過去に `category = SUNTORY SUI` や `category = カルーア` のような商品名categoryで保存したアイテムは、管理画面で編集するか再登録して、`category = ジン` や `category = コーヒーリキュール` のような標準材料名へ直してください。

追加seedを適用した後は、管理画面でAI候補または手入力登録を行い、以下を確認してください。

- `SUNTORY SUI` を登録すると、aliasにより `category = ジン` を候補にできる。
- `カルーア` を登録すると、aliasにより `category = コーヒーリキュール` を候補にできる。
- `三岳` を登録すると、aliasにより `category = 焼酎` を候補にできる。
- `焼酎` と `ソーダ` が在庫にあると、`焼酎ソーダ割り` が makeable になる。
- `コーヒーリキュール` と `牛乳` が在庫にあると、`カルーアミルク` が makeable になる。
- `ビール` と `ジンジャーエール` が在庫にあると、`シャンディガフ` が makeable になる。

## AI登録補助（Gemini Vision）

AI登録補助はGemini Visionに一本化しています。管理者が画像をStorageへアップロードし、`画像からAI候補作成` を押したときだけ、Supabase Storage内の画像をEdge Function `analyze-inventory-image` 経由でGeminiへ送ります。

登録補助フロー:

1. 管理者が画像を選択し、既存の画像アップロードで `inventory-images` に保存します。
2. `画像からAI候補作成` を押します。
3. Edge Function `analyze-inventory-image` がadmin権限を確認します。
4. Edge FunctionがStorage画像を取得し、Gemini Visionへ送ります。
5. Geminiが登録候補JSONを返します。
6. 候補カードに正規化結果、確認ポイント、カクテルDB照合、重複候補、フォーム反映後プレビューを表示します。
7. 管理者が `フォームに反映` を押します。
8. 管理者が値を確認・修正します。
9. 既存の登録/更新ボタンで `inventory_items` に保存します。

Gemini Visionモードは、任意の外部URLを解析しません。フロントから送るのは `{ bucket: "inventory-images", path: "inventory/xxxxx.jpg" }` だけで、Edge Function側でも `inventory-images` バケット、`inventory/` 配下、対応MIME type、画像サイズを検証します。画像を外部AI APIへ送る処理なので、自動実行ではなく管理者の明示操作にしています。

Gemini Vision候補はフォーム反映前に正規化します。ブランド名や商品名をそのまま `category` にせず、`ingredient_aliases` を優先してカクテル照合に使いやすい標準材料名へ寄せます。例として、`SUNTORY SUI` は `category = ジン`、`カルーア` は `category = コーヒーリキュール`、`三岳` は `category = 焼酎` を候補にします。aliasで補正した場合は、候補カードに「categoryをaliasに基づいて補正しました」と表示します。

`volume_ml` があり `remaining_ml` が未判定の場合は、管理者確認前提で `remaining_ml = volume_ml` を候補として補完します。`alcohol_percentage` は画像から読めない場合、推測で埋めず空欄のままにします。`category` が現在のカクテルDBまたは `ingredient_aliases` に存在しない場合は、保存をブロックせず、候補カードに警告を表示します。

AI候補はDBへ直接保存しません。管理者が候補カードを確認し、「フォームに反映」で既存フォームへ値を入れ、必要に応じて修正してから既存の登録/更新ボタンで保存します。エラー時も画像URLやフォーム入力は残し、手入力登録に戻せます。

AI候補カードでは、既存の `inventory_items` との類似チェックも行います。`name` の完全一致、alias補正後の `category` 一致、AIが読んだ文字に既存nameが含まれる場合、同じcategoryで容量が近い場合などをもとに、重複候補を警告表示します。MVPでは保存を自動で止めず、必要なら「この在庫を編集」から既存アイテムの編集モードへ移り、既存フォームの更新ボタンで保存します。

### Gemini APIキー

Gemini APIキー名は `GEMINI_API_KEY` です。本番ではSupabase Edge Function Secretとして管理します。

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

ローカルでEdge Functionをserveする場合は、Git管理されていない `.env` に以下を追加して使えます。

```bash
GEMINI_API_KEY=your-gemini-api-key
```

`VITE_GEMINI_API_KEY` は作らないでください。Gemini APIキーはReact/Viteフロントエンド、GitHub Pages、GitHub ActionsのVite build envには入れません。フロントエンドに置くのは `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` だけです。

### Edge Function deploy / serve

Edge Functionは以下にあります。

```text
supabase/functions/analyze-inventory-image/index.ts
```

ローカルserve例:

```bash
supabase functions serve analyze-inventory-image --env-file .env
```

本番deploy例:

```bash
supabase functions deploy analyze-inventory-image
```

`supabase/config.toml` で `verify_jwt = true` を明示しています。`--no-verify-jwt` 前提では運用しません。関数内でもSupabase Auth JWTを確認し、`profiles.role = 'admin'` のユーザーだけGeminiを呼べるようにしています。

### 管理画面での確認手順

1. 管理者として `#/admin/login` からログインします。
2. `#/admin` の在庫登録フォームで画像を選択します。
3. `画像アップロード` を押してStorageへ保存します。
4. `画像からAI候補作成` を押します。
5. 画像評価、画像から読めた文字、視覚的な根拠、候補内容を確認します。
6. 正規化後のフォーム反映値、カクテルDB照合、未入力項目、自動補完項目、重複候補、確認ポイントを確認します。
7. `フォームに反映` を押します。
8. 管理者が内容を修正してから、既存の `登録` または `更新` ボタンで保存します。

Geminiが失敗した場合、画像やフォーム入力を見直すか、そのまま手入力登録へ戻してください。カクテル照合は引き続き `matchRecipes.ts` がクライアント側で都度計算し、`recipe_matches` には保存しません。

## 既知課題

- 画像差し替え時、古いStorage画像は自動削除しません。次フェーズで不要画像の削除導線またはStorage整理処理を追加します。
- 画像圧縮は未実装です。次フェーズでアップロード前のWebP化と長辺1024px程度への縮小を検討します。
- `profiles` 自動作成triggerは未実装です。MVPでは初回admin手動付与で運用します。
- Gemini Visionの認識精度は画像品質に依存します。反射、暗い画像、複数本が写った画像、小さいラベルでは誤認識する場合があります。
- AI候補は必ず管理者が確認・修正してください。
- 将来的には複数本画像の分割、物体検出、バーコード読み取りを検討します。

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
