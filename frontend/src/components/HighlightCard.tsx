import type { HighlightRead } from '../types';

const CATEGORY_CONFIG: Record<string, { bg: string; border: string; icon: string }> = {
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-l-amber-500', icon: '⚠️' },
  scenic: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500', icon: '🏔️' },
  cost: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500', icon: '💰' },
  tip: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-500', icon: '💡' },
  info: { bg: 'bg-gray-50 dark:bg-gray-700/50', border: 'border-l-gray-400', icon: 'ℹ️' },
};

interface HighlightCardProps {
  highlight: HighlightRead;
}

export default function HighlightCard({ highlight }: HighlightCardProps) {
  const config = CATEGORY_CONFIG[highlight.category] || CATEGORY_CONFIG.info;

  return (
    <div className={`rounded-lg border-l-4 ${config.border} ${config.bg} p-3 my-2`}>
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{config.icon}</span>
        <div className="min-w-0 flex-1">
          {highlight.title && (
            <span className="font-semibold text-sm block">{highlight.title}</span>
          )}
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{highlight.body}</p>
        </div>
      </div>

      {/* Source info */}
      {highlight.leg_id && (
        <span className="text-xs text-gray-400 mt-1 block">Leg #{highlight.leg_id}</span>
      )}
      {highlight.stop_id && (
        <span className="text-xs text-gray-400 mt-1 block">Stop #{highlight.stop_id}</span>
      )}
    </div>
  );
}
