"use client";

import { useState, useEffect, useRef } from "react";
import { getCompany } from "@/app/actions/createcompnayacc";
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
    }
  | undefined;

// 🔹 Cache to prevent re-fetching across components
let cachedCompany: Company = undefined;

export function useCompany() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company>(cachedCompany);
  const [loading, setLoading] = useState(!cachedCompany);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user || hasFetched.current || cachedCompany) return;
    hasFetched.current = true;

    const fetchCompany = async () => {
      setLoading(true);
      try {
        const res = await getCompany(user.companyId);
        cachedCompany = res.data; // cache globally
        setCompany(res.data);
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
