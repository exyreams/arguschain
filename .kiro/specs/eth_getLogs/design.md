# ETH Logs Analyzer Design Document

## Overview

This document outlines the design for implementing comprehensive ETH logs analysis features in the Arguschain platform. The solution will provide advanced capabilities for fetching, analyzing, and visualizing ERC-20 token transfer events using the `eth_getLogs` RPC method, transforming raw log data into interactive visualizations and actionable insights.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ETH Logs Analyzer Page                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Query         │  │   Analytics     │  │   Export        │ │
│  │   Controls      │  │   Visualization │  │   Manager       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                  Analytics Components Layer                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ Distribution│ │ Timeline    │ │ Network     │ │ Participant │ │
│  │ Charts      │ │ Charts      │ │ Diagrams    │ │ Tables      │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Data Processing Layer                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Logs          │  │   Analytics     │  │   Cache         │ │
│  │   Processor     │  │   Engine        │  │   Manager       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                      Charting Library                       │
│                        (Recharts)                           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Charting Library**: Recharts (React-based, responsive, accessible)
- **Network Diagrams**: React Flow (for interactive node-link graphs)
- **Advanced Visualizations**: Plotly.js for interactive histograms and Sankey diagrams
- **Data Processing**: Custom TypeScript utilities with Web3.js integration
- **State Management**: React hooks and context
- **Styling**: Tailwind CSS with Arguschain color palette
- **Icons**: Lucide React icons
- **Export Integration**: Google Sheets API, CSV/JSON direct downloads

## Components and Interfaces

### Core Analytics Components

#### 1. LogsAnalyzerInterface Component

```typescript
interface LogsAnalyzerInterfaceProps {
  initialParams?: Partial<LogsQueryParams>;
  onAnalysisComplete?: (results: AnalysisResults) => void;
}

interface ProcessedLogsData {
  transferDistribution: TransferDistributionData[];
  volumeTimeline: VolumeTimelineData[];
  participantAnalysis: ParticipantAnalysisData[];
  networkMetrics: NetworkMetricsData[];
  statisticalSummary: StatisticalSummaryData[];
}
```

**Sub-components:**

- `TransferDistributionChart`: Interactive histogram with outlier detection and range slider
- `VolumeTimelineChart`: Time series chart with hourly aggregation and moving averages
- `TransferNetworkDiagram`: Sankey diagram showing top 50 transfer flows with flow direction
- `ParticipantTables`: Top senders and receivers with volume percentage analysis
- `StatisticalSummaryCards`: Comprehensive metrics including median, quartiles, and unique participants
- `BlockRangeValidator`: Google Blockchain API 5-block limit compliance checker

#### 2. QueryControls Component

```typescript
interface QueryControlsProps {
  onSubmit: (params: LogsQueryParams) => void;
  loading: boolean;
  networks: NetworkInfo[];
  currentNetwork: NetworkType;
  onNetworkChange: (network: NetworkType) => void;
}

interface ProcessedQueryData {
  contractValidation: ValidationResult;
  blockRangeValidation: ValidationResult;
  networkCompatibility: NetworkCompatibility;
  estimatedResults: ResultEstimation;
}
```

**Sub-components:**

- `ContractAddressInput`: Contract address input with validation
- `BlockRangeSelector`: From/to block selection with validation
- `NetworkSelector`: Network switching controls
- `QuerySubmitButton`: Analysis trigger with loading states

#### 3. AnalyticsVisualization Component

```typescript
interface AnalyticsVisualizationProps {
  data: ProcessedLogData[];
  statistics: TransferStatistics;
  loading: boolean;
  error?: AnalyticsErrorState;
}

interface ProcessedAnalyticsData {
  distributionCharts: DistributionChartData[];
  timelineCharts: TimelineChartData[];
  networkDiagrams: NetworkDiagramData[];
  participantTables: ParticipantTableData[];
}
```

**Sub-components:**

- `DistributionAnalysisPanel`: Transfer size and frequency analysis
- `TimelineAnalysisPanel`: Volume trends over time
- `NetworkAnalysisPanel`: Transfer flow visualization
- `ParticipantAnalysisPanel`: Top participants and statistics

### Data Processing Utilities

#### Logs Data Processor

```typescript
class LogsProcessor {
  static parseTransferLogs(rawLogs: RawLogData[]): TransferLogData[] {
    // Parse raw log data into structured transfer events
  }

  static processDistributionData(
    logs: ProcessedLogData[]
  ): TransferDistributionData[] {
    // Create histogram data for transfer size distribution
  }

  static processTimelineData(logs: ProcessedLogData[]): VolumeTimelineData[] {
    // Generate time series data for volume analysis
  }

  static calculateStatistics(logs: ProcessedLogData[]): TransferStatistics {
    // Calculate comprehensive transfer statistics
  }
}
```

#### Analytics Engine

```typescript
class AnalyticsEngine {
  static analyzeParticipants(logs: ProcessedLogData[]): ParticipantAnalysis {
    // Analyze top senders, receivers, and active addresses
  }

  static buildTransferNetwork(logs: ProcessedLogData[]): NetworkGraphData {
    // Build network graph for transfer flow visualization
  }

  static calculateVolumeMetrics(logs: ProcessedLogData[]): VolumeMetrics {
    // Calculate volume-based metrics and trends
  }

  static generateExportData(
    logs: ProcessedLogData[],
    analysis: AnalysisResults
  ): ExportData {
    // Prepare data for various export formats
  }
}
```

## Data Models

### Chart Data Interfaces

```typescript
// Transfer Distribution
interface TransferDistributionData {
  range: string;
  count: number;
  percentage: number;
  totalValue: number;
  color: string;
}

// Volume Timeline
interface VolumeTimelineData {
  timestamp: number;
  datetime: Date;
  volume: number;
  transactionCount: number;
  uniqueParticipants: number;
  averageTransferSize: number;
}

// Network Graph
interface NetworkNode {
  id: string;
  address: string;
  addressShort: string;
  totalVolume: number;
  transactionCount: number;
  nodeType: "sender" | "receiver" | "both";
  position?: { x: number; y: number };
}

interface NetworkLink {
  id: string;
  source: string;
  target: string;
  value: number;
  transactionCount: number;
  strength: number;
  label: string;
}

// Participant Analysis
interface ParticipantData {
  address: string;
  addressShort: string;
  totalValue: number;
  transactionCount: number;
  volumePercentage: number;
  contractInfo?: ContractInfo;
}

// Transfer Statistics
interface TransferStatistics {
  totalTransfers: number;
  totalVolume: number;
  averageTransfer: number;
  medianTransfer: number;
  maxTransfer: number;
  minTransfer: number;
  uniqueSenders: number;
  uniqueReceivers: number;
  timeRange: { start: Date; end: Date };
}
```

## Error Handling

### Error States and Fallbacks

```typescript
interface AnalyticsErrorState {
  type: "data_processing" | "chart_rendering" | "network_error";
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}

// Error Boundary for Analytics Components
class AnalyticsErrorBoundary extends React.Component {
  // Handle chart rendering errors gracefully
  // Provide fallback UI with error details
  // Allow retry mechanisms
}
```

### Data Validation

```typescript
class DataValidator {
  static validateLogsData(data: ProcessedLogData[]): ValidationResult {
    // Validate required fields and data integrity
    // Check for reasonable data ranges
    // Ensure chart compatibility
  }

  static validateQueryParams(params: LogsQueryParams): ValidationResult {
    // Validate contract address format
    // Check block range validity
    // Ensure network compatibility
  }
}
```

## Testing Strategy

### Unit Testing

1. **Data Processors**: Test data transformation logic
2. **Chart Components**: Test rendering with various data sets
3. **Utility Functions**: Test calculation accuracy
4. **Error Handling**: Test error states and recovery

### Integration Testing

1. **Component Integration**: Test analytics components with real log data
2. **Performance Testing**: Test with large datasets (1000+ log entries)
3. **Responsive Testing**: Test charts on various screen sizes
4. **Accessibility Testing**: Test keyboard navigation and screen readers

### Test Data Sets

```typescript
// Mock data generators for testing
class MockDataGenerator {
  static generateLogsData(
    complexity: "simple" | "complex" | "large"
  ): ProcessedLogData[];
  static generateTransferData(
    count: number,
    timeRange: TimeRange
  ): TransferLogData[];
  static generateErrorScenarios(): Array<{ data: any; expectedError: string }>;
}
```

## Performance Considerations

### Optimization Strategies

1. **Data Virtualization**: For large datasets (>1000 items)
2. **Lazy Loading**: Load analytics components on demand
3. **Memoization**: Cache processed data and chart configurations
4. **Progressive Enhancement**: Show basic analytics first, enhance with interactions

### Memory Management

```typescript
// Efficient data processing for large log datasets
class PerformanceOptimizer {
  static chunkProcessing<T>(
    data: T[],
    chunkSize: number
  ): Promise<ProcessedData[]> {
    // Process large datasets in chunks to avoid blocking UI
  }

  static memoizeChartData(processor: Function): Function {
    // Cache processed chart data to avoid recomputation
  }
}
```

## Accessibility Features

### WCAG 2.1 Compliance

1. **Color Accessibility**: Use patterns and shapes in addition to colors
2. **Keyboard Navigation**: Full keyboard support for all interactive elements
3. **Screen Reader Support**: Proper ARIA labels and descriptions
4. **Alternative Data Views**: Provide data tables as alternatives to charts

### Implementation

```typescript
// Accessibility utilities
class AccessibilityHelper {
  static generateChartDescription(chartType: string, data: any[]): string {
    // Generate descriptive text for screen readers
  }

  static addKeyboardNavigation(chartElement: HTMLElement): void {
    // Add keyboard event handlers for chart interaction
  }
}
```

## Export and Integration Features

### Export Capabilities

```typescript
interface ExportManager {
  // Direct download exports
  exportToCSV(data: ProcessedLogData[], filename?: string): Promise<void>;
  exportToJSON(data: AnalysisResults, filename?: string): Promise<void>;

  // Google Sheets integration
  exportToGoogleSheets(
    data: ProcessedLogData[],
    analysis: AnalysisResults,
    sheetTitle?: string
  ): Promise<void>;

  // Advanced export options
  exportVisualizationAsPNG(chartRef: ChartReference): Promise<Blob>;
  exportSankeyDiagramAsSVG(diagramData: NetworkGraphData): Promise<string>;
}
```

**Export Features:**

- **CSV Export**: Complete transfer data with full addresses and metadata
- **JSON Export**: Structured analysis results with statistics and participant data
- **Google Sheets**: Authenticated direct export with formatted sheets and charts
- **Visualization Export**: PNG/SVG export of charts and Sankey diagrams
- **Batch Export**: Multiple format export with single user action

### Provider-Specific Optimizations

```typescript
interface ProviderOptimizations {
  // Google Blockchain API optimizations
  respectBlockRangeLimit(fromBlock: number, toBlock: number): BlockRange[];
  handleRateLimiting(requests: RPCRequest[]): Promise<RPCResponse[]>;

  // Standard RPC optimizations
  batchLogRequests(queries: LogQuery[]): Promise<LogResult[]>;
  implementRetryLogic(request: RPCRequest): Promise<RPCResponse>;
}
```

## Deployment and Rollout

### Feature Flags

```typescript
interface AnalyticsFeatureFlags {
  enableLogsAnalyzer: boolean;
  enableDistributionCharts: boolean;
  enableTimelineAnalysis: boolean;
  enableNetworkDiagrams: boolean;
  enableDataExport: boolean;
  enableGoogleSheetsIntegration: boolean;
  enableAdvancedVisualizations: boolean;
}
```

### Progressive Rollout

1. **Phase 1**: Basic charts (histogram, timeline)
2. **Phase 2**: Interactive elements (tooltips, zoom, pan)
3. **Phase 3**: Advanced visualizations (network graphs, flow diagrams)
4. **Phase 4**: Export and sharing features

This design provides a solid foundation for implementing comprehensive ETH logs analysis while maintaining performance, accessibility, and user experience standards.
