import React, { useState } from "react";
import { Button, Card, Input, Label, Separator } from "@/components/global";
import { toast, toastHelpers } from "@/components/global/notifications";
import { toastConfig } from "@/lib/toast-config";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  Bookmark,
  Network,
  Zap,
  Clock,
  X,
} from "lucide-react";

const ToastTest: React.FC = () => {
  const [customTitle, setCustomTitle] = useState("Custom Toast Title");
  const [customDescription, setCustomDescription] = useState(
    "This is a custom toast description"
  );
  const [loadingToastId, setLoadingToastId] = useState<string | number | null>(
    null
  );

  // Basic toast tests
  const testBasicToasts = () => {
    toast.success("Success Toast", {
      description: "This is a success message",
      duration: 3000,
    });

    setTimeout(() => {
      toast.error("Error Toast", {
        description: "This is an error message",
        duration: 4000,
      });
    }, 500);

    setTimeout(() => {
      toast.info("Info Toast", {
        description: "This is an info message",
        duration: 2000,
      });
    }, 1000);

    setTimeout(() => {
      toast.warning("Warning Toast", {
        description: "This is a warning message",
        duration: 3500,
      });
    }, 1500);
  };

  // Toast with actions
  const testActionToast = () => {
    toast.error("Action Required", {
      description: "Something went wrong. Would you like to retry?",
      action: {
        label: "Retry",
        onClick: () => {
          toast.success("Retrying...", {
            description: "Action button clicked!",
          });
        },
      },
      duration: 5000,
    });
  };

  // Loading toast test
  const testLoadingToast = () => {
    const id = toast.loading("Processing", {
      description: "Please wait while we process your request...",
    });
    setLoadingToastId(id);

    setTimeout(() => {
      toast.dismiss(id);
      toast.success("Processing Complete", {
        description: "Your request has been processed successfully!",
      });
      setLoadingToastId(null);
    }, 3000);
  };

  // Bookmark-specific toasts
  const testBookmarkToasts = () => {
    toastConfig.bookmark.saved("My Test Bookmark");

    setTimeout(() => {
      toastConfig.bookmark.loaded("My Test Bookmark");
    }, 1000);

    setTimeout(() => {
      toastConfig.bookmark.updated("My Updated Bookmark");
    }, 2000);

    setTimeout(() => {
      toastConfig.bookmark.duplicate();
    }, 3000);

    setTimeout(() => {
      toastConfig.bookmark.deleted();
    }, 4000);
  };

  // Toast helpers test
  const testToastHelpers = () => {
    toastHelpers.transactionSuccess("0x1234567890abcdef");

    setTimeout(() => {
      toastHelpers.networkConnected("Ethereum Mainnet");
    }, 1000);

    setTimeout(() => {
      toastHelpers.highGasWarning("2,500,000");
    }, 2000);

    setTimeout(() => {
      toastHelpers.copiedToClipboard("Transaction Hash");
    }, 3000);
  };

  // Custom toast test
  const testCustomToast = () => {
    toast.success(customTitle, {
      description: customDescription,
      duration: 4000,
    });
  };

  // Promise-based toast
  const testPromiseToast = () => {
    const myPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve("Success!") : reject("Failed!");
      }, 2000);
    });

    toast.promise(myPromise, {
      loading: "Processing your request...",
      success: (data) => `Operation completed: ${data}`,
      error: (err) => `Operation failed: ${err}`,
    });
  };

  // Multiple toasts stress test
  const testMultipleToasts = () => {
    const toastTypes = ["success", "error", "warning", "info", "loading"];
    for (let i = 1; i <= 5; i++) {
      setTimeout(() => {
        const type = toastTypes[i - 1];
        switch (type) {
          case "success":
            toast.success(`Success Toast ${i}`, {
              description: `This is success toast number ${i}`,
              duration: 3000,
            });
            break;
          case "error":
            toast.error(`Error Toast ${i}`, {
              description: `This is error toast number ${i}`,
              duration: 4000,
            });
            break;
          case "warning":
            toast.warning(`Warning Toast ${i}`, {
              description: `This is warning toast number ${i}`,
              duration: 3500,
            });
            break;
          case "info":
            toast.info(`Info Toast ${i}`, {
              description: `This is info toast number ${i}`,
              duration: 2500,
            });
            break;
          case "loading":
            toast.loading(`Loading Toast ${i}`, {
              description: `This is loading toast number ${i}`,
              duration: 5000,
            });
            break;
        }
      }, i * 300);
    }
  };

  // Dismiss all toasts
  const dismissAllToasts = () => {
    toast.dismiss();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#0f1419]">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#00bfff] mb-4">
              Toast Testing Page
            </h1>
            <p className="text-[#8b9dc3] text-lg">
              Test all toast notifications and their behaviors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Toasts */}
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Basic Toasts
                  </h3>
                </div>
              </Card.Header>
              <Card.Content className="space-y-3">
                <Button
                  onClick={testBasicToasts}
                  className="w-full bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
                >
                  Test All Basic Types
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() =>
                      toast.success("Success!", {
                        description: "Operation completed",
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    Success
                  </Button>
                  <Button
                    onClick={() =>
                      toast.error("Error!", {
                        description: "Something went wrong",
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Error
                  </Button>
                  <Button
                    onClick={() =>
                      toast.info("Info!", {
                        description: "Here's some information",
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  >
                    Info
                  </Button>
                  <Button
                    onClick={() =>
                      toast.warning("Warning!", {
                        description: "Please be careful",
                      })
                    }
                    variant="outline"
                    size="sm"
                    className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    Warning
                  </Button>
                </div>
              </Card.Content>
            </Card>

            {/* Advanced Toasts */}
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Advanced Toasts
                  </h3>
                </div>
              </Card.Header>
              <Card.Content className="space-y-3">
                <Button
                  onClick={testActionToast}
                  className="w-full bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Toast with Action
                </Button>

                <Button
                  onClick={testLoadingToast}
                  disabled={loadingToastId !== null}
                  variant="outline"
                  className="w-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Loading Toast
                </Button>

                <Button
                  onClick={testPromiseToast}
                  variant="outline"
                  className="w-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Promise Toast
                </Button>
              </Card.Content>
            </Card>

            {/* Bookmark Toasts */}
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Bookmark Toasts
                  </h3>
                </div>
              </Card.Header>
              <Card.Content className="space-y-3">
                <Button
                  onClick={testBookmarkToasts}
                  className="w-full bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
                >
                  Test All Bookmark Toasts
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => toastConfig.bookmark.saved("Test Bookmark")}
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Saved
                  </Button>
                  <Button
                    onClick={() => toastConfig.bookmark.loaded("Test Bookmark")}
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Loaded
                  </Button>
                  <Button
                    onClick={() =>
                      toastConfig.bookmark.updated("Test Bookmark")
                    }
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Updated
                  </Button>
                  <Button
                    onClick={() => toastConfig.bookmark.duplicate()}
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Duplicate
                  </Button>
                </div>
              </Card.Content>
            </Card>

            {/* Toast Helpers */}
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Toast Helpers
                  </h3>
                </div>
              </Card.Header>
              <Card.Content className="space-y-3">
                <Button
                  onClick={testToastHelpers}
                  className="w-full bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
                >
                  Test All Helpers
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() =>
                      toastHelpers.transactionSuccess("0x123...abc")
                    }
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    TX Success
                  </Button>
                  <Button
                    onClick={() => toastHelpers.networkConnected("Ethereum")}
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Network
                  </Button>
                  <Button
                    onClick={() => toastHelpers.highGasWarning("1,000,000")}
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Gas Warning
                  </Button>
                  <Button
                    onClick={() => toastHelpers.copiedToClipboard("Address")}
                    variant="outline"
                    size="sm"
                    className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Copied
                  </Button>
                </div>
              </Card.Content>
            </Card>

            {/* Custom Toast */}
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] md:col-span-2">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Custom Toast
                  </h3>
                </div>
              </Card.Header>
              <Card.Content className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-[#8b9dc3]">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="mt-1 bg-[rgba(15,20,25,0.5)] border-[rgba(0,191,255,0.2)] text-[#e2e8f0]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-[#8b9dc3]">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="mt-1 bg-[rgba(15,20,25,0.5)] border-[rgba(0,191,255,0.2)] text-[#e2e8f0]"
                    />
                  </div>
                </div>
                <Button
                  onClick={testCustomToast}
                  className="w-full bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
                >
                  Show Custom Toast
                </Button>
              </Card.Content>
            </Card>

            {/* Stress Tests */}
            <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] md:col-span-2">
              <Card.Header>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[#00bfff]" />
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Stress Tests & Controls
                  </h3>
                </div>
              </Card.Header>
              <Card.Content>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={testMultipleToasts}
                    variant="outline"
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Stacking Test (5 Types)
                  </Button>

                  <Button
                    onClick={dismissAllToasts}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dismiss All
                  </Button>

                  <Button
                    onClick={() => {
                      for (let i = 0; i < 10; i++) {
                        setTimeout(() => {
                          toast.info(`Rapid Toast ${i + 1}`, {
                            description: `Testing rapid succession ${i + 1}/10`,
                            duration: 1000,
                          });
                        }, i * 100);
                      }
                    }}
                    variant="outline"
                    className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                  >
                    Rapid Fire (10x)
                  </Button>

                  <Button
                    onClick={() => {
                      toast.success("Long Duration Toast", {
                        description:
                          "This toast will stay for 10 seconds to test persistence",
                        duration: 10000,
                      });
                    }}
                    variant="outline"
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Long Duration (10s)
                  </Button>

                  <Button
                    onClick={() => {
                      // Create the exact scenario from the images
                      for (let i = 1; i <= 5; i++) {
                        setTimeout(() => {
                          toast.info(`Toast ${i}`, {
                            description: `This is toast number ${i}`,
                            duration: 8000, // Long duration to test stacking
                          });
                        }, i * 500);
                      }
                    }}
                    variant="outline"
                    className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  >
                    Stacking Demo (Like Images)
                  </Button>
                </div>
              </Card.Content>
            </Card>
          </div>

          <Separator className="my-8 bg-[rgba(0,191,255,0.2)]" />

          <div className="text-center text-[#8b9dc3]">
            <p className="mb-2">
              This page tests all toast functionality including basic types,
              actions, loading states, bookmark-specific toasts, and stress
              scenarios.
            </p>
            <p className="text-sm">
              Check the console for any errors and observe toast behavior,
              positioning, and animations.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ToastTest;
