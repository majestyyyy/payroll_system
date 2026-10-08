import { describe, it, expect } from 'vitest';
import { computeGrossToNet } from '../../src/engine/gross_to_net';
import { Employee, AttendanceInput } from '../../src/types/payroll';

describe('End-to-End Gross-to-Net Computation', () => {
  const sampleEmployee: Employee = {
    id: 'emp-001',
    employeeNo: 'EMP-2026-001',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@example.com',
    basicSalaryMonthlyCentavos: 3000000, // ₱30,000.00 / month
    employmentType: 'regular',
    taxStatus: 'SINGLE',
    tin: '123-456-789-000',
    sssNumber: '01-2345678-9',
    philhealthNumber: '12-345678901-2',
    pagibigNumber: '1234-5678-9012',
  };

  const sampleAttendance: AttendanceInput = {
    employeeId: 'emp-001',
    daysWorked: 11,
    daysAbsent: 0,
    tardinessMinutes: 30, // 30 minutes late
    undertimeMinutes: 0,
    regularOvertimeHours: 4, // 4 hours regular OT
    restDayHours: 0,
    nightDifferentialHours: 2, // 2 hours ND
    holidayHours: 0,
  };

  it('computes complete semi-monthly payroll run with exact centavo precision', () => {
    const result = computeGrossToNet(sampleEmployee, sampleAttendance, {
      cycleType: 'semi_monthly',
      statutoryTiming: 'split_equally',
      nonTaxableAllowancesCentavos: 100000, // ₱1,000 rice allowance
    });

    // 1. Basic Pay for Semi-Monthly = 30,000 / 2 = 15,000.00
    expect(result.basicPayCentavos).toBe(1500000);

    // 2. Overtime Pay:
    // Factor 261: Daily = (30,000 * 12) / 261 = 1,379.31 -> 137931 centavos
    // Hourly = 137931 / 8 = 172.41 -> 17241 centavos
    // OT Rate = 17241 * 1.25 = 21551 centavos/hr
    // 4 hours OT = 21551 * 4 = 86204 centavos (₱862.04)
    expect(result.overtimePayCentavos).toBe(86204);

    // 3. Gross Pay includes basic + OT + ND + Allowance
    expect(result.grossPayCentavos).toBeGreaterThan(1500000);

    // 4. Statutory Deductions (Split equally for semi-monthly):
    // SSS: Total monthly EE = 1,350 -> semi-monthly = 675.00
    expect(result.sssEeCentavos).toBe(67500);
    // PhilHealth: Total monthly EE = 750 -> semi-monthly = 375.00
    expect(result.philhealthEeCentavos).toBe(37500);
    // Pag-IBIG: Total monthly EE = 200 -> semi-monthly = 100.00
    expect(result.pagibigEeCentavos).toBe(10000);

    // Total Statutory EE = 675 + 375 + 100 = 1,150.00
    expect(result.totalStatutoryEeCentavos).toBe(115000);

    // 5. Invariant Checks
    expect(result.netPayCentavos).toBe(result.grossPayCentavos - result.totalDeductionsCentavos);
    expect(result.totalCostToEmployerCentavos).toBe(
      result.grossPayCentavos + result.totalEmployerContributionsCentavos
    );
  });

  it('accurately reproduces real Accenture 09/15/2026 payslip using ACCENTURE_ENTERPRISE_PRESET', () => {
    const accentureEmployee: Employee = {
      id: 'acc-emp-01',
      employeeNo: 'ACC-001',
      firstName: 'Corporate',
      lastName: 'Associate',
      basicSalaryMonthlyCentavos: 2100000, // ₱21,000.00 / month (₱10,500 semi-monthly)
      employmentType: 'regular',
      taxStatus: 'SINGLE',
    };

    const emptyAttendance: AttendanceInput = {
      employeeId: 'acc-emp-01',
      daysWorked: 11,
      daysAbsent: 0,
      tardinessMinutes: 0,
      undertimeMinutes: 0,
      regularOvertimeHours: 0,
      restDayHours: 0,
      nightDifferentialHours: 0,
      holidayHours: 0,
    };

    const result = computeGrossToNet(accentureEmployee, emptyAttendance, {
      cycleType: 'semi_monthly',
      isSecondCutoff: false, // 1st Cut-Off (09/15/2026)
      customSssEeCentavos: 72500, // ₱725.00 regular SSS
      policy: {
        companyName: 'Accenture Inc. (Philippines)',
        payCycle: 'semi_monthly',
        workingDaysFactor: 261,
        sssTiming: 'corporate_tiered',
        philhealthTiming: 'split_50_50',
        pagibigTiming: 'first_cutoff_only', // ₱200 on 1st cut-off
        sssSalaryBasis: 'total_cash_compensation',
        philhealthSalaryBasis: 'basic_salary_only',
        annualBonusExemptCeilingCentavos: 9000000,
        components: [],
      },
      customLineItems: [
        {
          code: 'DEMINIMIS',
          name: 'Fixed De Minimis',
          category: 'EARNING',
          treatment: 'NON_TAXABLE_DE_MINIMIS',
          amountCentavos: 280000, // ₱2,800.00
        },
        {
          code: 'HOLIDAY_OT',
          name: 'Holiday Overtime',
          category: 'EARNING',
          treatment: 'TAXABLE',
          amountCentavos: 125518, // ₱1,255.18
        },
        {
          code: 'HMO_SILVER1',
          name: 'HMO Silver1',
          category: 'DEDUCTION',
          treatment: 'POST_TAX_DEDUCTION',
          amountCentavos: 43880, // ₱438.80
        },
      ],
    });

    // 1. Gross Pay = 10,500 + 2,800 + 1,255.18 = ₱14,555.18
    expect(result.grossPayCentavos).toBe(1455518);

    // 2. Pre-tax statutory deductions:
    // SSS EE = ₱725.00
    expect(result.sssEeCentavos).toBe(72500);
    // PhilHealth EE = ₱262.50 (₱21,000 * 5% = ₱1,050 / 2 = ₱525 total / 2 = ₱262.50)
    expect(result.philhealthEeCentavos).toBe(26250);
    // Pag-IBIG EE = ₱200.00 (full on 1st cut-off under first_cutoff_only)
    expect(result.pagibigEeCentavos).toBe(20000);
    // Total Statutory = 725 + 262.50 + 200 = ₱1,187.50
    expect(result.totalStatutoryEeCentavos).toBe(118750);

    // 3. Taxable Income:
    // Gross (₱14,555.18) - De Minimis (₱2,800.00) - Pre-tax Statutory (₱1,187.50) = ₱10,567.68
    expect(result.taxableIncomeCentavos).toBe(1056768);

    // 4. BIR TRAIN Law Withholding Tax:
    // (10,567.68 - 10,417) * 15% = ₱22.602 -> ₱22.60 exact centavo match
    expect(result.withholdingTaxCentavos).toBe(2260);

    // 5. Total Deductions = Statutory (₱1,187.50) + Tax (₱22.60) + HMO (₱438.80) = ₱1,648.90
    expect(result.totalDeductionsCentavos).toBe(164890);

    // 6. Net Take-Home Pay = ₱14,555.18 - ₱1,648.90 = ₱12,906.28 exact match!
    expect(result.netPayCentavos).toBe(1290628);
  });

  it('correctly exempts ₱90,000 bonus pool earnings on 2nd cut-off and sets Pag-IBIG to ₱0 under first_cutoff_only policy', () => {
    const emp: Employee = {
      id: 'acc-emp-02',
      employeeNo: 'ACC-002',
      firstName: 'Jane',
      lastName: 'Smith',
      basicSalaryMonthlyCentavos: 2100000,
      employmentType: 'regular',
      taxStatus: 'SINGLE',
    };

    const emptyAttendance: AttendanceInput = {
      employeeId: 'acc-emp-02',
      daysWorked: 11,
      daysAbsent: 0,
      tardinessMinutes: 0,
      undertimeMinutes: 0,
      regularOvertimeHours: 0,
      restDayHours: 0,
      nightDifferentialHours: 0,
      holidayHours: 0,
    };

    const result = computeGrossToNet(emp, emptyAttendance, {
      cycleType: 'semi_monthly',
      isSecondCutoff: true, // 2nd Cut-off
      customSssEeCentavos: 72500,
      policy: {
        companyName: 'Accenture Inc. (Philippines)',
        payCycle: 'semi_monthly',
        workingDaysFactor: 261,
        sssTiming: 'corporate_tiered',
        philhealthTiming: 'split_50_50',
        pagibigTiming: 'first_cutoff_only',
        sssSalaryBasis: 'basic_salary_only',
        philhealthSalaryBasis: 'basic_salary_only',
        annualBonusExemptCeilingCentavos: 9000000,
        components: [],
      },
      customLineItems: [
        {
          code: 'REFERRAL_BONUS',
          name: 'Referral Bonus',
          category: 'EARNING',
          treatment: 'BONUS_90K_POOL',
          amountCentavos: 500000, // ₱5,000.00
        },
      ],
      accumulatedYearToDate90kCentavos: 0, // Well below ₱90,000
    });

    // On 2nd cut-off, Pag-IBIG under first_cutoff_only is ₱0
    expect(result.pagibigEeCentavos).toBe(0);

    // SSS is 725, PhilHealth is 262.50
    expect(result.sssEeCentavos).toBe(72500);
    expect(result.philhealthEeCentavos).toBe(26250);
    expect(result.totalStatutoryEeCentavos).toBe(98750);

    // Referral bonus ₱5,000 is 100% tax exempt
    expect(result.customNonTaxableEarningsCentavos).toBe(500000);
    expect(result.customTaxableEarningsCentavos).toBe(0);

    // Taxable Income = Basic ₱10,500 - Pre-Tax Statutory ₱987.50 = ₱9,512.50
    expect(result.taxableIncomeCentavos).toBe(951250);

    // ₱9,512.50 <= ₱10,417 bracket floor -> ₱0 Withholding Tax
    expect(result.withholdingTaxCentavos).toBe(0);

    // Net Pay = ₱10,500 (Basic) + ₱5,000 (Bonus) - ₱987.50 (Statutory) = ₱14,512.50
    expect(result.netPayCentavos).toBe(1451250);
  });
});
