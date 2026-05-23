import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { AdminInventoryTable } from '../features/admin/AdminInventoryTable';
import { InventoryItemForm } from '../features/admin/InventoryItemForm';
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
import { uploadInventoryImage } from '../features/inventory/api/storage';
import { getSupabaseConfigErrorMessage, supabase } from '../lib/supabase/client';
import { toErrorMessage } from '../lib/supabase/errors';
import type { InventoryItem } from '../types/inventory';

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
  const [formValues, setFormValues] = useState<InventoryItemFormValues>(
    emptyInventoryItemFormValues,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
      const nextItems = await listInventoryItems();
      setItems(sortInventoryItems(nextItems));
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
  }

  function resetForm() {
    setEditingItemId(null);
    setFormValues(emptyInventoryItemFormValues);
    setImageFile(null);
  }

  function handleEdit(item: InventoryItem) {
    setMessage(null);
    setError(null);
    setEditingItemId(item.id);
    setFormValues(inventoryItemToFormValues(item));
    setImageFile(null);
  }

  async function handleUploadImage() {
    if (!imageFile) {
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);
    setError(null);

    try {
      const publicUrl = await uploadInventoryImage(imageFile);
      setFormValues((current) => ({
        ...current,
        image_url: publicUrl,
      }));
      setImageFile(null);
      setMessage('画像をアップロードしました。保存すると在庫アイテムに反映されます。');
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
        const publicUrl = await uploadInventoryImage(imageFile);
        nextFormValues = {
          ...nextFormValues,
          image_url: publicUrl,
        };
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

  async function handleUpdateRemaining(item: InventoryItem, remainingMl: number) {
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
      <AppShell title="管理者画面">
        <div className="rounded border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {getSupabaseConfigErrorMessage() ??
            '.env に Supabase のURLとAnon Keyを設定してください。'}
        </div>
      </AppShell>
    );
  }

  if (isSessionLoading) {
    return (
      <AppShell title="管理者画面">
        <div className="rounded border border-stone-200 bg-white p-5 text-sm text-stone-600">
          ログイン状態を確認しています。
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="管理者画面">
        <div className="rounded border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-600">ログインが必要です。</p>
          <Link
            to="/admin/login"
            className="mt-4 inline-flex rounded border border-stone-300 px-3 py-2 text-sm font-medium"
          >
            ログインへ
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    const adminReason = profile
      ? 'profiles.role が admin ではありません。'
      : "このアカウントには管理者権限がありません。Supabaseのprofilesテーブルに、このユーザーのuser_idとrole='admin'を登録してください。";

    return (
      <AppShell title="管理者画面">
        <div className="rounded border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>admin権限がないためアクセスできません。</p>
          <p className="mt-2">{adminReason}</p>
          {sessionError ? <p className="mt-2">{sessionError}</p> : null}
          <Button
            className="mt-4"
            variant="secondary"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? 'ログアウト中' : 'ログアウト'}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="管理者画面">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-600">
            在庫登録、編集、削除、残量更新、画像アップロードを行えます。
          </p>
          <p className="mt-1 text-xs text-stone-500">
            ログイン中: {session.user.email ?? session.user.id} / role:{' '}
            {profile?.role}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          {isSigningOut ? 'ログアウト中' : 'ログアウト'}
        </Button>
      </div>

      {message ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {editingItemId ? '在庫アイテム編集' : '在庫アイテム新規登録'}
          </h2>
          <Button type="button" variant="secondary" onClick={resetForm}>
            新規入力に戻す
          </Button>
        </div>
        <InventoryItemForm
          values={formValues}
          imageFile={imageFile}
          isSubmitting={isSubmitting}
          isUploadingImage={isUploadingImage}
          submitLabel={editingItemId ? '更新' : '登録'}
          onCancel={resetForm}
          onChange={updateFormValue}
          onImageFileChange={setImageFile}
          onSubmit={handleSave}
          onUploadImage={handleUploadImage}
        />
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">在庫一覧</h2>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoadingItems}
            onClick={() => void loadItems()}
          >
            再読み込み
          </Button>
        </div>
        {isLoadingItems ? (
          <p className="rounded border border-stone-200 bg-white p-4 text-sm text-stone-600">
            在庫を読み込んでいます。
          </p>
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
    </AppShell>
  );
}
