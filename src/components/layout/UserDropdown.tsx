import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings, User, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import SettingsModal from "@/components/modals/settings/SettingsModal";
import { useModalState } from "@/hooks/shared";

import { getUserDisplayData, getUserInitials } from "@/lib/profile/utils";
import type { DropdownItem, UserDropdownProps } from "@/lib/profile/types";

const AnonymousIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M21 17.5C21 19.433 19.433 21 17.5 21C15.567 21 14 19.433 14 17.5C14 15.567 15.567 14 17.5 14C19.433 14 21 15.567 21 17.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M2 11H22"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 11L4.6138 8.54479C5.15947 6.36211 5.43231 5.27077 6.24609 4.63538C7.05988 4 8.1848 4 10.4347 4H13.5653C15.8152 4 16.9401 4 17.7539 4.63538C18.5677 5.27077 18.8405 6.36211 19.3862 8.54479L20 11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10 17.5C10 19.433 8.433 21 6.5 21C4.567 21 3 19.433 3 17.5C3 15.567 4.567 14 6.5 14C8.433 14 10 15.567 10 17.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M10 17.4999L10.6584 17.1707C11.5029 16.7484 12.4971 16.7484 13.3416 17.1707L14 17.4999"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  isAnonymous,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { modalState, updateModalState, clearModalState, isModalOpen } =
    useModalState();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsOpen(false);

      // Clear modal state first
      clearModalState();

      // Sign out using Supabase auth
      await signOut();

      // Clear any local storage and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Navigate to home page
      navigate("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleCreateAccount = () => {
    navigate("/auth/signup");
    setIsOpen(false);
  };

  const handleProfileClick = () => {
    updateModalState({ tab: "profile", section: "info" });
    setIsOpen(false);
  };

  const handleSettingsClick = () => {
    updateModalState({ tab: "preferences" });
    setIsOpen(false);
  };

  const displayData = getUserDisplayData(user);
  const initials = getUserInitials(user);

  const handleEndSession = () => {
    // Clear any session data and redirect to home
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
    setIsOpen(false);
  };

  // Define dropdown items based on user state
  const dropdownItems: DropdownItem[] = isAnonymous
    ? [
        {
          label: "Profile",
          icon: User,
          action: handleProfileClick,
        },
        {
          label: "Create Account",
          icon: UserPlus,
          action: handleCreateAccount,
        },
        {
          label: "End Session",
          icon: LogOut,
          action: handleEndSession,
          variant: "danger",
        },
      ]
    : [
        {
          label: "Profile",
          icon: User,
          action: handleProfileClick,
        },
        {
          label: "Settings",
          icon: Settings,
          action: handleSettingsClick,
        },
        {
          label: "Sign Out",
          icon: LogOut,
          action: handleSignOut,
          variant: "danger",
        },
      ];

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-[13px] font-medium tracking-[0.5px] rounded-[6px] transition-all duration-300 border no-underline cursor-pointer",
          isOpen
            ? "text-[#00bfff] bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.4)]"
            : "text-[#a0a9c0] border-transparent hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[rgba(0,191,255,0.3)] hover:-translate-y-px",
        )}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={isAnonymous ? "Anonymous user menu" : "User menu"}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            isAnonymous
              ? "bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.4)] text-[#00bfff]"
              : "bg-gradient-to-br from-[#00bfff] to-[#0080cc] text-white text-sm font-medium",
          )}
        >
          {displayData?.avatar ? (
            <img
              src={displayData.avatar}
              alt="User avatar"
              className="w-full h-full rounded-full object-cover"
            />
          ) : isAnonymous ? (
            <AnonymousIcon className="h-4 w-4" />
          ) : (
            <span className="text-sm font-medium">{initials}</span>
          )}
        </div>

        {/* User Info */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm font-medium truncate max-w-32">
            {isAnonymous ? "Guest" : displayData?.fullName || "User"}
          </span>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200 group-hover:rotate-180",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-[120%] z-50",
            "bg-[rgba(25,28,40,0.9)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg",
            "min-w-[200px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
            "opacity-100 visible translate-y-0 transition-all duration-300",
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Info Header (for authenticated users) */}
          {!isAnonymous && displayData && (
            <>
              <div className="px-4 py-3 border-b border-[rgba(0,191,255,0.2)]">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex items-center justify-center",
                      "w-10 h-10 rounded-full",
                      "bg-gradient-to-br from-[#00bfff] to-[#0080cc] text-white text-sm font-medium",
                    )}
                  >
                    {displayData.avatar ? (
                      <img
                        src={displayData.avatar}
                        alt="User avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-accent-primary truncate">
                      {displayData.displayName}
                    </span>
                    <span className="text-xs text-[#8b9dc3] truncate">
                      {displayData.email}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Anonymous User Info */}
          {isAnonymous && (
            <div className="px-4 py-3 border-b border-[rgba(0,191,255,0.2)]">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center",
                    "w-10 h-10 rounded-full",
                    "bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.4)] text-[#00bfff]",
                  )}
                >
                  <AnonymousIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-accent-primary">
                    Anonymous User
                  </span>
                  <span className="text-xs text-[#8b9dc3]">
                    Limited session
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="p-2">
            {dropdownItems.map((item, index) => (
              <button
                key={index}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-[10px] text-left",
                  "text-[13px] text-[#8b9dc3] no-underline rounded-[6px] transition-all duration-200",
                  "hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff]",
                  "focus:bg-[rgba(0,191,255,0.1)] focus:text-[#00bfff] focus:outline-none",
                  item.variant === "danger" &&
                    "text-red-400 hover:text-red-300 hover:bg-red-900/20",
                  item.disabled && "opacity-50 cursor-not-allowed",
                )}
                onClick={item.action}
                disabled={item.disabled}
                role="menuitem"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearModalState();
          }
        }}
        initialTab={modalState.tab || "profile"}
      />
    </div>
  );
};

export default UserDropdown;
