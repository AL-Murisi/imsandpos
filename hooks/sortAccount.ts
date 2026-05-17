// lib/utils/accountSort.ts
type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE"
  | "COST_OF_GOODS";
type AccountCategory = string;
interface CreateAccountInput {
  account_code: string;
  account_name_en: string;
  account_name_ar?: string;
  account_type: AccountType;
  account_category: AccountCategory;
  parent_id?: string;
  opening_balance?: number;
  description?: string;
  currency_code?: string | null;
  allow_manual_entry?: boolean;
  level: number;
  branchId?: string;
  currency?: string;
}

export function sortAccountsByHierarchy(
  items: CreateAccountInput[],
): CreateAccountInput[] {
  const map = new Map<string, CreateAccountInput>();
  const visited = new Set<string>();
  const result: CreateAccountInput[] = [];

  items.forEach((item) => map.set(item.account_code, item));

  function visit(code: string) {
    if (visited.has(code)) return;

    const item = map.get(code);
    if (!item) return;

    // Visit parent first if it exists in this batch
    if (item.parent_id && map.has(item.parent_id)) {
      visit(item.parent_id);
    }

    visited.add(code);
    result.push(item);
  }

  items.forEach((item) => visit(item.account_code));
  return result;
}
