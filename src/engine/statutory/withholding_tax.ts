/**
 * BIR Withholding Tax on Compensation Module
 * Under Republic Act No. 10963 (TRAIN Law) - Revised Withholding Tax Tables (2023+).
 *
 * Taxable compensation = Gross taxable income less statutory mandatory
 * employee contributions (SSS + PhilHealth + Pag-IBIG).
 */

import { pesosToCentavos } from '../currency';

export type TaxBracketPeriod = 'semi_monthly' | 'monthly' | 'daily';

export interface TaxBracket {
  floorPesos: number;
  ceilingPesos: number | null;
  baseTaxPesos: number;
  percentageRate: number;
}

/**
 * Semi-Monthly Revised Withholding Tax Table (TRAIN Law)
 */
export const SEMI_MONTHLY_TAX_TABLE: TaxBracket[] = [
  { floorPesos: 0, ceilingPesos: 10417, baseTaxPesos: 0, percentageRate: 0.0 },
  { floorPesos: 10417, ceilingPesos: 16666, baseTaxPesos: 0, percentageRate: 0.15 },
  { floorPesos: 16667, ceilingPesos: 33332, baseTaxPesos: 937.5, percentageRate: 0.2 },
  { floorPesos: 33333, ceilingPesos: 83332, baseTaxPesos: 4270.7, percentageRate: 0.25 },
  { floorPesos: 83333, ceilingPesos: 333332, baseTaxPesos: 16770.7, percentageRate: 0.3 },
  { floorPesos: 333333, ceilingPesos: null, baseTaxPesos: 91770.7, percentageRate: 0.35 },
];

/**
 * Monthly Revised Withholding Tax Table (TRAIN Law)
 */
export const MONTHLY_TAX_TABLE: TaxBracket[] = [
  { floorPesos: 0, ceilingPesos: 20833, baseTaxPesos: 0, percentageRate: 0.0 },
  { floorPesos: 20833, ceilingPesos: 33332, baseTaxPesos: 0, percentageRate: 0.15 },
  { floorPesos: 33333, ceilingPesos: 66666, baseTaxPesos: 1875.0, percentageRate: 0.2 },
  { floorPesos: 66667, ceilingPesos: 166666, baseTaxPesos: 8541.8, percentageRate: 0.25 },
  { floorPesos: 166667, ceilingPesos: 666666, baseTaxPesos: 33541.8, percentageRate: 0.3 },
  { floorPesos: 666667, ceilingPesos: null, baseTaxPesos: 183541.8, percentageRate: 0.35 },
];

export interface WithholdingTaxResult {
  taxableIncomeCentavos: number;
  withholdingTaxCentavos: number;
  appliedBracket: TaxBracket;
}

/**
 * Calculates BIR withholding tax on taxable compensation for the given period.
 */
export function calculateWithholdingTax(
  taxableIncomeCentavos: number,
  period: TaxBracketPeriod = 'semi_monthly'
): WithholdingTaxResult {
  const taxablePesos = taxableIncomeCentavos / 100;
  const table = period === 'monthly' ? MONTHLY_TAX_TABLE : SEMI_MONTHLY_TAX_TABLE;

  let applied = table[0];
  for (const bracket of table) {
    if (taxablePesos >= bracket.floorPesos) {
      if (bracket.ceilingPesos === null || taxablePesos <= bracket.ceilingPesos) {
        applied = bracket;
        break;
      }
      applied = bracket;
    }
  }

  if (taxablePesos <= applied.floorPesos || applied.percentageRate === 0) {
    return {
      taxableIncomeCentavos,
      withholdingTaxCentavos: 0,
      appliedBracket: applied,
    };
  }

  const excessPesos = taxablePesos - applied.floorPesos;
  const computedTaxPesos = applied.baseTaxPesos + excessPesos * applied.percentageRate;
  const withholdingTaxCentavos = pesosToCentavos(Math.max(0, computedTaxPesos));

  return {
    taxableIncomeCentavos,
    withholdingTaxCentavos,
    appliedBracket: applied,
  };
}
