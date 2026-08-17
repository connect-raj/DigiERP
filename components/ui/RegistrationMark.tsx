import { cn } from '@/lib/utils';

const SIZES = { sm: 14, md: 20, lg: 32 } as const;

interface RegistrationMarkProps {
  size?: keyof typeof SIZES;
  spinning?: boolean;
  className?: string;
}

/**
 * The DigiERP brand mark: three overlapping CMYK ink dots (registration mark).
 * Reused app-wide as the brand/loading motif. Set `spinning` for loading states.
 */
export function RegistrationMark({
  size = 'md',
  spinning = false,
  className,
}: RegistrationMarkProps) {
  const dot = SIZES[size];
  const overlap = dot * 0.45;
  const width = dot * 3 - overlap * 2;

  return (
    <span
      data-slot="registration-mark"
      role="img"
      aria-label="DigiERP"
      className={cn('relative inline-block', spinning && 'animate-spin', className)}
      style={{ width, height: dot }}
    >
      <span
        className="bg-accent-cyan absolute top-0 left-0 rounded-full mix-blend-screen"
        style={{ width: dot, height: dot }}
      />
      <span
        className="bg-accent-magenta absolute top-0 rounded-full mix-blend-screen"
        style={{ width: dot, height: dot, left: dot - overlap }}
      />
      <span
        className="bg-accent-yellow absolute top-0 rounded-full mix-blend-screen"
        style={{ width: dot, height: dot, left: (dot - overlap) * 2 }}
      />
    </span>
  );
}
