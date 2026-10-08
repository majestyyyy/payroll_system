/**
 * Currency and Centavo Precision Utilities
 *
 * To eliminate floating-point rounding errors in payroll calculations,
 * all financial values are stored and calculated as integer centavos.
 * Example: PHP 25,000.50 is represented as 2500050.
 */

/**
 * Converts Philippine Peso amount to integer centavos.
 */
export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/**
 * Converts integer centavos to Philippine Peso amount.
 */
export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

/**
 * Formats integer centavos as standard Philippine Peso currency string (e.g., "₱25,000.50").
 */
export function formatPHP(centavos: number): string {
  const pesos = centavosToPesos(centavos);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pesos);
}

/**
 * Multiplies an integer centavo amount by a rate/factor with standard half-up rounding.
 */
export function multiplyCentavos(centavos: number, factor: number): number {
  return Math.round(centavos * factor);
}

/**
 * Divides an integer centavo amount by a divisor with standard half-up rounding.
 */
export function divideCentavos(centavos: number, divisor: number): number {
  if (divisor === 0) {
    throw new Error('Division by zero in payroll calculation');
  }
  return Math.round(centavos / divisor);
}
