export function calculateMetrics(data: any) {
  const { todaySales, todayReturns, todayReceipts, todayPayments } = data;

  const salesTotal = Number(todaySales._sum.totalAmount ?? 0);
  const salesDue = Number(todaySales._sum.amountDue ?? 0);
  const salesCount = Number(todaySales._count.id ?? 0);
  const returnsTotal = Number(todayReturns._sum.totalAmount ?? 0);
  const returnsCount = Number(todayReturns._count.id ?? 0);
  const averageSale = salesCount > 0 ? salesTotal / salesCount : 0;
  const receiptTotal = Number(todayReceipts._sum.amount ?? 0);
  const paymentTotal = Number(todayPayments._sum.amount ?? 0);
  const netMovement = receiptTotal - paymentTotal;

  return {
    salesTotal,
    salesDue,
    salesCount,
    returnsTotal,
    returnsCount,
    averageSale,
    receiptTotal,
    paymentTotal,
    netMovement,
  };
}

export function calculateCollectionRate(
  salesTotal: number,
  receiptTotal: number,
): string {
  return salesTotal > 0
    ? `${Math.round((receiptTotal / salesTotal) * 100)}%`
    : "0%";
}
