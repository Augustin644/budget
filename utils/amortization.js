export function calculateMonthlyPayment(principal, annualRate, durationMonths) {
  if (annualRate === 0) return principal / durationMonths;
  const monthlyRate = annualRate / 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, durationMonths)) / (Math.pow(1 + monthlyRate, durationMonths) - 1);
}

export function generateAmortizationSchedule(principal, annualRate, durationMonths, startDate) {
  const schedule = [];
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, durationMonths);
  const monthlyRate = annualRate / 12;
  let remainingBalance = principal;
  let totalInterest = 0;

  for (let month = 1; month <= durationMonths; month++) {
    const interest = annualRate === 0 ? 0 : remainingBalance * monthlyRate;
    const capitalAmortized = monthlyPayment - interest;
    remainingBalance = Math.max(remainingBalance - capitalAmortized, 0);
    totalInterest += interest;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + month);

    schedule.push({
      month,
      date: paymentDate.toISOString().split('T')[0],
      payment: Math.round(monthlyPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      capitalAmortized: Math.round(capitalAmortized * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
    });
  }

  return { schedule, monthlyPayment, totalInterest };
}

export function calculateRemainingBalance(principal, annualRate, durationMonths, startDate) {
  const now = new Date();
  const start = new Date(startDate);
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  if (monthsElapsed <= 0) return principal;
  if (monthsElapsed >= durationMonths) return 0;

  const monthlyRate = annualRate / 12;
  if (annualRate === 0) {
    const monthlyPayment = principal / durationMonths;
    return Math.max(principal - monthlyPayment * monthsElapsed, 0);
  }

  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, durationMonths);
  let balance = principal;
  for (let i = 0; i < monthsElapsed; i++) {
    const interest = balance * monthlyRate;
    balance -= (monthlyPayment - interest);
  }
  return Math.max(Math.round(balance * 100) / 100, 0);
}

export function calculateEndDate(startDate, durationMonths) {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + durationMonths);
  return d.toISOString().split('T')[0];
}

export function getCreditRemainingBalance(credit) {
  if (credit.remainingBalance <= 0) return 0;
  if (!credit.startDate || !credit.principal) return credit.remainingBalance || 0;
  return calculateRemainingBalance(
    credit.principal,
    credit.annualRate || 0,
    credit.durationMonths || 0,
    credit.startDate
  );
}
