import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, Button, Input, Label } from "@/components/global";
import { authActions, handleAuthError } from "@/lib/auth";

const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBackToSignIn?: () => void;
}

export function ForgotPasswordForm({
  onBackToSignIn,
}: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await authActions.resetPassword(data.email);
      setIsSuccess(true);
    } catch (err) {
      setError(handleAuthError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <Alert className="text-sm" role="alert">
          If an account with that email exists, we've sent you a password reset
          link.
        </Alert>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Check your email for the reset link. It may take a few minutes to
            arrive.
          </p>

          {onBackToSignIn && (
            <Button
              type="button"
              variant="outline"
              onClick={onBackToSignIn}
              className="w-full"
              aria-label="Return to sign in form"
            >
              Back to Sign In
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-label="Reset password form"
    >
      {error && (
        <Alert variant="destructive" className="text-sm" role="alert">
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email address"
          {...register("email")}
          className="transition-all duration-200 focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary"
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
          disabled={isLoading}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary disabled:hover:scale-100 relative"
        aria-label="Send password reset email"
      >
        <span
          className={`transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
        >
          Send Reset Link
        </span>
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span className="ml-2">Sending...</span>
          </span>
        )}
      </Button>

      {onBackToSignIn && (
        <Button
          type="button"
          variant="ghost"
          onClick={onBackToSignIn}
          disabled={isLoading}
          className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary disabled:hover:scale-100"
          aria-label="Return to sign in form"
        >
          Back to Sign In
        </Button>
      )}
    </form>
  );
}
