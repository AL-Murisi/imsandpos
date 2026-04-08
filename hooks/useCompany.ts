"use client";

import { useState, useEffect, useRef } from "react";
import { getCompany } from "@/lib/actions/createcompnayacc";
import { useAuth } from "@/lib/context/AuthContext";

export type Company =
  | {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;

      country: string | null;
      logoUrl: string | null;
      base_currency: string | null;
      branches: {
        id: string;
        name: string;
        location: string | null;
      }[];
    }
  | undefined;

// 🔹 Cache to prevent re-fetching across components
let cachedCompany: Company = undefined;

export function useCompany() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company>(cachedCompany);
  const [loading, setLoading] = useState(Boolean(user) && !cachedCompany);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (cachedCompany) {
      setCompany(cachedCompany);
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchCompany = async () => {
      setLoading(true);
      try {
        const res = await getCompany();
        cachedCompany = res?.data; // cache globally
        setCompany(res?.data);
      } catch (err) {
        console.error("Failed to fetch company", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [user?.companyId]);

  return { company, loading };
}
