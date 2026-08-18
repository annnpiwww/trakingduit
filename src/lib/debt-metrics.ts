export function getDebtDueLabel(
  days: number | null,
  settled: boolean,
  late: boolean,
): string {
  if (settled) return "Lunas";
  if (late) return "Telat";
  if (days == null) return "Tanpa jatuh tempo";
  if (days === 0) return "Hari ini";
  return `${days} hari lagi`;
}
