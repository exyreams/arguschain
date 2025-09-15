---
inclusion: always
---

# Arguschain Product Guidelines

**Arguschain** is an enterprise-grade Ethereum blockchain analysis platform for transaction debugging, gas optimization, and smart contract analysis.

## Core Product Requirements

### Performance (Non-Negotiable)

- Virtualize datasets >1000 items with `@tanstack/react-virtual`
- Skeleton UI for operations >200ms
- React Query caching (5-minute stale time minimum)
- Lazy load routes with `React.lazy()`
- Progressive loading for large datasets

### Accessibility (WCAG 2.1 AA)

- Semantic HTML with ARIA labels
- Full keyboard navigation
- Screen reader compatibility
- Focus management in modals

### Data Handling

- Validate blockchain data with Zod schemas
- Multi-layer caching: memory → localStorage → IndexedDB
- Graceful network failures with user feedback
- Exponential backoff retry for transient errors

## Feature Requirements

Every feature MUST include:

1. JSON/CSV export for all data views
2. Error boundaries with proper error handling
3. Loading states with skeleton UI
4. Mobile-first responsive design
5. Complete TypeScript coverage

## Blockchain Integration

### Network Support

- Ethereum Mainnet, Sepolia testnet, custom RPCs
- State preservation during network switching
- RPC endpoint validation before connection

### Core Features

- Call trace visualization (hierarchical views)
- Opcode-level debugging (memory/stack/storage)
- Gas analytics with optimization suggestions
- Automatic event decoding for standard contracts

## User Experience

### Target Users

- **Developers**: Debug transactions, optimize gas
- **DeFi Teams**: Analyze flows, security insights
- **Researchers**: Deep forensics, pattern analysis
- **Auditors**: Investigate suspicious transactions

### Design Principles

- Clean, minimal interface prioritizing data visualization
- Progressive disclosure of complex information
- Consistent navigation patterns
- Touch-friendly mobile interactions

## Performance Benchmarks

- Page load: <2 seconds
- Chart rendering: <500ms (datasets <10k items)
- Network timeout: 3 seconds
- Memory usage: <100MB per session

## Error Handling

- Specific, actionable error messages
- Fallback UI for critical failures
- Retry mechanisms for network issues
- User feedback for all async operations
