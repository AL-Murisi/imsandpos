"use client";

import Dailogreuse from "@/components/common/dailogreuse";
import { DataTable } from "@/components/common/ReusbleTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTablePrams } from "@/hooks/useTableParams";
import {
  createCurrency,
  deleteCurrency,
  disableCompanyCurrency,
  enableCompanyCurrency,
  setCompanyBaseCurrency,
  updateCurrency,
} from "@/lib/actions/currencies";
import { ColumnDef } from "@tanstack/react-table";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type CurrencyItem = {
  code: string;
  name: string;
  symbol?: string | null;
  decimals?: number | null;
  enabled: boolean;
  isBase: boolean;
};

export default function CurrenciesClient({
  data,
}: {
  data: { baseCurrency: string; items: CurrencyItem[] };
}) {
  const [isPending, startTransition] = useTransition();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<CurrencyItem | null>(null);
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
  } = useTablePrams();

  const handleCreate = async (formData: FormData) => {
    const code = String(formData.get("code") || "");
    const name = String(formData.get("name") || "");
    const symbol = String(formData.get("symbol") || "");
    const decimals = Number(formData.get("decimals") || 2);

    startTransition(async () => {
      try {
        await createCurrency({
          code,
          name,
          symbol: symbol || null,
          decimals,
        });
        toast.success("تمت إضافة العملة");
        setOpenCreate(false);
      } catch (err: any) {
        toast.error(err?.message || "فشل إضافة العملة");
      }
    });
  };

  const handleEdit = async (formData: FormData) => {
    if (!editing) return;
    const name = String(formData.get("name") || "");
    const symbol = String(formData.get("symbol") || "");
    const decimals = Number(formData.get("decimals") || 2);

    startTransition(async () => {
      try {
        await updateCurrency(editing.code, {
          name,
          symbol: symbol || null,
          decimals,
        });
        toast.success("تم تحديث العملة");
        setOpenEdit(false);
      } catch (err: any) {
        toast.error(err?.message || "فشل تحديث العملة");
      }
    });
  };

  const handleDelete = (code: string) => {
    if (!confirm("حذف العملة؟")) return;
    startTransition(async () => {
      try {
        await deleteCurrency(code);
        toast.success("تم حذف العملة");
      } catch (err: any) {
        toast.error(err?.message || "فشل حذف العملة");
      }
    });
  };

  const handleToggleCompany = (code: string, enabled: boolean) => {
    startTransition(async () => {
      try {
        if (enabled) {
          await disableCompanyCurrency(code);
          toast.success("تم تعطيل العملة للشركة");
        } else {
          await enableCompanyCurrency(code);
          toast.success("تم تفعيل العملة للشركة");
        }
      } catch (err: any) {
        toast.error(err?.message || "فشل تحديث حالة العملة");
      }
    });
  };

  const handleSetBase = (code: string) => {
    startTransition(async () => {
      try {
        await setCompanyBaseCurrency(code);
        toast.success("تم تغيير العملة الأساسية");
      } catch (err: any) {
        toast.error(err?.message || "فشل تغيير العملة الأساسية");
      }
    });
  };

  const columns: ColumnDef<CurrencyItem>[] = [
    {
      accessorKey: "code",
      header: "الرمز",
      cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "الاسم",
    },
    {
      accessorKey: "symbol",
      header: "الرمز المختصر",
      cell: ({ row }) => row.original.symbol || "—",
    },
    {
      accessorKey: "decimals",
      header: "الكسور",
      cell: ({ row }) => row.original.decimals ?? 2,
    },
    {
      id: "status",
      header: "الحالة",
      cell: ({ row }) => <BadgeTone enabled={row.original.enabled} />,
    },
    {
      id: "base",
      header: "الأساسية",
      cell: ({ row }) => (row.original.isBase ? "نعم" : "—"),
    },
    {
      id: "actions",
      header: "الإجراءات",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              handleToggleCompany(row.original.code, row.original.enabled)
            }
            disabled={isPending}
          >
            {row.original.enabled ? "تعطيل" : "تفعيل"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSetBase(row.original.code)}
            disabled={isPending || row.original.isBase}
          >
            تعيين كأساسية
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(row.original);
              setOpenEdit(true);
            }}
          >
            تعديل
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDelete(row.original.code)}
            disabled={isPending}
          >
            حذف
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div
      className="bg-accent border-primary flex flex-col rounded-2xl p-3"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">العملات</h1>
          <p className="text-muted-foreground text-sm">
            إدارة العملات وربطها بالشركة
          </p>
        </div>
      </div>

      <DataTable
        search={
          <Dailogreuse
            open={openCreate}
            setOpen={setOpenCreate}
            btnLabl="إضافة عملة"
            titel="عملة جديدة"
            description="أدخل بيانات العملة الجديدة"
            style="sm:max-w-md"
          >
            <form action={handleCreate} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="code">رمز العملة (3 أحرف)</Label>
                <Input id="code" name="code" maxLength={3} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">الاسم</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="symbol">الرمز</Label>
                <Input id="symbol" name="symbol" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="decimals">عدد الكسور</Label>
                <Input
                  id="decimals"
                  name="decimals"
                  type="number"
                  min={0}
                  max={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenCreate(false)}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isPending}>
                  حفظ
                </Button>
              </div>
            </form>
          </Dailogreuse>
        }
        data={data.items}
        columns={columns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(data.items.length / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={data.items.length}
        highet="h-[60vh]"
      />

      {/* <Dailogreuse
        open={openEdit}
        setOpen={setOpenEdit}
        style="sm:max-w-md"
        btnLabl="تعديل العملة"
        description="تعديل بيانات العملة"
      >
        {editing && (
          <form action={handleEdit} className="space-y-4">
            <div className="grid gap-2">
              <Label>الرمز</Label>
              <Input value={editing.code} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" name="name" defaultValue={editing.name} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="symbol">الرمز</Label>
              <Input
                id="symbol"
                name="symbol"
                defaultValue={editing.symbol || ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="decimals">عدد الكسور</Label>
              <Input
                id="decimals"
                name="decimals"
                type="number"
                min={0}
                max={6}
                defaultValue={editing.decimals ?? 2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEdit(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending}>
                حفظ
              </Button>
            </div>
          </form>
        )}
      </Dailogreuse> */}
    </div>
  );
}

function BadgeTone({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
        enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {enabled ? "مفعل" : "غير مفعل"}
    </span>
  );
}
