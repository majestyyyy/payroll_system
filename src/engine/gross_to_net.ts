/**
 * Gross-to-Net Calculation Coordinator
 *
 * Orchestrates complete payroll computation for an employee for a specific pay period.
 * All math operations are performed with exact integer centavo precision.
 */

import { Employee, AttendanceInput, PayCycleType } from '../types/payroll';
import { CompanyPayrollPolicy } from '../types/policy';
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

export interface CustomLineItem {
  componentId?: string | undefined;
  code: string;
  name: string;
  category: 'EARNING' | 'DEDUCTION';
  treatment:
    | 'TAXABLE'
    | 'NON_TAXABLE_DE_MINIMIS'
    | 'BONUS_90K_POOL'
    | 'PRE_TAX_DEDUCTION'
    | 'POST_TAX_DEDUCTION';
  amountCentavos: number;
}

export interface GrossToNetOptions {
  cycleType?: PayCycleType | undefined;
  isSecondCutoff?: boolean | undefined;
  statutoryTiming?: StatutoryDeductionTiming | undefined;
  nonTaxableAllowancesCentavos?: number | undefined;
  taxableAllowancesCentavos?: number | undefined;
  otherDeductionsCentavos?: number | undefined;
  voluntaryPagIbigPesos?: number | undefined;
  customSssEeCentavos?: number | undefined;
  customPhilhealthEeCentavos?: number | undefined;
  customPagIbigEeCentavos?: number | undefined;
  policy?: CompanyPayrollPolicy | undefined;
  customLineItems?: CustomLineItem[] | undefined;
  accumulatedYearToDate90kCentavos?: number | undefined;
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
  customTaxableEarningsCentavos?: number | undefined;
  customNonTaxableEarningsCentavos?: number | undefined;
  grossPayCentavos: number;

  // Deductions
  tardinessDeductionCentavos: number;
  absencesDeductionCentavos: number;
  sssEeCentavos: number;
  philhealthEeCentavos: number;
  pagibigEeCentavos: number;
  totalStatutoryEeCentavos: number;
  customPreTaxDeductionsCentavos?: number | undefined;
  taxableIncomeCentavos: number;
  withholdingTaxCentavos: number;
  otherDeductionsCentavos: number;
  customPostTaxDeductionsCentavos?: number | undefined;
  totalDeductionsCentavos: number;

  // Net Take-Home Pay
  netPayCentavos: number;

  // Employer Contributions
  sssErCentavos: number;
  philhealthErCentavos: number;
  pagibigErCentavos: number;
  totalEmployerContributionsCentavos: number;
  totalCostToEmployerCentavos: number;

  // Policy and Custom Components Audit
  customLineItemsApplied?: CustomLineItem[] | undefined;

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
  const policy = options.policy;

  const nonTaxableAllowancesCentavos = options.nonTaxableAllowancesCentavos ?? 0;
  const taxableAllowancesCentavos = options.taxableAllowancesCentavos ?? 0;
  const otherDeductionsCentavos = options.otherDeductionsCentavos ?? 0;
  const voluntaryPagIbigPesos = options.voluntaryPagIbigPesos ?? 0;

  // 1. Base Compensation per Cycle
  const workingDaysFactor = policy?.workingDaysFactor ?? 261;
  const baseMonthlyCentavos = employee.basicSalaryMonthlyCentavos;
  const dailyRateCentavos = deriveDailyRate(baseMonthlyCentavos, workingDaysFactor);
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

  // 3. Custom Line Items & ₱90,000 Annual Bonus Pool Processing
  let customTaxableEarningsCentavos = 0;
  let customNonTaxableEarningsCentavos = 0;
  let customPreTaxDeductionsCentavos = 0;
  let customPostTaxDeductionsCentavos = 0;

  const bonus90kCeilingCentavos = policy?.annualBonusExemptCeilingCentavos ?? 9000000;
  let accumulated90k = options.accumulatedYearToDate90kCentavos ?? 0;

  if (options.customLineItems && options.customLineItems.length > 0) {
    for (const item of options.customLineItems) {
      if (item.category === 'EARNING') {
        if (item.treatment === 'TAXABLE') {
          customTaxableEarningsCentavos += item.amountCentavos;
        } else if (item.treatment === 'NON_TAXABLE_DE_MINIMIS') {
          customNonTaxableEarningsCentavos += item.amountCentavos;
        } else if (item.treatment === 'BONUS_90K_POOL') {
          const remainingCap = Math.max(0, bonus90kCeilingCentavos - accumulated90k);
          const exemptPortion = Math.min(item.amountCentavos, remainingCap);
          const taxablePortion = item.amountCentavos - exemptPortion;
          customNonTaxableEarningsCentavos += exemptPortion;
          customTaxableEarningsCentavos += taxablePortion;
          accumulated90k += exemptPortion;
        }
      } else if (item.category === 'DEDUCTION') {
        if (item.treatment === 'PRE_TAX_DEDUCTION') {
          customPreTaxDeductionsCentavos += item.amountCentavos;
        } else {
          customPostTaxDeductionsCentavos += item.amountCentavos;
        }
      }
    }
  }

  // 4. Gross Pay
  const grossPayCentavos =
    basicPayCentavos +
    overtimePayCentavos +
    nightDiffPayCentavos +
    taxableAllowancesCentavos +
    nonTaxableAllowancesCentavos +
    customTaxableEarningsCentavos +
    customNonTaxableEarningsCentavos;

  // 5. Statutory Basis Determination
  let sssSalaryBaseCentavos = baseMonthlyCentavos;
  if (policy?.sssSalaryBasis === 'gross_taxable') {
    sssSalaryBaseCentavos =
      baseMonthlyCentavos +
      (taxableAllowancesCentavos + customTaxableEarningsCentavos) *
        (cycleType === 'semi_monthly' ? 2 : 1);
  } else if (policy?.sssSalaryBasis === 'total_cash_compensation') {
    sssSalaryBaseCentavos =
      baseMonthlyCentavos +
      (taxableAllowancesCentavos +
        nonTaxableAllowancesCentavos +
        customTaxableEarningsCentavos +
        customNonTaxableEarningsCentavos) *
        (cycleType === 'semi_monthly' ? 2 : 1);
  }

  // Monthly Statutory Calculations
  const sss = calculateSssContribution(sssSalaryBaseCentavos);
  const ph = calculatePhilHealthContribution(baseMonthlyCentavos);
  const hdmf = calculatePagIbigContribution(baseMonthlyCentavos, voluntaryPagIbigPesos);

  // Apply Timing Allocation per statutory component
  let sssEe = sss.totalEeCentavos;
  let phEe = ph.employeeShareCentavos;
  let hdmfEe = hdmf.totalEmployeeCentavos;
  let sssEr = sss.totalErCentavos;
  let phEr = ph.employerShareCentavos;
  let hdmfEr = hdmf.totalEmployerCentavos;

  if (cycleType === 'semi_monthly') {
    // SSS Timing
    const sssTimingMode =
      policy?.sssTiming ?? (timing === 'second_cutoff_only' ? 'second_cutoff_only' : 'split_50_50');
    if (sssTimingMode === 'split_50_50' || sssTimingMode === 'corporate_tiered') {
      sssEe = Math.round(sssEe / 2);
      sssEr = Math.round(sssEr / 2);
    } else if (sssTimingMode === 'first_cutoff_only') {
      sssEe = !isSecondCutoff ? sssEe : 0;
      sssEr = !isSecondCutoff ? sssEr : 0;
    } else if (sssTimingMode === 'second_cutoff_only') {
      sssEe = isSecondCutoff ? sssEe : 0;
      sssEr = isSecondCutoff ? sssEr : 0;
    }

    // PhilHealth Timing
    const phTimingMode =
      policy?.philhealthTiming ??
      (timing === 'second_cutoff_only' ? 'second_cutoff_only' : 'split_50_50');
    if (phTimingMode === 'split_50_50') {
      phEe = Math.round(phEe / 2);
      phEr = Math.round(phEr / 2);
    } else if (phTimingMode === 'first_cutoff_only') {
      phEe = !isSecondCutoff ? phEe : 0;
      phEr = !isSecondCutoff ? phEr : 0;
    } else if (phTimingMode === 'second_cutoff_only') {
      phEe = isSecondCutoff ? phEe : 0;
      phEr = isSecondCutoff ? phEr : 0;
    }

    // Pag-IBIG Timing
    const hdmfTimingMode =
      policy?.pagibigTiming ??
      (timing === 'second_cutoff_only' ? 'second_cutoff_only' : 'split_50_50');
    if (hdmfTimingMode === 'split_50_50') {
      hdmfEe = Math.round(hdmfEe / 2);
      hdmfEr = Math.round(hdmfEr / 2);
    } else if (hdmfTimingMode === 'first_cutoff_only') {
      hdmfEe = !isSecondCutoff ? hdmfEe : 0;
      hdmfEr = !isSecondCutoff ? hdmfEr : 0;
    } else if (hdmfTimingMode === 'second_cutoff_only') {
      hdmfEe = isSecondCutoff ? hdmfEe : 0;
      hdmfEr = isSecondCutoff ? hdmfEr : 0;
    }
  }

  // Apply explicit overrides if provided
  if (options.customSssEeCentavos !== undefined) {
    sssEe = options.customSssEeCentavos;
  }
  if (options.customPhilhealthEeCentavos !== undefined) {
    phEe = options.customPhilhealthEeCentavos;
  }
  if (options.customPagIbigEeCentavos !== undefined) {
    hdmfEe = options.customPagIbigEeCentavos;
  }

  const totalStatutoryEeCentavos = sssEe + phEe + hdmfEe;
  const totalEmployerContributionsCentavos = sssEr + phEr + hdmfEr;

  // 6. Taxable Income & BIR Withholding Tax (TRAIN Law)
  // Taxable Income = Gross Pay - Non-Taxable Allowances - Pre-Tax Statutory/Custom Deductions - Absences/Tardiness
  const grossTaxableCentavos =
    grossPayCentavos -
    (nonTaxableAllowancesCentavos + customNonTaxableEarningsCentavos) -
    tardinessDeductionCentavos -
    absencesDeductionCentavos;

  const totalPreTaxDeductions = totalStatutoryEeCentavos + customPreTaxDeductionsCentavos;
  const taxableIncomeCentavos = Math.max(0, grossTaxableCentavos - totalPreTaxDeductions);

  const taxDetails = calculateWithholdingTax(
    taxableIncomeCentavos,
    cycleType === 'monthly' ? 'monthly' : 'semi_monthly'
  );
  const withholdingTaxCentavos = taxDetails.withholdingTaxCentavos;

  // 7. Total Deductions & Net Take-Home Pay
  const totalDeductionsCentavos =
    tardinessDeductionCentavos +
    absencesDeductionCentavos +
    totalStatutoryEeCentavos +
    customPreTaxDeductionsCentavos +
    withholdingTaxCentavos +
    otherDeductionsCentavos +
    customPostTaxDeductionsCentavos;

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
    customTaxableEarningsCentavos,
    customNonTaxableEarningsCentavos,
    grossPayCentavos,
    tardinessDeductionCentavos,
    absencesDeductionCentavos,
    sssEeCentavos: sssEe,
    philhealthEeCentavos: phEe,
    pagibigEeCentavos: hdmfEe,
    totalStatutoryEeCentavos,
    customPreTaxDeductionsCentavos,
    taxableIncomeCentavos,
    withholdingTaxCentavos,
    otherDeductionsCentavos,
    customPostTaxDeductionsCentavos,
    totalDeductionsCentavos,
    netPayCentavos,
    sssErCentavos: sssEr,
    philhealthErCentavos: phEr,
    pagibigErCentavos: hdmfEr,
    totalEmployerContributionsCentavos,
    totalCostToEmployerCentavos,
    customLineItemsApplied: options.customLineItems,
    sssDetails: sss,
    philhealthDetails: ph,
    pagibigDetails: hdmf,
    taxDetails,
  };
}
