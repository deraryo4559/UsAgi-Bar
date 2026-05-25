import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import failedRabbitUrl from '../../../img/faild.png';

type AnalyzeFailedStateProps = {
  message: string;
  onRetry: () => void;
  onChooseImage: () => void;
  onManualMode: () => void;
};

function friendlyErrorMessage(message: string) {
  if (
    message.includes('429') ||
    message.toLowerCase().includes('quota') ||
    message.toLowerCase().includes('rate')
  ) {
    return 'Gemini APIの利用上限に達しているみたいだ。時間を置くか、使用量を確認してくれ。';
  }

  if (message.includes('Edge Function')) {
    return 'AI解析サーバーとの通信でつまずいたみたいだ。deployやログイン状態を確認してくれ。';
  }

  return '画像を変えるか、手入力で登録してくれ。';
}

export function AnalyzeFailedState({
  message,
  onRetry,
  onChooseImage,
  onManualMode,
}: AnalyzeFailedStateProps) {
  return (
    <section className="grid gap-5 rounded-[28px] border border-rose-400/45 bg-rose-950/35 p-5 text-rose-50 shadow-bar lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="mx-auto grid justify-items-center">
        <img
          src={failedRabbitUrl}
          alt="判定に失敗したうさぎ店主"
          className="h-44 w-44 object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.6)] sm:h-52 sm:w-52"
          draggable={false}
        />
      </div>

      <div className="grid gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-200/80">
            解析失敗
          </div>
          <h2 className="mt-1 text-2xl font-extrabold text-rose-50">
            うまく判定できなかったぞ
          </h2>
          <p className="mt-2 text-sm text-rose-100/85">
            {friendlyErrorMessage(message)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="accent" onClick={onRetry}>
            もう一度解析する
          </Button>
          <Button type="button" variant="secondary" onClick={onChooseImage}>
            別の画像を選ぶ
          </Button>
          <Button type="button" variant="ghost" onClick={onManualMode}>
            手入力に切り替える
          </Button>
        </div>

        <details className="rounded-2xl border border-rose-300/25 bg-black/25 p-3 text-xs text-rose-100/80">
          <summary className="cursor-pointer font-bold">
            エラー詳細を見る
          </summary>
          <Alert tone="error" className="mt-3 whitespace-pre-wrap">
            {message}
          </Alert>
        </details>
      </div>
    </section>
  );
}
