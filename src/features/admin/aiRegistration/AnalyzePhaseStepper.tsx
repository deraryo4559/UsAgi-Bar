import type { AiRegistrationStep } from './aiRegistrationFlow';
import { analyzePhases, getAnalyzePhaseStatus } from './analyzePhaseState';

type AnalyzePhaseStepperProps = {
  currentStep: AiRegistrationStep;
};

export function AnalyzePhaseStepper({
  currentStep,
}: AnalyzePhaseStepperProps) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {analyzePhases.map((phase, index) => {
        const status = getAnalyzePhaseStatus(index, currentStep);
        const isActive = status === 'active';
        const isDone = status === 'done';

        return (
          <li
            key={phase.step}
            className={`rounded-2xl border px-3 py-3 text-center text-xs shadow-chip transition ${
              isActive
                ? 'border-night-neon bg-night-neon/20 text-pink-100 shadow-neon'
                : isDone
                  ? 'border-night-mint/50 bg-night-mint/15 text-night-mint'
                  : 'border-night-gold/25 bg-black/25 text-cream-200/50'
            }`}
          >
            <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full border border-current font-extrabold">
              {isDone ? '✓' : index + 1}
            </div>
            <div className="font-bold">{phase.label}</div>
            <div className="mt-1 leading-snug opacity-80">{phase.message}</div>
          </li>
        );
      })}
    </ol>
  );
}
