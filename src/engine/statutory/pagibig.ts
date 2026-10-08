/**
 * Pag-IBIG (HDMF) Statutory Contribution Module
 * Under Pag-IBIG Fund Circular No. 460.
 *
 * Maximum Monthly Compensation (Fund Salary) cap: ₱10,000.00
 * Employee Rate:
 * - 1.0% if salary <= ₱1,500
 * - 2.0% if salary > ₱1,500
 * Employer Rate: 2.0%
 * Standard Monthly Mandatory Maximum:
 * - Employee Share: ₱200.00
 * - Employer Share: ₱200.00
 * Plus optional voluntary additional employee savings (MP2 / voluntary HDMF).
 */

import { pesosToCentavos } from '../currency';

export interface PagIbigResult {
  basisSalaryCentavos: number;
  mandatoryEmployeeCentavos: number;
  mandatoryEmployerCentavos: number;
  voluntaryEmployeeCentavos: number;
  totalEmployeeCentavos: number;
  totalEmployerCentavos: number;
  totalContributionCentavos: number;
}

export function calculatePagIbigContribution(
  monthlySalaryCentavos: number,
  voluntaryAdditionalSavingsPesos = 0,
  maxFundSalaryPesos = 10000
): PagIbigResult {
  const salaryPesos = monthlySalaryCentavos / 100;
  const basisPesos = Math.min(salaryPesos, maxFundSalaryPesos);

  const eeRate = basisPesos <= 1500 ? 0.01 : 0.02;
  const erRate = 0.02;

  const eeMandatoryPesos = basisPesos * eeRate;
  const erMandatoryPesos = basisPesos * erRate;

  const mandatoryEmployeeCentavos = pesosToCentavos(eeMandatoryPesos);
  const mandatoryEmployerCentavos = pesosToCentavos(erMandatoryPesos);
  const voluntaryEmployeeCentavos = pesosToCentavos(Math.max(0, voluntaryAdditionalSavingsPesos));

  const totalEmployeeCentavos = mandatoryEmployeeCentavos + voluntaryEmployeeCentavos;
  const totalEmployerCentavos = mandatoryEmployerCentavos;

  return {
    basisSalaryCentavos: pesosToCentavos(basisPesos),
    mandatoryEmployeeCentavos,
    mandatoryEmployerCentavos,
    voluntaryEmployeeCentavos,
    totalEmployeeCentavos,
    totalEmployerCentavos,
    totalContributionCentavos: totalEmployeeCentavos + totalEmployerCentavos,
  };
}
