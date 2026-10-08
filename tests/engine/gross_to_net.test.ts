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
});
