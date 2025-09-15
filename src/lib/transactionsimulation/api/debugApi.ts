import { ethers } from "ethers";
import { TRACE_CONFIG } from "../constants";

export class DebugApi {
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  async traceCall(
    params: {
      to: string;
      data: string;
      from?: string;
      gas?: string;
      gasPrice?: string;
      value?: string;
    },
    blockTag: string | number = "latest",
    tracerConfig?: any,
  ): Promise<any> {
    const config = tracerConfig || {
      tracer: "callTracer",
      tracerConfig: TRACE_CONFIG.callTracer,
    };

    try {
      const traceFormats = [
        [params, blockTag, config],

        [params, blockTag, "callTracer"],

        [params, blockTag, { tracer: "callTracer" }],
      ];

      let lastError: Error | null = null;

      for (const format of traceFormats) {
        try {
          const result = await this.provider.send("debug_traceCall", format);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
      }

      throw lastError || new Error("All trace formats failed");
    } catch (error) {
      throw new Error(
        `debug_traceCall failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async traceTransaction(txHash: string, tracerConfig?: any): Promise<any> {
    const config = tracerConfig || {
      tracer: "callTracer",
      tracerConfig: TRACE_CONFIG.callTracer,
    };

    try {
      const result = await this.provider.send("debug_traceTransaction", [
        txHash,
        config,
      ]);
      return result;
    } catch (error) {
      throw new Error(
        `debug_traceTransaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async traceCallStructLog(
    params: {
      to: string;
      data: string;
      from?: string;
      gas?: string;
      gasPrice?: string;
      value?: string;
    },
    blockTag: string | number = "latest",
  ): Promise<any> {
    const config = {
      tracer: "structLog",
      tracerConfig: TRACE_CONFIG.structLog,
    };

    try {
      const result = await this.provider.send("debug_traceCall", [
        params,
        blockTag,
        config,
      ]);
      return result;
    } catch (error) {
      throw new Error(
        `debug_traceCall with structLog failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getStorageAt(
    address: string,
    position: string,
    blockTag: string | number = "latest",
  ): Promise<string> {
    try {
      const result = await this.provider.getStorage(
        address,
        position,
        blockTag,
      );
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get storage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCode(
    address: string,
    blockTag: string | number = "latest",
  ): Promise<string> {
    try {
      const result = await this.provider.getCode(address, blockTag);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to get code: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async alternativeTraceCall(
    params: {
      to: string;
      data: string;
      from?: string;
      gas?: string;
      gasPrice?: string;
      value?: string;
    },
    blockTag: string | number = "latest",
  ): Promise<any> {
    try {
      const result = await this.provider.send("trace_call", [
        params,
        ["trace"],
        blockTag,
      ]);
      return result;
    } catch (error) {
      throw new Error(
        `trace_call failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async isDebugAvailable(): Promise<boolean> {
    try {
      await this.provider.send("debug_traceCall", [
        {
          to: "0x0000000000000000000000000000000000000000",
          data: "0x",
        },
        "latest",
        { tracer: "callTracer" },
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async makeDebugRequest(method: string, params: any[]): Promise<any> {
    try {
      const result = await this.provider.send(method, params);
      return result;
    } catch (error) {
      throw new Error(
        `Debug RPC request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
