import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "../lib/utils";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "true" || process.env.NODE_ENV !== "production";

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => Promise<void> | void;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  loadingComponent?: React.ReactNode;
  endMessage?: React.ReactNode;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.1,
  rootMargin = "100px",
  className,
  loadingComponent,
  endMessage,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Função para carregar mais dados
  const handleLoadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    try {
      await onLoadMore();
    } catch (error) {
      if (DEBUG) console.error("Erro ao carregar mais dados:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [hasMore, onLoadMore]);

  // Configurar Intersection Observer
  useEffect(() => {
    const currentLoadingRef = loadingRef.current;

    if (!currentLoadingRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          handleLoadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(currentLoadingRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoading, handleLoadMore, threshold, rootMargin]);

  // Atualizar referência de loading
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  const defaultLoadingComponent = (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-600">Carregando mais produtos...</span>
      </div>
    </div>
  );

  const defaultEndMessage = (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">Todos os produtos foram carregados!</p>
        <p className="text-gray-400 text-sm mt-1">Você visualizou todo o catálogo disponível.</p>
      </div>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {children}

      {/* Loading trigger element */}
      <div ref={loadingRef} className="w-full">
        {hasMore && isLoading && (loadingComponent || defaultLoadingComponent)}
        {!hasMore && (endMessage || defaultEndMessage)}
      </div>
    </div>
  );
};

export default InfiniteScroll;
