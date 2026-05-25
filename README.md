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
- 複数アイテム画像の物体検出はGeminiではなくブラウザ側MLで行います。YOLO/ONNX Runtime Webで瓶・缶・紙パックなどの位置を検出し、Canvasで切り抜いてからGemini Visionの商品判定へ流します。

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

AI登録補助では、Gemini Visionの役割を「切り抜き済み商品画像の中身判定・構造化」に限定します。管理画面では、管理者が `画像を選ぶ` だけで、Storage保存、ブラウザ側MLによる複数アイテム検出、Canvas切り抜き、Gemini Vision解析、候補フォーム作成まで自動で進みます。

登録補助フロー:

1. 管理者が画像を選びます。
2. フロントが画像を `inventory-images` にアップロードします。
3. ブラウザ側MLで瓶・缶・紙パック・ペットボトルなどの候補位置を検出します。
4. 検出できた候補はブラウザ側Canvasで切り抜き、crop画像をStorageへ保存します。
5. crop画像ごとに既存の `analyze-inventory-image` を呼び、Gemini Visionで登録候補JSONを作ります。
6. モデル未配置、モデル読み込み失敗、検出0件、推論失敗時は、画像全体を1件として `analyze-inventory-image` にフォールバックします。
7. 候補は最初から編集可能な候補フォームとして表示します。
8. 管理者が値を確認・修正し、登録対象を選びます。
9. `選択した候補を登録` を押した候補だけ、既存のRLS付きCRUD処理で `inventory_items` に保存します。

管理画面UIは `画像を添付`、`解析中`、`判定結果` の3ステップに整理しています。画像選択後は内部処理ボタンを出さず、解析中は `src/img/komaokuri/` のうさぎ画像をファイル名順にコマ送り表示し、`画像を保存中`、`候補を探し中`、`切り抜き中`、`商品判定中`、`サムネ作成中`、`候補整理中` のフェーズを表示します。

解析に失敗した場合は `src/img/faild.png` のうさぎ画像を表示し、原因の要約、再解析、別画像選択、手入力への切り替えを案内します。技術的なエラー詳細は折りたたみ表示にし、通常画面で大きく出しすぎない方針です。

Gemini Visionモードは、任意の外部URLを解析しません。フロントからEdge Functionへ送るのは `{ bucket: "inventory-images", path: "inventory/xxxxx.jpg" }` だけで、Edge Function側でも `inventory-images` バケット、`inventory/` 配下、対応MIME type、画像サイズを検証します。物体検出はGeminiに送らず端末内で行い、画像を外部AI APIへ送るのは商品判定が必要なcrop画像またはフォールバック時の元画像だけです。

Gemini Vision候補は候補フォーム表示前に正規化します。ブランド名や商品名をそのまま `category` にせず、`ingredient_aliases` を優先してカクテル照合に使いやすい標準材料名へ寄せます。例として、`SUNTORY SUI` は `category = ジン`、`カルーア` は `category = コーヒーリキュール`、`三岳` は `category = 焼酎` を候補にします。aliasで補正した場合は、候補フォームの確認ポイントに補正内容を表示します。

`volume_ml` があり `remaining_ml` が未判定の場合は、管理者確認前提で `remaining_ml = volume_ml` を候補として補完します。`alcohol_percentage` は画像から読めない場合、推測で埋めず空欄のままにします。`category` が現在のカクテルDBまたは `ingredient_aliases` に存在しない場合は、保存をブロックせず、候補フォームに警告を表示します。

AI候補はDBへ完全自動保存しません。候補フォームへの入力までは自動化しますが、最終保存は管理者が候補を確認・修正して `選択した候補を登録` を押したときだけ実行します。エラー時は別の画像で再解析するか、`手入力に切り替える` から従来フォームで登録できます。

AI候補フォームでは、既存の `inventory_items` との類似チェックも行います。`name` の完全一致、alias補正後の `category` 一致、AIが読んだ文字に既存nameが含まれる場合、同じcategoryで容量が近い場合などをもとに、重複候補を警告表示します。MVPでは保存を自動で止めず、必要なら「この在庫を編集」から既存アイテムの編集モードへ移り、既存フォームの更新ボタンで保存します。

### AI生成サムネイル

写真の白背景、暗さ、反射、余白で酒棚上の商品が見えにくい場合に備え、crop画像をもとにイラスト風サムネイルを自動生成します。商品判定の根拠は元画像とGemini Vision結果であり、生成サムネイルは見やすくするための表示画像です。

候補作成後、フロントは候補ごとにSupabase Edge Function `generate-inventory-thumbnail` を順番に呼びます。生成に失敗しても候補登録はブロックせず、元画像のまま登録できます。候補フォームには `再生成` と `元画像を使う` の導線を残し、生成結果が気に入らない場合だけ手動で調整します。

サムネイル生成は、単純なimg2img結果をそのまま保存しません。Edge Function側で、生成前にcrop画像の背景を外し、最大の被写体だけを縦長キャンバスへ再配置してからCloudflare Workers AIへ渡します。生成後もエッジ背景を透過し、最大の被写体を512x768の透過PNGへ再配置します。横に広すぎる被写体はサムネイル用の最大比率に収めるため、細長い瓶や缶が正方形内で小さく潰れたり、逆に横長に引き伸ばされたように見える問題を抑えます。

既存の生成済みサムネイルは自動では変わりません。縦横比が不自然なサムネイルは、Edge Functionを再deployした後に候補フォームから再生成してください。元画像やcrop画像は残るため、生成に失敗しても元画像のまま登録・表示できます。

保存される項目:

- `thumbnail_url`: 酒棚で優先表示する生成サムネイルURL
- `thumbnail_prompt`: 生成に使ったprompt
- `thumbnail_provider`: `cloudflare-workers-ai`
- `thumbnail_generated_at`: 生成日時

表示優先度:

1. `thumbnail_url`
2. `image_url`
3. `BottlePlaceholder`

Storageは `inventory-thumbnails` bucketを使います。読み取りは公開、書き込み・更新・削除はadminのみです。追加migration `supabase/migrations/0004_add_inventory_thumbnail_fields.sql` を適用すると、DBカラム追加とbucket/policy設定が入ります。

必要なSupabase Edge Function Secret:

```bash
supabase secrets set CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
supabase secrets set CLOUDFLARE_API_TOKEN=your-cloudflare-workers-ai-token
```

Cloudflare API TokenはWorkers AIを実行できる権限を持つものを使ってください。React/Vite側に `VITE_IMAGE_GENERATION_API_KEY`、`VITE_CLOUDFLARE_API_TOKEN`、`VITE_CLOUDFLARE_ACCOUNT_ID` は作りません。CloudflareのSecretとGemini APIキーはいずれもEdge Function側だけで管理します。

本番deploy例:

```bash
supabase functions deploy generate-inventory-thumbnail --project-ref nyeqnaaqlwxheqehsmgv
```

Cloudflare Workers AIは無料枠やモデル提供条件が変わる可能性があります。完全無料が永続する保証はありません。現在のデフォルトモデルは、crop画像を入力できる `@cf/runwayml/stable-diffusion-v1-5-img2img` です。`CLOUDFLARE_IMAGE_MODEL` Secretで別モデルに変える場合も、必ず `image_b64` / img2img に対応したモデルを指定してください。text-to-image専用モデルを指定すると `input tensor image is not present` のような400エラーになります。候補API比較と運用上の注意は [docs/thumbnail_generation_research.md](docs/thumbnail_generation_research.md) を参照してください。

### 複数アイテム検出モード

複数のお酒・ドリンク・割材が1枚に写っている場合も、管理者がモードを選ぶ必要はありません。通常の `画像を選ぶ` から始めると、まずブラウザ側MLで複数アイテム検出を試し、検出できた候補を自動で切り抜いて一括解析します。

処理フロー:

1. ONNX Runtime Webで `public/models/inventory-detector/model.onnx` 相当のYOLOモデルを読み込みます。
2. ブラウザ上で瓶・缶・紙パック・ペットボトルなどの候補を検出します。
3. YOLOは商品名を当てず、切り抜き範囲だけを作ります。
4. フロントは採用候補をブラウザ側Canvasで切り抜きます。
5. crop画像を `inventory-images` の `inventory/crops/` 配下へアップロードします。
6. 既存の `analyze-inventory-image` をcropごとに順番に呼び、一括解析として複数候補フォームを表示します。
7. 管理者が候補を確認・修正し、登録対象にする/しないを選びます。
8. `選択した候補を登録` で選択済み候補を順番に保存します。一部失敗した場合は失敗候補だけ画面に残します。

複数検出モードでもAI候補から直接DB保存しません。保存は必ず候補フォームとRLS経由です。任意外部URLは受け付けず、Gemini解析対象は `inventory-images` 内の `inventory/` 配下画像だけです。

検出枠の座標はブラウザ側MLの画像ピクセル座標として扱います。crop処理はEdge Functionではなくブラウザ側Canvasで行い、Edge Function側の画像処理負荷を増やさない方針です。

モデルファイルが未配置、読み込み失敗、推論失敗、検出候補0件の場合は、画像全体解析へフォールバックします。候補が作れている場合、通常画面では失敗扱いにせず、必要な補足だけ `検出詳細` に表示します。それでも候補作成に失敗した場合は手入力登録へ戻せます。

### ローカル検出モデル

ONNX Runtime Webを使う前提で、モデル配置パスは以下を想定しています。

```text
public/models/inventory-detector/model.onnx
public/models/inventory-detector/classes.json
public/models/inventory-detector/ort-wasm-simd-threaded.jsep.wasm
```

GitHub Pages公開時はViteのpublic assetsとして配信されます。モデルが未配置でも登録フローは止めず、画像全体を単体商品としてGemini Vision解析します。これはSupabase更新ではなく、フロント側に `model.onnx` を配置する必要がある機能です。

`ort-wasm-simd-threaded.jsep.wasm` は ONNX Runtime Web の実行に必要なWASMランタイムです。これが公開パスで取得できない場合、ブラウザは `index.html` をWASMとして読んで `expected magic word ... found <!do` のようなエラーになります。

`classes.json` はモデルのclass idを `bottle / cup / wine_glass / can / carton / plastic_bottle / drink_pack` などの検出対象へ対応付けます。COCO系モデルでは `bottle / wine glass / cup` は含まれやすい一方、`can / carton / plastic bottle / drink pack` は標準classに存在しないことがあります。存在しないclassを無理にある前提にせず、カスタムモデルを使う場合だけ追加してください。

Geminiは物体検出には使いません。ブラウザ側YOLOは切り抜き範囲だけを作り、Gemini Visionは切り抜き後の商品判定に使います。詳しいモデル配置、`classes.json`、YOLO export、debug確認は [docs/local_detection_model_setup.md](docs/local_detection_model_setup.md) を参照してください。

この方式により、Geminiに大きな集合写真を送って物体検出させる回数を減らし、crop画像だけを商品判定へ送ることで画像入力サイズを抑えやすくします。ただし、最終的なトークン使用量は画像枚数、画像サイズ、Geminiモデルに依存します。`analyze-inventory-image` はGeminiの `usageMetadata` のうち `promptTokenCount / candidatesTokenCount / totalTokenCount` を安全な範囲で返せるようにしており、今後crop前後の実測に使います。

token節約効果は `model.onnx` 配置後に実測してください。比較対象は、画像全体をGeminiに送った場合の `totalTokenCount`、crop画像を送った場合の `totalTokenCount`、複数cropの合計 `totalTokenCount` です。

Gemini APIが `429` を返した場合は、無料枠またはレート制限に達しています。この場合、残りのcrop画像解析と画像全体フォールバックは止め、管理画面にクォータ確認の案内を表示します。時間を置くか、Google AI Studioの使用量・課金設定を確認してください。

### 旧Gemini検出Function

`supabase/functions/detect-inventory-items` は旧方式です。すぐには削除しませんが、現行UIからは呼びません。今後の主経路では、複数物体検出はブラウザ側MLで行い、Gemini Visionは切り抜き済み商品画像の中身判定だけに使います。

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
supabase/functions/generate-inventory-thumbnail/index.ts
```

ローカルserve例:

```bash
supabase functions serve analyze-inventory-image --env-file .env
```

本番deploy例:

```bash
supabase functions deploy analyze-inventory-image
supabase functions deploy generate-inventory-thumbnail
```

実Supabaseプロジェクトへdeployする場合:

```bash
supabase functions deploy analyze-inventory-image --project-ref nyeqnaaqlwxheqehsmgv
supabase functions deploy generate-inventory-thumbnail --project-ref nyeqnaaqlwxheqehsmgv
```

`supabase/config.toml` で `verify_jwt = true` を明示しています。`--no-verify-jwt` 前提では運用しません。関数内でもSupabase Auth JWTを確認し、`profiles.role = 'admin'` のユーザーだけGeminiを呼べるようにしています。

### 管理画面での確認手順

1. 管理者として `#/admin/login` からログインします。
2. `#/admin` で `画像を選ぶ` を押し、単体または複数本が写った画像を選択します。
3. 解析中画面でうさぎのコマ送りアニメーションと5フェーズ表示が出ることを確認します。
4. 候補フォームが表示されたら、画像プレビュー、商品名、category、容量、残量、確認ポイント、重複候補を確認します。
5. 必要に応じて候補フォームを修正し、登録対象にする/しないを選びます。
6. `登録する` を押します。
7. 登録後、折りたたみの `登録済みアイテムを見る` を開いて在庫一覧に追加されたことを確認します。
8. 画像解析に失敗した場合は、失敗うさぎ画面から `もう一度解析する`、`別の画像を選ぶ`、`手入力に切り替える` を使います。

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
