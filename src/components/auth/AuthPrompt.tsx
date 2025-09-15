import { Link } from "react-router-dom";
import { Button, Card } from "@/components/global";
import { Lock, LogIn, UserPlus } from "lucide-react";

interface AuthPromptProps {
  title?: string;
  description?: string;
  feature?: string;
  className?: string;
}

export function AuthPrompt({
  title = "Authentication Required",
  description = "Please sign in to access this feature",
  feature = "this feature",
  className = "",
}: AuthPromptProps) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary ${className}`}
    >
      <Card className="p-8 bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-[#00bfff]" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            <p className="text-[#8b9dc3]">{description}</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-[#6b7280]">
              Sign in to access {feature} and unlock the full power of
              Arguschain's blockchain analysis tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signin" className="flex-1">
                <Button className="w-full bg-[#00bfff] hover:bg-[#00bfff]/80 text-[#0f1419]">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>

              <Link to="/signup" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-[rgba(0,191,255,0.1)]">
            <p className="text-xs text-[#6b7280]">
              New to Arguschain? Create an account to get started with advanced
              blockchain analysis.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
