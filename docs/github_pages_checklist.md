# GitHub Pages公開後チェックリスト

ウサギBar MVPをGitHub Pagesへデプロイしたあと、公開URLで確認する項目です。

想定公開URL:

```text
https://deraryo4559.github.io/UsAgi-Bar/
```

リポジトリ名やownerが変わる場合は、実際のPages URLに読み替えてください。

## 1. GitHub側の設定

- Repository Settings > Pages で Source が `GitHub Actions` になっている。
- Repository Settings > Actions > General でWorkflow permissionsがPagesデプロイ可能な設定になっている。
- Repository Settings > Secrets and variables > Actions に以下が設定されている。
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL` はSupabase Project URLのルートで、`/rest/v1` を含まない。
- `VITE_SUPABASE_ANON_KEY` は anon public key。service_role / secret keyは使わない。

## 2. Supabase Auth URL設定

Supabase Dashboard > Authentication > URL Configuration を確認します。

- Site URL:
  - `https://deraryo4559.github.io/UsAgi-Bar/`
- Redirect URLs:
  - `http://127.0.0.1:5173/**`
  - `http://localhost:5173/**`
  - `https://deraryo4559.github.io/UsAgi-Bar/**`

現在のログインはメールアドレス/パスワードなので通常のログインではredirect URLを使いません。ただし、メール確認、パスワードリセット、将来のOAuth/OTPで必要になるため、公開前に設定しておきます。

## 3. 公開画面の確認

- 公開URLのトップページが開く。
- 酒棚が表示される。
- 酒棚の画像が表示される。
- アイテムクリックで `#/item/:id` の詳細画面が開く。
- 詳細画面で画像が表示される。
- 詳細画面で `作れるカクテル` が表示される。
- 詳細画面で `あと1つで作れるカクテル` が表示される。
- `not_makeable` のレシピが表示されない。
- 材料一覧、分量、作り方、グラス、ガーニッシュが表示される。

## 4. 管理画面の確認

- `#/admin/login` にアクセスできる。
- 管理者メールアドレス/パスワードでログインできる。
- ログイン後に `#/admin` へ遷移する。
- `profiles.role = 'admin'` のユーザーだけが管理画面に入れる。
- 未ログインで `#/admin` にアクセスすると `#/admin/login` に戻る。
- adminでないユーザーは管理画面で拒否表示になる。
- 在庫を新規登録できる。
- 在庫を編集できる。
- 在庫を削除できる。
- 残量プリセットで `remaining_ml` が更新できる。
- 画像をアップロードできる。
- アップロード後の公開画像URLが `inventory_items.image_url` に保存される。
- 画像が酒棚・詳細画面で表示される。

## 5. RLS / Storage確認

SQL EditorではなくREST APIまたは画面で確認します。SQL Editorは管理者権限で実行されるため、RLSの実動確認には使いません。

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-public-key"
```

未ログインread:

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items?select=id,name&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

期待: `200 OK`

anon keyのみでwrite拒否:

```bash
curl -i "$SUPABASE_URL/rest/v1/inventory_items" \
  -X POST \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name":"anon write check","item_type":"other"}'
```

期待: `401` / `403` / RLS拒否系エラー

Storage公開画像:

- `inventory_items.image_url` を未ログインのブラウザで直接開き、画像が表示される。
- admin以外では管理画面から画像アップロードできない。

## 6. よくある不具合

- 画面が真っ白:
  - Actionsのbuildログを確認する。
  - `vite.config.ts` の `base: './'` を確認する。
  - DevTools ConsoleでJS/CSSの404を確認する。
- Supabase接続エラー:
  - `VITE_SUPABASE_URL` が `/rest/v1` を含まないProject URLか確認する。
  - `VITE_SUPABASE_ANON_KEY` が対象プロジェクトのanon public keyか確認する。
- ログインできない:
  - Supabase Authユーザーが存在するか確認する。
  - Supabase Authentication > URL Configurationに公開URLを追加する。
  - メール確認が必要な設定の場合はユーザーの確認状態を確認する。
- RLSで書き込みできない:
  - `public.profiles` にログインユーザーの `user_id` と `role = 'admin'` があるか確認する。
  - SQL Editorではなくアプリ画面またはREST APIで確認する。
- 画像が表示されない:
  - `inventory-images` バケットがpublicになっているか確認する。
  - Storage policyが `inventory-images` に限定され、public read / admin writeになっているか確認する。
  - `inventory_items.image_url` に公開URLが保存されているか確認する。
