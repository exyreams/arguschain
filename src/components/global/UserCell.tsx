import React from "react";
import {
  getUserIdentifier,
  getUserAuthMode,
  getUserDisplayName,
} from "@/lib/auth/anonymous-utils";
import { User } from "@/lib/auth/auth";
import { cn } from "@/lib/utils";

interface UserCellProps {
  user: User | null;
  variant?: "name" | "identifier" | "full";
  showAuthMode?: boolean;
  className?: string;
}

export const UserCell: React.FC<UserCellProps> = ({
  user,
  variant = "identifier",
  showAuthMode = false,
  className,
}) => {
  const displayText =
    variant === "name"
      ? getUserDisplayName(user, { showId: true })
      : getUserIdentifier(user);

  const authMode = getUserAuthMode(user);

  const getAuthModeColor = (mode: string) => {
    switch (mode) {
      case "anonymous":
        return "text-yellow-400";
      case "email":
        return "text-green-400";
      case "oauth":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-text-primary">{displayText}</span>
      {showAuthMode && (
        <span className={cn("text-xs", getAuthModeColor(authMode))}>
          {authMode}
        </span>
      )}
    </div>
  );
};
