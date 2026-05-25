import { Button } from '../../../components/ui/Button';
import type { AiRegistrationStep } from './aiRegistrationFlow';
import { AnalyzePhaseStepper } from './AnalyzePhaseStepper';
import { KomaokuriRabbit } from './KomaokuriRabbit';

type AnalyzeLoadingScreenProps = {
  step: AiRegistrationStep;
  statusText: string;
  imageUrl?: string | null;
  onManualMode: () => void;
};

export function AnalyzeLoadingScreen({
  step,
  statusText,
  imageUrl,
  onManualMode,
}: AnalyzeLoadingScreenProps) {
  return (
    <section
      aria-live="polite"
      className="grid gap-5 rounded-[28px] border border-night-gold/35 bg-[radial-gradient(circle_at_50%_0%,rgba(255,214,128,0.16),rgba(8,10,18,0.92)_52%)] p-5 shadow-bar"
    >
      <div className="grid items-center gap-5 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-3 text-center lg:text-left">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-night-glow">
            2 解析中
          </div>
          <h2 className="text-2xl font-extrabold text-cream-50">
            解析中…
          </h2>
          <div className="mx-auto w-fit rounded-2xl border border-night-gold/35 bg-black/45 px-4 py-2 text-sm font-bold text-cream-50 shadow-chip lg:mx-0">
            {statusText}
          </div>
          <p className="text-sm text-cream-100/65">
            AIが候補フォームを作るまで少し待ってくれ。保存はまだ行わないぞ。
          </p>
        </div>

        <div className="relative mx-auto grid justify-items-center">
          <KomaokuriRabbit active className="h-44 w-44 sm:h-52 sm:w-52" />
          {imageUrl ? (
            <div className="absolute -bottom-2 right-0 hidden h-16 w-16 overflow-hidden rounded-2xl border border-night-gold/35 bg-black/45 p-1 shadow-chip sm:block">
              <img
                src={imageUrl}
                alt="解析対象画像"
                className="h-full w-full rounded-xl object-cover"
                draggable={false}
              />
            </div>
          ) : null}
        </div>
      </div>

      <AnalyzePhaseStepper currentStep={step} />

      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="ghost" onClick={onManualMode}>
          手入力に切り替える
        </Button>
      </div>
    </section>
  );
}
