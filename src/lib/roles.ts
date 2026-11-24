export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Store Manager",
  accountant: "Accountant",
  cashier: "Cashier",
  salesman: "Sales Executive",
};

export const ROLE_RANK: Record<string, number> = {
  admin: 5,
  manager: 4,
  accountant: 3,
  cashier: 2,
  salesman: 1,
};

export function roleAtLeast(role: string, min: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[min] ?? 99);
}
