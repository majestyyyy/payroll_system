/**
 * SSS (Social Security System) Statutory Contribution Module
 * Under Republic Act No. 11199 (Social Security Act of 2018).
 *
 * Total regular rate = 14% (Employee 4.5%, Employer 9.5%)
 * Portions above ₱20,000 MSC up to max MSC (₱30,000/₱35,000) go into
 * the Mandatory Provident Fund (WISP / Worker's Investment and Savings Program).
 * EC (Employees' Compensation) is 100% Employer-paid:
 * - ₱10.00 for MSC <= ₱14,500
 * - ₱30.00 for MSC > ₱14,500
 */

import { pesosToCentavos } from '../currency';

export interface SssContributionResult {
  monthlySalaryCreditCentavos: number;
  regularSsEeCentavos: number;
  regularSsErCentavos: number;
  wispEeCentavos: number;
  wispErCentavos: number;
  ecErCentavos: number;
  totalEeCentavos: number;
  totalErCentavos: number;
  totalContributionCentavos: number;
}

/**
 * Calculates SSS Monthly Salary Credit (MSC) in centavos.
 * Brackets step in increments of ₱500, starting from minimum ₱4,000 up to maximum ₱35,000.
 */
export function getMonthlySalaryCreditCentavos(
  monthlySalaryCentavos: number,
  maxMscPesos = 35000
): number {
  const minMscPesos = 4000;
  const salaryPesos = monthlySalaryCentavos / 100;

  if (salaryPesos < 4250) {
    return pesosToCentavos(minMscPesos);
  }

  if (salaryPesos >= maxMscPesos - 250) {
    return pesosToCentavos(maxMscPesos);
  }

  // Bracket logic: midpoint increments of 500
  // e.g., 4,250 to 4,749.99 has MSC of 4,500
  const step = Math.floor((salaryPesos - 4250) / 500) + 1;
  const mscPesos = 4000 + step * 500;
  return pesosToCentavos(Math.min(mscPesos, maxMscPesos));
}

/**
 * Calculates complete SSS contribution breakdown for a given monthly salary in centavos.
 */
export function calculateSssContribution(
  monthlySalaryCentavos: number,
  maxMscPesos = 35000
): SssContributionResult {
  const mscCentavos = getMonthlySalaryCreditCentavos(monthlySalaryCentavos, maxMscPesos);
  const mscPesos = mscCentavos / 100;

  // Regular SS caps at ₱20,000 MSC
  const regularMscPesos = Math.min(mscPesos, 20000);
  const regularSsEePesos = regularMscPesos * 0.045;
  const regularSsErPesos = regularMscPesos * 0.095;

  // WISP (Mandatory Provident Fund) covers MSC exceeding ₱20,000
  const wispMscPesos = Math.max(0, mscPesos - 20000);
  const wispEePesos = wispMscPesos * 0.045;
  const wispErPesos = wispMscPesos * 0.095;

  // EC (Employees' Compensation) - 100% Employer
  const ecErPesos = mscPesos > 14500 ? 30 : 10;

  const regularSsEeCentavos = pesosToCentavos(regularSsEePesos);
  const regularSsErCentavos = pesosToCentavos(regularSsErPesos);
  const wispEeCentavos = pesosToCentavos(wispEePesos);
  const wispErCentavos = pesosToCentavos(wispErPesos);
  const ecErCentavos = pesosToCentavos(ecErPesos);

  const totalEeCentavos = regularSsEeCentavos + wispEeCentavos;
  const totalErCentavos = regularSsErCentavos + wispErCentavos + ecErCentavos;

  return {
    monthlySalaryCreditCentavos: mscCentavos,
    regularSsEeCentavos,
    regularSsErCentavos,
    wispEeCentavos,
    wispErCentavos,
    ecErCentavos,
    totalEeCentavos,
    totalErCentavos,
    totalContributionCentavos: totalEeCentavos + totalErCentavos,
  };
}
