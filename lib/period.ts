export type Period = 'month' | 'fy';

export interface PeriodRange {
  /** Inclusive start of the period, as a real UTC instant. */
  start: Date;
  /** Exclusive end of the period (start of the next period), as a real UTC instant. */
  end: Date;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// India has no DST, so a fixed +5:30 offset is safe for all IST boundary math.
function toIstShifted(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

function fromIstShifted(istShifted: Date): Date {
  return new Date(istShifted.getTime() - IST_OFFSET_MS);
}

export interface IstDateParts {
  year: number;
  month: number; // 0-indexed
  day: number;
}

export function getIstDateParts(date: Date): IstDateParts {
  const shifted = toIstShifted(date);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/**
 * Computes the [start, end) boundaries for a dashboard period, in IST.
 * financialYearStartMonth is 1-indexed (April = 4), matching Settings.financialYearStart
 * and the FY math already used in lib/invoice-no.ts / lib/purchase-no.ts.
 */
export function getPeriodRange(
  period: Period,
  referenceDate: Date = new Date(),
  financialYearStartMonth: number = 4
): PeriodRange {
  const istNow = toIstShifted(referenceDate);
  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();

  if (period === 'month') {
    return {
      start: fromIstShifted(new Date(Date.UTC(istYear, istMonth, 1))),
      end: fromIstShifted(new Date(Date.UTC(istYear, istMonth + 1, 1))),
    };
  }

  const fyStartMonthIndex = financialYearStartMonth - 1;
  const fyStartYear = istMonth >= fyStartMonthIndex ? istYear : istYear - 1;

  return {
    start: fromIstShifted(new Date(Date.UTC(fyStartYear, fyStartMonthIndex, 1))),
    end: fromIstShifted(new Date(Date.UTC(fyStartYear + 1, fyStartMonthIndex, 1))),
  };
}

/** Formats the current financial year as e.g. "FY 2026-27", per getPeriodRange's FY math. */
export function getFinancialYearLabel(
  date: Date = new Date(),
  financialYearStartMonth: number = 4
): string {
  const { start } = getPeriodRange('fy', date, financialYearStartMonth);
  const startYear = getIstDateParts(start).year;
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
}
