export const ROLE_DEFINITIONS = [
  {
    id: "admin",
    name: "admin",
    description: "تتمتع بصلاحيات كاملة للتحكم في جميع جوانب النظام وإدارته",
    permissions: [
      "إنشاء",
      "قراءة",
      "تعديل",
      "حذف",
      "تحويل",
      "استلام",
      "قراءة_الكل",
    ],
  },
  {
    id: "customer",
    name: "customer",
    description:
      "عميل يمكنه استعراض بياناته الشخصية، التقارير الخاصة به، الفواتير وسندات القبض",
    permissions: [
      "قراءة_البيانات_الشخصية",
      "عرض_التقارير",
      "عرض_كشف_الحساب",
      "عرض_الإيصالات",
      "عرض_السندات",
    ],
  },
  {
    id: "manager_wh",
    name: "manager_wh",
    description:
      "مسؤول عن إدارة المخزون، استلام المنتجات، إجراء عمليات الجرد، وإصدار أوامر التحويل بين المستودعات.",
    permissions: [
      "إنشاء",
      "قراءة",
      "تعديل",
      "حذف",
      "تحويل",
      "استلام",
      "قراءة_المخزون_فقط",
    ],
  },
  {
    id: "accountant",
    name: "accountant",
    description:
      "مسؤول عن العمليات المالية مثل مراجعة المبيعات والمدفوعات وتسجيل القيود المحاسبية",
    permissions: ["قراءة", "إنشاء", "تعديل", "قراءة_الكل"],
  },

  {
    id: "supplier",
    name: "supplier",
    description: "مورد يمكنه متابعة الطلبيات والتقارير المرتبطة به.",
    permissions: ["قراءة_البيانات_الذاتية", "عرض_التقارير", "عرض_السندات"],
  },
  {
    id: "cashier",
    name: "cashier",
    description:
      "مسؤول عن معالجة طلبات المبيعات اليومية، تسجيل المدفوعات، وعرض بيانات المخزون المتاحة.",
    permissions: [
      "إنشاء",
      "قراءة البيانات الذاتية",
      "تعديل البيانات الخاصة",
      "قراءة المخزون",
    ],
  },
] as const;

export type AppRoleName = (typeof ROLE_DEFINITIONS)[number]["name"];

export function getRoleDefinition(roleName?: string | null) {
  return ROLE_DEFINITIONS.find((role) => role.name === roleName) ?? null;
}
