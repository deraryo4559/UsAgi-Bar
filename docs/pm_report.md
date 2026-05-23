# ウサギBar PM報告メモ

## 確定したMVP方針

- 詳細URLは `/item/:id` のまま進める。
- Storageは公開バケット `inventory-images` を使う。
- 画像読み取りは公開、アップロード・更新・削除はadminのみ。
- 残量DBは `remaining_ml` を中心にする。
- 残量UIは `100% / 75% / 50% / 25% / 空` のプリセット更新にする。
- プリセット更新時は `volume_ml × 割合` で `remaining_ml` を計算する。
- `near` 判定は不足1個までにする。
- `recipe_matches` はMVPではDB保存せず、クライアント側で都度計算する。
- Gemini APIはMVPでは使わない。

## 次にやる実装タスク

1. Supabase実プロジェクトを作成し、migrationとseedを適用する。
2. `.env` に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定する。
3. 初回adminユーザーを作成し、`profiles.role = 'admin'` を付与する。
4. 酒棚・詳細画面をサンプルデータからSupabase DB取得へ置き換える。
5. `/admin` にadmin権限ガードを入れる。
6. 管理画面で在庫アイテムの手入力CRUDを実装する。
7. 残量プリセット更新を実装する。
8. `inventory-images` への画像アップロードを実装する。
9. DB取得した在庫・レシピ・材料・aliasesで `matchRecipes` を実行し、詳細画面に表示する。
10. GitHub Pagesデプロイを確認する。

## ChatGPTへの報告文案

```md
ウサギBarのMVP方針について、未決定だった点を確定しました。

確定事項:
- 詳細URLは `/item/:id` のまま進めます。
- StorageはMVPでは公開バケットにします。
- バケット名は `inventory-images` を想定します。
- 画像の読み取りは公開、アップロード・更新・削除はadminのみです。
- 残量はDBでは `remaining_ml` 中心にします。
- UIでは `100% / 75% / 50% / 25% / 空` のプリセット更新にします。
- プリセット更新時は `volume_ml × 割合` で `remaining_ml` を更新します。
- `near` 判定は不足1個までにします。
- `recipe_matches` はMVPではDB保存せず、クライアント側で都度計算します。
- Gemini APIはMVPでは使いません。

実装への反映:
- Supabase migrationに公開Storageバケット `inventory-images` とstorage policyを追加しました。
- READMEにMVP方針メモを追記しました。
- `matchRecipes` は既に `nearThreshold = 1` をデフォルトにしており、MVP方針に合っています。

次の実装は、Supabase実接続とDB取得への置き換えから進めるのがよいです。
```
