import React, { useState, useEffect } from "react";
import { Button } from "@/components/global";
import { supabase } from "@/lib/auth/auth";
import { toast } from "@/hooks/global/useToast";
import {
  Mail,
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  Clock,
  Shield,
} from "lucide-react";

interface EmailVerificationSentProps {
  email: string;
  onBackToSignUp: () => void;
  onVerificationComplete?: () => void;
}

const EmailVerificationSent: React.FC<EmailVerificationSentProps> = ({
  email,
  onBackToSignUp,
  onVerificationComplete,
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Check verification status periodically
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && user.email_confirmed_at) {
          toast.success("Email Verified!", {
            description:
              "Your email has been successfully verified. Welcome to Arguschain!",
          });
          onVerificationComplete?.();
        }
      } catch (error) {
        // Silently handle errors during verification check
      }
    };

    // Check immediately and then every 3 seconds
    checkVerification();
    const interval = setInterval(checkVerification, 3000);

    return () => clearInterval(interval);
  }, [onVerificationComplete]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        toast.error("Failed to Resend Email", {
          description: error.message,
        });
      } else {
        toast.success("Verification Email Sent", {
          description: "We've sent another verification email to your inbox.",
        });
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (error) {
      toast.error("Resend Failed", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    try {
      // Refresh the session to get latest user data
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        toast.error("Verification Check Failed", {
          description: "Unable to check verification status. Please try again.",
        });
        return;
      }

      if (session?.user?.email_confirmed_at) {
        toast.success("Email Verified!", {
          description:
            "Your email has been successfully verified. Welcome to Arguschain!",
        });
        onVerificationComplete?.();
      } else {
        toast.info("Not Verified Yet", {
          description:
            "Please check your email and click the verification link.",
        });
      }
    } catch (error) {
      toast.error("Verification Check Failed", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsCheckingVerification(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      {/* Icon and Header */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00bfff] to-[#0099cc] rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
            <Clock className="h-3 w-3 text-yellow-900" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#e2e8f0] mb-2">
            Check Your Email
          </h2>
          <p className="text-[#8b9dc3] text-sm">
            We've sent a verification link to
          </p>
          <p className="text-[#00bfff] font-medium font-mono text-sm mt-1">
            {email}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-[#00bfff] mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <h3 className="text-sm font-medium text-[#e2e8f0] mb-1">
              Verification Required
            </h3>
            <p className="text-xs text-[#8b9dc3] leading-relaxed">
              Click the verification link in your email to activate your account
              and get unlimited access to all Arguschain features.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleCheckVerification}
          disabled={isCheckingVerification}
          className="w-full bg-gradient-to-r from-[#00bfff] to-[#0099cc] text-[#0f1419] hover:from-[#0099cc] hover:to-[#007acc] font-medium"
        >
          {isCheckingVerification ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              I've Verified My Email
            </>
          )}
        </Button>

        <Button
          onClick={handleResendEmail}
          disabled={isResending || resendCooldown > 0}
          variant="outline"
          className="w-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
        >
          {isResending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Resend in {resendCooldown}s
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Resend Email
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-[#6b7280] space-y-2">
        <p>
          Didn't receive the email? Check your spam folder or try resending.
        </p>
        <p>Having trouble? Contact our support team for assistance.</p>
      </div>

      {/* Back Button */}
      <div className="pt-4 border-t border-[rgba(0,191,255,0.1)]">
        <Button
          onClick={onBackToSignUp}
          variant="ghost"
          className="text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.05)]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign Up
        </Button>
      </div>
    </div>
  );
};

export default EmailVerificationSent;
