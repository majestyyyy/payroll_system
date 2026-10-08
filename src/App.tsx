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
  AlertCircle,
  FileText,
  Download,
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
} from './index';

interface EmployeeRecord extends Employee {
  department: string;
  position: string;
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
    basicSalaryMonthlyCentavos: pesosToCentavos(30000),
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
    basicSalaryMonthlyCentavos: pesosToCentavos(25000),
    employmentType: 'regular',
    taxStatus: 'SINGLE',
    tin: '456-789-012-000',
    sssNumber: '03-9876543-2',
    philhealthNumber: '34-567890123-4',
    pagibigNumber: '3456-7890-1234',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'calc' | 'employees' | 'statutory' | 'backup'>('calc');
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);

  // Calculator State
  const [basicSalaryPesos, setBasicSalaryPesos] = useState<number>(30000);
  const [cycleType, setCycleType] = useState<PayCycleType>('semi_monthly');
  const [workingDaysFactor, setWorkingDaysFactor] = useState<261 | 313>(261);
  const [otHours, setOtHours] = useState<number>(4);
  const [nightDiffHours, setNightDiffHours] = useState<number>(0);
  const [tardinessMins, setTardinessMins] = useState<number>(15);
  const [absentDays, setAbsentDays] = useState<number>(0);
  const [nonTaxableAllowancePesos, setNonTaxableAllowancePesos] = useState<number>(1000);
  const [taxableAllowancePesos, setTaxableAllowancePesos] = useState<number>(0);
  const [otherDeductionsPesos, setOtherDeductionsPesos] = useState<number>(0);
  const [voluntaryPagIbigPesos, setVoluntaryPagIbigPesos] = useState<number>(0);

  // New Employee Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Operations');
  const [newPosition, setNewPosition] = useState('Associate');
  const [newSalary, setNewSalary] = useState(25000);

  // Backup State
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

  // Compute live calculation
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
      daysWorked: cycleType === 'semi_monthly' ? 11 : 22,
      daysAbsent: absentDays,
      tardinessMinutes: tardinessMins,
      undertimeMinutes: 0,
      regularOvertimeHours: otHours,
      restDayHours: 0,
      nightDifferentialHours: nightDiffHours,
      holidayHours: 0,
    };

    return computeGrossToNet(mockEmployee, mockAttendance, {
      cycleType,
      statutoryTiming: 'split_equally',
      nonTaxableAllowancesCentavos: pesosToCentavos(nonTaxableAllowancePesos),
      taxableAllowancesCentavos: pesosToCentavos(taxableAllowancePesos),
      otherDeductionsCentavos: pesosToCentavos(otherDeductionsPesos),
      voluntaryPagIbigPesos,
    });
  }, [
    basicSalaryPesos,
    cycleType,
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

  const handleSimulateEmployee = (emp: EmployeeRecord) => {
    setBasicSalaryPesos(centavosToPesos(emp.basicSalaryMonthlyCentavos));
    setActiveTab('calc');
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName) return;

    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      employeeNo: `EMP-2026-${String(employees.length + 1).padStart(3, '0')}`,
      firstName: newFirstName,
      lastName: newLastName,
      department: newDepartment,
      position: newPosition,
      basicSalaryMonthlyCentavos: pesosToCentavos(newSalary),
      employmentType: 'regular',
      taxStatus: 'SINGLE',
      tin: '000-000-000-000',
      sssNumber: '00-0000000-0',
      philhealthNumber: '00-000000000-0',
      pagibigNumber: '0000-0000-0000',
    };

    setEmployees([...employees, newEmp]);
    setShowAddModal(false);
    setNewFirstName('');
    setNewLastName('');
    setNewSalary(25000);
  };

  const handleTriggerBackup = () => {
    const timestamp = new Date().toISOString().replace(/T/, '_').slice(0, 19);
    const newBak = {
      id: `bak-${Date.now()}`,
      filename: `payroll_backup_${timestamp}.payrollbak`,
      date: new Date().toLocaleString(),
      size: '14.8 MB',
    };
    setBackups([newBak, ...backups]);
    setBackupMessage(`Successfully synced encrypted backup "${newBak.filename}" to Google Drive!`);
    setTimeout(() => setBackupMessage(null), 5000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Application Bar */}
      <header
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
              Philippine Payroll System
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Enterprise Desktop Edition • Multi-Tenant &amp; Statutory Compliant
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
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 1.75rem',
          display: 'flex',
          gap: '1.5rem',
        }}
      >
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
          Live Calculator &amp; Payslip
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
        style={{ flex: 1, padding: '1.75rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}
      >
        {/* TAB 1: LIVE CALCULATOR */}
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
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.4rem',
                  }}
                >
                  Monthly Basic Salary: {formatPHP(pesosToCentavos(basicSalaryPesos))}
                </label>
                <input
                  type="range"
                  min="10000"
                  max="120000"
                  step="1000"
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
                    value={cycleType}
                    onChange={(e) => setCycleType(e.target.value as PayCycleType)}
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

              {/* Attendance Adjustments (No Biometrics Required) */}
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
                      Non-Taxable Allowance (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
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
                      Taxable Allowance (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
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
                      Loans / Cash Advance (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
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
              {/* Highlight Hero Card */}
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
                    Net Take-Home Pay ({cycleType === 'semi_monthly' ? 'Semi-Monthly' : 'Monthly'})
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
                {/* 1. Earnings Column */}
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

                {/* 2. Employee Deductions Column */}
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

                {/* 3. Employer Cost Column */}
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

        {/* TAB 2: EMPLOYEE DIRECTORY */}
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

            {/* Employee Table */}
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
                        onClick={() => handleSimulateEmployee(emp)}
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

            {/* Add Employee Modal */}
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
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '1.75rem',
                    width: '460px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
                    Add New Employee
                  </h3>

                  <form onSubmit={handleCreateEmployee}>
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
                          First Name
                        </label>
                        <input
                          required
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
                          Last Name
                        </label>
                        <input
                          required
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

                    <div style={{ marginBottom: '0.75rem' }}>
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

                    <div style={{ marginBottom: '0.75rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.2rem',
                        }}
                      >
                        Position
                      </label>
                      <input
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

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.2rem',
                        }}
                      >
                        Monthly Salary (₱)
                      </label>
                      <input
                        type="number"
                        min="10000"
                        step="1000"
                        value={newSalary}
                        onChange={(e) => setNewSalary(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '0.45rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        style={{
                          padding: '0.5rem 1rem',
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
                          padding: '0.5rem 1.25rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2563eb',
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        Save Employee
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STATUTORY TABLES */}
        {activeTab === 'statutory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* TRAIN Law Table */}
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

            {/* SSS, PhilHealth, Pag-IBIG Cards */}
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

        {/* TAB 4: GOOGLE DRIVE BACKUPS */}
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
                onClick={handleTriggerBackup}
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

            {backupMessage && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                {backupMessage}
              </div>
            )}

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
    </div>
  );
}
