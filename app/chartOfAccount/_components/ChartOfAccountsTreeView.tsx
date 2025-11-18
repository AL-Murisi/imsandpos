"use client";

import {
  ChevronDown,
  ChevronLeft,
  Eye,
  Pencil,
  Power,
  Trash2,
  FolderOpen,
  Folder,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {
  toggleAccountStatus,
  deleteAccount,
} from "@/app/actions/chartOfaccounts";
import { toast } from "sonner";

const AccountFormDialog = dynamic(() => import("./AccountFormDialog"), {
  ssr: false,
});

const AccountDetailsDialog = dynamic(() => import("./AccountDetailsDialog"), {
  ssr: false,
});

type AccountNode = {
  id: string;
  account_code: string;
  account_name_ar: string | null;
  account_name_en: string;
  account_type: string;
  account_category?: string;
  balance: number;
  level: number;
  is_active: boolean;
  is_system: boolean;
  parent_id: string | null;
  children?: AccountNode[];
};

type TreeNodeProps = {
  account: AccountNode;
  level: number;
};

function TreeNode({ account, level }: any) {
  const [isExpanded, setIsExpanded] = useState(level < 2);

  const hasChildren = account.children && account.children.length > 0;
  const indent = level * 24;

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency: "YER",
      numberingSystem: "latn",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600 font-semibold";
    if (balance < 0) return "text-red-600 font-semibold";
    return "text-gray-600";
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      ASSET: "أصول",
      LIABILITY: "خصوم",
      EQUITY: "حقوق ملكية",
      REVENUE: "إيرادات",
      EXPENSE: "مصروفات",
      COST_OF_GOODS: "تكلفة البضاعة",
    };
    return typeMap[type] || type;
  };

  const getIcon = () => {
    if (hasChildren) {
      return isExpanded ? (
        <FolderOpen className="h-5 w-5 text-blue-500" />
      ) : (
        <Folder className="h-5 w-5 text-blue-400" />
      );
    }
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  const handleToggleStatus = async () => {
    const result = await toggleAccountStatus(account.id);
    if (result.success) {
      toast.success("تم تحديث حالة الحساب بنجاح");
    } else {
      toast.error("فشل في تحديث حالة الحساب");
    }
  };

  const handleDelete = async () => {
    if (
      confirm(
        `هل أنت متأكد من حذف الحساب "${account.account_name_ar || account.account_name_en}"؟`,
      )
    ) {
      const result = await deleteAccount(account.id);
      if (result.success) {
        toast.success("تم حذف الحساب بنجاح");
      } else {
        toast.error(result.error || "فشل في حذف الحساب");
      }
    }
  };

  return (
    <div className="w-full">
      <div
        className={`hover:bg-accent/50 flex items-center gap-2 rounded-lg border-r-4 px-3 py-2.5 transition-colors duration-150 ${
          level === 0
            ? "border-r-blue-500 bg-blue-50/30"
            : level === 1
              ? "border-r-purple-400 bg-purple-50/20"
              : "border-r-transparent"
        } `}
        style={{ paddingRight: `${indent + 12}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 rounded p-1 transition-colors hover:bg-gray-200"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6 flex-shrink-0" />}

        {/* Icon */}
        <div className="flex-shrink-0">{getIcon()}</div>

        {/* Account Code */}
        <span className="min-w-[80px] flex-shrink-0 font-mono text-sm font-semibold text-gray-700">
          {account.account_code}
        </span>

        {/* Account Name */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={`truncate font-medium ${level === 0 ? "text-base font-bold" : "text-sm"}`}
          >
            {account.account_name_ar || account.account_name_en}
          </span>
          {account.is_system && (
            <Badge className="flex-shrink-0 bg-blue-100 text-xs text-blue-800">
              نظام
            </Badge>
          )}
        </div>

        {/* Account Type */}
        <span className="min-w-[100px] flex-shrink-0 text-center text-sm text-gray-600">
          {getTypeLabel(account.account_type)}
        </span>

        {/* Balance */}
        <div
          className={`min-w-[150px] flex-shrink-0 text-left font-mono text-sm ${getBalanceColor(account.balance)}`}
        >
          {formatBalance(account.balance)}
        </div>

        {/* Status Badge */}
        <Badge
          className={`min-w-[70px] flex-shrink-0 justify-center ${
            account.is_active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {account.is_active ? "نشط" : "غير نشط"}
        </Badge>

        {/* Actions */}
        <div className="flex flex-shrink-0 gap-1">
          <AccountDetailsDialog account={account} />

          {!account.is_system && (
            <>
              <AccountFormDialog mode="edit" account={account} />

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-100"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${
              account.is_active ? "hover:bg-green-100" : "hover:bg-yellow-100"
            }`}
            onClick={handleToggleStatus}
          >
            <Power
              className={`h-4 w-4 ${account.is_active ? "text-green-600" : "text-yellow-600"}`}
            />
          </Button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {account.children!.map((child: any) => (
            <TreeNode key={child.id} account={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

type ChartOfAccountsTreeViewProps = {
  data: AccountNode[];
  totals?: any;
};

export default function ChartOfAccountsTreeView({
  data,
  totals,
}: ChartOfAccountsTreeViewProps) {
  return (
    <div className="bg-background rounded-2xl border p-4">
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <h2 className="text-lg font-semibold text-gray-700">
          التسلسل الهرمي للحسابات
        </h2>
        <span className="text-sm text-gray-500">{data.length} حساب رئيسي</span>
      </div>

      <div className="max-h-[calc(100vh-400px)] space-y-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>لا توجد حسابات</p>
          </div>
        ) : (
          data.map((account) => (
            <TreeNode key={account.id} account={account} level={0} />
          ))
        )}
      </div>
    </div>
  );
}
