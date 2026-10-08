/**
 * Philippine Labor Code Rate & Premium Computations
 */

import { divideCentavos, multiplyCentavos } from './currency';

/**
 * Standard yearly factor used in the Philippines to derive daily rate:
 * - Factor 313: Works 6 days a week (Mon-Sat), rest day on Sunday (52 rest days deducted)
 * - Factor 261: Works 5 days a week (Mon-Fri), rest day on Sat & Sun (104 rest days deducted)
 * - Factor 365: Works everyday including Sundays and holidays
 * - Factor 393.8: Special factor factoring paid rest days & holidays
 */
export type WorkingDaysFactor = 313 | 261 | 365 | 393.8;

/**
 * Derives daily rate in centavos from a monthly basic salary in centavos.
 * Formula: (Monthly Rate * 12) / Factor
 */
export function deriveDailyRate(
  monthlyRateCentavos: number,
  factor: WorkingDaysFactor = 261
): number {
  const annualSalaryCentavos = monthlyRateCentavos * 12;
  return Math.round(annualSalaryCentavos / factor);
}

/**
 * Derives hourly rate in centavos from a daily rate in centavos.
 * Standard Philippine workday: 8 hours.
 */
export function deriveHourlyRate(dailyRateCentavos: number, standardHoursPerDay = 8): number {
  return divideCentavos(dailyRateCentavos, standardHoursPerDay);
}

/**
 * Philippine Statutory Overtime & Premium Multipliers (DOLE Handbook):
 * - Regular Overtime: +25% of hourly rate (125%)
 * - Rest Day / Special Non-Working Day (First 8 hrs): 130%
 * - Rest Day Overtime (>8 hrs): 169% (130% * 130%)
 * - Regular Holiday (First 8 hrs worked): 200%
 * - Regular Holiday Overtime (>8 hrs): 260% (200% * 130%)
 * - Night Shift Differential (10 PM to 6 AM): +10% premium
 */
export const STATUTORY_MULTIPLIERS = {
  REGULAR_OVERTIME: 1.25,
  REST_DAY_FIRST_8: 1.3,
  REST_DAY_OVERTIME: 1.69,
  SPECIAL_DAY_FIRST_8: 1.3,
  SPECIAL_DAY_OVERTIME: 1.69,
  REGULAR_HOLIDAY_FIRST_8: 2.0,
  REGULAR_HOLIDAY_OVERTIME: 2.6,
  NIGHT_DIFF_PREMIUM: 0.1,
} as const;

/**
 * Calculates regular overtime pay in centavos.
 */
export function calculateRegularOvertimePay(
  hourlyRateCentavos: number,
  overtimeHours: number
): number {
  if (overtimeHours <= 0) return 0;
  const otHourlyRate = multiplyCentavos(hourlyRateCentavos, STATUTORY_MULTIPLIERS.REGULAR_OVERTIME);
  return Math.round(otHourlyRate * overtimeHours);
}

/**
 * Calculates night shift differential pay in centavos.
 */
export function calculateNightDifferentialPay(
  hourlyRateCentavos: number,
  nightDiffHours: number
): number {
  if (nightDiffHours <= 0) return 0;
  const ndHourlyBonus = multiplyCentavos(hourlyRateCentavos, STATUTORY_MULTIPLIERS.NIGHT_DIFF_PREMIUM);
  return Math.round(ndHourlyBonus * nightDiffHours);
}

/**
 * Calculates deduction for tardiness / undertime in centavos.
 */
export function calculateTardinessDeduction(
  hourlyRateCentavos: number,
  tardinessMinutes: number
): number {
  if (tardinessMinutes <= 0) return 0;
  const minuteRateCentavos = hourlyRateCentavos / 60;
  return Math.round(minuteRateCentavos * tardinessMinutes);
}
