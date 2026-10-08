import { describe, it, expect } from 'vitest';
import { calculateSssContribution } from '../../src/engine/statutory/sss';
import { calculatePhilHealthContribution } from '../../src/engine/statutory/philhealth';
import { calculatePagIbigContribution } from '../../src/engine/statutory/pagibig';
import { calculateWithholdingTax } from '../../src/engine/statutory/withholding_tax';

describe('SSS Contribution Engine (RA 11199)', () => {
  it('computes accurately for ₱20,000 salary (no WISP, EC = ₱30)', () => {
    // ₱20,000 Monthly Salary -> MSC = 20,000
    // Regular SS EE = 20,000 * 4.5% = 900
    // Regular SS ER = 20,000 * 9.5% = 1,900
    // WISP = 0
    // EC = 30
    const res = calculateSssContribution(2000000);
    expect(res.monthlySalaryCreditCentavos).toBe(2000000);
    expect(res.regularSsEeCentavos).toBe(90000); // ₱900.00
    expect(res.regularSsErCentavos).toBe(190000); // ₱1,900.00
    expect(res.wispEeCentavos).toBe(0);
    expect(res.ecErCentavos).toBe(3000); // ₱30.00
    expect(res.totalEeCentavos).toBe(90000);
    expect(res.totalErCentavos).toBe(193000); // ₱1,930.00
  });

  it('computes accurately for ₱30,000 salary (with WISP)', () => {
    // ₱30,000 Monthly Salary -> MSC = 30,000
    // Regular MSC = 20,000 -> EE = 900, ER = 1,900
    // WISP MSC = 10,000 -> EE = 450, ER = 950
    // EC = 30
    const res = calculateSssContribution(3000000);
    expect(res.regularSsEeCentavos).toBe(90000);
    expect(res.wispEeCentavos).toBe(45000); // ₱450.00
    expect(res.totalEeCentavos).toBe(135000); // ₱1,350.00
    expect(res.wispErCentavos).toBe(95000); // ₱950.00
    expect(res.totalErCentavos).toBe(288000); // 1,900 + 950 + 30 = 2,880.00
  });

  it('clamps to minimum MSC for low salary', () => {
    // ₱3,500 Monthly Salary -> Min MSC = 4,000
    const res = calculateSssContribution(350000);
    expect(res.monthlySalaryCreditCentavos).toBe(400000);
    expect(res.regularSsEeCentavos).toBe(18000); // 4,000 * 4.5% = 180.00
    expect(res.ecErCentavos).toBe(1000); // ₱10.00 (<= 14,500)
  });
});

describe('PhilHealth Contribution Engine (UHC Act)', () => {
  it('applies 5% premium split 50/50 for standard salary', () => {
    // ₱30,000 Monthly Salary -> 5% = 1,500 -> 750 EE / 750 ER
    const res = calculatePhilHealthContribution(3000000);
    expect(res.totalPremiumCentavos).toBe(150000); // ₱1,500.00
    expect(res.employeeShareCentavos).toBe(75000); // ₱750.00
    expect(res.employerShareCentavos).toBe(75000); // ₱750.00
  });

  it('enforces ₱10,000 income floor (₱500 min premium)', () => {
    // ₱8,000 Monthly Salary -> Floor = 10,000 -> 250 EE / 250 ER
    const res = calculatePhilHealthContribution(800000);
    expect(res.employeeShareCentavos).toBe(25000); // ₱250.00
    expect(res.employerShareCentavos).toBe(25000); // ₱250.00
  });

  it('enforces ₱100,000 income ceiling (₱5,000 max premium)', () => {
    // ₱150,000 Monthly Salary -> Ceiling = 100,000 -> 2,500 EE / 2,500 ER
    const res = calculatePhilHealthContribution(15000000);
    expect(res.employeeShareCentavos).toBe(250000); // ₱2,500.00
    expect(res.employerShareCentavos).toBe(250000); // ₱2,500.00
  });
});

describe('Pag-IBIG Contribution Engine (Circular 460)', () => {
  it('applies 2% capped at ₱10,000 fund salary (₱200 EE / ₱200 ER)', () => {
    // ₱25,000 Monthly Salary -> Capped at 10,000 -> 200 EE / 200 ER
    const res = calculatePagIbigContribution(2500000);
    expect(res.mandatoryEmployeeCentavos).toBe(20000); // ₱200.00
    expect(res.mandatoryEmployerCentavos).toBe(20000); // ₱200.00
    expect(res.totalEmployeeCentavos).toBe(20000);
  });

  it('includes voluntary additional employee savings', () => {
    // ₱25,000 Monthly Salary + ₱500 voluntary MP2
    const res = calculatePagIbigContribution(2500000, 500);
    expect(res.mandatoryEmployeeCentavos).toBe(20000);
    expect(res.voluntaryEmployeeCentavos).toBe(50000); // ₱500.00
    expect(res.totalEmployeeCentavos).toBe(70000); // ₱700.00
  });
});

describe('BIR TRAIN Withholding Tax Engine', () => {
  it('returns ₱0 tax for compensation within exempt bracket (Level 1)', () => {
    // Semi-Monthly: ₱10,000 (below ₱10,417 threshold) -> 0%
    const res = calculateWithholdingTax(1000000, 'semi_monthly');
    expect(res.withholdingTaxCentavos).toBe(0);
  });

  it('calculates 15% tax on excess for Level 2', () => {
    // Semi-Monthly: ₱15,000 (between 10,417 and 16,666)
    // Excess = 15,000 - 10,417 = 4,583 -> 4,583 * 0.15 = 687.45
    const res = calculateWithholdingTax(1500000, 'semi_monthly');
    expect(res.withholdingTaxCentavos).toBe(68745); // ₱687.45
  });

  it('calculates base tax + 20% on excess for Level 3', () => {
    // Semi-Monthly: ₱25,000 (between 16,667 and 33,332)
    // Base Tax = 937.50 + 20% of (25,000 - 16,667 = 8,333)
    // 937.50 + 1,666.60 = 2,604.10
    const res = calculateWithholdingTax(2500000, 'semi_monthly');
    expect(res.withholdingTaxCentavos).toBe(260410); // ₱2,604.10
  });
});
