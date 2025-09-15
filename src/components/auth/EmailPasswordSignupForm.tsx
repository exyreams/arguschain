import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authActions, handleAuthError } from "@/lib/auth";
import { Alert, Button, Checkbox, Input, Label } from "@/components/global";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms of service to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function EmailPasswordSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      acceptTerms: false,
    },
  });

  const acceptTerms = watch("acceptTerms");

  const onSubmit = useCallback(async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await authActions.signUp(
        data.email,
        data.password,
        {
          data: {
            name: data.name,
          },
        },
      );

      if (authError) {
        setError(handleAuthError(authError).message);
        return;
      }
    } catch (err) {
      setError(handleAuthError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-label="Sign up with email and password"
    >
      {error && (
        <Alert variant="destructive" className="text-sm" role="alert">
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          {...register("name")}
          className={`transition-all duration-200 focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary ${
            errors.name ? "border-destructive focus:border-destructive" : ""
          }`}
          disabled={isLoading}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-destructive text-sm" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm your password"
          {...register("confirmPassword")}
          className={`transition-all duration-200 focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary ${
            errors.confirmPassword
              ? "border-destructive focus:border-destructive"
              : ""
          }`}
          disabled={isLoading}
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          aria-describedby={
            errors.confirmPassword ? "confirm-password-error" : undefined
          }
        />
        {errors.confirmPassword && (
          <p
            id="confirm-password-error"
            className="text-destructive text-sm"
            role="alert"
          >
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Checkbox
          id="acceptTerms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setValue("acceptTerms", checked)}
          textClassName="text-xs text-text-secondary"
          aria-invalid={errors.acceptTerms ? "true" : "false"}
          aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
        >
          I agree to the{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:text-text-secondary underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:text-text-secondary underline"
          >
            Privacy Policy
          </a>
        </Checkbox>
        {errors.acceptTerms && (
          <p id="terms-error" className="text-destructive text-sm" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary disabled:hover:scale-100"
        disabled={isLoading}
        aria-describedby={error ? "signup-error" : undefined}
      >
        <span
          className={`transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
        >
          Create Account
        </span>
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span className="ml-2">Creating account...</span>
          </span>
        )}
      </Button>
    </form>
  );
}
