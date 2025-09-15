import { supabase } from "@/lib/auth/auth";
import { validateFileUpload } from "./utils";
import type { ProfileError } from "./types";

export class AvatarService {
  private readonly bucketName = "avatars";
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  /**
   * Upload avatar to Supabase storage
   */
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ url: string; path: string }> {
    // Validate file
    const validationErrors = validateFileUpload(file);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors[0].message);
    }

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Avatar upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      // Update user profile with new avatar URL
      await this.updateUserAvatarUrl(userId, data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error("Avatar upload failed:", error);
      throw error instanceof Error ? error : new Error("Avatar upload failed");
    }
  }

  /**
   * Delete avatar from storage
   */
  async deleteAvatar(userId: string, avatarPath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([avatarPath]);

      if (error) {
        console.error("Avatar deletion error:", error);
        throw new Error(`Deletion failed: ${error.message}`);
      }

      // Clear avatar URL from user profile
      await this.updateUserAvatarUrl(userId, null);
    } catch (error) {
      console.error("Avatar deletion failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Avatar deletion failed");
    }
  }

  /**
   * Get public URL for avatar
   */
  getPublicUrl(path: string): string {
    const { data } = supabase.storage.from(this.bucketName).getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Update user profile with avatar URL
   */
  private async updateUserAvatarUrl(
    userId: string,
    avatarPath: string | null
  ): Promise<void> {
    try {
      const { error } = await supabase.from("user_profiles").upsert({
        id: userId,
        avatar_url: avatarPath,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Profile update error:", error);
        throw new Error(`Profile update failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to update user avatar URL:", error);
      throw error instanceof Error ? error : new Error("Profile update failed");
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): ProfileError[] {
    return validateFileUpload(file);
  }

  /**
   * Create upload progress handler
   */
  createProgressHandler(onProgress: (progress: number) => void) {
    return (progressEvent: ProgressEvent) => {
      if (progressEvent.lengthComputable) {
        const progress = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100
        );
        onProgress(progress);
      }
    };
  }

  /**
   * Generate avatar preview URL from file
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Clean up preview URL
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Check if storage bucket exists and is accessible
   */
  async checkBucketAccess(): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list("", { limit: 1 });

      return !error;
    } catch (error) {
      console.error("Bucket access check failed:", error);
      return false;
    }
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(file: File): boolean {
    return this.allowedTypes.includes(file.type);
  }

  /**
   * Check if file size is within limits
   */
  isFileSizeValid(file: File): boolean {
    return file.size <= this.maxFileSize;
  }
}

// Export singleton instance
export const avatarService = new AvatarService();
