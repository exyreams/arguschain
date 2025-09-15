# Design Document

## Overview

The Not Found Page is implemented as a modular component system that provides a user-friendly 404 error experience. The design consists of reusable components that can be composed together to create different variations of the error page, from a standalone component-based version to a full-page implementation with navigation headers and footers.

## Architecture

### Component Structure

```
NotFoundPage (Standalone Component)
├── Header (Branding Logo)
├── ErrorContent (Main Content)
│   ├── ErrorIllustration (SVG/Fallback Display)
│   ├── ErrorMessage (Typography & Content)
│   └── NavigationActions (Recovery Buttons)
└── Footer (Help Text)

NotFound (Full Page Component)
├── Statusbar (Application Status)
├── Navbar (Full Navigation)
├── ErrorContent (Simplified)
│   ├── Shield Icon (Fallback Icon)
│   ├── Error Message
│   └── Single Recovery Button
└── Footer (Application Footer)
```

### Routing Integration

The 404 pages integrate with React Router using:

- Catch-all route pattern: `<Route path="*" element={<NotFound />} />`
- URL preservation for debugging purposes
- Browser history API integration for "Go Back" functionality
- Proper navigation state management

### State Management

The 404 pages are primarily stateless and rely on:

- React Router for navigation actions
- Local component state for image loading and error handling
- Configuration props for customization
- Browser APIs for history navigation

## Components and Interfaces

### NotFoundPage Component (Standalone)

```typescript
interface NotFoundPageProps {
  className?: string;
  config?: Partial<ErrorPageConfig>;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({
  className,
  config: userConfig,
}) => {
  // Configurable, component-based implementation
};
```

**Responsibilities:**

- Render complete 404 experience with branding
- Handle configuration merging and customization
- Manage responsive layout and accessibility
- Set page title and meta information

### ErrorIllustration Component

```typescript
interface ErrorIllustrationProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  src?: string;
  alt?: string;
}

const ErrorIllustration: React.FC<ErrorIllustrationProps> = ({
  className,
  size = "lg",
  animate = true,
  src = "/src/assets/error_logo.svg",
  alt = "Error illustration",
}) => {
  // SVG loading with fallback handling
};
```

**Responsibilities:**

- Display SVG illustration with proper sizing
- Handle loading states and error fallbacks
- Provide CSS-based fallback icon when SVG fails
- Support responsive scaling and animations

### NavigationActions Component

```typescript
interface NavigationActionsProps {
  actions: NavigationAction[];
  onActionClick?: (action: NavigationAction) => void;
  className?: string;
}

const NavigationActions: React.FC<NavigationActionsProps> = ({
  actions,
  onActionClick,
  className,
}) => {
  // Navigation rendering and routing logic
};
```

**Responsibilities:**

- Render navigation buttons with proper styling
- Handle click events and routing logic
- Support browser history navigation for "Go Back"
- Provide keyboard navigation and accessibility

### NotFound Component (Full Page)

```typescript
const NotFound = () => {
  const location = useLocation();

  // Simple, integrated page with full navigation
};
```

**Responsibilities:**

- Provide full-page 404 experience with app navigation
- Log attempted URLs for debugging
- Display simplified error message and single recovery option
- Integrate with existing application layout components

## Data Models

### Error Page Configuration

```typescript
interface ErrorPageConfig {
  title: string;
  subtitle: string;
  description: string;
  illustration: {
    src: string;
    alt: string;
    size: "sm" | "md" | "lg";
  };
  actions: NavigationAction[];
}

interface NavigationAction {
  label: string;
  path: string;
  variant:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "link";
  icon?: React.ComponentType<{ className?: string }>;
}

const DEFAULT_404_CONFIG: ErrorPageConfig = {
  title: "404",
  subtitle: "Page Not Found",
  description: "The page you're looking for doesn't exist or has been moved.",
  illustration: {
    src: "/src/assets/error_logo.svg",
    alt: "Arguschain error illustration",
    size: "lg",
  },
  actions: [
    
    {
      label: "Go Back",
      path: "back",
      variant: "secondary",
    },
    {
      label: "Debug Trace",
      path: "/debug-trace",
      variant: "outline",
    },
    {
      label: "Transaction Analysis",
      path: "/trace-transaction",
      variant: "outline",
    },
  ],
};
```

## Error Handling

### Graceful Degradation

1. **SVG Loading Failure**
   - Automatic fallback to CSS-based error icon
   - Maintains layout structure and accessibility
   - Loading states with spinner animation

2. **Navigation Failures**
   - Browser history fallback for "Go Back" action
   - Dashboard redirect when no history available
   - Error logging without user impact

3. **Component Failures**
   - Memoized components to prevent unnecessary re-renders
   - Error boundaries at component level
   - Fallback UI for critical failures

### Error States

```typescript
// Image loading states
const [imageError, setImageError] = useState(false);
const [isLoaded, setIsLoaded] = useState(false);

// Fallback icon when SVG fails
const FallbackIcon = () => (
  <div className="flex items-center justify-center rounded-full bg-bg-dark-secondary">
    <svg className="w-1/2 h-1/2 text-text-secondary">
      {/* Error icon SVG */}
    </svg>
  </div>
);
```

## Performance Considerations

### Loading Optimization

1. **Component Memoization**
   - `React.memo` for all components to prevent unnecessary re-renders
   - Stable callback functions with `useCallback`
   - Efficient prop comparison

2. **Image Loading**
   - Loading states with spinner animation
   - Graceful fallback to CSS icons
   - Proper error handling and user feedback

3. **Responsive Performance**
   - CSS-based responsive design
   - Efficient Tailwind class composition
   - Minimal JavaScript for interactions

### Bundle Optimization

1. **Code Splitting**
   - Components can be lazy-loaded if needed
   - Minimal dependencies and imports
   - Efficient tree-shaking

2. **Asset Management**
   - SVG illustrations loaded on-demand
   - Fallback icons using CSS/SVG
   - No external dependencies for core functionality

## Accessibility Implementation

### WCAG 2.1 AA Compliance

1. **Semantic HTML Structure**

   ```html
   <main
     role="main"
     aria-labelledby="error-title"
     aria-describedby="error-description"
   >
     <h1 id="error-title">404</h1>
     <h2>Page Not Found</h2>
     <p id="error-description">The page you're looking for doesn't exist...</p>
     <nav aria-label="Error recovery options">
       <!-- Navigation buttons -->
     </nav>
   </main>
   ```

2. **Keyboard Navigation**
   - Full keyboard support for all interactive elements
   - Proper tab order and focus management
   - Enter and Space key handling for buttons
   - Visible focus indicators

3. **Screen Reader Support**
   - Descriptive ARIA labels and roles
   - Screen reader only instructions
   - Proper heading hierarchy
   - Meaningful alt text for images

### Touch and Mobile Optimization

1. **Touch Targets**
   - Minimum 44px touch targets for all buttons
   - Adequate spacing between interactive elements
   - Touch-friendly hover states and feedback

2. **Responsive Design**
   - Mobile-first CSS approach
   - Flexible layouts that work on all screen sizes
   - Optimized typography scaling

## Mobile Responsiveness

### Breakpoint Strategy

1. **Mobile (320px - 768px)**
   - Single column layout
   - Larger touch targets
   - Simplified navigation grid
   - Optimized illustration size

2. **Tablet (768px - 1024px)**
   - Two-column navigation grid
   - Medium illustration size
   - Enhanced spacing

3. **Desktop (1024px+)**
   - Full layout with optimal spacing
   - Large illustration display
   - Complete navigation grid
   - Enhanced visual hierarchy

### Layout Patterns

```css
/* Mobile-first responsive classes */
.navigation-grid {
  @apply grid gap-2 sm:gap-3;
  @apply grid-cols-1 sm:grid-cols-2 md:grid-cols-3;
}

.illustration-sizing {
  @apply w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80;
}

.touch-targets {
  @apply min-h-[44px] sm:h-10;
}
```

## Integration Points

### Theme Integration

1. **Design System Consistency**
   - Uses existing Tailwind CSS custom properties
   - Maintains color scheme consistency
   - Leverages global component library (Button, etc.)

2. **Typography and Spacing**
   - Consistent with application typography scale
   - Uses standard spacing utilities
   - Maintains visual hierarchy patterns

### Component Library Integration

1. **Global Components**
   - Uses `Button` component from `@/components/global`
   - Leverages `Logo` component for branding
   - Integrates with existing utility functions

2. **Styling Utilities**
   - Uses `cn()` utility for conditional classes
   - Leverages Tailwind CSS for all styling
   - Maintains consistent design tokens

## Testing Strategy

### Component Testing

1. **Unit Tests**
   - Component rendering and props handling
   - Navigation functionality and routing
   - Error states and fallback behavior
   - Accessibility compliance

2. **Integration Tests**
   - Router integration and navigation
   - Component composition and interaction
   - Responsive behavior across breakpoints

### Accessibility Testing

1. **Automated Testing**
   - WCAG compliance validation
   - Color contrast verification
   - Semantic HTML structure

2. **Manual Testing**
   - Screen reader compatibility
   - Keyboard navigation flow
   - Touch interaction on mobile devices
