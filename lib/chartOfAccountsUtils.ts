// utils/chartOfAccountsUtils.ts

/**
 * Transforms flat account data into a hierarchical tree structure
 */
export function buildAccountTree(accounts: any[]) {
  // Create a map for quick lookup
  const accountMap = new Map();
  const rootAccounts: any[] = [];

  // First pass: Create map of all accounts
  accounts.forEach((account) => {
    accountMap.set(account.id, {
      ...account,
      children: [],
    });
  });

  // Second pass: Build tree structure
  accounts.forEach((account) => {
    const accountNode = accountMap.get(account.id);

    if (account.parent_id) {
      // This account has a parent
      const parent = accountMap.get(account.parent_id);
      if (parent) {
        parent.children.push(accountNode);
      } else {
        // Parent not found, treat as root
        rootAccounts.push(accountNode);
      }
    } else {
      // This is a root account
      rootAccounts.push(accountNode);
    }
  });

  // Sort accounts by code at each level
  const sortByCode = (accounts: any[]) => {
    accounts.sort((a, b) => a.account_code.localeCompare(b.account_code));
    accounts.forEach((account) => {
      if (account.children.length > 0) {
        sortByCode(account.children);
      }
    });
  };

  sortByCode(rootAccounts);
  return rootAccounts;
}

/**
 * Alternative: Build tree based on account_code hierarchy
 * Example: 1000 -> 1001 -> 1001.01
 */
export function buildAccountTreeByCode(accounts: any[]) {
  const rootAccounts: any[] = [];
  const accountMap = new Map();

  // Initialize all accounts with empty children array
  accounts.forEach((account) => {
    accountMap.set(account.account_code, {
      ...account,
      children: [],
    });
  });

  // Build hierarchy based on code structure
  accounts.forEach((account) => {
    const accountNode = accountMap.get(account.account_code);

    // Find parent by checking if any account code is a prefix
    let parentFound = false;

    for (const [code, potentialParent] of accountMap) {
      if (
        code !== account.account_code &&
        account.account_code.startsWith(code) &&
        account.level === potentialParent.level + 1
      ) {
        potentialParent.children.push(accountNode);
        parentFound = true;
        break;
      }
    }

    if (!parentFound) {
      rootAccounts.push(accountNode);
    }
  });

  return rootAccounts;
}

/**
 * Filter tree recursively based on search query
 */
export function filterAccountTree(accounts: any[], searchQuery: string): any[] {
  if (!searchQuery) return accounts;

  const query = searchQuery.toLowerCase();

  return accounts.reduce((filtered: any[], account) => {
    const matchesSearch =
      account.account_code.toLowerCase().includes(query) ||
      account.account_name_ar?.toLowerCase().includes(query) ||
      account.account_name_en?.toLowerCase().includes(query);

    // Recursively filter children
    const filteredChildren = account.children
      ? filterAccountTree(account.children, searchQuery)
      : [];

    // Include this account if it matches OR if any children match
    if (matchesSearch || filteredChildren.length > 0) {
      filtered.push({
        ...account,
        children: filteredChildren,
      });
    }

    return filtered;
  }, []);
}

/**
 * Filter by account type
 */
export function filterByAccountType(
  accounts: any[],
  accountType: string,
): any[] {
  if (!accountType || accountType === "all") return accounts;

  return accounts.reduce((filtered: any[], account) => {
    const matchesType = account.account_type === accountType;
    const filteredChildren = account.children
      ? filterByAccountType(account.children, accountType)
      : [];

    if (matchesType || filteredChildren.length > 0) {
      filtered.push({
        ...account,
        children: filteredChildren,
      });
    }

    return filtered;
  }, []);
}

/**
 * Flatten tree structure back to array (for export or other purposes)
 */
export function flattenAccountTree(accounts: any[]): any[] {
  const result: any[] = [];

  function traverse(accounts: any[]) {
    accounts.forEach((account) => {
      const { children, ...accountData } = account;
      result.push(accountData);
      if (children && children.length > 0) {
        traverse(children);
      }
    });
  }

  traverse(accounts);
  return result;
}

/**
 * Get all parent accounts for a given account
 */
export function getAccountPath(accountId: string, accounts: any[]): any[] {
  const path: any[] = [];

  function findPath(accounts: any[], targetId: string): boolean {
    for (const account of accounts) {
      if (account.id === targetId) {
        path.unshift(account);
        return true;
      }

      if (account.children && account.children.length > 0) {
        if (findPath(account.children, targetId)) {
          path.unshift(account);
          return true;
        }
      }
    }
    return false;
  }

  findPath(accounts, accountId);
  return path;
}

/**
 * Calculate total balance for an account including all children
 */
export function calculateAccountBalance(account: any): number {
  let total = parseFloat(account.balance?.toString() || "0");

  if (account.children && account.children.length > 0) {
    account.children.forEach((child: any) => {
      total += calculateAccountBalance(child);
    });
  }

  return total;
}
