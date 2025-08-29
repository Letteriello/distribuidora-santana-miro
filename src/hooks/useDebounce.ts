import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook personalizado para debounce otimizado
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos
 * @param options - Opções adicionais
 */
export function useDebounce<T>(
  value: T,
  delay: number,
  options: {
    leading?: boolean; // Executar imediatamente na primeira chamada
    trailing?: boolean; // Executar após o delay (padrão: true)
    maxWait?: number; // Tempo máximo para aguardar
  } = {}
) {
  const { leading = false, trailing = true, maxWait } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leadingRef = useRef<boolean>(true);
  const valueRef = useRef<T>(value);

  // Atualizar refs sem causar re-renders
  valueRef.current = value;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    leadingRef.current = true;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      setDebouncedValue(valueRef.current);
      cancel();
    }
  }, [cancel]);

  useEffect(() => {
    // Limpar timeouts existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // Verificar se deve executar imediatamente (leading)
    if (leading && leadingRef.current) {
      leadingRef.current = false;
      setDebouncedValue(value);
      return;
    }

    // Configurar timeout principal
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(valueRef.current);
        timeoutRef.current = null;
      }, delay);
    }

    // Configurar maxWait se especificado
    if (maxWait !== undefined) {
      maxTimeoutRef.current = setTimeout(() => {
        setDebouncedValue(valueRef.current);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        maxTimeoutRef.current = null;
      }, maxWait);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, leading, trailing, maxWait]);

  return {
    debouncedValue,
    cancel,
    flush,
    isPending: timeoutRef.current !== null,
  };
}

/**
 * Hook simplificado para debounce de busca
 * @param searchTerm - Termo de busca
 * @param delay - Delay em milissegundos (padrão: 300ms)
 */
export function useSearchDebounce(searchTerm: string, delay: number = 300) {
  return useDebounce(searchTerm.trim().toLowerCase(), delay, {
    leading: false,
    trailing: true,
    maxWait: 1000, // Máximo 1 segundo de espera
  });
}

/**
 * Hook para debounce de callback
 * @param callback - Função a ser executada
 * @param delay - Delay em milissegundos
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);
  const delayRef = useRef<number>(delay);

  // Atualizar refs sem causar re-renders
  callbackRef.current = callback;
  delayRef.current = delay;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
      timeoutRef.current = null;
    }, delayRef.current);
  }, []);

  const flush = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    callbackRef.current(...args);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    debouncedCallback,
    cancel,
    flush,
    isPending: timeoutRef.current !== null,
  };
}
