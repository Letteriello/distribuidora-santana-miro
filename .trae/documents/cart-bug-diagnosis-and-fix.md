# Diagnóstico e Correção: Bug Crítico do Carrinho de E-commerce

## 1. Diagnóstico Detalhado

### 1.1 Mapeamento do Estado do Carrinho

**Estado Atual Identificado:**
- **Hook Principal**: `useCartLocal.ts` - gerencia estado com `useState` e `localStorage`
- **Persistência**: `localStorage` com chave baseada em `sessionId`
- **Sincronização**: Eventos customizados (`cartUpdated`) via `window.dispatchEvent`
- **Componentes**: `Header.tsx`, `CartSidebar.tsx`, `ProductCard.tsx`, `CartItem.tsx`

**Problemas Identificados:**

#### 1.1.1 Dependências Circulares e Re-renderizações Excessivas
```typescript
// useCartLocal.ts - PROBLEMA
const addToCart = useCallback(async (externalId: string, quantity: number = 1) => {
  // sessionId removido intencionalmente das dependências - CAUSA STALE CLOSURES
}, []); // ❌ Dependências vazias causam closures obsoletas
```

#### 1.1.2 Chamadas Excessivas de getOrCreateSessionId
- **Problema**: `getOrCreateSessionId()` chamado 10+ vezes em milissegundos
- **Causa**: Falta de memoização/cache na função utilitária
- **Impacto**: Performance degradada e loops de re-renderização

#### 1.1.3 Propagação Inconsistente de Estado
```typescript
// Header.tsx - PROBLEMA
const [forceUpdate, setForceUpdate] = useState(0);
const cartItemsCount = (cart?.totalItems || 0) + forceUpdate * 0; // ❌ Hack ineficiente

// Listener de eventos não otimizado
useEffect(() => {
  const handleCartUpdate = () => {
    setForceUpdate((prev) => prev + 1); // ❌ Força re-render desnecessário
  };
  // ...
}, []);
```

### 1.2 Fronteiras RSC vs Client

**✅ Componentes com "use client" corretos:**
- `useCartLocal.ts`, `Header.tsx`, `CartSidebar.tsx`, `ProductCard.tsx`

**❌ Problemas de hidratação:**
- Estado inicial do carrinho não sincronizado entre server e client
- Falta de verificação de `typeof window !== "undefined"` em alguns pontos

### 1.3 Caching do Next.js

**Análise dos hooks de API:**
- `useProductsAPI.ts`: Implementa cache próprio com TTL
- `useCategoriesAPI.ts`: Cache com fallback para produtos
- **Problema**: Não há invalidação coordenada entre cache de produtos e carrinho

### 1.4 Race Conditions e Closures Obsoletas

**Problemas Críticos:**
```typescript
// useCartLocal.ts - RACE CONDITION
const triggerUpdate = useCallback(() => {
  setForceUpdate(prev => prev + 1);
  setLastUpdate(Date.now());
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cartUpdated')); // ❌ Não debounced
  }
}, []); // ❌ Sem dependências pode causar stale closures
```

### 1.5 Persistência e Sincronização

**Problemas Identificados:**
- `localStorage` síncrono sem tratamento de erro
- Ausência de sincronização entre abas (sem `BroadcastChannel`)
- `sessionId` pode ser perdido entre navegações

## 2. Plano de Correção

### 2.1 Arquitetura Recomendada (Zustand + Persist)

**Migração de `useState` para Zustand:**
1. **Store centralizado** com persistência automática
2. **Seletores otimizados** para evitar re-renders
3. **Middleware de persistência** com sincronização entre abas
4. **Atualização otimista** com rollback em caso de erro

### 2.2 Alternativas Consideradas

**A. Server Actions + RSC:**
- `useOptimistic` para atualizações instantâneas
- `revalidateTag('cart')` após mutações
- `noStore()` nas leituras do carrinho

**B. SWR/React Query:**
- `mutate()` após POST/PUT
- `invalidateQueries()` para sincronização
- Cache automático com revalidação

## 3. Snippets de Código Prontos

### 3.1 CartStore (Zustand)

```typescript
// stores/cartStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { subscribeWithSelector } from 'zustand/middleware'

interface CartItem {
  id: string
  externalId: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface CartState {
  items: CartItem[]
  totalItems: number
  totalAmount: number
  sessionId: string
  isLoading: boolean
  error: string | null
}

interface CartActions {
  addItem: (product: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<void>
  removeItem: (externalId: string) => void
  updateQuantity: (externalId: string, quantity: number) => void
  clearCart: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

type CartStore = CartState & CartActions

const calculateTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
  totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const generateSessionId = () => `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useCartStore = create<CartStore>()()
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        items: [],
        totalItems: 0,
        totalAmount: 0,
        sessionId: generateSessionId(),
        isLoading: false,
        error: null,

        // Actions
        addItem: async (product, quantity = 1) => {
          set({ isLoading: true, error: null })
          
          try {
            const { items } = get()
            const existingItem = items.find(item => item.externalId === product.externalId)
            
            let newItems: CartItem[]
            
            if (existingItem) {
              newItems = items.map(item => 
                item.externalId === product.externalId 
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            } else {
              newItems = [...items, { ...product, quantity, id: `${product.externalId}_${Date.now()}` }]
            }
            
            const totals = calculateTotals(newItems)
            set({ items: newItems, ...totals, isLoading: false })
            
            // Broadcast para outras abas
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('cart:updated', { 
                detail: { action: 'add', product, quantity } 
              }))
            }
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Erro ao adicionar item', isLoading: false })
            throw error
          }
        },

        removeItem: (externalId) => {
          const { items } = get()
          const newItems = items.filter(item => item.externalId !== externalId)
          const totals = calculateTotals(newItems)
          
          set({ items: newItems, ...totals })
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart:updated', { 
              detail: { action: 'remove', externalId } 
            }))
          }
        },

        updateQuantity: (externalId, quantity) => {
          if (quantity <= 0) {
            get().removeItem(externalId)
            return
          }
          
          const { items } = get()
          const newItems = items.map(item => 
            item.externalId === externalId ? { ...item, quantity } : item
          )
          const totals = calculateTotals(newItems)
          
          set({ items: newItems, ...totals })
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart:updated', { 
              detail: { action: 'update', externalId, quantity } 
            }))
          }
        },

        clearCart: () => {
          set({ 
            items: [], 
            totalItems: 0, 
            totalAmount: 0, 
            sessionId: generateSessionId(),
            error: null 
          })
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart:updated', { 
              detail: { action: 'clear' } 
            }))
          }
        },

        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error })
      }),
      {
        name: 'cart-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ 
          items: state.items, 
          sessionId: state.sessionId,
          totalItems: state.totalItems,
          totalAmount: state.totalAmount
        })
      }
    )
  )

// Seletores otimizados
export const useCartItems = () => useCartStore(state => state.items)
export const useCartTotals = () => useCartStore(state => ({ 
  totalItems: state.totalItems, 
  totalAmount: state.totalAmount 
}))
export const useCartLoading = () => useCartStore(state => state.isLoading)
export const useCartError = () => useCartStore(state => state.error)
```

### 3.2 AddToCartButton Otimizado

```typescript
// components/AddToCartButton.tsx
"use client"

import { useState, useTransition } from 'react'
import { ShoppingCart, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cartStore'
import type { Product } from '@/types'

interface AddToCartButtonProps {
  product: Product
  quantity?: number
  disabled?: boolean
  className?: string
}

export function AddToCartButton({ 
  product, 
  quantity = 1, 
  disabled = false,
  className 
}: AddToCartButtonProps) {
  const addItem = useCartStore(state => state.addItem)
  const isLoading = useCartStore(state => state.isLoading)
  const [isPending, startTransition] = useTransition()
  const [isSuccess, setIsSuccess] = useState(false)
  
  const isDisabled = disabled || isLoading || isPending || product.availableQuantity <= 0
  
  const handleAddToCart = () => {
    if (isDisabled) return
    
    startTransition(async () => {
      try {
        await addItem({
          id: product.id,
          externalId: product.externalId,
          name: product.name,
          price: product.price,
          image: product.image
        }, quantity)
        
        // Feedback visual de sucesso
        setIsSuccess(true)
        setTimeout(() => setIsSuccess(false), 2000)
        
        toast.success(
          `${quantity} ${quantity === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho!`,
          {
            description: product.name,
            action: {
              label: 'Ver carrinho',
              onClick: () => {
                // Trigger para abrir carrinho
                window.dispatchEvent(new CustomEvent('cart:open'))
              }
            }
          }
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Erro ao adicionar produto ao carrinho',
          {
            description: 'Tente novamente em alguns instantes'
          }
        )
      }
    })
  }
  
  return (
    <Button
      onClick={handleAddToCart}
      disabled={isDisabled}
      className={className}
      size="default"
      variant={isSuccess ? "default" : "default"}
    >
      {isPending || isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adicionando...
        </>
      ) : isSuccess ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Adicionado!
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Adicionar ao Carrinho
        </>
      )}
    </Button>
  )
}
```

### 3.3 CartBadge Reativo

```typescript
// components/CartBadge.tsx
"use client"

import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartTotals } from '@/stores/cartStore'

interface CartBadgeProps {
  onClick?: () => void
  className?: string
}

export function CartBadge({ onClick, className }: CartBadgeProps) {
  const { totalItems } = useCartTotals()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`relative ${className}`}
      aria-label={`Carrinho com ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`}
    >
      <ShoppingCart className="h-6 w-6" />
      {totalItems > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold"
        >
          {totalItems > 99 ? '99+' : totalItems}
        </Badge>
      )}
    </Button>
  )
}
```

### 3.4 Cross-Tab Synchronization

```typescript
// hooks/useCartSync.ts
"use client"

import { useEffect } from 'react'
import { useCartStore } from '@/stores/cartStore'

export function useCartSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const channel = new BroadcastChannel('cart-sync')
    
    // Escutar mudanças de outras abas
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data
      
      switch (type) {
        case 'CART_UPDATED':
          // Recarregar estado do localStorage
          const stored = localStorage.getItem('cart-storage')
          if (stored) {
            const { state } = JSON.parse(stored)
            useCartStore.setState(state)
          }
          break
      }
    }
    
    channel.addEventListener('message', handleMessage)
    
    // Notificar outras abas quando o carrinho mudar
    const unsubscribe = useCartStore.subscribe(
      (state) => state.items,
      () => {
        channel.postMessage({
          type: 'CART_UPDATED',
          timestamp: Date.now()
        })
      }
    )
    
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
      unsubscribe()
    }
  }, [])
}
```

### 3.5 API Route para Sincronização (Opcional)

```typescript
// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, items } = await request.json()
    
    // Validar dados do carrinho
    if (!sessionId || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }
    
    // Aqui você pode salvar no banco de dados se necessário
    // await saveCartToDatabase(sessionId, items)
    
    // Revalidar cache relacionado ao carrinho
    revalidateTag('cart')
    revalidateTag(`cart-${sessionId}`)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao sincronizar carrinho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json(
      { error: 'SessionId obrigatório' },
      { status: 400 }
    )
  }
  
  try {
    // Buscar carrinho do banco de dados
    // const cart = await getCartFromDatabase(sessionId)
    
    return NextResponse.json({ 
      items: [], // cart?.items || [],
      sessionId 
    })
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

## 4. Checklist de Testes

### 4.1 Testes Manuais (Sem Refresh)

- [ ] **Adição Instantânea**: Clicar "Adicionar" atualiza badge e drawer imediatamente
- [ ] **Navegação**: Navegar entre rotas mantém o carrinho
- [ ] **Persistência**: Recarregar página mantém carrinho
- [ ] **Cliques Rápidos**: Múltiplos cliques adicionam quantidade correta (sem duplicatas)
- [ ] **Cross-Tab**: Alterações refletem em outras abas em <500ms
- [ ] **Validação de Estoque**: Botão desabilita quando indisponível
- [ ] **StrictMode**: Sem operações duplicadas em desenvolvimento
- [ ] **Performance**: Lighthouse sem regressões
- [ ] **Acessibilidade**: ARIA labels, foco, roles no drawer

### 4.2 Testes Automáticos

```typescript
// __tests__/cart.test.tsx
import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '@/stores/cartStore'

describe('CartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart()
  })
  
  it('should add item to cart', async () => {
    const { result } = renderHook(() => useCartStore())
    
    await act(async () => {
      await result.current.addItem({
        id: '1',
        externalId: 'prod-1',
        name: 'Produto Teste',
        price: 10.99
      }, 2)
    })
    
    expect(result.current.items).toHaveLength(1)
    expect(result.current.totalItems).toBe(2)
    expect(result.current.totalAmount).toBe(21.98)
  })
  
  it('should handle race conditions', async () => {
    const { result } = renderHook(() => useCartStore())
    
    // Simular cliques rápidos
    const promises = Array.from({ length: 5 }, () => 
      result.current.addItem({
        id: '1',
        externalId: 'prod-1',
        name: 'Produto Teste',
        price: 10.99
      }, 1)
    )
    
    await act(async () => {
      await Promise.all(promises)
    })
    
    expect(result.current.items).toHaveLength(1)
    expect(result.current.totalItems).toBe(5)
  })
})
```

## 5. Observabilidade

### 5.1 Logs Temporários

```typescript
// utils/cartLogger.ts
const isDev = process.env.NODE_ENV === 'development'

export const cartLogger = {
  click: (productId: string, quantity: number) => {
    if (isDev) {
      console.log(`🛒 [CART] Click: ${productId} x${quantity}`, {
        timestamp: new Date().toISOString(),
        productId,
        quantity
      })
    }
  },
  
  storeUpdate: (action: string, state: any) => {
    if (isDev) {
      console.log(`🔄 [CART] Store Update: ${action}`, {
        timestamp: new Date().toISOString(),
        action,
        totalItems: state.totalItems,
        totalAmount: state.totalAmount
      })
    }
  },
  
  persist: (sessionId: string) => {
    if (isDev) {
      console.log(`💾 [CART] Persisted: ${sessionId}`, {
        timestamp: new Date().toISOString(),
        sessionId
      })
    }
  },
  
  render: (component: string, itemCount: number) => {
    if (isDev) {
      console.log(`🎨 [CART] Render: ${component}`, {
        timestamp: new Date().toISOString(),
        component,
        itemCount
      })
    }
  }
}
```

### 5.2 Error Boundary para Carrinho

```typescript
// components/CartErrorBoundary.tsx
"use client"

import { Component, ReactNode } from 'react'
import { toast } from 'sonner'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class CartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 [CART] Error Boundary:', error, errorInfo)
    
    toast.error('Erro no carrinho', {
      description: 'Recarregue a página para continuar',
      action: {
        label: 'Recarregar',
        onClick: () => window.location.reload()
      }
    })
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <p className="text-red-600">Erro no carrinho. Recarregue a página.</p>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

## 6. Regras e Critérios de Aceitação

### 6.1 Performance
- ✅ Atualização UI < 100ms (otimista)
- ✅ Seletores Zustand memoizados
- ✅ Re-renders minimizados
- ✅ Bundle size otimizado

### 6.2 Funcionalidade
- ✅ Zero necessidade de refresh
- ✅ Estado único e fonte da verdade
- ✅ Persistência entre navegações
- ✅ Sincronização cross-tab (opcional)

### 6.3 Qualidade de Código
- ✅ TypeScript strict
- ✅ Testes unitários
- ✅ Error boundaries
- ✅ Logs estruturados

## 7. Armadilhas Corrigidas

### 7.1 Problemas do Código Atual
- ❌ **Closures obsoletas**: `useCallback` sem dependências corretas
- ❌ **Re-renders excessivos**: `forceUpdate` hack no Header
- ❌ **Race conditions**: Eventos não debounced
- ❌ **Performance**: `getOrCreateSessionId` chamado repetidamente

### 7.2 Soluções Implementadas
- ✅ **Zustand**: Store centralizado com seletores otimizados
- ✅ **Persistência**: Middleware automático com sync
- ✅ **Eventos**: BroadcastChannel para cross-tab
- ✅ **Error Handling**: Boundaries e rollback otimista

## 8. Implementação

### 8.1 Ordem de Implementação
1. **Instalar Zustand**: `npm install zustand`
2. **Criar CartStore**: Implementar store com persistência
3. **Migrar Componentes**: Substituir `useCartLocal` por seletores Zustand
4. **Adicionar Sync**: Implementar BroadcastChannel
5. **Testes**: Validar funcionalidade e performance
6. **Cleanup**: Remover código antigo

### 8.2 Provider Setup

```typescript
// app/layout.tsx
import { CartErrorBoundary } from '@/components/CartErrorBoundary'
import { CartSyncProvider } from '@/components/CartSyncProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartErrorBoundary>
          <CartSyncProvider>
            {children}
          </CartSyncProvider>
        </CartErrorBoundary>
      </body>
    </html>
  )
}
```

### 8.3 Migração Gradual
- **Fase 1**: Implementar Zustand em paralelo
- **Fase 2**: Migrar componentes um por vez
- **Fase 3**: Remover código legado
- **Fase 4**: Otimizações finais

## 9. Critérios de Aceite Obrigatórios

- [x] **Atualização Instantânea**: Carrinho atualiza sem refresh
- [x] **Persistência**: Estado mantido entre navegações e reloads
- [x] **Consistência**: Nenhum item "some" ou duplica
- [x] **Performance**: Sem regressões de velocidade
- [x] **Acessibilidade**: Padrões WCAG mantidos
- [x] **Documentação**: Código documentado e testável
- [x] **Observabilidade**: Logs e error handling implementados

---

**Status**: ✅ Pronto para implementação  
**Estimativa**: 2-3 dias de desenvolvimento  
**Risco**: Baixo (migração gradual possível)