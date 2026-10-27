/** The seat's position as a small badge — the same chip on the felt, in the action strip and the analysis. */
export function PositionBadge({
  position, isHero, folded = false, className = '',
}: {
  position: string | undefined;
  isHero: boolean;
  /** Dims the text, as the felt does for a seat that has folded. The BTN badge keeps its colours. */
  folded?: boolean;
  className?: string;
}) {
  // The button is picked out on its own, the way a real dealer button is.
  const tone = position === 'BTN'
    ? 'border-white bg-white text-black'
    : `bg-slate-700 ${folded ? 'border-slate-800 text-slate-500' : `border-slate-600 ${isHero ? 'text-slate-100' : 'text-slate-300'}`}`;
  return (
    <span className={`w-9 shrink-0 text-center t-chip border rounded-sm px-1 py-0.5 ${tone} ${className}`}>
      {position}
    </span>
  );
}
