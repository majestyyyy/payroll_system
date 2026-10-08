import { describe, it, expect } from 'vitest';
import {
  pesosToCentavos,
  centavosToPesos,
  formatPHP,
  multiplyCentavos,
  divideCentavos,
} from '../../src/engine/currency';
import {
  deriveDailyRate,
  deriveHourlyRate,
  calculateRegularOvertimePay,
  calculateNightDifferentialPay,
  calculateTardinessDeduction,
} from '../../src/engine/rates';

describe('Currency & Centavo Arithmetic', () => {
  it('converts PHP to centavos with exact integer precision', () => {
    expect(pesosToCentavos(25000.5)).toBe(2500050);
    expect(pesosToCentavos(0.01)).toBe(1);
    expect(pesosToCentavos(100.99)).toBe(10099);
  });

  it('converts centavos back to PHP float', () => {
    expect(centavosToPesos(2500050)).toBe(25000.5);
    expect(centavosToPesos(10099)).toBe(100.99);
  });

  it('formats centavos into Philippine Peso format', () => {
    const formatted = formatPHP(2500050);
    expect(formatted).toContain('25,000.50');
  });

  it('multiplies centavos and rounds half-up', () => {
    expect(multiplyCentavos(10000, 1.25)).toBe(12500);
    expect(multiplyCentavos(1001, 1.5)).toBe(1502);
  });

  it('throws error when dividing centavos by zero', () => {
    expect(() => divideCentavos(1000, 0)).toThrow('Division by zero in payroll calculation');
  });
});

describe('Philippine Labor Code Rates & Premiums', () => {
  // Scenario: ₱26,100 Monthly Salary, Factor 261 (5-day work week)
  const monthlySalaryCentavos = 2610000; // ₱26,100.00
  const dailyRateCentavos = deriveDailyRate(monthlySalaryCentavos, 261);
  const hourlyRateCentavos = deriveHourlyRate(dailyRateCentavos, 8);

  it('derives correct daily rate using Factor 261', () => {
    // (26,100 * 12) / 261 = 313,200 / 261 = 1,200/day
    expect(dailyRateCentavos).toBe(120000); // ₱1,200.00
  });

  it('derives correct hourly rate for standard 8-hour day', () => {
    // 1,200 / 8 = 150/hr
    expect(hourlyRateCentavos).toBe(15000); // ₱150.00
  });

  it('calculates regular overtime (125% of hourly rate)', () => {
    // 150 * 1.25 = 187.50/hr -> 2 hrs = 375.00
    const otPay = calculateRegularOvertimePay(hourlyRateCentavos, 2);
    expect(otPay).toBe(37500); // ₱375.00
  });

  it('calculates night differential (+10% premium)', () => {
    // 150 * 0.10 = 15.00/hr -> 4 hrs = 60.00
    const ndPay = calculateNightDifferentialPay(hourlyRateCentavos, 4);
    expect(ndPay).toBe(6000); // ₱60.00
  });

  it('calculates tardiness deduction accurately by minute', () => {
    // 150/hr = 2.50/minute -> 15 minutes late = 37.50
    const tardinessDeduction = calculateTardinessDeduction(hourlyRateCentavos, 15);
    expect(tardinessDeduction).toBe(3750); // ₱37.50
  });
});
