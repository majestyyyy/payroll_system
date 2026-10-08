/**
 * Core Payroll Domain Types
 */

export type PayCycleType = 'semi_monthly' | 'monthly' | 'weekly';

export type EmploymentType = 'regular' | 'probationary' | 'contractual' | 'part_time';

export type TaxStatus = 'SINGLE' | 'MARRIED';

export interface Employee {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email?: string;
  basicSalaryMonthlyCentavos: number;
  employmentType: EmploymentType;
  taxStatus: TaxStatus;
  tin?: string;
  sssNumber?: string;
  philhealthNumber?: string;
  pagibigNumber?: string;
}

export interface AttendanceInput {
  employeeId: string;
  daysWorked: number;
  daysAbsent: number;
  tardinessMinutes: number;
  undertimeMinutes: number;
  regularOvertimeHours: number;
  restDayHours: number;
  nightDifferentialHours: number;
  holidayHours: number;
}

export interface StatutoryContributions {
  sssEmployeeCentavos: number;
  sssEmployerCentavos: number;
  philhealthEmployeeCentavos: number;
  philhealthEmployerCentavos: number;
  pagibigEmployeeCentavos: number;
  pagibigEmployerCentavos: number;
  totalEmployeeCentavos: number;
  totalEmployerCentavos: number;
}

export interface PayslipComputationResult {
  employeeId: string;
  basicPayCentavos: number;
  overtimePayCentavos: number;
  nightDiffPayCentavos: number;
  grossPayCentavos: number;
  tardinessDeductionCentavos: number;
  statutoryDeductionsCentavos: number;
  withholdingTaxCentavos: number;
  otherDeductionsCentavos: number;
  totalDeductionsCentavos: number;
  netPayCentavos: number;
}
