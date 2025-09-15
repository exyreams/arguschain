import { z } from "zod";
export const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be less than 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Display name contains invalid characters"),
  firstName: z
    .string()
    .max(30, "First name must be less than 30 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "First name contains invalid characters")
    .optional()
    .or(z.literal("")),
  lastName: z
    .string()
    .max(30, "Last name must be less than 30 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Last name contains invalid characters")
    .optional()
    .or(z.literal("")),
  email: z
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const oauthProviderSchema = z.enum(["google", "github", "microsoft"]);

export const dataExportSchema = z.object({
  format: z.enum(["json", "csv"]),
  dataTypes: z
    .array(z.enum(["profile", "analysis-history", "usage-data"]))
    .min(1, "Please select at least one data type to export")
    .max(10, "Too many data types selected"),
});

export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB"
    )
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
          file.type
        ),
      "Please upload a valid image file (JPEG, PNG, GIF, or WebP)"
    ),
});

export const accountDeletionSchema = z.object({
  confirmation: z.literal("DELETE").refine((val) => val === "DELETE", {
    message: 'Please type "DELETE" to confirm account deletion',
  }),
  password: z
    .string()
    .min(1, "Password is required for account deletion")
    .optional(),
});

export const sessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  startTime: z.string().datetime("Invalid session start time"),
  limitations: z.object({
    maxAnalysisHistory: z.number().min(0),
    maxSavedQueries: z.number().min(0),
    canExport: z.boolean(),
    canSaveSettings: z.boolean(),
  }),
  usage: z.object({
    analysisCount: z.number().min(0),
    savedQueries: z.number().min(0),
  }),
});

export const userProfileSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
  createdAt: z.string().datetime("Invalid creation date"),
  lastLoginAt: z.string().datetime("Invalid last login date"),
  authMethod: z.object({
    type: z.enum(["email", "oauth"]),
    provider: oauthProviderSchema.optional(),
    lastPasswordChange: z.string().datetime().optional(),
  }),
  isEmailVerified: z.boolean(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]),
      notifications: z.object({
        browser: z.boolean(),
        email: z.boolean(),
        analysisComplete: z.boolean(),
        errorAlerts: z.boolean(),
      }),
      accessibility: z.object({
        fontSize: z.enum(["small", "medium", "large"]),
        highContrast: z.boolean(),
        reduceAnimations: z.boolean(),
      }),
      interface: z.object({
        compactMode: z.boolean(),
        showTooltips: z.boolean(),
        autoSave: z.boolean(),
      }),
    })
    .optional(),
  connectedProviders: z
    .array(
      z.object({
        provider: oauthProviderSchema,
        providerId: z.string(),
        email: z.string().email().optional(),
        connectedAt: z.string().datetime(),
      })
    )
    .optional(),
  usage: z
    .object({
      analysisCount: z.number().min(0),
      savedQueries: z.number().min(0),
      storageUsed: z.number().min(0),
      storageLimit: z.number().min(0),
    })
    .optional(),
});

export const validateProfileForm = (data: unknown) => {
  return profileFormSchema.safeParse(data);
};

export const validatePasswordChange = (data: unknown) => {
  return passwordChangeSchema.safeParse(data);
};

export const validateOAuthProvider = (provider: unknown) => {
  return oauthProviderSchema.safeParse(provider);
};

export const validateDataExport = (data: unknown) => {
  return dataExportSchema.safeParse(data);
};

export const validateFileUpload = (file: unknown) => {
  return fileUploadSchema.safeParse({ file });
};

export const validateAccountDeletion = (data: unknown) => {
  return accountDeletionSchema.safeParse(data);
};

export const validateSession = (data: unknown) => {
  return sessionSchema.safeParse(data);
};

export const validateUserProfile = (data: unknown) => {
  return userProfileSchema.safeParse(data);
};

export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.issues.map((error) => ({
    field: error.path.join("."),
    message: error.message,
  }));
};

export const customValidations = {
  isStrongPassword: (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  },

  isValidDisplayName: (name: string): boolean => {
    return (
      name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s\-_.]+$/.test(name)
    );
  },

  isValidEmail: (email: string): boolean => {
    return z.string().email().safeParse(email).success;
  },

  isValidFileSize: (file: File, maxSizeMB: number = 5): boolean => {
    return file.size <= maxSizeMB * 1024 * 1024;
  },

  isValidImageType: (file: File): boolean => {
    return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
      file.type
    );
  },

  isValidSessionId: (sessionId: string): boolean => {
    return sessionId.length > 0 && /^[a-zA-Z0-9_-]+$/.test(sessionId);
  },
};

export const asyncValidations = {
  checkEmailAvailability: async (email: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const unavailableEmails = ["admin@example.com", "test@example.com"];
    return !unavailableEmails.includes(email.toLowerCase());
  },

  validateCurrentPassword: async (password: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return password.length > 0;
  },

  checkOAuthConnection: async (): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    return true;
  },
};

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export const createValidator = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): ValidationResult<T> => {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      errors: formatValidationErrors(result.error),
    };
  };
};

export const validators = {
  profileForm: createValidator(profileFormSchema),
  passwordChange: createValidator(passwordChangeSchema),
  oauthProvider: createValidator(oauthProviderSchema),
  dataExport: createValidator(dataExportSchema),
  fileUpload: createValidator(fileUploadSchema),
  accountDeletion: createValidator(accountDeletionSchema),
  session: createValidator(sessionSchema),
  userProfile: createValidator(userProfileSchema),
};
