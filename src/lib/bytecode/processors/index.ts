export {
  BytecodeProcessor,
  ERC20_SIGNATURES,
  ERC721_SIGNATURES,
  PROXY_SIGNATURES,
  SECURITY_SIGNATURES,
  type BytecodeAnalysis,
  type DetectedFunction,
  type ContractComparison,
  type SimilarityMetric,
  type ContractRelationship,
} from "./bytecodeProcessor";

export {
  EnhancedPatternDetector,
  ENHANCED_ERC20_SIGNATURES,
  ENHANCED_ERC721_SIGNATURES,
  ENHANCED_ERC1155_SIGNATURES,
  ENHANCED_PROXY_SIGNATURES,
  ENHANCED_SECURITY_SIGNATURES,
  DEFI_SIGNATURES,
  GAS_OPTIMIZATION_SIGNATURES,
  type PatternDetectionResult,
  type PatternAnalysisResult,
} from "./patternDetector";
