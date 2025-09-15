import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authActions, handleAuthError } from "@/lib/auth";
import { Alert, Button, Checkbox, Input, Label } from "@/components/global";
import {
  loadSigninPreferences,
  updateEmailPreference,
  updateLastSigninMethod,
} from "@/lib/auth/signin-preferences";

const signinSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SigninFormData = z.infer<typeof signinSchema>;

interface EmailPasswordFormProps {
  onForgotPassword?: () => void;
}

export function EmailPasswordForm({
  onForgotPassword,
}: EmailPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [rememberEmail, setRememberEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    mode: "onChange",
  });

  useEffect(() => {
    const preferences = loadSigninPreferences();
    setRememberEmail(preferences.rememberEmail);

    if (preferences.rememberEmail && preferences.lastEmail) {
      setValue("email", preferences.lastEmail);
    }
  }, [setValue]);

  const onSubmit = useCallback(
    async (data: SigninFormData) => {
      setIsLoading(true);
      setError(null);

      if (attemptCount > 0) {
        const delay = Math.min(1000 * Math.pow(2, attemptCount - 1), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const { error: authError } = await authActions.signIn(
          data.email,
          data.password,
        );

        if (authError) {
          setError(handleAuthError(authError).message);
          setAttemptCount((prev) => prev + 1);
          return;
        }

        updateEmailPreference(data.email, rememberEmail);
        updateLastSigninMethod("email");
      } catch (err) {
        setError(handleAuthError(err).message);
        setAttemptCount((prev) => prev + 1);
      } finally {
        setIsLoading(false);
      }
    },
    [attemptCount, rememberEmail],
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-label="Sign in with email and password"
    >
      {error && (
        <Alert variant="destructive" className="text-sm" role="alert">
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          {...register("email")}
          className={`transition-all duration-200 focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary ${
            errors.email ? "border-destructive focus:border-destructive" : ""
          }`}
          disabled={isLoading}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-destructive text-sm" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {onForgotPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-accent-primary hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary rounded"
              disabled={isLoading}
              aria-label="Go to forgot password form"
            >
              Forgot Password?
            </button>
          )}
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          {...register("password")}
          className={`transition-all duration-200 focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary ${
            errors.password ? "border-destructive focus:border-destructive" : ""
          }`}
          disabled={isLoading}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p
            id="password-error"
            className="text-destructive text-sm"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="py-2">
        <Checkbox
          id="remember-email"
          checked={rememberEmail}
          onCheckedChange={setRememberEmail}
          disabled={isLoading}
          textClassName="text-text-secondary"
          aria-label="Remember my email address for future sign-ins"
        >
          Remember my email address
        </Checkbox>
      </div>

      <Button
        type="submit"
        className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary disabled:hover:scale-100"
        disabled={isLoading}
        aria-describedby={error ? "signin-error" : undefined}
      >
        <span
          className={`transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        >
          Sign In
        </span>
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span className="ml-2">Signing in...</span>
          </span>
        )}
      </Button>
    </form>
  );
}
