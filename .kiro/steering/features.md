---
inclusion: always
---

# Feature Development Guide

## Mandatory File Structure

Create this EXACT structure for every new feature:

```
src/
├── components/[feature-name]/
│   ├── [FeatureComponent].tsx
│   └── index.ts
├── hooks/use-[feature-name].ts
├── lib/[feature-name]/
│   ├── [feature]Service.ts
│   ├── types.ts
│   └── index.ts
└── pages/[FeatureName].tsx
```

## Naming Rules (Non-Negotiable)

- **Directories**: kebab-case (`gas-analyzer`, `transaction-trace`)
- **Components**: PascalCase (`GasAnalyzer.tsx`, `TransactionTrace.tsx`)
- **Hooks**: kebab-case with `use-` prefix (`use-gas-data.ts`, `use-trace-data.ts`)
- **Services**: camelCase (`gasService.ts`, `traceProcessor.ts`)
- **Pages**: PascalCase (`GasAnalyzer.tsx` for route `/gas-analyzer`)

## Implementation Steps (Follow This Order)

### 1. Types First - Always Start Here

```typescript
// lib/[feature]/types.ts
export interface FeatureData {
  id: string;
  // Define complete data structures before coding
}

export interface FeatureConfig {
  // Configuration interfaces
}
```

### 2. Service Hook with React Query

```typescript
// hooks/use-[feature-name].ts
import { useQuery } from "@tanstack/react-query";
import type { FeatureData } from "@/lib/[feature]/types";

export const useFeatureData = () => {
  return useQuery({
    queryKey: ["feature-data"],
    queryFn: async (): Promise<FeatureData[]> => {
      // Implementation
    },
    staleTime: 5 * 60 * 1000, // REQUIRED: 5min cache
    retry: 3,
  });
};
```

### 3. Component with Error Handling

```typescript
// components/[feature]/[Feature].tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useFeatureData } from "@/hooks/use-[feature-name]";
import type { FeatureData } from "@/lib/[feature]/types";

interface Props {
  className?: string;
}

export const Feature: React.FC<Props> = ({ className }) => {
  const { data, isLoading, error } = useFeatureData();

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Feature content */}
    </div>
  );
};
```

## Integration Checklist (Complete Every Item)

For EVERY new feature:

1. **File Structure**: Create ALL files in the mandatory structure above
2. **Barrel Exports**: Add `index.ts` to every component directory
3. **Route Integration**: Add route to `src/App.tsx`
4. **Navigation**: Update `src/components/layout/Navbar.tsx`
5. **Error Handling**: Implement loading states and error boundaries
6. **TypeScript**: Define all interfaces before implementation
7. **Performance**: Add virtualization for large datasets (>1000 items)
8. **Accessibility**: Include ARIA labels and keyboard navigation

## Code Standards (Enforce Strictly)

### Import Order (Exact Order Required)

```typescript
// 1. External libraries
import React from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Internal utilities
import { cn } from "@/lib/utils";

// 3. UI components first, then domain components
import { Button } from "@/components/ui/Button";
import { FeatureComponent } from "@/components/feature";

// 4. Hooks and services
import { useFeatureData } from "@/hooks/use-feature-data";

// 5. Types (always last)
import type { FeatureData } from "@/lib/feature/types";
```

### Performance Rules (Non-Negotiable)

- **Loading States**: Show skeleton UI for operations >200ms
- **Virtualization**: Use `@tanstack/react-virtual` for datasets >1000 items
- **Caching**: React Query with 5-minute stale time minimum
- **Error Boundaries**: Wrap all components with error handling
- **Lazy Loading**: Use `React.lazy()` for route components

### Accessibility Standards (WCAG 2.1 AA)

- Use semantic HTML (`<main>`, `<section>`, `<article>`)
- Include `aria-label` and `aria-describedby` attributes
- Ensure full keyboard navigation with proper focus management
- Test with screen readers

## Critical AI Assistant Rules

### File Creation (Never Skip)

- Create ALL files in the mandatory structure - no exceptions
- Generate barrel exports (`index.ts`) for every component directory
- Follow naming conventions exactly as specified above

### Implementation Order (Strict)

1. **Types First**: Define all TypeScript interfaces before any implementation
2. **Service Layer**: Create hooks with React Query integration
3. **Components**: Build UI with proper error handling and loading states
4. **Integration**: Add routes, navigation, and barrel exports

### Quality Gates (Must Pass)

- **Error Handling**: Wrap all async operations in try/catch blocks
- **Performance**: Implement virtualization for large datasets
- **Accessibility**: Include ARIA labels and keyboard navigation
- **TypeScript**: Ensure complete type coverage with no `any` types

### Navigation Updates (Always Required)

- Add new routes to `src/App.tsx`
- Update navigation in `src/components/layout/Navbar.tsx`
- Create proper breadcrumb navigation for nested features
