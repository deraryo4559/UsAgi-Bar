import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { SectionTitle } from '../components/ui/SectionTitle';
import { AdminInventoryTable } from '../features/admin/AdminInventoryTable';
import { AdminStepGuide } from '../features/admin/AdminStepGuide';
import { InventoryItemForm } from '../features/admin/InventoryItemForm';
import { AutoAiRegistrationPanel } from '../features/admin/aiRegistration/AutoAiRegistrationPanel';
import type {
  CandidateRegistrationInput,
  CandidateRegistrationResult,
} from '../features/admin/aiRegistration/aiRegistrationFlow';
import {
  emptyInventoryItemFormValues,
  formValuesToInventoryItemInput,
  formValuesToInventoryItemUpdate,
  inventoryItemToFormValues,
  type InventoryItemFormValues,
} from '../features/admin/inventoryForm';
import { useAdminSession } from '../features/auth/useAdminSession';
import {
  createInventoryItem,
  deleteInventoryItem,
  listInventoryItems,
  sortInventoryItems,
  updateInventoryItem,
} from '../features/inventory/api/inventoryItems';
import {
  extractInventoryImagePathFromPublicUrl,
  uploadInventoryImage,
} from '../features/inventory/api/storage';
import { fetchRecipeCatalog } from '../features/recipes/api/recipeCatalog';
import { getSupabaseConfigErrorMessage, supabase } from '../lib/supabase/client';
import { toErrorMessage } from '../lib/supabase/errors';
import type { InventoryItem } from '../types/inventory';
import type { CocktailIngredient, IngredientAlias } from '../types/recipes';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const {
    session,
    profile,
    isAdmin,
    isLoading: isSessionLoading,
    error: sessionError,
    hasSupabaseConfig,
  } = useAdminSession();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [cocktailIngredients, setCocktailIngredients] = useState<
    CocktailIngredient[]
  >([]);
  const [ingredientAliases, setIngredientAliases] = useState<IngredientAlias[]>(
    [],
  );
  const [formValues, setFormValues] = useState<InventoryItemFormValues>(
    emptyInventoryItemFormValues,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoadingItems(true);
    setError(null);

    try {
      const [nextItems, recipeCatalog] = await Promise.all([
        listInventoryItems(),
        fetchRecipeCatalog(),
      ]);
      setItems(sortInventoryItems(nextItems));
      setCocktailIngredients(recipeCatalog.cocktailIngredients);
      setIngredientAliases(recipeCatalog.ingredientAliases);
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionLoading && hasSupabaseConfig && !session) {
      navigate('/admin/login', { replace: true });
    }
  }, [hasSupabaseConfig, isSessionLoading, navigate, session]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    void loadItems();
  }, [isAdmin, loadItems]);

  function updateFormValue<K extends keyof InventoryItemFormValues>(
    key: K,
    value: InventoryItemFormValues[K],
  ) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === 'image_url') {
      setImagePath(extractInventoryImagePathFromPublicUrl(String(value)));
    }
  }

  function resetForm() {
    setEditingItemId(null);
    setIsManualMode(false);
    setFormValues(emptyInventoryItemFormValues);
    setImageFile(null);
    setImagePath(null);
  }

  function handleImageFileChange(file: File | null) {
    setImageFile(file);

    if (file) {
      setImagePath(null);
    }
  }

  function handleEdit(item: InventoryItem) {
    setMessage(null);
    setError(null);
    setIsManualMode(true);
    setEditingItemId(item.id);
    setFormValues(inventoryItemToFormValues(item));
    setImageFile(null);
    setImagePath(extractInventoryImagePathFromPublicUrl(item.image_url ?? ''));
  }

  async function handleUploadImage() {
    if (!imageFile) {
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);
    setError(null);

    try {
      const uploadedImage = await uploadInventoryImage(imageFile);
      setFormValues((current) => ({
        ...current,
        image_url: uploadedImage.publicUrl,
      }));
      setImagePath(uploadedImage.path);
      setImageFile(null);
      setMessage(
        '画像をアップロードしました。保存すると在庫アイテムに反映されます。',
      );
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!isAdmin) {
      setError('admin権限がないため保存できません。');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      let nextFormValues = formValues;

      if (imageFile) {
        const uploadedImage = await uploadInventoryImage(imageFile);
        nextFormValues = {
          ...nextFormValues,
          image_url: uploadedImage.publicUrl,
        };
        setImagePath(uploadedImage.path);
      }

      if (editingItemId) {
        await updateInventoryItem(
          editingItemId,
          formValuesToInventoryItemUpdate(nextFormValues),
        );
        setMessage('在庫アイテムを更新しました。');
      } else {
        await createInventoryItem(
          formValuesToInventoryItemInput(nextFormValues),
        );
        setMessage('在庫アイテムを登録しました。');
      }

      resetForm();
      await loadItems();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterAiCandidates(
    candidates: CandidateRegistrationInput[],
  ): Promise<CandidateRegistrationResult[]> {
    if (!isAdmin) {
      return candidates.map((candidate) => ({
        localId: candidate.localId,
        ok: false,
        error: 'admin権限がないため保存できません。',
      }));
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const results: CandidateRegistrationResult[] = [];

    try {
      for (const candidate of candidates) {
        try {
          await createInventoryItem(
            formValuesToInventoryItemInput(candidate.values),
          );
          results.push({
            localId: candidate.localId,
            ok: true,
            error: null,
          });
        } catch (nextError) {
          results.push({
            localId: candidate.localId,
            ok: false,
            error: toErrorMessage(nextError),
          });
        }
      }

      const successCount = results.filter((result) => result.ok).length;

      if (successCount > 0) {
        await loadItems();
        setMessage(`${successCount}件の在庫アイテムを登録しました。`);
      }

      return results;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: InventoryItem) {
    const shouldDelete = window.confirm(`${item.name} を削除しますか？`);

    if (!shouldDelete) {
      return;
    }

    setBusyItemId(item.id);
    setMessage(null);
    setError(null);

    try {
      await deleteInventoryItem(item.id);
      setMessage('在庫アイテムを削除しました。');

      if (editingItemId === item.id) {
        resetForm();
      }

      await loadItems();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleUpdateRemaining(
    item: InventoryItem,
    remainingMl: number,
  ) {
    setBusyItemId(item.id);
    setMessage(null);
    setError(null);

    try {
      await updateInventoryItem(item.id, {
        remaining_ml: remainingMl,
      });
      setMessage(`${item.name} の残量を更新しました。`);
      await loadItems();
    } catch (nextError) {
      setError(toErrorMessage(nextError));
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);
    setMessage(null);

    const { error: signOutError } = await supabase.auth.signOut();
    setIsSigningOut(false);

    if (signOutError) {
      setError(toErrorMessage(signOutError));
      return;
    }

    navigate('/admin/login', { replace: true });
  }

  if (!hasSupabaseConfig) {
    return (
      <AppShell title="管理者画面" variant="admin">
        <Alert tone="warn" title="Supabase設定が未完了です">
          {getSupabaseConfigErrorMessage() ??
            '.env に Supabase のURLとAnon Keyを設定してください。'}
        </Alert>
      </AppShell>
    );
  }

  if (isSessionLoading) {
    return (
      <AppShell title="管理者画面" variant="admin">
        <LoadingState label="ログイン状態を確認しています…" />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="管理者画面" variant="admin">
        <Card>
          <p className="text-sm text-cream-100/80">ログインが必要です。</p>
          <Link
            to="/admin/login"
            className="mt-4 inline-flex rounded-full border border-night-neon bg-night-neon px-4 py-2 text-sm font-semibold text-white shadow-neon hover:bg-night-neon/90"
          >
            ログインへ
          </Link>
        </Card>
      </AppShell>
    );
  }

  if (!isAdmin) {
    const adminReason = profile
      ? 'profiles.role が admin ではありません。'
      : 'このアカウントには管理者権限がありません。Supabaseのprofilesテーブルに、このユーザーのuser_idとrole=adminを登録してください。';

    return (
      <AppShell title="管理者画面" variant="admin">
        <ErrorState
          title="admin権限がないためアクセスできません"
          message={[adminReason, sessionError ?? ''].filter(Boolean).join('\n')}
          mascotMessage="悪いな、ここは関係者だけだ。"
          action={
            <Button
              variant="secondary"
              disabled={isSigningOut}
              onClick={handleSignOut}
            >
              {isSigningOut ? 'ログアウト中…' : 'ログアウト'}
            </Button>
          }
        />
      </AppShell>
    );
  }

  const headerActions = (
    <Button
      variant="ghost"
      size="sm"
      disabled={isSigningOut}
      onClick={handleSignOut}
    >
      {isSigningOut ? 'ログアウト中…' : 'ログアウト'}
    </Button>
  );

  return (
    <AppShell
      title="管理者画面"
      variant="admin"
      subtitle={`${session.user.email ?? session.user.id} (${profile?.role})`}
      headerActions={headerActions}
    >
      <AdminStepGuide />

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="grid gap-3">
        <SectionTitle
          icon="📝"
          description="画像を選ぶだけで候補作成まで進みます。AI候補は保存前に確認・修正してください。"
          actions={
            editingItemId || isManualMode ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resetForm}
              >
                AI登録に戻る
              </Button>
            ) : null
          }
        >
          {editingItemId ? '在庫アイテムを編集' : '在庫アイテムを登録'}
        </SectionTitle>
        {editingItemId || isManualMode ? (
          <InventoryItemForm
            values={formValues}
            imageFile={imageFile}
            imagePath={imagePath}
            isSubmitting={isSubmitting}
            isUploadingImage={isUploadingImage}
            submitLabel={editingItemId ? '更新' : '登録'}
            onCancel={resetForm}
            onChange={updateFormValue}
            onImageFileChange={handleImageFileChange}
            onSubmit={handleSave}
            onUploadImage={handleUploadImage}
          />
        ) : (
          <AutoAiRegistrationPanel
            referenceData={{
              cocktailIngredients,
              ingredientAliases,
            }}
            inventoryItems={items}
            currentItemId={editingItemId}
            isRegistering={isSubmitting}
            onEditSimilarItem={handleEdit}
            onManualMode={() => {
              resetForm();
              setIsManualMode(true);
            }}
            onRegisterCandidates={handleRegisterAiCandidates}
          />
        )}
      </section>

      <details className="rounded-2xl border border-night-gold/30 bg-night-ink/70 p-4 shadow-bar">
        <summary className="cursor-pointer text-sm font-extrabold text-cream-50">
          登録済みアイテムを見る（{items.length}件）
        </summary>
        <section className="mt-4 grid gap-3">
          <SectionTitle
            icon="🥃"
            description="編集・削除・残量更新はこちらから行えます。"
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isLoadingItems}
                onClick={() => void loadItems()}
              >
                再読み込み
              </Button>
            }
          >
            在庫一覧
          </SectionTitle>
          {isLoadingItems ? (
            <LoadingState label="在庫を読み込んでいます…" />
          ) : (
            <AdminInventoryTable
              items={items}
              busyItemId={busyItemId}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onUpdateRemaining={handleUpdateRemaining}
            />
          )}
        </section>
      </details>
    </AppShell>
  );
}
