import type { HighlightRead } from '../types';

const CATEGORY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-l-amber-400', icon: '⚠️' },
  scenic:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-l-emerald-400', icon: '🏔️' },
  cost:    { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-400', icon: '💰' },
  tip:     { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-400', icon: '💡' },
  info:    { bg: 'bg-gray-50 dark:bg-slate-800', border: 'border-l-gray-300 dark:border-l-slate-600', icon: 'ℹ️' },
};

interface HighlightCardProps {
  highlight: HighlightRead;
}

export default function HighlightCard({ highlight }: HighlightCardProps) {
  const style = CATEGORY_STYLES[highlight.category] || CATEGORY_STYLES.info;

  return (
    <div className={`rounded-lg border-l-4 ${style.border} ${style.bg} px-3 py-2.5 my-2`}>
      <div className="flex items-start gap-2">
        <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
        <div className="min-w-0 flex-1">
          {highlight.title && (
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{highlight.title}</p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap break-words">
            {highlight.body}
          </p>
        </div>
      </div>
    </div>
  );
}
