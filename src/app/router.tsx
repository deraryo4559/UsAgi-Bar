import { HashRouter, Route, Routes } from 'react-router-dom';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminLoginPage } from '../pages/AdminLoginPage';
import { ItemDetailPage } from '../pages/ItemDetailPage';
import { ShelfPage } from '../pages/ShelfPage';

function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-stone-900">
      <h1 className="text-2xl font-bold">ページが見つかりません</h1>
      <a
        className="rounded border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-100"
        href="#/"
      >
        酒棚へ戻る
      </a>
    </main>
  );
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ShelfPage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
}
