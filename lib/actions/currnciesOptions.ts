export const currencyOptions = [
  { name: "الريال اليمني (YER)", id: "YER" },
  { name: "الدولار الأمريكي (USD)", id: "USD" },
  { name: "الريال السعودي (SAR)", id: "SAR" },
  { name: "اليورو (EUR)", id: "EUR" },
  { name: "الدينار الكويتي (KWD)", id: "KWD" },
];
export interface UserOption {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  outstandingBalance?: number;
  preferred_currency?: string[];
  creditLimit?: number;
}
