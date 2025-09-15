---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Stack

- **React 19.1.0** + **TypeScript 5.8.3** (strict mode enabled)
- **Vite 7.0.6** with SWC plugin for fast builds
- **Tailwind CSS 3.4.17** + **shadcn/ui** component library
- **TanStack React Query 5.83.0** for server state management
- **ethers.js 6.15.0** for blockchain interactions

## Code Standards

### Import Order (STRICT - Follow Exactly)

```typescript
// 1. External libraries
import React from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Internal utilities
import { cn } from "@/lib/utils";

// 3. Components (UI first, then domain)
import { Button } from "@/components/ui/Button";
import { TraceComponent } from "@/components/trace";

// 4. Hooks and services
import { useBlockchainData } from "@/hooks/useBlockchainData";

// 5. Types (always last)
import type { TraceResult } from "@/lib/trace/types";
```

### Naming Conventions (MANDATORY)

- **Components**: PascalCase (`TransactionAnalytics.tsx`)
- **Hooks**: kebab-case with `use-` prefix (`use-blockchain-data.ts`)
- **Utilities**: camelCase (`traceProcessor.ts`)
- **Types**: PascalCase interfaces (`TraceResult`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_CACHE_TIME`)
- **Imports**: Always use `@/*` alias, never `../` beyond one level

### Component Requirements

- All components MUST have TypeScript interfaces for props
- Use `cn()` utility for conditional Tailwind classes
- UI components from `@/components/ui/`, domain components in `@/components/[domain]/`
- Wrap all major components with error boundaries

## Data Management

### React Query (REQUIRED)

```typescript
// Standard query configuration
const { data, isLoading, error } = useQuery({
  queryKey: ["feature-data"],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000, // 5 minutes minimum
  retry: 3,
});
```

### Forms & Validation

- **React Hook Form** + **Zod** for all form validation
- Validate ALL blockchain data with Zod schemas before processing
- Never trust external API responses without validation

### Performance Rules (NON-NEGOTIABLE)

- **Virtualization**: Use `@tanstack/react-virtual` for datasets >1000 items
- **Loading States**: Show skeleton UI for operations >200ms
- **Lazy Loading**: Use `React.lazy()` for all route components
- **Caching**: Multi-layer caching (memory → localStorage → IndexedDB)

## Blockchain Integration Standards

- **Networks**: Support Ethereum Mainnet, Sepolia testnet, custom RPCs
- **Tracing**: Use `debug_traceTransaction` with `callTracer` and `structLog`
- **Error Handling**: Implement exponential backoff retry for network failures
- **State Management**: Preserve application state during network switching

## Accessibility Requirements (WCAG 2.1 AA)

- Use semantic HTML elements (`<main>`, `<section>`, `<article>`)
- Include proper ARIA labels and descriptions
- Ensure full keyboard navigation with visible focus indicators
- Test with screen readers and maintain focus management in modals

## Mandatory Features

- **Export**: JSON/CSV export for ALL data views
- **Responsive**: Mobile-first design approach
- **TypeScript**: 100% type coverage, no `any` types allowed
- **Error Handling**: User-friendly error messages with retry mechanisms

## Development Commands

```bash
npm run dev    # Development server (port 5173)
npm run build  # Production build with type checking
npm run lint   # ESLint with auto-fix enabled
```
