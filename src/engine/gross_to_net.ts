/**
 * Gross-to-Net Calculation Coordinator
 *
 * Orchestrates complete payroll computation for an employee for a specific pay period.
 * All math operations are performed with exact integer centavo precision.
 */

import { Employee, AttendanceInput, PayCycleType } from '../types/payroll';
import {
  deriveDailyRate,
  deriveHourlyRate,
  calculateRegularOvertimePay,
  calculateNightDifferentialPay,
  calculateTardinessDeduction,
} from './rates';
import { calculateSssContribution, SssContributionResult } from './statutory/sss';
import { calculatePhilHealthContribution, PhilHealthResult } from './statutory/philhealth';
import { calculatePagIbigContribution, PagIbigResult } from './statutory/pagibig';
import { calculateWithholdingTax, WithholdingTaxResult } from './statutory/withholding_tax';

export type StatutoryDeductionTiming = 'split_equally' | 'second_cutoff_only' | 'full';

export interface GrossToNetOptions {
  cycleType?: PayCycleType;
  isSecondCutoff?: boolean;
  statutoryTiming?: StatutoryDeductionTiming;
  nonTaxableAllowancesCentavos?: number;
  taxableAllowancesCentavos?: number;
  otherDeductionsCentavos?: number;
  voluntaryPagIbigPesos?: number;
}

export interface GrossToNetResult {
  employeeId: string;
  cycleType: PayCycleType;

  // Earnings
  basicPayCentavos: number;
  overtimePayCentavos: number;
  nightDiffPayCentavos: number;
  taxableAllowancesCentavos: number;
  nonTaxableAllowancesCentavos: number;
  grossPayCentavos: number;

  // Deductions
  tardinessDeductionCentavos: number;
  absencesDeductionCentavos: number;
  sssEeCentavos: number;
  philhealthEeCentavos: number;
  pagibigEeCentavos: number;
  totalStatutoryEeCentavos: number;
  taxableIncomeCentavos: number;
  withholdingTaxCentavos: number;
  otherDeductionsCentavos: number;
  totalDeductionsCentavos: number;

  // Net Take-Home Pay
  netPayCentavos: number;

  // Employer Contributions
  sssErCentavos: number;
  philhealthErCentavos: number;
  pagibigErCentavos: number;
  totalEmployerContributionsCentavos: number;
  totalCostToEmployerCentavos: number;

  // Raw Statutory Data for Auditing / Line-items
  sssDetails: SssContributionResult;
  philhealthDetails: PhilHealthResult;
  pagibigDetails: PagIbigResult;
  taxDetails: WithholdingTaxResult;
}

export function computeGrossToNet(
  employee: Employee,
  attendance: AttendanceInput,
  options: GrossToNetOptions = {}
): GrossToNetResult {
  const cycleType = options.cycleType ?? 'semi_monthly';
  const isSecondCutoff = options.isSecondCutoff ?? true;
  const timing = options.statutoryTiming ?? 'split_equally';
  const nonTaxableAllowancesCentavos = options.nonTaxableAllowancesCentavos ?? 0;
  const taxableAllowancesCentavos = options.taxableAllowancesCentavos ?? 0;
  const otherDeductionsCentavos = options.otherDeductionsCentavos ?? 0;
  const voluntaryPagIbigPesos = options.voluntaryPagIbigPesos ?? 0;

  // 1. Base Compensation per Cycle
  const baseMonthlyCentavos = employee.basicSalaryMonthlyCentavos;
  const dailyRateCentavos = deriveDailyRate(baseMonthlyCentavos, 261);
  const hourlyRateCentavos = deriveHourlyRate(dailyRateCentavos, 8);

  const basicPayCentavos =
    cycleType === 'semi_monthly' ? Math.round(baseMonthlyCentavos / 2) : baseMonthlyCentavos;

  // 2. Attendance & Overtime Earnings / Deductions
  const overtimePayCentavos = calculateRegularOvertimePay(
    hourlyRateCentavos,
    attendance.regularOvertimeHours
  );
  const nightDiffPayCentavos = calculateNightDifferentialPay(
    hourlyRateCentavos,
    attendance.nightDifferentialHours
  );
  const tardinessDeductionCentavos = calculateTardinessDeduction(
    hourlyRateCentavos,
    attendance.tardinessMinutes + attendance.undertimeMinutes
  );
  const absencesDeductionCentavos = attendance.daysAbsent * dailyRateCentavos;

  // 3. Gross Pay
  const grossPayCentavos =
    basicPayCentavos +
    overtimePayCentavos +
    nightDiffPayCentavos +
    taxableAllowancesCentavos +
    nonTaxableAllowancesCentavos;

  // 4. Statutory Calculations (Monthly Base)
  const sss = calculateSssContribution(baseMonthlyCentavos);
  const ph = calculatePhilHealthContribution(baseMonthlyCentavos);
  const hdmf = calculatePagIbigContribution(baseMonthlyCentavos, voluntaryPagIbigPesos);

  // Apply timing allocation (split across 2 cutoffs, only on 2nd cutoff, or full)
  let sssEe = sss.totalEeCentavos;
  let phEe = ph.employeeShareCentavos;
  let hdmfEe = hdmf.totalEmployeeCentavos;
  let sssEr = sss.totalErCentavos;
  let phEr = ph.employerShareCentavos;
  let hdmfEr = hdmf.totalEmployerCentavos;

  if (cycleType === 'semi_monthly') {
    if (timing === 'split_equally') {
      sssEe = Math.round(sssEe / 2);
      phEe = Math.round(phEe / 2);
      hdmfEe = Math.round(hdmfEe / 2);
      sssEr = Math.round(sssEr / 2);
      phEr = Math.round(phEr / 2);
      hdmfEr = Math.round(hdmfEr / 2);
    } else if (timing === 'second_cutoff_only') {
      if (!isSecondCutoff) {
        sssEe = 0;
        phEe = 0;
        hdmfEe = 0;
        sssEr = 0;
        phEr = 0;
        hdmfEr = 0;
      }
    }
  }

  const totalStatutoryEeCentavos = sssEe + phEe + hdmfEe;
  const totalEmployerContributionsCentavos = sssEr + phEr + hdmfEr;

  // 5. Taxable Income & BIR Withholding Tax (TRAIN Law)
  // Taxable Income = Gross Pay - Non-Taxable Allowances - Pre-Tax Statutory Deductions - Absences/Tardiness
  const grossTaxableCentavos =
    grossPayCentavos -
    nonTaxableAllowancesCentavos -
    tardinessDeductionCentavos -
    absencesDeductionCentavos;

  const taxableIncomeCentavos = Math.max(0, grossTaxableCentavos - totalStatutoryEeCentavos);

  const taxDetails = calculateWithholdingTax(
    taxableIncomeCentavos,
    cycleType === 'monthly' ? 'monthly' : 'semi_monthly'
  );
  const withholdingTaxCentavos = taxDetails.withholdingTaxCentavos;

  // 6. Total Deductions & Net Take-Home Pay
  const totalDeductionsCentavos =
    tardinessDeductionCentavos +
    absencesDeductionCentavos +
    totalStatutoryEeCentavos +
    withholdingTaxCentavos +
    otherDeductionsCentavos;

  const netPayCentavos = Math.max(0, grossPayCentavos - totalDeductionsCentavos);
  const totalCostToEmployerCentavos = grossPayCentavos + totalEmployerContributionsCentavos;

  return {
    employeeId: employee.id,
    cycleType,
    basicPayCentavos,
    overtimePayCentavos,
    nightDiffPayCentavos,
    taxableAllowancesCentavos,
    nonTaxableAllowancesCentavos,
    grossPayCentavos,
    tardinessDeductionCentavos,
    absencesDeductionCentavos,
    sssEeCentavos: sssEe,
    philhealthEeCentavos: phEe,
    pagibigEeCentavos: hdmfEe,
    totalStatutoryEeCentavos,
    taxableIncomeCentavos,
    withholdingTaxCentavos,
    otherDeductionsCentavos,
    totalDeductionsCentavos,
    netPayCentavos,
    sssErCentavos: sssEr,
    philhealthErCentavos: phEr,
    pagibigErCentavos: hdmfEr,
    totalEmployerContributionsCentavos,
    totalCostToEmployerCentavos,
    sssDetails: sss,
    philhealthDetails: ph,
    pagibigDetails: hdmf,
    taxDetails,
  };
}
