import { useCallback, useMemo, useState } from "react";
import { PyusdProcessor } from "@/lib/mempool/processors";
import type {
  MempoolFilters,
  NetworkConditions,
  PyusdTransaction,
  SortConfig,
} from "@/lib/mempool/types";

interface UseMempoolFiltersOptions {
  initialFilters?: Partial<MempoolFilters>;
  initialSort?: SortConfig;
  pageSize?: number;
}

export function useMempoolFilters(options: UseMempoolFiltersOptions = {}) {
  const {
    initialFilters = {},
    initialSort = { field: "gasPrice", direction: "desc" },
    pageSize = 50,
  } = options;

  const [filters, setFilters] = useState<MempoolFilters>({
    minGasPrice: initialFilters.minGasPrice,
    maxGasPrice: initialFilters.maxGasPrice,
    functionTypes: initialFilters.functionTypes || [],
    addressFilter: initialFilters.addressFilter || "",
    showPyusdOnly: initialFilters.showPyusdOnly ?? false,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);

  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");

  const updateFilters = useCallback((newFilters: Partial<MempoolFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const updateSort = useCallback(
    (field: string, direction?: "asc" | "desc") => {
      setSortConfig((prev) => ({
        field,
        direction:
          direction ||
          (prev.field === field && prev.direction === "desc" ? "asc" : "desc"),
      }));
      setCurrentPage(1);
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({
      minGasPrice: undefined,
      maxGasPrice: undefined,
      functionTypes: [],
      addressFilter: "",
      showPyusdOnly: false,
    });
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  const filterPyusdTransactions = useCallback(
    (transactions: PyusdTransaction[]) => {
      let filtered = transactions;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (tx) =>
            tx.hash.toLowerCase().includes(query) ||
            tx.from.toLowerCase().includes(query) ||
            tx.to.toLowerCase().includes(query) ||
            tx.function.name.toLowerCase().includes(query)
        );
      }

      filtered = PyusdProcessor.filterPyusdTransactions(filtered, {
        functionNames: filters.functionTypes?.length
          ? filters.functionTypes
          : undefined,
        minGasPrice: filters.minGasPrice,
        maxGasPrice: filters.maxGasPrice,
        addressFilter: filters.addressFilter || undefined,
      });

      return filtered;
    },
    [filters, searchQuery]
  );

  const sortPyusdTransactions = useCallback(
    (transactions: PyusdTransaction[]) => {
      const sortField = sortConfig.field as
        | "gasPrice"
        | "timestamp"
        | "function"
        | "value";
      return PyusdProcessor.sortPyusdTransactions(
        transactions,
        sortField,
        sortConfig.direction
      );
    },
    [sortConfig]
  );

  const processedPyusdTransactions = useMemo(() => {
    return (transactions: PyusdTransaction[]) => {
      const filtered = filterPyusdTransactions(transactions);

      const sorted = sortPyusdTransactions(filtered);

      const totalItems = sorted.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = sorted.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        totalItems,
        totalPages,
        currentPage,
        pageSize,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      };
    };
  }, [filterPyusdTransactions, sortPyusdTransactions, currentPage, pageSize]);

  const processedNetworkConditions = useMemo(() => {
    return (networks: NetworkConditions[]) => {
      let filtered = [...networks];

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((network) =>
          network.network.toLowerCase().includes(query)
        );
      }

      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortConfig.field) {
          case "network":
            comparison = a.network.localeCompare(b.network);
            break;
          case "pending":
            comparison = a.txPoolStatus.pending - b.txPoolStatus.pending;
            break;
          case "queued":
            comparison = a.txPoolStatus.queued - b.txPoolStatus.queued;
            break;
          case "congestion":
            comparison =
              a.congestionAnalysis.factor - b.congestionAnalysis.factor;
            break;
          case "baseFee":
            comparison = a.baseFee - b.baseFee;
            break;
          default:
            comparison = a.txPoolStatus.pending - b.txPoolStatus.pending;
        }

        return sortConfig.direction === "asc" ? comparison : -comparison;
      });

      return filtered;
    };
  }, [searchQuery, sortConfig]);

  const getAvailableFunctionTypes = useCallback(
    (transactions: PyusdTransaction[]) => {
      const functionTypes = new Set<string>();
      transactions.forEach((tx) => functionTypes.add(tx.function.name));
      return Array.from(functionTypes).sort();
    },
    []
  );

  const getFilterStats = useCallback(
    (
      originalTransactions: PyusdTransaction[],
      filteredTransactions: PyusdTransaction[]
    ) => {
      return {
        total: originalTransactions.length,
        filtered: filteredTransactions.length,
        percentage:
          originalTransactions.length > 0
            ? (filteredTransactions.length / originalTransactions.length) * 100
            : 0,
        hasActiveFilters:
          filters.minGasPrice !== undefined ||
          filters.maxGasPrice !== undefined ||
          (filters.functionTypes && filters.functionTypes.length > 0) ||
          filters.addressFilter !== "" ||
          searchQuery.trim() !== "",
      };
    },
    [filters, searchQuery]
  );

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback((totalPages: number) => {
    setCurrentPage(totalPages);
  }, []);

  return {
    filters,
    updateFilters,
    clearFilters,

    sortConfig,
    updateSort,

    searchQuery,
    setSearchQuery,

    currentPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,

    processedPyusdTransactions,
    processedNetworkConditions,
    getAvailableFunctionTypes,
    getFilterStats,

    filterPyusdTransactions,
    sortPyusdTransactions,
  };
}
