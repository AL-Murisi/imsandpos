"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Dailogreuse from "@/components/common/dailogreuse";
import { Plus, Edit2, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import {
  createAccount,
  updateAccounts,
  getParentAccounts,
} from "@/lib/actions/chartOfaccounts";
import { SelectField } from "@/components/common/selectproduct";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SingleAccount,
  BulkFormValues,
  bulkAccountsSchema,
  singleAccountSchema,
} from "@/lib/zod/chartsOfaccounts";
import { useCompany } from "@/hooks/useCompany";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";

const DEFAULT_ACCOUNTS_TEMPLATE = [
  // ASSETS (1000-1999)
  {
    code: "1000",
    name: "Ø§Ù„Ø£ØµÙˆÙ„",
    type: "ASSET",
    category: "OTHER_ASSETS",
    parent: null,
    level: 1,
  },
  {
    code: "1100",
    name: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
    type: "ASSET",
    category: "OTHER_CURRENT_ASSETS",
    parent: "1000",
    level: 2,
  },
  {
    code: "1110",
    name: "Ø§Ù„Ù†Ù‚Ø¯",
    type: "ASSET",
    category: "CASH",
    parent: "1100",
    level: 3,
    allowManual: true,
  },
  {
    code: "1120",
    name: "Ø§Ù„Ø¨Ù†ÙˆÙƒ",
    type: "ASSET",
    category: "BANK",
    parent: "1100",
    level: 3,
    allowManual: true,
  },
  {
    code: "1130",
    name: "Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©",
    type: "ASSET",
    category: "ACCOUNTS_RECEIVABLE",
    parent: "1100",
    level: 3,
    allowManual: false,
  },
  {
    code: "1140",
    name: "Ø§Ù„Ù…Ø®Ø²ÙˆÙ†",
    type: "ASSET",
    category: "INVENTORY",
    parent: "1100",
    level: 3,
    allowManual: false,
  },
  {
    code: "1200",
    name: "Ø§Ù„Ø£ØµÙˆÙ„ Ø§Ù„Ø«Ø§Ø¨ØªØ©",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1000",
    level: 2,
  },
  {
    code: "1210",
    name: "Ø§Ù„Ù…Ø¨Ø§Ù†ÙŠ",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1200",
    level: 3,
  },
  {
    code: "1220",
    name: "Ø§Ù„Ù…Ø¹Ø¯Ø§Øª",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1200",
    level: 3,
  },
  {
    code: "1230",
    name: "Ø§Ù„Ø£Ø«Ø§Ø«",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1200",
    level: 3,
  },

  // LIABILITIES (2000-2999)
  {
    code: "2000",
    name: "Ø§Ù„Ø®ØµÙˆÙ…",
    type: "LIABILITY",
    category: "OTHER_CURRENT_LIABILITIES",
    parent: null,
    level: 1,
  },
  {
    code: "2100",
    name: "Ø§Ù„Ø®ØµÙˆÙ… Ø§Ù„Ù…ØªØ¯Ø§ÙˆÙ„Ø©",
    type: "LIABILITY",
    category: "OTHER_CURRENT_LIABILITIES",
    parent: "2000",
    level: 2,
  },
  {
    code: "2110",
    name: "Ø§Ù„Ø°Ù…Ù… Ø§Ù„Ø¯Ø§Ø¦Ù†Ø©",
    type: "LIABILITY",
    category: "ACCOUNTS_PAYABLE",
    parent: "2100",
    level: 3,
    allowManual: false,
  },
  {
    code: "2130",
    name: "Ù‚Ø±ÙˆØ¶ Ù‚ØµÙŠØ±Ø© Ø§Ù„Ø£Ø¬Ù„",
    type: "LIABILITY",
    category: "SHORT_TERM_LOANS",
    parent: "2100",
    level: 3,
  },
  {
    code: "2140",
    name: "Ø¶Ø±ÙŠØ¨Ø© Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ø³ØªØ­Ù‚Ø©",
    type: "LIABILITY",
    category: "SALES_TAX_PAYABLE",
    parent: "2100",
    level: 3,
    allowManual: false,
  },
  {
    code: "2150",
    name: "Ø±ÙˆØ§ØªØ¨ Ù…Ø³ØªØ­Ù‚Ø©",
    type: "LIABILITY",
    category: "ACCRUED_EXPENSES",
    parent: "2100",
    level: 3,
    allowManual: false,
  },
  {
    code: "2200",
    name: "Ø§Ù„Ø®ØµÙˆÙ… Ø·ÙˆÙŠÙ„Ø© Ø§Ù„Ø£Ø¬Ù„",
    type: "LIABILITY",
    category: "LONG_TERM_LIABILITIES",
    parent: "2000",
    level: 2,
  },

  // EQUITY (3000-3999)
  {
    code: "3000",
    name: "Ø­Ù‚ÙˆÙ‚ Ø§Ù„Ù…Ù„ÙƒÙŠØ©",
    type: "EQUITY",
    category: "OWNER_EQUITY",
    parent: null,
    level: 1,
  },
  {
    code: "3100",
    name: "Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„",
    type: "EQUITY",
    category: "OWNER_EQUITY",
    parent: "3000",
    level: 2,
  },
  {
    code: "3200",
    name: "Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ù…Ø­ØªØ¬Ø²Ø©",
    type: "EQUITY",
    category: "RETAINED_EARNINGS",
    parent: "3000",
    level: 2,
    allowManual: false,
  },
  {
    code: "3300",
    name: "Ø§Ù„Ù…Ø³Ø­ÙˆØ¨Ø§Øª",
    type: "EQUITY",
    category: "DRAWINGS",
    parent: "3000",
    level: 2,
  },

  // REVENUE (4000-4999)
  {
    code: "4000",
    name: "Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª",
    type: "REVENUE",
    category: "SALES_REVENUE",
    parent: null,
    level: 1,
  },
  {
    code: "4100",
    name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª",
    type: "REVENUE",
    category: "SALES_REVENUE",
    parent: "4000",
    level: 2,
    allowManual: false,
  },
  {
    code: "4200",
    name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ø®Ø¯Ù…Ø§Øª",
    type: "REVENUE",
    category: "SERVICE_REVENUE",
    parent: "4000",
    level: 2,
    allowManual: false,
  },
  {
    code: "4300",
    name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ø®Ø±Ù‰",
    type: "REVENUE",
    category: "OTHER_INCOME",
    parent: "4000",
    level: 2,
  },

  // EXPENSES (5000-5999)
  {
    code: "5000",
    name: "Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: null,
    level: 1,
  },
  {
    code: "5100",
    name: "ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© Ø§Ù„Ù…Ø¨Ø§Ø¹Ø©",
    type: "EXPENSE",
    category: "COST_OF_GOODS_SOLD",
    parent: "5000",
    level: 2,
    allowManual: false,
  },
  {
    code: "5200",
    name: "Ù…ØµØ§Ø±ÙŠÙ Ø§Ù„ØªØ´ØºÙŠÙ„",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5000",
    level: 2,
  },
  {
    code: "5210",
    name: "Ø§Ù„Ø¥ÙŠØ¬Ø§Ø±",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5200",
    level: 3,
  },
  {
    code: "5220",
    name: "Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ§Ù„Ù…Ø§Ø¡",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5200",
    level: 3,
  },
  {
    code: "5230",
    name: "Ø§Ù„Ø§ØªØµØ§Ù„Ø§Øª",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5200",
    level: 3,
  },
  {
    code: "5300",
    name: "Ù…ØµØ§Ø±ÙŠÙ Ø§Ù„Ø±ÙˆØ§ØªØ¨",
    type: "EXPENSE",
    category: "PAYROLL_EXPENSES",
    parent: "5000",
    level: 2,
    allowManual: false,
  },
  {
    code: "5400",
    name: "Ù…ØµØ§Ø±ÙŠÙ Ø¥Ø¯Ø§Ø±ÙŠØ©",
    type: "EXPENSE",
    category: "ADMINISTRATIVE_EXPENSES",
    parent: "5000",
    level: 2,
  },
  {
    code: "5500",
    name: "Ù…ØµØ§Ø±ÙŠÙ Ø£Ø®Ø±Ù‰",
    type: "EXPENSE",
    category: "OTHER_EXPENSES",
    parent: "5000",
    level: 2,
  },
];

type ParentAccount = {
  id: string;
  account_code: string;
  account_name_en: string;
  account_name_ar: string | null;
  currency_code: string | null;
  level: number | null;
  account_type: string | null;
};

interface AccountFormDialogProps {
  mode: "create" | "edit";
  account?: Partial<SingleAccount> & { id?: string };
  companyBaseCurrency?: string;
  onSuccess?: () => void;
}

export default function AccountFormDialog({
  mode,
  account,
  companyBaseCurrency = "YER",
  onSuccess,
}: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const { company } = useCompany();
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;

  

  const accountTypes = [
    { id: "ASSET", name: "Ø£ØµÙˆÙ„" },
    { id: "LIABILITY", name: "Ø®ØµÙˆÙ…" },
    { id: "EQUITY", name: "Ø­Ù‚ÙˆÙ‚ Ù…Ù„ÙƒÙŠØ©" },
    { id: "REVENUE", name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª" },
    { id: "EXPENSE", name: "Ù…ØµØ±ÙˆÙØ§Øª" },
  ];

  const accountCategories = [
    { id: "CASH", name: "Ù†Ù‚Ø¯", type: "ASSET" },
    { id: "BANK", name: "Ø¨Ù†ÙˆÙƒ", type: "ASSET" },
    { id: "ACCOUNTS_RECEIVABLE", name: "Ø°Ù…Ù… Ù…Ø¯ÙŠÙ†Ø©", type: "ASSET" },
    { id: "INVENTORY", name: "Ù…Ø®Ø²ÙˆÙ†", type: "ASSET" },
    { id: "FIXED_ASSETS", name: "Ø£ØµÙˆÙ„ Ø«Ø§Ø¨ØªØ©", type: "ASSET" },
    { id: "OTHER_CURRENT_ASSETS", name: "Ø£ØµÙˆÙ„ Ù…ØªØ¯Ø§ÙˆÙ„Ø© Ø£Ø®Ø±Ù‰", type: "ASSET" },
    { id: "OTHER_ASSETS", name: "Ø£ØµÙˆÙ„ Ø£Ø®Ø±Ù‰", type: "ASSET" },
    { id: "ACCOUNTS_PAYABLE", name: "Ø°Ù…Ù… Ø¯Ø§Ø¦Ù†Ø©", type: "LIABILITY" },
    { id: "CREDIT_CARD", name: "Ø¨Ø·Ø§Ù‚Ø© Ø§Ø¦ØªÙ…Ø§Ù†", type: "LIABILITY" },
    { id: "SHORT_TERM_LOANS", name: "Ù‚Ø±ÙˆØ¶ Ù‚ØµÙŠØ±Ø© Ø§Ù„Ø£Ø¬Ù„", type: "LIABILITY" },
    { id: "SALES_TAX_PAYABLE", name: "Ø¶Ø±ÙŠØ¨Ø© Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ø³ØªØ­Ù‚Ø©", type: "LIABILITY" },
    { id: "ACCRUED_EXPENSES", name: "Ù…ØµØ§Ø±ÙŠÙ Ù…Ø³ØªØ­Ù‚Ø©", type: "LIABILITY" },
    {
      id: "OTHER_CURRENT_LIABILITIES",
      name: "Ø®ØµÙˆÙ… Ù…ØªØ¯Ø§ÙˆÙ„Ø© Ø£Ø®Ø±Ù‰",
      type: "LIABILITY",
    },
    {
      id: "LONG_TERM_LIABILITIES",
      name: "Ø®ØµÙˆÙ… Ø·ÙˆÙŠÙ„Ø© Ø§Ù„Ø£Ø¬Ù„",
      type: "LIABILITY",
    },
    { id: "OWNER_EQUITY", name: "Ø±Ø£Ø³ Ø§Ù„Ù…Ø§Ù„", type: "EQUITY" },
    { id: "RETAINED_EARNINGS", name: "Ø£Ø±Ø¨Ø§Ø­ Ù…Ø­ØªØ¬Ø²Ø©", type: "EQUITY" },
    { id: "DRAWINGS", name: "Ù…Ø³Ø­ÙˆØ¨Ø§Øª", type: "EQUITY" },
    { id: "SALES_REVENUE", name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ù…Ø¨ÙŠØ¹Ø§Øª", type: "REVENUE" },
    { id: "SERVICE_REVENUE", name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø®Ø¯Ù…Ø§Øª", type: "REVENUE" },
    { id: "OTHER_INCOME", name: "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø£Ø®Ø±Ù‰", type: "REVENUE" },
    {
      id: "COST_OF_GOODS_SOLD",
      name: "ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© Ø§Ù„Ù…Ø¨Ø§Ø¹Ø©",
      type: "EXPENSE",
    },
    { id: "OPERATING_EXPENSES", name: "Ù…ØµØ§Ø±ÙŠÙ ØªØ´ØºÙŠÙ„ÙŠØ©", type: "EXPENSE" },
    { id: "PAYROLL_EXPENSES", name: "Ù…ØµØ§Ø±ÙŠÙ Ø±ÙˆØ§ØªØ¨", type: "EXPENSE" },
    { id: "ADMINISTRATIVE_EXPENSES", name: "Ù…ØµØ§Ø±ÙŠÙ Ø¥Ø¯Ø§Ø±ÙŠØ©", type: "EXPENSE" },
    { id: "OTHER_EXPENSES", name: "Ù…ØµØ§Ø±ÙŠÙ Ø£Ø®Ø±Ù‰", type: "EXPENSE" },
  ];

  // Form for bulk mode - FIX: Use Controller for better performance
  const {
    control,
    handleSubmit,
    reset: resetBulk,
  } = useForm<BulkFormValues>({
    resolver: zodResolver(bulkAccountsSchema),
    defaultValues: {
      accounts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "accounts",
  });

  // Form for single mode
  const {
    register,
    handleSubmit: handleSingleSubmit,
    reset: resetSingle,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SingleAccount>({
    resolver: zodResolver(singleAccountSchema),
    defaultValues: {
      account_code: "",
      account_name_en: "",
      account_name_ar: "",
      account_type: "ASSET",
      account_category: "CASH",
      parent_id: "",
      description: "",
      currency_code: null,
      opening_balance: 0,
      allow_manual_entry: true,
    },
  });

  // Fetch parent accounts
  useEffect(() => {
    if (!open) return;

    async function fetchParents() {
      setIsLoadingParents(true);
      try {
        const result = await getParentAccounts();
        setParentAccounts(result?.data || []);
      } catch (error) {
        console.error("Error fetching parents:", error);
        toast.error("ÙØ´Ù„ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©");
      } finally {
        setIsLoadingParents(false);
      }
    }

    fetchParents();
  }, [open]);

  // Load account data for edit mode
  useEffect(() => {
    if (mode === "edit" && account && open) {
      setIsBulkMode(false);
      resetSingle({
        account_code: account.account_code ?? "",
        account_name_en: account.account_name_en ?? "",
        account_name_ar: account.account_name_ar ?? "",
        account_type: account.account_type ?? "ASSET",
        account_category: account.account_category ?? "CASH",
        parent_id: account.parent_id ?? "",
        description: account.description ?? "",
        currency_code: account.currency_code ?? null,
        opening_balance: Number(account.opening_balance ?? 0),
        allow_manual_entry: account.allow_manual_entry ?? true,
      });
    }
  }, [mode, account, open, resetSingle]);

  // Load default accounts template
  const loadDefaultTemplate = () => {
    const formattedAccounts = DEFAULT_ACCOUNTS_TEMPLATE.map((acc: any) => ({
      account_code: acc.code,
      account_name_en: acc.name,
      account_name_ar: acc.name,
      account_type: acc.type,
      account_category: acc.category,
      parent_id: acc.parent ?? "",
      description: "",
      currency_code: null,
      opening_balance: 0,
      allow_manual_entry: acc.allowManual ?? true,
      level: acc.level,
    }));

    resetBulk({ accounts: formattedAccounts });
    setIsBulkMode(true);
    toast.success(
      `ØªÙ… ØªØ­Ù…ÙŠÙ„ ${formattedAccounts.length} Ø­Ø³Ø§Ø¨ Ø§ÙØªØ±Ø§Ø¶ÙŠ. ÙŠÙ…ÙƒÙ†Ùƒ ØªØ¹Ø¯ÙŠÙ„Ù‡Ù… Ø§Ù„Ø¢Ù†`,
    );
  };

  // Currency validation
  const getValidationMessage = (acc: SingleAccount) => {
    if (!acc.parent_id) {
      if (acc.currency_code && acc.currency_code !== companyBaseCurrency) {
        return {
          type: "error",
          message: `Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© ÙŠØ¬Ø¨ Ø£Ù† ØªØ³ØªØ®Ø¯Ù… Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© (${companyBaseCurrency})`,
        };
      }
    } else {
      const parent = parentAccounts.find((p) => p.id === acc.parent_id);
      if (parent?.currency_code && acc.currency_code !== parent.currency_code) {
        return {
          type: "error",
          message: `ÙŠØ¬Ø¨ Ù…Ø·Ø§Ø¨Ù‚Ø© Ø¹Ù…Ù„Ø© Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø£Ø¨ (${parent.currency_code})`,
        };
      }
    }
    return null;
  };

  // Single account submit
  const onSingleSubmit = async (data: SingleAccount) => {
    const validationMsg = getValidationMessage(data);
    if (validationMsg?.type === "error") {
      toast.error(validationMsg.message);
      return;
    }

    try {
      setIsSubmitting(true);
      let result;

      if (mode === "create") {
        result = await createAccount({
          ...data,
          parent_id: data.parent_id || undefined,
        });
      } else if (mode === "edit" && account?.id) {
        result = await updateAccounts(account.id, {
          ...data,
          parent_id: data.parent_id || undefined,
        });
      }

      if (!result?.success) {
        toast.error(result?.error || "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ø­Ø³Ø§Ø¨");
        return;
      }

      toast.success(result.message);
      setOpen(false);
      resetSingle();
      onSuccess?.();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ø­Ø³Ø§Ø¨");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk accounts submit
  const onBulkSubmit = async (data: BulkFormValues) => {
    try {
      setIsSubmitting(true);

      // Validate all accounts
      for (const acc of data.accounts) {
        const validationMsg = getValidationMessage(acc);
        if (validationMsg?.type === "error") {
          toast.error(`${acc.account_code}: ${validationMsg.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Create accounts sequentially
      const results = [];
      for (const acc of data.accounts) {
        const result = await createAccount({
          ...acc,
          parent_id: acc.parent_id || undefined,
          branchId: company?.branches[0]?.id ?? "",
          currency: company?.base_currency ?? "",
        });
        results.push(result);
        if (!result?.success) {
          toast.error(`ÙØ´Ù„ ÙÙŠ Ø¥Ù†Ø´Ø§Ø¡ ${acc.account_code}: ${result?.error}`);
        }
      }

      const successCount = results.filter((r) => r?.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          `ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ${successCount} Ø­Ø³Ø§Ø¨ Ø¨Ù†Ø¬Ø§Ø­${failCount > 0 ? ` (ÙØ´Ù„ ${failCount})` : ""}`,
        );
        setOpen(false);
        resetBulk({ accounts: [] });
        setIsBulkMode(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Bulk submit error:", error);
      toast.error("Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø­ÙØ¸ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEmptyAccount = () => {
    append({
      account_code: "",
      account_name_en: "",
      account_name_ar: "",
      account_type: "ASSET",
      account_category: "CASH",
      parent_id: "",
      description: "",
      currency_code: null,
      opening_balance: 0,
      allow_manual_entry: true,
      level: 1,
    });
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setIsBulkMode(false);
          resetSingle();
          resetBulk({ accounts: [] });
        }
      }}
      btnLabl={
        mode === "create" ? (
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ø¥Ø¶Ø§ÙØ© Ø­Ø³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit2 className="h-4 w-4" />
          </Button>
        )
      }
      style="sm:max-w-6xl max-h-[90vh]"
      titel={
        isBulkMode
          ? "Ø¥Ø¶Ø§ÙØ© Ø­Ø³Ø§Ø¨Ø§Øª Ù…ØªØ¹Ø¯Ø¯Ø©"
          : mode === "create"
            ? "Ø¥Ø¶Ø§ÙØ© Ø­Ø³Ø§Ø¨ Ø¬Ø¯ÙŠØ¯"
            : "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨"
      }
    >
      <div className="space-y-4" dir="rtl">
        {/* Mode Toggle & Default Template Button */}
        {mode === "create" && (
          <div className="flex items-center justify-between gap-4 border-b pb-4">
            <Alert className="flex-1 border-blue-200">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm text-blue-900">
                  Ù‡Ù„ ØªØ­ØªØ§Ø¬ Ø¥Ù„Ù‰ Ù…Ø³Ø§Ø¹Ø¯Ø©ØŸ Ù‚Ù… Ø¨ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ ÙˆØ¹Ø¯Ù‘Ù„Ù‡ Ø­Ø³Ø¨
                  Ø­Ø§Ø¬ØªÙƒ
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDefaultTemplate}
                  disabled={isSubmitting}
                  className="border-blue-300 text-blue-700"
                >
                  <Sparkles className="ml-2 h-4 w-4" />
                  ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø§ÙØªØ±Ø§Ø¶ÙŠ
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Bulk Mode */}
        {isBulkMode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {fields.length} Ø­Ø³Ø§Ø¨ Ø¬Ø§Ù‡Ø² Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmptyAccount}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  Ø¥Ø¶Ø§ÙØ© Ø­Ø³Ø§Ø¨
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsBulkMode(false);
                  resetBulk({ accounts: [] });
                }}
              >
                Ø§Ù„Ø±Ø¬ÙˆØ¹ Ù„Ù„ÙˆØ¶Ø¹ Ø§Ù„ÙØ±Ø¯ÙŠ
              </Button>
            </div>

            <ScrollArea className="h-[500px] rounded-md border p-4">
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const filteredCategories = accountCategories.filter(
                    (cat) => cat.type === field.account_type,
                  );

                  return (
                    <div
                      key={field.id}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-600">
                            {field.account_code}
                          </span>
                          <span className="text-sm text-gray-500">
                            {field.account_name_en}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="hover: text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {/* Account Code - Using Controller */}
                        <div>
                          <Label className="text-xs">Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨</Label>
                          <Controller
                            name={`accounts.${index}.account_code`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} className="h-8 text-sm" />
                            )}
                          />
                        </div>

                        {/* Account Name - Using Controller */}
                        <div>
                          <Label className="text-xs">Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨</Label>
                          <Controller
                            name={`accounts.${index}.account_name_en`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} className="h-8 text-sm" />
                            )}
                          />
                        </div>

                        {/* Account Type */}
                        <div>
                          <Label className="text-xs">Ø§Ù„Ù†ÙˆØ¹</Label>
                          <Controller
                            name={`accounts.${index}.account_type`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountTypes.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <Label className="text-xs">Ø§Ù„ÙØ¦Ø©</Label>
                          <Controller
                            name={`accounts.${index}.account_category`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Currency */}
                        <div>
                          <Label className="text-xs">Ø§Ù„Ø¹Ù…Ù„Ø©</Label>
                          <Controller
                            name={`accounts.${index}.currency_code`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value || "none"}
                                onValueChange={(v) =>
                                  field.onChange(v === "none" ? null : v)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Ù„Ø§ Ø¹Ù…Ù„Ø©</SelectItem>
                                  {currencyOptions.map((curr) => (
                                    <SelectItem key={curr.id} value={curr.id}>
                                      {curr.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Opening Balance */}
                        <div>
                          <Label className="text-xs">Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠ</Label>
                          <Controller
                            name={`accounts.${index}.opening_balance`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            )}
                          />
                        </div>

                        {/* Level */}
                        <div>
                          <Label className="text-xs">Ù…Ø³ØªÙˆÙ‰ Ø§Ù„Ø­Ø³Ø§Ø¨</Label>
                          <Controller
                            name={`accounts.${index}.level`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 1)
                                }
                                className="h-8 text-sm"
                              />
                            )}
                          />
                        </div>

                        {/* Parent ID */}
                        <div>
                          <Label className="text-xs">ÙƒÙˆØ¯ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø£Ø¨</Label>
                          <Controller
                            name={`accounts.${index}.parent_id`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 1)
                                }
                                className="h-8 text-sm"
                              />
                            )}
                          />
                        </div>
                        {/* Allow Manual Entry */}
                        <div className="flex items-center gap-2">
                          <Controller
                            name={`accounts.${index}.allow_manual_entry`}
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                          <Label className="cursor-pointer text-xs">
                            Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø¥Ø¯Ø®Ø§Ù„ Ù‚ÙŠÙˆØ¯ ÙŠØ¯ÙˆÙŠØ©
                          </Label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setIsBulkMode(false);
                  resetBulk({ accounts: [] });
                }}
              >
                Ø¥Ù„ØºØ§Ø¡
              </Button>
              <Button
                onClick={handleSubmit(onBulkSubmit)}
                disabled={isSubmitting || fields.length === 0}
              >
                {isSubmitting ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : `Ø¥Ù†Ø´Ø§Ø¡ ${fields.length} Ø­Ø³Ø§Ø¨`}
              </Button>
            </div>
          </div>
        ) : (
          /* Single Mode Form */
          <div className="space-y-6">
            {getValidationMessage(watch()) && (
              <Alert className="border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  {getValidationMessage(watch())?.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="account_code">Ø±Ù…Ø² Ø§Ù„Ø­Ø³Ø§Ø¨ *</Label>
                <Input
                  id="account_code"
                  placeholder="Ù…Ø«Ø§Ù„: 1011"
                  {...register("account_code")}
                />
                {errors.account_code && (
                  <p className="text-xs text-red-500">
                    {errors.account_code.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨ *</Label>
                <SelectField
                  value={watch("account_type")}
                  action={(value: string) =>
                    setValue("account_type", value as any)
                  }
                  placeholder="Ø§Ø®ØªØ± Ù†ÙˆØ¹ Ø§Ù„Ø­Ø³Ø§Ø¨"
                  options={accountTypes}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account_name_en">Ø§Ø³Ù… Ø§Ù„Ø­Ø³Ø§Ø¨ *</Label>
                <Input
                  id="account_name_en"
                  placeholder="Ù…Ø«Ø§Ù„: Ø§Ù„Ù†Ù‚Ø¯ ÙÙŠ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚"
                  {...register("account_name_en")}
                />
                {errors.account_name_en && (
                  <p className="text-xs text-red-500">
                    {errors.account_name_en.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Ø§Ù„ÙØ¦Ø© *</Label>
                <SelectField
                  options={accountCategories.filter(
                    (cat) => cat.type === watch("account_type"),
                  )}
                  value={watch("account_category")}
                  action={(value: string) =>
                    setValue("account_category", value)
                  }
                  placeholder="Ø§Ø®ØªØ± Ø§Ù„ÙØ¦Ø©"
                />
              </div>

              <div className="grid gap-2">
                <Label>Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ø£Ø¨</Label>
                <Select
                  value={watch("parent_id") || "none"}
                  onValueChange={(value) =>
                    setValue("parent_id", value === "none" ? "" : value)
                  }
                  disabled={isLoadingParents}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingParents
                          ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„..."
                          : "Ù„Ø§ ÙŠÙˆØ¬Ø¯ (Ø­Ø³Ø§Ø¨ Ø±Ø¦ÙŠØ³ÙŠ)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ù„Ø§ ÙŠÙˆØ¬Ø¯ (Ø­Ø³Ø§Ø¨ Ø±Ø¦ÙŠØ³ÙŠ)</SelectItem>
                    {parentAccounts
                      .filter((p) => p.account_type === watch("account_type"))
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} -{" "}
                          {acc.account_name_ar || acc.account_name_en}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Ø§Ù„Ø¹Ù…Ù„Ø©</Label>
                <Select
                  value={watch("currency_code") || "none"}
                  onValueChange={(value) =>
                    setValue("currency_code", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ù„Ø§ Ø¹Ù…Ù„Ø©" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ù„Ø§ Ø¹Ù…Ù„Ø©</SelectItem>
                    {currencyOptions.map((curr) => (
                      <SelectItem key={curr.id} value={curr.id}>
                        {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "create" && (
                <div className="grid gap-2">
                  <Label htmlFor="opening_balance">Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠ</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("opening_balance", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-gray-500">
                    Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù‚ÙŠØ¯ Ø§ÙØªØªØ§Ø­ÙŠ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù„Ø±ØµÙŠØ¯ ØºÙŠØ± ØµÙØ±
                  </p>
                </div>
              )}

              <div className="col-span-1 grid gap-2 md:col-span-2">
                <Label htmlFor="description">Ø§Ù„ÙˆØµÙ</Label>
                <Textarea
                  id="description"
                  placeholder="ÙˆØµÙ ØªÙØµÙŠÙ„ÙŠ Ù„Ù„Ø­Ø³Ø§Ø¨..."
                  rows={3}
                  {...register("description")}
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allow_manual_entry"
                    checked={watch("allow_manual_entry")}
                    onCheckedChange={(checked) =>
                      setValue("allow_manual_entry", !!checked)
                    }
                  />
                  <Label
                    htmlFor="allow_manual_entry"
                    className="cursor-pointer"
                  >
                    Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø¥Ø¯Ø®Ø§Ù„ Ù‚ÙŠÙˆØ¯ ÙŠØ¯ÙˆÙŠØ© Ù„Ù‡Ø°Ø§ Ø§Ù„Ø­Ø³Ø§Ø¨
                  </Label>
                </div>
                <p className="mt-1 mr-6 text-xs text-gray-500">
                  Ø¥Ø°Ø§ ÙƒØ§Ù† ØºÙŠØ± Ù…ÙØ¹Ù„ØŒ Ø³ÙŠÙ‚Ø¨Ù„ Ø§Ù„Ø­Ø³Ø§Ø¨ ÙÙ‚Ø· Ø§Ù„Ù‚ÙŠÙˆØ¯ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ© Ù…Ù†
                  Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetSingle();
                }}
              >
                Ø¥Ù„ØºØ§Ø¡
              </Button>
              <Button
                onClick={handleSingleSubmit(onSingleSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..."
                  : mode === "create"
                    ? "Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø­Ø³Ø§Ø¨"
                    : "Ø­ÙØ¸ Ø§Ù„ØªØºÙŠÙŠØ±Ø§Øª"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dailogreuse>
  );
}

