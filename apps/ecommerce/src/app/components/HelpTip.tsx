import { HelpCircle } from 'lucide-react';

interface HelpTipProps {
  /** Texto de ayuda que se muestra en el popover */
  text: string;
  /** Lado del popover respecto al ícono */
  side?: 'top' | 'right';
}

/**
 * Ícono de ayuda "?" que muestra un popover al pasar el mouse o al enfocar con teclado.
 * CSS-only (group-hover + focus-within), accesible.
 */
export function HelpTip({ text, side = 'top' }: HelpTipProps) {
  const position =
    side === 'right'
      ? 'left-full top-1/2 -translate-y-1/2 ml-2'
      : 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span className="relative inline-flex group align-middle">
      <button
        type="button"
        aria-label={text}
        className="text-[#9AA0A6] hover:text-[#D97706] focus:text-[#D97706] focus:outline-none transition-colors"
      >
        <HelpCircle size={15} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${position} z-20 w-52 rounded-lg bg-[#2B2D31] px-3 py-2 text-xs leading-snug text-white shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity`}
      >
        {text}
      </span>
    </span>
  );
}
