---
inclusion: always
---

---

## inclusion: always

# Project Structure & Architecture

## Directory Structure (Mandatory)

### Core Directories

- `src/components/` - Domain-organized components with barrel exports
- `src/hooks/` - Custom React hooks (kebab-case with `use-` prefix)
- `src/lib/` - Business logic, utilities, and services
- `src/pages/` - Route-level page components

### Component Organization

```
components/
├── ui/          # shadcn/ui base components
├── global/      # Cross-app reusable components
├── layout/      # Navigation, Layout, Footer
├── modals/      # Dialog components
├── trace/       # Blockchain analysis components
└── [domain]/    # Feature-specific components
```

## Naming Conventions (Strict)

- **Components**: PascalCase (`TransactionAnalytics.tsx`)
- **Hooks**: kebab-case (`use-blockchain-data.ts`)
- **Utilities**: camelCase (`traceProcessor.ts`)
- **Types**: PascalCase interfaces (`TraceResult`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_CACHE_TIME`)

## Import Order (Exact Order Required)

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
import { useBlockchainData } from "@/hooks/use-blockchain-data";

// 5. Types (always last)
import type { TraceResult } from "@/lib/trace/types";
```

## Path Resolution Rules

- Use `@/*` alias for all internal imports (maps to `./src/*`)
- Avoid `../` beyond one level
- Always create barrel exports (`index.ts`) in component directories

## Component Template

```typescript
interface Props {
  className?: string;
  // Define all props with TypeScript
}

export const ComponentName: React.FC<Props> = ({ className, ...props }) => {
  return (
    <div className={cn("base-classes", className)}>
      {/* Content */}
    </div>
  );
};
```

## Architecture Patterns

### State Management

- **Server State**: React Query with 5-minute stale time minimum
- **Client State**: React hooks, Context only for global UI state
- **Forms**: React Hook Form + Zod validation

### Performance (Non-Negotiable)

- Virtualize datasets >1000 items with `@tanstack/react-virtual`
- Lazy load routes with `React.lazy()`
- Skeleton UI for operations >200ms
- `React.memo` for expensive components

### Error Handling

- Wrap all async operations in try/catch
- Error Boundaries for component-level errors
- User-friendly error messages with retry mechanisms

### Accessibility (WCAG 2.1 AA)

- Semantic HTML with proper ARIA labels
- Full keyboard navigation support
- Focus management in modals and complex interactions

## New Feature Structure (Mandatory)

Create this EXACT structure for every feature:

```
src/
├── components/[feature]/
│   ├── [FeatureComponent].tsx
│   └── index.ts
├── hooks/use-[feature-name].ts
├── lib/[feature]/
│   ├── types.ts
│   ├── [feature]Service.ts
│   └── index.ts
└── pages/[FeatureName].tsx
```

## Integration Checklist (Complete All)

1. Create complete file structure above
2. Add route in `App.tsx`
3. Update navigation in `Navbar.tsx`
4. Create barrel exports in all directories
5. Implement error boundaries and loading states
6. Define TypeScript interfaces first
