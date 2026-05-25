import { Card } from '../../components/ui/Card';
import { MascotBubble } from '../../components/ui/MascotBubble';

const STEPS = [
  { n: 1, label: '画像を選ぶ' },
  { n: 2, label: '候補を確認' },
  { n: 3, label: '登録する' },
];

export function AdminStepGuide() {
  return (
    <Card tone="cream" className="overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <MascotBubble size="md">
          画像を選べば候補作成まで進むぞ。最後だけ、ちゃんと確認して登録してくれ。
        </MascotBubble>
        <ol className="grid flex-1 grid-cols-1 gap-2 text-xs sm:grid-cols-3">
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
