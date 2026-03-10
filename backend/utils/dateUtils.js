function validateMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return false;
  }

  const [year, monthPart] = month.split('-').map(Number);
  return monthPart >= 1 && monthPart <= 12 && year >= 2000;
}

function getMonthDates(month) {
  const [year, monthPart] = month.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, monthPart - 1, 1));
  const dates = [];

  while (firstDay.getUTCMonth() === monthPart - 1) {
    const isoDate = firstDay.toISOString().split('T')[0];
    dates.push(isoDate);
    firstDay.setUTCDate(firstDay.getUTCDate() + 1);
  }

  return dates;
}

module.exports = {
  validateMonth,
  getMonthDates,
};
