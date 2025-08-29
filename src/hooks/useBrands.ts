"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export interface Brand {
  name: string;
  productCount: number;
}

export function useBrands() {
  const brands = useQuery(api.queries.products.getBrands);

  return {
    brands: brands || [],
    isLoading: brands === undefined,
    error: null,
  };
}
