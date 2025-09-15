# Arguschain 🔍

**Enterprise-grade Ethereum blockchain analysis platform for transaction debugging, gas optimization, and smart contract forensics.**

<div align="center">

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0.6-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![ethers.js](https://img.shields.io/badge/ethers.js-6.15.0-2535A0?style=flat&logo=ethereum)](https://docs.ethers.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

Arguschain provides deep blockchain analysis capabilities with 12+ advanced analysis methods, real-time monitoring, and intuitive visualizations. Built for developers, auditors, and researchers who need comprehensive transaction insights.

## ✨ Key Features

### 🔬 **Advanced Analysis Methods**

- **Transaction Tracing** - Complete call hierarchies with gas analysis
- **Bytecode Forensics** - Disassembly and opcode-level debugging
- **Event Log Analysis** - Automatic decoding and filtering
- **Storage Inspection** - Contract state analysis and diff visualization
- **Debug Block Tracing** - Block-level execution analysis
- **Transaction Replay** - Historical transaction re-execution
- **Mempool Monitoring** - Real-time pending transaction analysis
- **Transaction Simulation** - Pre-execution testing and optimization
- **Comparative Analysis** - Side-by-side transaction comparison

### 🎯 **Enterprise Features**

- Multi-network support (Mainnet, Sepolia, custom RPCs)
- Export capabilities (JSON, CSV)
- Performance analytics and optimization suggestions
- Bookmark and history management
- Real-time data streaming
- Mobile-responsive design

### 🛡️ **Built for Reliability**

- WCAG 2.1 AA accessibility compliance
- Comprehensive error handling with retry mechanisms
- Multi-layer caching (memory → localStorage → IndexedDB)
- Progressive loading for large datasets
- Offline-capable architecture

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Ethereum RPC endpoint (Google Blockchain RPC, Infura, Alchemy, or local node)

### Installation

```bash
# Clone the repository
git clone https://github.com/exyreams/arguschain.git
cd arguschain

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your RPC endpoints and configuration
```

### Development

```bash
# Start development server
npm run dev
# or
bun dev

# Build for production
npm run build

# Run linting
npm run lint
```

Visit `http://localhost:5173` to access the application.

## 🎬 Platform Demo

Experience Arguschain's comprehensive blockchain analysis capabilities in action.

> [!TIP]
> **🎥 Watch the Complete Demo**: See all 12+ analysis methods, advanced features, and real-world use cases in our comprehensive platform walkthrough.

[![Arguschain Demo](https://img.shields.io/badge/🎥_Watch_Demo-Coming_Soon-orange?style=for-the-badge)](https://youtu.be/your-demo-link)

### **What You'll See in the Demo:**

🔍 **Core Analysis Methods**

- Transaction tracing with complete call hierarchies
- Bytecode analysis and opcode-level debugging
- Event log filtering and automatic decoding
- Storage inspection and state diff visualization
- Block-level execution analysis
- Transaction replay and simulation

🎯 **Advanced Features**

- Multi-network support and real-time monitoring
- Performance analytics and gas optimization
- Comparative transaction analysis
- Export capabilities (JSON/CSV)
- Mobile-responsive interface

🛡️ **Enterprise Capabilities**

- High-cost RPC method access (`debug_traceTransaction`, `trace_replayTransaction`, etc.)
- Forensic analysis tools for security auditing
- MEV detection and DeFi interaction analysis
- Accessibility compliance (WCAG 2.1 AA)

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 19.1.0 + TypeScript 5.8.3
- **Build Tool**: Vite 7.0.6 with SWC
- **Styling**: Tailwind CSS 3.4.17 + shadcn/ui
- **State Management**: TanStack React Query 5.83.0
- **Blockchain**: ethers.js 6.15.0
- **Performance**: React Virtual for large datasets

### Design Principles

- **Performance First**: Virtualization, caching, and lazy loading
- **Accessibility**: WCAG 2.1 AA compliance with full keyboard navigation
- **Type Safety**: 100% TypeScript coverage with strict mode
- **Error Resilience**: Comprehensive error boundaries and retry mechanisms

<details>
<summary>📁 Project Structure</summary>

```
src/
├── App.tsx                 # Root application component
├── main.tsx                # Entry point for the React application
├── index.css               # Global styles
├── vite-env.d.ts           # Vite TypeScript declarations
├── assets/                 # Static assets (logos, icons, loaders)
├── components/             # Reusable UI components
│   ├── auth/               # Authentication components (SignIn, SignUp, AuthCard, etc.)
│   ├── blocktrace/         # Block trace visualization components
│   ├── bytecode/           # Bytecode analysis and disassembly UI
│   ├── dashboard/          # Dashboard and analytics components
│   ├── debugblock/         # Debug block execution components
│   ├── debugtrace/         # Debug trace visualization
│   ├── eventlogs/          # Event log parsing and display
│   ├── global/             # Global components (modals, toasts, etc.)
│   ├── landing/            # Landing page components
│   ├── layout/             # Layout and navigation components
│   ├── mempool/            # Mempool monitoring UI
│   ├── modals/             # Modal dialog components
│   ├── replaytransactions/ # Transaction replay interface
│   ├── status/             # Status indicators and loaders
│   ├── storagerange/       # Storage range analysis
│   ├── tracetransaction/   # Transaction tracing components
│   ├── transactionsimulation/ # Simulation UI
│   └── ui/                 # Base UI primitives (buttons, cards, etc.)
├── hooks/                  # Custom React hooks
│   ├── auth/               # Authentication hooks
│   ├── blockchain/         # Blockchain interaction hooks
│   ├── blocktrace/         # Block trace hooks
│   ├── bookmarks/          # Bookmark management
│   ├── bytecode/           # Bytecode analysis hooks
│   ├── dashboard/          # Dashboard data hooks
│   ├── debugblock/         # Debug block hooks
│   ├── debugtrace/         # Debug trace hooks
│   ├── eventlogs/          # Event log hooks
│   ├── global/             # Global state hooks
│   ├── mempool/            # Mempool hooks
│   ├── replaytransactions/ # Replay hooks
│   ├── shared/             # Shared utility hooks
│   ├── storagerange/       # Storage hooks
│   ├── tracetransaction/   # Trace transaction hooks
│   └── transactionsimulation/ # Simulation hooks
├── lib/                    # Core library and utilities
│   ├── blockchainService.ts # Blockchain RPC and data services
│   ├── blockIdentifierUtils.ts # Block identification helpers
│   ├── config.ts           # Application configuration
│   ├── queryConfig.ts      # API query configurations
│   ├── structLogTracer.ts  # Struct log tracing utilities
│   ├── toast-config.ts     # Toast notification setup
│   ├── traceCache.ts       # Trace result caching
│   ├── transactionTracer.ts # Transaction tracing logic
│   ├── unifiedAnalyzer.ts  # Unified analysis engine
│   ├── utils.ts            # General utility functions
│   └── [feature]/          # Feature-specific libraries (analytics, auth, export, etc.)
└── pages/                  # Page-level components
    ├── AnalysisHistoryPage.tsx # Analysis history view
    ├── AuthCallback.tsx    # OAuth/auth callback
    ├── BlockTraceAnalyzer.tsx # Block trace analyzer page
    ├── BytecodeAnalysis.tsx # Bytecode analysis page
    ├── ComparativeTransactionAnalysis.tsx # Comparative analysis
    ├── Dashboard.tsx       # Main dashboard
    ├── DebugBlockTrace.tsx # Debug block trace
    ├── DebugTrace.tsx      # Debug trace page
    ├── EventLogs.tsx       # Event logs page
    ├── Landing.tsx         # Landing/home page
    ├── NetworkMonitor.tsx  # Network monitoring
    ├── NotFound.tsx        # 404 page
    ├── PerformanceDashboardPage.tsx # Performance dashboard
    ├── ReplayTransactions.tsx # Replay transactions page
    ├── SignIn.tsx          # Sign-in page
    ├── SignUp.tsx          # Sign-up page
    ├── StorageAnalysis.tsx # Storage analysis
    ├── ToastTest.tsx       # Toast testing (dev utility)
    ├── TraceTransaction.tsx # Trace transaction page
    ├── TransactionPool.tsx # Transaction pool page
    ├── TransactionSimulation.tsx # Simulation page
    └── TxStatus.tsx        # Transaction status page

public/                     # Static public assets
├── package.json            # Dependencies and scripts
├── bun.lock                # Bun lockfile
├── tailwind.config.ts      # Tailwind configuration
├── postcss.config.js       # PostCSS config
├── eslint.config.js        # ESLint configuration
├── tsconfig.json           # TypeScript config (root)
├── tsconfig.app.json       # App-specific TS config
├── tsconfig.node.json      # Node-specific TS config
├── vite.config.ts          # Vite build config
└── [docs]/                 # Documentation files (Hackathon.md, ODL.md, Questions.md, Story.md)
```

</details>

## 🔬 Analysis Methods & RPC Coverage

Arguschain implements comprehensive analysis workflows using advanced Ethereum RPC methods, optimized for deep blockchain intelligence:

### **High-Cost RPC Methods Supported**

- **`debug_traceTransaction`** (50x multiplier) - Complete EVM execution tracing
- **`trace_replayTransaction`** (100x multiplier) - State diffs for forensic auditing
- **`eth_getLogs`** (50x multiplier) - High-efficiency event filtering
- **`debug_storageRangeAt`** (50x multiplier) - Direct storage inspection
- **`trace_block`** (75x multiplier) - Block-level execution flows
- **`debug_traceBlockByNumber`** (75x multiplier) - Detailed block tracing
- **`trace_call`** (25x multiplier) - Transaction simulation and gas prediction
- **`txpool_status`** (10x multiplier) - Mempool health monitoring

### **Analysis Capabilities by Method**

#### **🔍 Transaction-Level Analysis**

- **Internal Call Mapping**: Complete call hierarchies with gas breakdown
- **Event Emission Tracking**: Automatic event decoding and filtering
- **Revert Debugging**: Detailed failure analysis with stack traces
- **Gas Optimization**: Step-by-step gas consumption analysis

#### **🧱 Block-Level Intelligence**

- **Transaction Context**: How transactions interact within blocks
- **MEV Detection**: Identify arbitrage and sandwich attacks
- **Gas Pattern Analysis**: Block-level gas usage patterns
- **Network Activity**: Comprehensive block activity overview

#### **🔄 State & Simulation**

- **Precise State Tracking**: Balance and storage change monitoring
- **"What-If" Scenarios**: Pre-execution transaction testing
- **Historical Replay**: Re-execute past transactions with full context
- **Storage Inspection**: Raw contract storage analysis

#### **📊 Network Monitoring**

- **Mempool Analysis**: Pending transaction insights
- **Congestion Assessment**: Network health and confirmation times
- **Gas Price Intelligence**: Dynamic fee recommendations

## 🎯 Use Cases

### For Developers

- Debug failed transactions with complete call traces
- Optimize gas usage with detailed execution analysis
- Test contract interactions before deployment
- Monitor transaction pool for MEV opportunities

### For Security Auditors

- Forensic analysis of suspicious transactions
- Contract state inspection and vulnerability assessment
- Historical transaction replay for incident investigation
- Comparative analysis for attack pattern detection

### For DeFi Teams

- Monitor protocol interactions and user flows
- Analyze arbitrage and liquidation transactions
- Track cross-protocol transaction patterns
- Performance monitoring and optimization

### For Researchers

- Large-scale transaction pattern analysis
- Network behavior studies and analytics
- Protocol adoption and usage metrics
- Historical blockchain data exploration

## ⚡ Why Arguschain Excels

### **Enterprise-Grade Infrastructure**

Unlike basic block explorers, Arguschain provides access to computationally expensive RPC methods that are typically cost-prohibitive:

- **Deep EVM Tracing**: Full execution paths with opcode-level detail
- **State Diff Analysis**: Precise tracking of all state changes
- **Advanced Simulation**: Test transactions before execution
- **Forensic Capabilities**: Investigate complex DeFi interactions

### **Performance & Scalability**

- **Virtualized Rendering**: Handle datasets >10,000 items smoothly
- **Multi-layer Caching**: Memory → localStorage → IndexedDB optimization
- **Progressive Loading**: Skeleton UI for operations >200ms
- **Error Resilience**: Exponential backoff retry with graceful degradation

### **Developer Experience**

- **TypeScript First**: 100% type coverage with strict mode
- **Component Architecture**: Modular, reusable UI components
- **Real-time Updates**: Live data streaming with React Query
- **Export Capabilities**: JSON/CSV export for all analysis views

### **Accessibility & Compliance**

- **WCAG 2.1 AA**: Full accessibility compliance
- **Keyboard Navigation**: Complete keyboard-only operation
- **Screen Reader Support**: Semantic HTML with proper ARIA labels
- **Mobile Responsive**: Touch-friendly mobile interface

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install` or `bun install`
3. **Set up environment**: Copy `.env.example` to `.env` and configure
4. **Start development**: `npm run dev`

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Components**: PascalCase with proper prop interfaces
- **Hooks**: kebab-case with `use-` prefix
- **Imports**: Use `@/*` aliases, follow import order guidelines
- **Testing**: Write tests for new features and bug fixes

### Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Follow our coding standards and architecture patterns
3. Add tests for new functionality
4. Update documentation as needed
5. Submit a pull request with a clear description

### Feature Development

Follow our structured approach for new features:

- Define TypeScript interfaces first
- Implement service layer with React Query
- Build components with error handling
- Add proper accessibility and performance optimizations

## 📊 Performance Benchmarks

- **Page Load**: <2 seconds
- **Chart Rendering**: <500ms (datasets <10k items)
- **Network Requests**: 3-second timeout with exponential backoff
- **Memory Usage**: <100MB per session
- **Accessibility**: WCAG 2.1 AA compliant

## 🔧 Configuration

### Environment Variables

```bash
# Required
VITE_ETHEREUM_RPC_URL=your_mainnet_rpc_url
VITE_SEPOLIA_RPC_URL=your_sepolia_rpc_url

# Optional
VITE_CUSTOM_RPC_URL=your_custom_rpc_url
VITE_API_TIMEOUT=30000
VITE_CACHE_DURATION=300000
```

### Network Configuration

Arguschain supports multiple Ethereum networks:

- **Mainnet**: Production Ethereum network
- **Sepolia**: Ethereum testnet
- **Custom RPCs**: Configure your own endpoints

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Kiro AI Assistant](https://kiro.ai) using spec-driven development
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Blockchain interactions powered by [ethers.js](https://docs.ethers.org/)
- Performance optimizations with [TanStack Query](https://tanstack.com/query)

---

**Ready to dive deep into blockchain analysis?** [Get started](#-quick-start) or [contribute](#-contributing) to make Arguschain even better!
