/**
 * Company Payroll Policy & Configuration Types
 * Allows complete customization of deduction timing, statutory basis,
 * component taxability, and calculation rules per organization.
 */

export type DeductionTimingOption =
  | 'split_50_50' // 50% on 1st cut-off, 50% on 2nd cut-off
  | 'first_cutoff_only' // 100% on 1st cut-off (e.g. Accenture Pag-IBIG policy)
  | 'second_cutoff_only' // 100% on 2nd cut-off
  | 'corporate_tiered'; // Regular on 1st cut-off, WISP/MPF on 2nd cut-off

export type StatutorySalaryBasis =
  | 'basic_salary_only' // Strict basic pay (Labor Code standard)
  | 'gross_taxable' // Basic + Taxable allowances + Overtime
  | 'total_cash_compensation'; // Basic + All allowances (common in MNCs/BPOs)

export type ComponentCategory = 'EARNING' | 'DEDUCTION';

export type TaxTreatment =
  | 'TAXABLE' // Regular compensation subjected to BIR withholding
  | 'NON_TAXABLE_DE_MINIMIS' // De Minimis benefit (BIR exempt ceiling)
  | 'BONUS_90K_POOL' // 13th month & incentives (tax exempt up to ₱90,000/yr)
  | 'PRE_TAX_DEDUCTION' // Statutory and authorized pre-tax deductions
  | 'POST_TAX_DEDUCTION'; // HMO dependents, loans, union dues, advances

export interface CustomPayComponent {
  id: string;
  code: string;
  name: string;
  category: ComponentCategory;
  treatment: TaxTreatment;
  defaultAmountCentavos?: number;
  deductOnCutoff?: 'ALL' | 'FIRST_ONLY' | 'SECOND_ONLY';
}

export interface CompanyPayrollPolicy {
  companyName: string;
  payCycle: 'semi_monthly' | 'monthly';
  workingDaysFactor: 261 | 313 | 365;

  // Statutory Deduction Schedules
  sssTiming: DeductionTimingOption;
  philhealthTiming: DeductionTimingOption;
  pagibigTiming: DeductionTimingOption;

  // Statutory Calculation Base
  sssSalaryBasis: StatutorySalaryBasis;
  philhealthSalaryBasis: StatutorySalaryBasis;

  // Annual Thresholds (Philippine Tax Code)
  annualBonusExemptCeilingCentavos: number; // Standard ₱90,000.00 (9000000 centavos)

  // Custom Components List
  components: CustomPayComponent[];
}

/**
 * Pre-configured Policy Presets
 */
export const DEFAULT_SME_POLICY: CompanyPayrollPolicy = {
  companyName: 'Acme Philippines Corp.',
  payCycle: 'semi_monthly',
  workingDaysFactor: 261,
  sssTiming: 'split_50_50',
  philhealthTiming: 'split_50_50',
  pagibigTiming: 'split_50_50',
  sssSalaryBasis: 'basic_salary_only',
  philhealthSalaryBasis: 'basic_salary_only',
  annualBonusExemptCeilingCentavos: 9000000,
  components: [
    {
      id: 'comp-1',
      code: 'BASIC',
      name: 'Basic Pay',
      category: 'EARNING',
      treatment: 'TAXABLE',
    },
    {
      id: 'comp-2',
      code: 'DEMINIMIS',
      name: 'Fixed De Minimis Allowance',
      category: 'EARNING',
      treatment: 'NON_TAXABLE_DE_MINIMIS',
    },
    {
      id: 'comp-3',
      code: 'HMO_DEP',
      name: 'HMO Dependent Premium',
      category: 'DEDUCTION',
      treatment: 'POST_TAX_DEDUCTION',
    },
  ],
};

export const ACCENTURE_ENTERPRISE_PRESET: CompanyPayrollPolicy = {
  companyName: 'Accenture Inc. (Philippines)',
  payCycle: 'semi_monthly',
  workingDaysFactor: 261,
  sssTiming: 'corporate_tiered', // Custom corporate tiered split
  philhealthTiming: 'split_50_50', // 262.50 per cut-off
  pagibigTiming: 'first_cutoff_only', // Full 200 on 1st cut-off, 0 on 2nd cut-off
  sssSalaryBasis: 'total_cash_compensation',
  philhealthSalaryBasis: 'basic_salary_only',
  annualBonusExemptCeilingCentavos: 9000000,
  components: [
    {
      id: 'acc-1',
      code: 'BASIC',
      name: 'Basic Pay',
      category: 'EARNING',
      treatment: 'TAXABLE',
    },
    {
      id: 'acc-2',
      code: 'DEMINIMIS',
      name: 'Fixed De Minimis',
      category: 'EARNING',
      treatment: 'NON_TAXABLE_DE_MINIMIS',
    },
    {
      id: 'acc-3',
      code: 'HOLIDAY_OT',
      name: 'Holiday Overtime',
      category: 'EARNING',
      treatment: 'TAXABLE',
    },
    {
      id: 'acc-4',
      code: 'REFERRAL_BONUS',
      name: 'Referral Bonus',
      category: 'EARNING',
      treatment: 'BONUS_90K_POOL',
    },
    {
      id: 'acc-5',
      code: 'HMO_SILVER1',
      name: 'HMO Contri Parent Silver1',
      category: 'DEDUCTION',
      treatment: 'POST_TAX_DEDUCTION',
    },
  ],
};
