import { Card } from '../../components/ui/Card';
import { MascotBubble } from '../../components/ui/MascotBubble';

const STEPS = [
  { n: 1, label: '画像アップロード' },
  { n: 2, label: 'AI候補作成' },
  { n: 3, label: '候補カード' },
  { n: 4, label: 'フォームに反映' },
  { n: 5, label: '確認・修正' },
  { n: 6, label: '登録 / 更新' },
  { n: 7, label: '在庫一覧で確認' },
];

export function AdminStepGuide() {
  return (
    <Card tone="cream" className="overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <MascotBubble size="md">
          画像を選んで「AI候補作成」だ。候補は確認してから保存してくれ。
        </MascotBubble>
        <ol className="grid flex-1 grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex items-center gap-2 rounded-xl border border-night-gold/25 bg-black/30 px-2 py-2 shadow-chip"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-night-gold text-[11px] font-bold text-night-deep">
                {step.n}
              </span>
              <span className="font-semibold text-cream-50">{step.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
