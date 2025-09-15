---
inclusion: fileMatch
fileMatchPattern: ["**/*.tsx", "**/*.ts"]
---

# Component Development Standards

## Import Rules (CRITICAL - Never Violate)

**ALWAYS import from `@/components/global/` - NEVER from `@/components/ui/` directly**

```typescript
// ✅ CORRECT
import { Button, Card, Input } from "@/components/global";

// ❌ FORBIDDEN
import { Button } from "@/components/ui/button";
```

## Component Architecture

### Two-Tier System

- **Global Components** (`@/components/global/`): Pure UI primitives, no business logic
- **Feature Components** (`@/components/[feature]/`): Domain logic, compose global components

Available global components: Accordion, Alert, Avatar, Badge, Breadcrumb, Button, Dropdown, Input, Label, Loader, Separator, Tooltip

### Component Creation Checklist

For new global components:

1. Create `src/components/global/ComponentName.tsx`
2. Add to `src/components/global/index.ts` barrel export
3. Use standard props interface (variant, size, className, disabled)
4. Implement full accessibility (ARIA, keyboard navigation)
5. Follow design system tokens exactly

### Standard Component Interface

```typescript
interface ComponentProps {
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}
```

## Design System Tokens (Use Exact Classes)

### Variant Classes

```typescript
const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};
```

### Size Classes

```typescript
const SIZES = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 py-2",
  lg: "h-11 px-8",
};
```

## Component Usage Patterns

### Feature Component Example

```typescript
// ✅ CORRECT - Feature component composition
import { Card, Button, Loader, Alert } from "@/components/global";
import { useTraceData } from "@/hooks/use-trace-data";

export const TransactionAnalytics = ({ txHash }: { txHash: string }) => {
  const { data, isLoading, error } = useTraceData(txHash);

  if (isLoading) return <Loader aria-label="Loading transaction data" />;
  if (error) return <Alert variant="destructive">{error.message}</Alert>;

  return (
    <Card>
      <Card.Header>Transaction Analysis</Card.Header>
      <Card.Content>{/* Analysis content */}</Card.Content>
    </Card>
  );
};
```

## Accessibility Requirements (WCAG 2.1 AA)

### Mandatory Accessibility Checklist

- Include `aria-label` for all interactive elements
- Support keyboard navigation (Enter/Space keys)
- Use semantic HTML elements when possible
- Provide focus indicators with `focus-visible:ring-2`
- Include loading states with descriptive labels

### Accessibility Implementation

```typescript
export const AccessibleComponent = ({ children, onClick, ...props }) => {
  return (
    <button
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
      aria-label="Descriptive action label"
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
```

## Performance Rules

### Required Optimizations

- Use `React.memo()` for components with expensive renders
- Implement `useMemo()` for heavy computations
- Use `useCallback()` for event handlers passed as props
- Show loading states for operations >200ms

### Loading State Pattern

```typescript
export const DataComponent = () => {
  const { data, isLoading, error } = useQuery(/* config */);

  if (isLoading) return <Loader aria-label="Loading data..." />;
  if (error) return <Alert variant="destructive">{error.message}</Alert>;

  return <div>{/* content */}</div>;
};
```

## Forbidden Patterns

```typescript
// ❌ NEVER - Direct shadcn/ui imports
import { Button } from "@/components/ui/button";

// ❌ NEVER - Missing accessibility
<button onClick={handleClick}>Click me</button>

// ❌ NEVER - Inline styles
<div style={{ backgroundColor: 'red' }}>Content</div>

// ❌ NEVER - Unhandled async data
const Component = () => {
  const { data } = useQuery(/* no error handling */);
  return <div>{data.property}</div>; // Will crash if data is null
};
```

## Component Template

```typescript
import React from "react";
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  onClick?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  children,
  variant = "default",
  size = "md",
  className,
  disabled = false,
  "aria-label": ariaLabel,
  onClick,
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",

        // Variants
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        variant === "outline" && "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",

        // Sizes
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-10 px-4 py-2",
        size === "lg" && "h-11 px-8",

        className
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
};
```
