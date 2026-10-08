import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Users,
  ShieldCheck,
  Cloud,
  DollarSign,
  Plus,
  RefreshCw,
  Clock,
  Briefcase,
  FileText,
  Download,
  PlayCircle,
  Printer,
  CheckCircle2,
  Lock,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  computeGrossToNet,
  formatPHP,
  pesosToCentavos,
  centavosToPesos,
  deriveDailyRate,
  deriveHourlyRate,
  SEMI_MONTHLY_TAX_TABLE,
  MONTHLY_TAX_TABLE,
  Employee,
  AttendanceInput,
  PayCycleType,
  GrossToNetResult,
  TaxStatus,
} from './index';

interface EmployeeRecord extends Employee {
  department: string;
  position: string;
}

interface PayrollRunRecord {
  id: string;
  periodName: string;
  cycleType: PayCycleType;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'COMPUTED' | 'LOCKED';
  processedAt: string;
  items: Array<{
    employee: EmployeeRecord;
    attendance: AttendanceInput;
    result: GrossToNetResult;
  }>;
  totals: {
    grossCentavos: number;
    deductionsCentavos: number;
    netCentavos: number;
    taxCentavos: number;
    sssEeCentavos: number;
    philhealthEeCentavos: number;
    pagibigEeCentavos: number;
    employerCostCentavos: number;
  };
}

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp-001',
    employeeNo: 'EMP-2026-001',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@company.ph',
    department: 'Engineering',
    position: 'Senior Software Engineer',
    basicSalaryMonthlyCentavos: pesosToCentavos(45000),
    employmentType: 'regular',
    taxStatus: 'SINGLE',
    tin: '123-456-789-000',
    sssNumber: '01-2345678-9',
    philhealthNumber: '12-345678901-2',
    pagibigNumber: '1234-5678-9012',
  },
  {
    id: 'emp-002',
    employeeNo: 'EMP-2026-002',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@company.ph',
    department: 'Human Resources',
    position: 'HR & Payroll Specialist',
    basicSalaryMonthlyCentavos: pesosToCentavos(32000),
    employmentType: 'regular',
    taxStatus: 'MARRIED',
    tin: '987-654-321-000',
    sssNumber: '02-8765432-1',
    philhealthNumber: '23-456789012-3',
    pagibigNumber: '2345-6789-0123',
  },
  {
    id: 'emp-003',
    employeeNo: 'EMP-2026-003',
    firstName: 'Roberto',
    lastName: 'Garcia',
    email: 'roberto.garcia@company.ph',
    department: 'Operations',
    position: 'Logistics Supervisor',
    basicSalaryMonthlyCentavos: pesosToCentavos(26000),
    employmentType: 'regular',
    taxStatus: 'SINGLE',
    tin: '456-789-012-000',
    sssNumber: '03-9876543-2',
    philhealthNumber: '34-567890123-4',
    pagibigNumber: '3456-7890-1234',
  },
  {
    id: 'emp-004',
    employeeNo: 'EMP-2026-004',
    firstName: 'Angela',
    lastName: 'Reyes',
    email: 'angela.reyes@company.ph',
    department: 'Finance',
    position: 'Senior Accountant',
    basicSalaryMonthlyCentavos: pesosToCentavos(40000),
    employmentType: 'regular',
    taxStatus: 'SINGLE',
    tin: '321-654-987-000',
    sssNumber: '04-1234567-8',
    philhealthNumber: '45-678901234-5',
    pagibigNumber: '4567-8901-2345',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'runs' | 'calc' | 'employees' | 'statutory' | 'backup'
  >('runs');
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);

  // Single Calculator State
  const [basicSalaryPesos, setBasicSalaryPesos] = useState<number>(30000);
  const [calcCycleType, setCalcCycleType] = useState<PayCycleType>('semi_monthly');
  const [workingDaysFactor, setWorkingDaysFactor] = useState<261 | 313>(261);
  const [otHours, setOtHours] = useState<number>(4);
  const [nightDiffHours, setNightDiffHours] = useState<number>(0);
  const [tardinessMins, setTardinessMins] = useState<number>(15);
  const [absentDays, setAbsentDays] = useState<number>(0);
  const [nonTaxableAllowancePesos, setNonTaxableAllowancePesos] = useState<number>(1000);
  const [taxableAllowancePesos, setTaxableAllowancePesos] = useState<number>(0);
  const [otherDeductionsPesos, setOtherDeductionsPesos] = useState<number>(0);
  const [voluntaryPagIbigPesos, setVoluntaryPagIbigPesos] = useState<number>(0);

  // Batch Payroll Run Wizard State
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunRecord[]>([]);
  const [activeRun, setActiveRun] = useState<PayrollRunRecord | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardPeriodName, setWizardPeriodName] = useState('October 1 - 15, 2026 (1st Cut-Off)');
  const [wizardCycleType, setWizardCycleType] = useState<PayCycleType>('semi_monthly');
  const [wizardStartDate, setWizardStartDate] = useState('2026-10-01');
  const [wizardEndDate, setWizardEndDate] = useState('2026-10-15');

  // Interactive Attendance Grid Inputs per Employee
  const [attendanceInputs, setAttendanceInputs] = useState<
    Record<string, { ot: number; late: number; absent: number; allowance: number; loan: number }>
  >({
    'emp-001': { ot: 5, late: 0, absent: 0, allowance: 1000, loan: 0 },
    'emp-002': { ot: 2, late: 15, absent: 0, allowance: 1000, loan: 0 },
    'emp-003': { ot: 8, late: 30, absent: 1, allowance: 500, loan: 1000 },
    'emp-004': { ot: 0, late: 0, absent: 0, allowance: 1000, loan: 0 },
  });

  // Modal Payslip Preview State
  const [selectedPayslip, setSelectedPayslip] = useState<{
    employee: EmployeeRecord;
    result: GrossToNetResult;
    periodName: string;
  } | null>(null);

  // Employee Add Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmpNo, setNewEmpNo] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operations');
  const [newPosition, setNewPosition] = useState('Associate');
  const [newSalary, setNewSalary] = useState(25000);
  const [newTaxStatus, setNewTaxStatus] = useState<TaxStatus>('SINGLE');
  const [newTin, setNewTin] = useState('');
  const [newSss, setNewSss] = useState('');
  const [newPhilhealth, setNewPhilhealth] = useState('');
  const [newPagibig, setNewPagibig] = useState('');

  // Backups State
  const [backups, setBackups] = useState<
    Array<{ id: string; filename: string; date: string; size: string }>
  >([
    {
      id: 'bak-1',
      filename: 'payroll_backup_2026-10-01_1st_cutoff.payrollbak',
      date: '2026-10-01 17:30',
      size: '14.2 MB',
    },
    {
      id: 'bak-2',
      filename: 'payroll_backup_2026-09-15_2nd_cutoff.payrollbak',
      date: '2026-09-15 18:05',
      size: '13.9 MB',
    },
  ]);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Live Single Calculation
  const calculationResult = useMemo(() => {
    const mockEmployee: Employee = {
      id: 'sim-emp',
      employeeNo: 'SIM-001',
      firstName: 'Simulated',
      lastName: 'Employee',
      basicSalaryMonthlyCentavos: pesosToCentavos(basicSalaryPesos),
      employmentType: 'regular',
      taxStatus: 'SINGLE',
    };

    const mockAttendance: AttendanceInput = {
      employeeId: 'sim-emp',
      daysWorked: calcCycleType === 'semi_monthly' ? 11 : 22,
      daysAbsent: absentDays,
      tardinessMinutes: tardinessMins,
      undertimeMinutes: 0,
      regularOvertimeHours: otHours,
      restDayHours: 0,
      nightDifferentialHours: nightDiffHours,
      holidayHours: 0,
    };

    return computeGrossToNet(mockEmployee, mockAttendance, {
      cycleType: calcCycleType,
      statutoryTiming: 'split_equally',
      nonTaxableAllowancesCentavos: pesosToCentavos(nonTaxableAllowancePesos),
      taxableAllowancesCentavos: pesosToCentavos(taxableAllowancePesos),
      otherDeductionsCentavos: pesosToCentavos(otherDeductionsPesos),
      voluntaryPagIbigPesos,
    });
  }, [
    basicSalaryPesos,
    calcCycleType,
    otHours,
    nightDiffHours,
    tardinessMins,
    absentDays,
    nonTaxableAllowancePesos,
    taxableAllowancePesos,
    otherDeductionsPesos,
    voluntaryPagIbigPesos,
  ]);

  const dailyRateCentavos = deriveDailyRate(pesosToCentavos(basicSalaryPesos), workingDaysFactor);
  const hourlyRateCentavos = deriveHourlyRate(dailyRateCentavos, 8);

  // Process Batch Payroll Run
  const handleProcessBatchRun = () => {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalTax = 0;
    let totalSss = 0;
    let totalPh = 0;
    let totalPagibig = 0;
    let totalErCost = 0;

    const items = employees.map((emp) => {
      const inputs = attendanceInputs[emp.id] || {
        ot: 0,
        late: 0,
        absent: 0,
        allowance: 0,
        loan: 0,
      };
      const att: AttendanceInput = {
        employeeId: emp.id,
        daysWorked: wizardCycleType === 'semi_monthly' ? 11 - inputs.absent : 22 - inputs.absent,
        daysAbsent: inputs.absent,
        tardinessMinutes: inputs.late,
        undertimeMinutes: 0,
        regularOvertimeHours: inputs.ot,
        restDayHours: 0,
        nightDifferentialHours: 0,
        holidayHours: 0,
      };

      const result = computeGrossToNet(emp, att, {
        cycleType: wizardCycleType,
        statutoryTiming: 'split_equally',
        nonTaxableAllowancesCentavos: pesosToCentavos(inputs.allowance),
        otherDeductionsCentavos: pesosToCentavos(inputs.loan),
      });

      totalGross += result.grossPayCentavos;
      totalDeductions += result.totalDeductionsCentavos;
      totalNet += result.netPayCentavos;
      totalTax += result.withholdingTaxCentavos;
      totalSss += result.sssEeCentavos;
      totalPh += result.philhealthEeCentavos;
      totalPagibig += result.pagibigEeCentavos;
      totalErCost += result.totalCostToEmployerCentavos;

      return { employee: emp, attendance: att, result };
    });

    const newRun: PayrollRunRecord = {
      id: `run-${Date.now()}`,
      periodName: wizardPeriodName,
      cycleType: wizardCycleType,
      startDate: wizardStartDate,
      endDate: wizardEndDate,
      status: 'COMPUTED',
      processedAt: new Date().toLocaleString(),
      items,
      totals: {
        grossCentavos: totalGross,
        deductionsCentavos: totalDeductions,
        netCentavos: totalNet,
        taxCentavos: totalTax,
        sssEeCentavos: totalSss,
        philhealthEeCentavos: totalPh,
        pagibigEeCentavos: totalPagibig,
        employerCostCentavos: totalErCost,
      },
    };

    setPayrollRuns([newRun, ...payrollRuns]);
    setActiveRun(newRun);
    setShowWizard(false);
    setWizardStep(1);
  };

  const handleLockRun = (runId: string) => {
    setPayrollRuns(
      payrollRuns.map((r) => (r.id === runId ? { ...r, status: 'LOCKED' as const } : r))
    );
    if (activeRun && activeRun.id === runId) {
      setActiveRun({ ...activeRun, status: 'LOCKED' });
    }
    // Auto-trigger Google Drive backup
    const timestamp = new Date().toISOString().replace(/T/, '_').slice(0, 19);
    setBackups([
      {
        id: `bak-${Date.now()}`,
        filename: `payroll_run_${runId}_${timestamp}.payrollbak`,
        date: new Date().toLocaleString(),
        size: '15.1 MB',
      },
      ...backups,
    ]);
    setBackupMessage(`Payroll Run locked! Encrypted snapshot auto-synced to Google Drive.`);
    setTimeout(() => setBackupMessage(null), 6000);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName) return;

    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      employeeNo: newEmpNo.trim() || `EMP-2026-${String(employees.length + 1).padStart(3, '0')}`,
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      department: newDepartment.trim() || 'General',
      position: newPosition.trim() || 'Staff',
      basicSalaryMonthlyCentavos: pesosToCentavos(newSalary),
      employmentType: 'regular',
      taxStatus: newTaxStatus,
      tin: newTin.trim() || '000-000-000-000',
      sssNumber: newSss.trim() || '00-0000000-0',
      philhealthNumber: newPhilhealth.trim() || '00-000000000-0',
      pagibigNumber: newPagibig.trim() || '0000-0000-0000',
    };

    setEmployees([...employees, newEmp]);
    setShowAddModal(false);
    setNewFirstName('');
    setNewLastName('');
    setNewEmpNo('');
    setNewDepartment('Operations');
    setNewPosition('Associate');
    setNewSalary(25000);
    setNewTaxStatus('SINGLE');
    setNewTin('');
    setNewSss('');
    setNewPhilhealth('');
    setNewPagibig('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Application Bar */}
      <header
        className="no-print"
        style={{
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: '0.85rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              backgroundColor: '#2563eb',
              borderRadius: '8px',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <DollarSign size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Acme Philippines Corp. • Payroll Enterprise
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Multi-Tenant &amp; Philippine Statutory Compliant Desktop System
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              backgroundColor: '#0f172a',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid #334155',
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span style={{ color: '#cbd5e1' }}>Encrypted SQLite (AES-256)</span>
          </div>

          <div
            style={{
              backgroundColor: '#0f172a',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid #334155',
            }}
          >
            <Cloud size={14} color="#38bdf8" />
            <span style={{ color: '#cbd5e1' }}>Google Drive: Connected</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div
        className="no-print"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1.75rem',
          display: 'flex',
          gap: '1.5rem',
        }}
      >
        <button
          onClick={() => setActiveTab('runs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.9rem 0.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'runs' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'runs' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'runs' ? 600 : 500,
            fontSize: '0.9rem',
          }}
        >
          <PlayCircle size={18} />
          Payroll Runs &amp; Processing
        </button>

        <button
          onClick={() => setActiveTab('calc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.9rem 0.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'calc' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'calc' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'calc' ? 600 : 500,
            fontSize: '0.9rem',
          }}
        >
          <Calculator size={18} />
          Live Calculator &amp; Simulator
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.9rem 0.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'employees' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'employees' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'employees' ? 600 : 500,
            fontSize: '0.9rem',
          }}
        >
          <Users size={18} />
          Employee Directory ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('statutory')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.9rem 0.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'statutory' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'statutory' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'statutory' ? 600 : 500,
            fontSize: '0.9rem',
          }}
        >
          <FileText size={18} />
          Statutory Tables (2024–2026)
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.9rem 0.25rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'backup' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'backup' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'backup' ? 600 : 500,
            fontSize: '0.9rem',
          }}
        >
          <Cloud size={18} />
          Google Drive Backups
        </button>
      </div>

      {/* Main Content Area */}
      <main
        className="no-print"
        style={{ flex: 1, padding: '1.75rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}
      >
        {/* TAB: PAYROLL RUNS & PROCESSING */}
        {activeTab === 'runs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Payroll Cut-Off Management
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Manage semi-monthly cut-offs, batch timekeeping adjustments, and generate
                  printable payslips.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowWizard(true);
                  setWizardStep(1);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <Plus size={16} /> New Payroll Run
              </button>
            </div>

            {backupMessage && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={16} />
                {backupMessage}
              </div>
            )}

            {/* Active Run Executive Card (If computed) */}
            {activeRun ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                        {activeRun.periodName}
                      </h3>
                      <span
                        style={{
                          backgroundColor: activeRun.status === 'LOCKED' ? '#f1f5f9' : '#dbeafe',
                          color: activeRun.status === 'LOCKED' ? '#475569' : '#1e40af',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                        }}
                      >
                        {activeRun.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Processed on {activeRun.processedAt} • {activeRun.items.length} Employees
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {activeRun.status !== 'LOCKED' && (
                      <button
                        onClick={() => handleLockRun(activeRun.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        <Lock size={14} /> Lock &amp; Auto-Backup
                      </button>
                    )}
                  </div>
                </div>

                {/* Company-Wide KPI Stats */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>
                      TOTAL NET DISBURSED
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#1e3a8a',
                        marginTop: '0.2rem',
                      }}
                    >
                      {formatPHP(activeRun.totals.netCentavos)}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                      TOTAL GROSS SALARIES
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        marginTop: '0.2rem',
                      }}
                    >
                      {formatPHP(activeRun.totals.grossCentavos)}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>
                      BIR TAX WITHHELD
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#b91c1c',
                        marginTop: '0.2rem',
                      }}
                    >
                      {formatPHP(activeRun.totals.taxCentavos)}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      TOTAL COMPANY COST
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#14532d',
                        marginTop: '0.2rem',
                      }}
                    >
                      {formatPHP(activeRun.totals.employerCostCentavos)}
                    </div>
                  </div>
                </div>

                {/* Employee Payslip Breakdown Table */}
                <h4
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '0.75rem',
                  }}
                >
                  Employee Payslip Roster ({activeRun.items.length})
                </h4>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#475569',
                      }}
                    >
                      <th style={{ padding: '0.65rem 0.85rem' }}>Employee</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Gross Pay</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>SSS (EE)</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>PhilHealth</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Pag-IBIG</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>BIR Tax</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Net Take-Home</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRun.items.map(({ employee, result }) => (
                      <tr key={employee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {employee.employeeNo} • {employee.position}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>
                          {formatPHP(result.grossPayCentavos)}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', color: '#475569' }}>
                          {formatPHP(result.sssEeCentavos)}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', color: '#475569' }}>
                          {formatPHP(result.philhealthEeCentavos)}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', color: '#475569' }}>
                          {formatPHP(result.pagibigEeCentavos)}
                        </td>
                        <td
                          style={{ padding: '0.75rem 0.85rem', color: '#b91c1c', fontWeight: 600 }}
                        >
                          {formatPHP(result.withholdingTaxCentavos)}
                        </td>
                        <td
                          style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#15803d' }}
                        >
                          {formatPHP(result.netPayCentavos)}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem' }}>
                          <button
                            onClick={() =>
                              setSelectedPayslip({
                                employee,
                                result,
                                periodName: activeRun.periodName,
                              })
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.75rem',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Printer size={13} /> View Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty state if no run computed yet */
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1',
                  padding: '3.5rem 2rem',
                  textAlign: 'center',
                }}
              >
                <PlayCircle size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                  No Active Payroll Run Open
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    maxWidth: '460px',
                    margin: '0.5rem auto 1.5rem',
                  }}
                >
                  Click below to launch the Payroll Run Wizard, enter attendance adjustments, and
                  process batch payslips for all {employees.length} employees.
                </p>
                <button
                  onClick={() => {
                    setShowWizard(true);
                    setWizardStep(1);
                  }}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.65rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Start New Payroll Run
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: LIVE CALCULATOR (Unchanged) */}
        {activeTab === 'calc' && (
          <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1.75rem' }}>
            {/* Input Controls Panel */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              >
                <Briefcase size={20} color="#2563eb" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Compensation &amp; Inputs</h2>
              </div>

              {/* Basic Salary */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                  }}
                >
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    Monthly Basic Salary (₱)
                  </label>
                  <input
                    type="number"
                    min="5000"
                    step="500"
                    value={basicSalaryPesos}
                    onChange={(e) => setBasicSalaryPesos(Number(e.target.value))}
                    style={{
                      width: '130px',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textAlign: 'right',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="10000"
                  max="120000"
                  step="500"
                  value={basicSalaryPesos}
                  onChange={(e) => setBasicSalaryPesos(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                  }}
                >
                  <span>₱10,000 (Min)</span>
                  <span>₱50,000</span>
                  <span>₱120,000 (Max)</span>
                </div>
              </div>

              {/* Pay Cycle & Factor */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.3rem',
                    }}
                  >
                    Pay Cycle
                  </label>
                  <select
                    value={calcCycleType}
                    onChange={(e) => setCalcCycleType(e.target.value as PayCycleType)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="semi_monthly">Semi-Monthly (15th/30th)</option>
                    <option value="monthly">Full Monthly</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.3rem',
                    }}
                  >
                    Days Factor
                  </label>
                  <select
                    value={workingDaysFactor}
                    onChange={(e) => setWorkingDaysFactor(Number(e.target.value) as 261 | 313)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value={261}>Factor 261 (Mon-Fri)</option>
                    <option value={313}>Factor 313 (Mon-Sat)</option>
                  </select>
                </div>
              </div>

              {/* Rates breakdown indicator */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                  fontSize: '0.78rem',
                  color: '#475569',
                  display: 'flex',
                  justifyContent: 'space-between',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span>
                  Daily: <strong>{formatPHP(dailyRateCentavos)}</strong>
                </span>
                <span>
                  Hourly: <strong>{formatPHP(hourlyRateCentavos)}</strong>
                </span>
                <span>
                  OT/hr: <strong>{formatPHP(Math.round(hourlyRateCentavos * 1.25))}</strong>
                </span>
              </div>

              {/* Attendance Adjustments */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h3
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Clock size={16} color="#64748b" />
                  Timekeeping &amp; Overtime
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Regular OT (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={otHours}
                      onChange={(e) => setOtHours(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Night Diff (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={nightDiffHours}
                      onChange={(e) => setNightDiffHours(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Tardiness (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tardinessMins}
                      onChange={(e) => setTardinessMins(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Absences (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={absentDays}
                      onChange={(e) => setAbsentDays(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Allowances & Deductions */}
              <div>
                <h3
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    marginBottom: '0.6rem',
                  }}
                >
                  Allowances &amp; Other Deductions
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Fixed De Minimis / Non-Taxable (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={nonTaxableAllowancePesos}
                      onChange={(e) => setNonTaxableAllowancePesos(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Holiday OT / Taxable Earnings (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={taxableAllowancePesos}
                      onChange={(e) => setTaxableAllowancePesos(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      HMO / Loans / After-Tax Ded. (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={otherDeductionsPesos}
                      onChange={(e) => setOtherDeductionsPesos(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Voluntary Pag-IBIG (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={voluntaryPagIbigPesos}
                      onChange={(e) => setVoluntaryPagIbigPesos(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payslip & Computation Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  color: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#bfdbfe',
                    }}
                  >
                    Net Take-Home Pay (
                    {calcCycleType === 'semi_monthly' ? 'Semi-Monthly' : 'Monthly'})
                  </span>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.2rem' }}>
                    {formatPHP(calculationResult.netPayCentavos)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#dbeafe', marginTop: '0.25rem' }}>
                    Gross Pay: {formatPHP(calculationResult.grossPayCentavos)} • Total Deductions:{' '}
                    {formatPHP(calculationResult.totalDeductionsCentavos)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '8px',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#e0e7ff' }}>Take-Home Ratio</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {(
                      (calculationResult.netPayCentavos /
                        (calculationResult.grossPayCentavos || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              </div>

              {/* Three Column Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#16a34a',
                      borderBottom: '2px solid #bbf7d0',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Gross Earnings
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Basic Pay</span>
                      <strong>{formatPHP(calculationResult.basicPayCentavos)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Overtime ({otHours} hrs)</span>
                      <span>{formatPHP(calculationResult.overtimePayCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Night Diff ({nightDiffHours} hrs)</span>
                      <span>{formatPHP(calculationResult.nightDiffPayCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Non-Taxable Allowances</span>
                      <span>{formatPHP(calculationResult.nonTaxableAllowancesCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Taxable Allowances</span>
                      <span>{formatPHP(calculationResult.taxableAllowancesCentavos)}</span>
                    </div>
                    <div
                      style={{
                        borderTop: '1px dashed #cbd5e1',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                      }}
                    >
                      <span>Total Gross</span>
                      <span style={{ color: '#16a34a' }}>
                        {formatPHP(calculationResult.grossPayCentavos)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#dc2626',
                      borderBottom: '2px solid #fecaca',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Employee Deductions
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>SSS Contribution</span>
                      <span>{formatPHP(calculationResult.sssEeCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>PhilHealth Premium (5%)</span>
                      <span>{formatPHP(calculationResult.philhealthEeCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Pag-IBIG (HDMF)</span>
                      <span>{formatPHP(calculationResult.pagibigEeCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>BIR Withholding Tax</span>
                      <strong style={{ color: '#b91c1c' }}>
                        {formatPHP(calculationResult.withholdingTaxCentavos)}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Tardiness / Undertime</span>
                      <span>{formatPHP(calculationResult.tardinessDeductionCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Absences</span>
                      <span>{formatPHP(calculationResult.absencesDeductionCentavos)}</span>
                    </div>
                    <div
                      style={{
                        borderTop: '1px dashed #cbd5e1',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                      }}
                    >
                      <span>Total Deductions</span>
                      <span style={{ color: '#dc2626' }}>
                        {formatPHP(calculationResult.totalDeductionsCentavos)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#475569',
                      borderBottom: '2px solid #cbd5e1',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    Employer Contributions
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>SSS Employer (+EC)</span>
                      <span>{formatPHP(calculationResult.sssErCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>PhilHealth Employer</span>
                      <span>{formatPHP(calculationResult.philhealthErCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Pag-IBIG Employer</span>
                      <span>{formatPHP(calculationResult.pagibigErCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Total Contrib (ER)</span>
                      <strong>
                        {formatPHP(calculationResult.totalEmployerContributionsCentavos)}
                      </strong>
                    </div>
                    <div
                      style={{
                        borderTop: '1px dashed #cbd5e1',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                      }}
                    >
                      <span>Total Company Cost</span>
                      <span style={{ color: '#1e293b' }}>
                        {formatPHP(calculationResult.totalCostToEmployerCentavos)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: EMPLOYEE DIRECTORY */}
        {activeTab === 'employees' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  Employee 201 Registry
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Manage employee compensation profiles, government statutory numbers, and tax
                  status.
                </p>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <Plus size={16} /> Add Employee
              </button>
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Employee No.</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Department &amp; Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Monthly Salary</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Statutory IDs</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td
                      style={{
                        padding: '0.85rem 1rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: '#2563eb',
                      }}
                    >
                      {emp.employeeNo}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{emp.email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div>{emp.position}</div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#f1f5f9',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          color: '#475569',
                        }}
                      >
                        {emp.department}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>
                      {formatPHP(emp.basicSalaryMonthlyCentavos)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <div>TIN: {emp.tin}</div>
                      <div>SSS: {emp.sssNumber}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => {
                          setBasicSalaryPesos(centavosToPesos(emp.basicSalaryMonthlyCentavos));
                          setActiveTab('calc');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        <Calculator size={14} /> Calculate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB: STATUTORY TABLES */}
        {activeTab === 'statutory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.5rem',
                }}
              >
                BIR Withholding Tax Tables (Republic Act No. 10963 - TRAIN Law)
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                Effective-dated graduated withholding rates applied to taxable compensation.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Semi-Monthly Brackets
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem' }}>Range</th>
                        <th style={{ padding: '0.5rem' }}>Tax Computation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SEMI_MONTHLY_TAX_TABLE.map((bracket, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>
                            ₱{bracket.floorPesos.toLocaleString()}{' '}
                            {bracket.ceilingPesos
                              ? `- ₱${bracket.ceilingPesos.toLocaleString()}`
                              : 'and above'}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                            {bracket.percentageRate === 0
                              ? '0.00 (Exempt)'
                              : `₱${bracket.baseTaxPesos.toLocaleString()} + ${(bracket.percentageRate * 100).toFixed(0)}% over floor`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Monthly Brackets
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.5rem' }}>Range</th>
                        <th style={{ padding: '0.5rem' }}>Tax Computation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHLY_TAX_TABLE.map((bracket, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>
                            ₱{bracket.floorPesos.toLocaleString()}{' '}
                            {bracket.ceilingPesos
                              ? `- ₱${bracket.ceilingPesos.toLocaleString()}`
                              : 'and above'}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                            {bracket.percentageRate === 0
                              ? '0.00 (Exempt)'
                              : `₱${bracket.baseTaxPesos.toLocaleString()} + ${(bracket.percentageRate * 100).toFixed(0)}% over floor`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                  }}
                >
                  SSS (RA 11199)
                </h3>
                <ul
                  style={{
                    fontSize: '0.8rem',
                    color: '#475569',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    paddingLeft: '1rem',
                  }}
                >
                  <li>Regular SS Rate: 14% (4.5% EE / 9.5% ER)</li>
                  <li>Regular MSC Cap: ₱20,000</li>
                  <li>WISP / MPF: Applies to MSC &gt; ₱20,000 up to ₱35,000</li>
                  <li>EC: ₱10 for &le; ₱14.5k, ₱30 for &gt; ₱14.5k</li>
                </ul>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                  }}
                >
                  PhilHealth (UHC Act)
                </h3>
                <ul
                  style={{
                    fontSize: '0.8rem',
                    color: '#475569',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    paddingLeft: '1rem',
                  }}
                >
                  <li>Standard Premium Rate: 5.0%</li>
                  <li>Split: 2.5% Employee / 2.5% Employer</li>
                  <li>Income Floor: ₱10,000 (₱500 min premium)</li>
                  <li>Income Ceiling: ₱100,000 (₱5,000 max premium)</li>
                </ul>
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    marginBottom: '0.5rem',
                  }}
                >
                  Pag-IBIG (Circular 460)
                </h3>
                <ul
                  style={{
                    fontSize: '0.8rem',
                    color: '#475569',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    paddingLeft: '1rem',
                  }}
                >
                  <li>Max Fund Salary: ₱10,000</li>
                  <li>Mandatory Employee Share: 2% (₱200 max)</li>
                  <li>Mandatory Employer Share: 2% (₱200 max)</li>
                  <li>Voluntary MP2 Savings: Uncapped</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB: GOOGLE DRIVE BACKUPS */}
        {activeTab === 'backup' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  Google Drive Cloud Backup
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Encrypted database archives are automatically backed up to your company Google
                  Drive folder.
                </p>
              </div>

              <button
                onClick={() => {
                  const timestamp = new Date().toISOString().replace(/T/, '_').slice(0, 19);
                  const newBak = {
                    id: `bak-${Date.now()}`,
                    filename: `manual_backup_${timestamp}.payrollbak`,
                    date: new Date().toLocaleString(),
                    size: '14.8 MB',
                  };
                  setBackups([newBak, ...backups]);
                  setBackupMessage(
                    `Successfully synced encrypted backup "${newBak.filename}" to Google Drive!`
                  );
                  setTimeout(() => setBackupMessage(null), 5000);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={16} /> Backup Now to Google Drive
              </button>
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Backup Archive</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created At</th>
                  <th style={{ padding: '0.75rem 1rem' }}>File Size</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Destination</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((bak) => (
                  <tr key={bak.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td
                      style={{
                        padding: '0.85rem 1rem',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      {bak.filename}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{bak.date}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{bak.size}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        Google Drive / Payroll Backups
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button
                        onClick={() => alert(`Ready to restore from ${bak.filename}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Download size={14} /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* PAYROLL RUN WIZARD MODAL */}
      {showWizard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '840px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            {/* Wizard Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '1rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  Payroll Run Wizard
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Step {wizardStep} of 2 •{' '}
                  {wizardStep === 1 ? 'Period Setup' : 'Batch Attendance & Overtime Adjustments'}
                </p>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Period Setup */}
            {wizardStep === 1 && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '0.3rem',
                      }}
                    >
                      Payroll Cut-Off Description
                    </label>
                    <input
                      value={wizardPeriodName}
                      onChange={(e) => setWizardPeriodName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '0.3rem',
                      }}
                    >
                      Pay Cycle
                    </label>
                    <select
                      value={wizardCycleType}
                      onChange={(e) => setWizardCycleType(e.target.value as PayCycleType)}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      <option value="semi_monthly">Semi-Monthly (15th &amp; 30th)</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '0.3rem',
                      }}
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={wizardStartDate}
                      onChange={(e) => setWizardStartDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '0.3rem',
                      }}
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      value={wizardEndDate}
                      onChange={(e) => setWizardEndDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
                    Active Employees to Process: {employees.length}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Standard scheduled working days (11 days) will be assumed. You will be able to
                    enter overtime, absences, and tardiness exceptions on the next step.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowWizard(false)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      background: '#ffffff',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setWizardStep(2)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1.5rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                    }}
                  >
                    Next: Review Attendance <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Batch Attendance Adjustments Grid */}
            {wizardStep === 2 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                    Enter attendance exceptions below (leave at 0 if no overtime or tardiness):
                  </span>
                  <button
                    onClick={() => {
                      const reset: Record<
                        string,
                        {
                          ot: number;
                          late: number;
                          absent: number;
                          allowance: number;
                          loan: number;
                        }
                      > = {};
                      employees.forEach((e) => {
                        reset[e.id] = { ot: 0, late: 0, absent: 0, allowance: 1000, loan: 0 };
                      });
                      setAttendanceInputs(reset);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.6rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      background: '#f8fafc',
                    }}
                  >
                    Reset All to Standard
                  </button>
                </div>

                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.82rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        color: '#475569',
                      }}
                    >
                      <th style={{ padding: '0.5rem' }}>Employee</th>
                      <th style={{ padding: '0.5rem', width: '90px' }}>OT (Hrs)</th>
                      <th style={{ padding: '0.5rem', width: '90px' }}>Late (Mins)</th>
                      <th style={{ padding: '0.5rem', width: '90px' }}>Absent (Days)</th>
                      <th style={{ padding: '0.5rem', width: '110px' }}>Allowance (₱)</th>
                      <th style={{ padding: '0.5rem', width: '100px' }}>Loan / Other</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const inp = attendanceInputs[emp.id] || {
                        ot: 0,
                        late: 0,
                        absent: 0,
                        allowance: 0,
                        loan: 0,
                      };
                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ fontWeight: 600 }}>
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {formatPHP(emp.basicSalaryMonthlyCentavos)}/mo
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              value={inp.ot}
                              onChange={(e) =>
                                setAttendanceInputs({
                                  ...attendanceInputs,
                                  [emp.id]: { ...inp, ot: Number(e.target.value) },
                                })
                              }
                              style={{
                                width: '100%',
                                padding: '0.35rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              value={inp.late}
                              onChange={(e) =>
                                setAttendanceInputs({
                                  ...attendanceInputs,
                                  [emp.id]: { ...inp, late: Number(e.target.value) },
                                })
                              }
                              style={{
                                width: '100%',
                                padding: '0.35rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              value={inp.absent}
                              onChange={(e) =>
                                setAttendanceInputs({
                                  ...attendanceInputs,
                                  [emp.id]: { ...inp, absent: Number(e.target.value) },
                                })
                              }
                              style={{
                                width: '100%',
                                padding: '0.35rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              value={inp.allowance}
                              onChange={(e) =>
                                setAttendanceInputs({
                                  ...attendanceInputs,
                                  [emp.id]: { ...inp, allowance: Number(e.target.value) },
                                })
                              }
                              style={{
                                width: '100%',
                                padding: '0.35rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              min="0"
                              value={inp.loan}
                              onChange={(e) =>
                                setAttendanceInputs({
                                  ...attendanceInputs,
                                  [emp.id]: { ...inp, loan: Number(e.target.value) },
                                })
                              }
                              style={{
                                width: '100%',
                                padding: '0.35rem',
                                borderRadius: '4px',
                                border: '1px solid #cbd5e1',
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <button
                    onClick={() => setWizardStep(1)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      background: '#ffffff',
                    }}
                  >
                    Back
                  </button>

                  <button
                    onClick={handleProcessBatchRun}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    <CheckCircle2 size={18} /> Compute All Payslips Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIDENTIAL PRINTABLE PAYSLIP MODAL */}
      {selectedPayslip && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '95vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            {/* Modal Control Bar */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                Payslip Preview
              </span>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <Printer size={15} /> Print Payslip
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* THE FORMAL PAYSLIP DOCUMENT (Targets #printable-payslip in @media print) */}
            <div
              id="printable-payslip"
              style={{ padding: '2rem', fontFamily: 'Inter, sans-serif' }}
            >
              {/* Company Header */}
              <div
                style={{
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      Acme Philippines Corporation
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: '#475569' }}>
                      Makati City, Metro Manila, Philippines • BIR RDO 044
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2563eb' }}>
                      CONFIDENTIAL PAYSLIP
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {selectedPayslip.periodName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Demographics Box */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  fontSize: '0.8rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    EMPLOYEE NAME
                  </span>
                  <strong style={{ color: '#0f172a' }}>
                    {selectedPayslip.employee.firstName} {selectedPayslip.employee.lastName}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    EMPLOYEE NUMBER
                  </span>
                  <strong>{selectedPayslip.employee.employeeNo}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    DEPARTMENT / ROLE
                  </span>
                  <span>
                    {selectedPayslip.employee.department} • {selectedPayslip.employee.position}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    TIN NUMBER
                  </span>
                  <span>{selectedPayslip.employee.tin || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    SSS / PHILHEALTH
                  </span>
                  <span>
                    {selectedPayslip.employee.sssNumber || 'N/A'} /{' '}
                    {selectedPayslip.employee.philhealthNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem' }}>
                    PAG-IBIG (HDMF)
                  </span>
                  <span>{selectedPayslip.employee.pagibigNumber || 'N/A'}</span>
                </div>
              </div>

              {/* 2-Column Ledger: Earnings vs Deductions */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                {/* Earnings Column */}
                <div
                  style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}
                >
                  <div
                    style={{
                      backgroundColor: '#f1f5f9',
                      padding: '0.5rem 0.75rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#1e293b',
                    }}
                  >
                    EARNINGS
                  </div>
                  <div
                    style={{
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Basic Pay</span>
                      <strong>{formatPHP(selectedPayslip.result.basicPayCentavos)}</strong>
                    </div>
                    {selectedPayslip.result.overtimePayCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Overtime Pay (125%)</span>
                        <span>{formatPHP(selectedPayslip.result.overtimePayCentavos)}</span>
                      </div>
                    )}
                    {selectedPayslip.result.nightDiffPayCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Night Differential (10%)</span>
                        <span>{formatPHP(selectedPayslip.result.nightDiffPayCentavos)}</span>
                      </div>
                    )}
                    {selectedPayslip.result.nonTaxableAllowancesCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>De Minimis / Non-Tax Allowance</span>
                        <span>
                          {formatPHP(selectedPayslip.result.nonTaxableAllowancesCentavos)}
                        </span>
                      </div>
                    )}
                    {selectedPayslip.result.taxableAllowancesCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Taxable Allowances</span>
                        <span>{formatPHP(selectedPayslip.result.taxableAllowancesCentavos)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '0.5rem',
                        marginTop: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                      }}
                    >
                      <span>TOTAL GROSS EARNINGS</span>
                      <span>{formatPHP(selectedPayslip.result.grossPayCentavos)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div
                  style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}
                >
                  <div
                    style={{
                      backgroundColor: '#f1f5f9',
                      padding: '0.5rem 0.75rem',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#1e293b',
                    }}
                  >
                    DEDUCTIONS
                  </div>
                  <div
                    style={{
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>SSS Contribution (EE)</span>
                      <span>{formatPHP(selectedPayslip.result.sssEeCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>PhilHealth Premium (EE)</span>
                      <span>{formatPHP(selectedPayslip.result.philhealthEeCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Pag-IBIG Contribution (EE)</span>
                      <span>{formatPHP(selectedPayslip.result.pagibigEeCentavos)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>BIR Withholding Tax</span>
                      <span>{formatPHP(selectedPayslip.result.withholdingTaxCentavos)}</span>
                    </div>
                    {selectedPayslip.result.tardinessDeductionCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tardiness / Undertime</span>
                        <span>{formatPHP(selectedPayslip.result.tardinessDeductionCentavos)}</span>
                      </div>
                    )}
                    {selectedPayslip.result.absencesDeductionCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Absences</span>
                        <span>{formatPHP(selectedPayslip.result.absencesDeductionCentavos)}</span>
                      </div>
                    )}
                    {selectedPayslip.result.otherDeductionsCentavos > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Loan / Company Advance</span>
                        <span>{formatPHP(selectedPayslip.result.otherDeductionsCentavos)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '0.5rem',
                        marginTop: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 700,
                      }}
                    >
                      <span>TOTAL DEDUCTIONS</span>
                      <span>{formatPHP(selectedPayslip.result.totalDeductionsCentavos)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Callout */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #86efac',
                  borderRadius: '6px',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.75rem',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#166534',
                      textTransform: 'uppercase',
                    }}
                  >
                    NET TAKE-HOME PAY
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#14532d' }}>
                    {formatPHP(selectedPayslip.result.netPayCentavos)}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#15803d', textAlign: 'right' }}>
                  Bank Disbursement Ready
                  <br />
                  Taxable Income: {formatPHP(selectedPayslip.result.taxableIncomeCentavos)}
                </div>
              </div>

              {/* Employer Contributions Note */}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b',
                  backgroundColor: '#f8fafc',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  marginBottom: '2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  Employer Remittance: SSS (+EC): {formatPHP(selectedPayslip.result.sssErCentavos)}
                </span>
                <span>PhilHealth: {formatPHP(selectedPayslip.result.philhealthErCentavos)}</span>
                <span>Pag-IBIG: {formatPHP(selectedPayslip.result.pagibigErCentavos)}</span>
              </div>

              {/* Employee Acknowledgment Block */}
              <div
                style={{
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  fontSize: '0.75rem',
                  color: '#475569',
                }}
              >
                <div style={{ maxWidth: '380px' }}>
                  I acknowledge receipt of the payment indicated herein and have no further claims
                  against the company for the period covered.
                </div>
                <div style={{ textAlign: 'center', minWidth: '220px' }}>
                  <div
                    style={{
                      borderBottom: '1px solid #0f172a',
                      height: '30px',
                      marginBottom: '0.25rem',
                    }}
                  ></div>
                  <span style={{ fontWeight: 600 }}>Employee Signature / Date</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL (Unchanged) */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1.75rem',
              width: '580px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Add New Employee Profile
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Register employee compensation, BIR tax status, and Philippine statutory numbers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              {/* Basic Info Section */}
              <div style={{ marginBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  Personal &amp; Employment Details
                </span>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      First Name *
                    </label>
                    <input
                      required
                      placeholder="e.g. John Lloyd"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      Last Name *
                    </label>
                    <input
                      required
                      placeholder="e.g. Parungao"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      Employee ID / Number
                    </label>
                    <input
                      placeholder="e.g. 14222356"
                      value={newEmpNo}
                      onChange={(e) => setNewEmpNo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      Monthly Basic Salary (₱) *
                    </label>
                    <input
                      type="number"
                      min="5000"
                      step="500"
                      required
                      value={newSalary}
                      onChange={(e) => setNewSalary(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      Department
                    </label>
                    <input
                      placeholder="e.g. Technology / Operations"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      Position / Role
                    </label>
                    <input
                      placeholder="e.g. Associate Software Engineer"
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Philippine Tax & Statutory Details Section */}
              <div
                style={{
                  marginBottom: '1.25rem',
                  backgroundColor: '#f8fafc',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'block',
                    marginBottom: '0.5rem',
                  }}
                >
                  🏛️ Philippine Tax &amp; Statutory Numbers
                </span>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      BIR Tax Status
                    </label>
                    <select
                      value={newTaxStatus}
                      onChange={(e) => setNewTaxStatus(e.target.value as TaxStatus)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                      }}
                    >
                      <option value="SINGLE">Single / Zero Exemption</option>
                      <option value="MARRIED">Married / Head of Family</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      TIN Number
                    </label>
                    <input
                      placeholder="e.g. 123-456-789-000"
                      value={newTin}
                      onChange={(e) => setNewTin(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      SSS Number
                    </label>
                    <input
                      placeholder="e.g. 01-2345678-9"
                      value={newSss}
                      onChange={(e) => setNewSss(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '0.2rem',
                      }}
                    >
                      PhilHealth Number
                    </label>
                    <input
                      placeholder="e.g. 12-345678901-2"
                      value={newPhilhealth}
                      onChange={(e) => setNewPhilhealth(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      marginBottom: '0.2rem',
                    }}
                  >
                    Pag-IBIG (HDMF) Number
                  </label>
                  <input
                    placeholder="e.g. 1234-5678-9012"
                    value={newPagibig}
                    onChange={(e) => setNewPagibig(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.55rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Save Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
