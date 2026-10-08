/**
 * PhilHealth Statutory Premium Module
 * Under Republic Act No. 11223 (Universal Health Care Act) and PhilHealth Circulars.
 *
 * Current standard premium rate: 5.0%
 * Split equally: 2.5% Employee, 2.5% Employer
 * Monthly Income Floor: ₱10,000.00 (Minimum monthly premium: ₱500.00)
 * Monthly Income Ceiling: ₱100,000.00 (Maximum monthly premium: ₱5,000.00)
 */

import { pesosToCentavos } from '../currency';

export interface PhilHealthResult {
  basisSalaryCentavos: number;
  premiumRate: number;
  totalPremiumCentavos: number;
  employeeShareCentavos: number;
  employerShareCentavos: number;
}

export function calculatePhilHealthContribution(
  monthlySalaryCentavos: number,
  rate = 0.05,
  floorPesos = 10000,
  ceilingPesos = 100000
): PhilHealthResult {
  const salaryPesos = monthlySalaryCentavos / 100;

  // Apply income floor and ceiling
  const cappedSalaryPesos = Math.min(Math.max(salaryPesos, floorPesos), ceilingPesos);
  const totalPremiumPesos = cappedSalaryPesos * rate;

  // Split equally between employee and employer (50% / 50%)
  const halfSharePesos = totalPremiumPesos / 2;
  const employeeShareCentavos = pesosToCentavos(halfSharePesos);
  const employerShareCentavos = pesosToCentavos(halfSharePesos);
  const totalPremiumCentavos = employeeShareCentavos + employerShareCentavos;

  return {
    basisSalaryCentavos: pesosToCentavos(cappedSalaryPesos),
    premiumRate: rate,
    totalPremiumCentavos,
    employeeShareCentavos,
    employerShareCentavos,
  };
}
