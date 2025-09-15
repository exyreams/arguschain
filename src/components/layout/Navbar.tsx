import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SettingsModal from "@/components/modals/settings/SettingsModal";
import { useIsMobile } from "@/hooks/global";
import { MobileNavbar } from "./MobileNavbar";
import { useAuth } from "@/lib/auth";
import UserDropdown from "./UserDropdown";
import type { UserProfile } from "@/lib/profile/types";
import type { User } from "@/lib/auth/auth";

import { Logo } from "@/components/ui/Logo";

const LogoComponent = () => <Logo className="w-8 h-8" alt="arguschain Logo" />;

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-[22px] h-[22px] fill-current transition-transform transition-duration-[400ms] group-hover:rotate-45"
  >
    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:rotate-180"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const HamburgerIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6 transition-transform duration-300"
  >
    {isOpen ? (
      <>
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </>
    ) : (
      <>
        <path d="M3 12h18" />
        <path d="M3 6h18" />
        <path d="M3 18h18" />
      </>
    )}
  </svg>
);

const MobileChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const transformUserToProfile = (user: User): UserProfile => {
  return {
    id: user.id,
    email: user.email || "",
    fullName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    username: user.user_metadata?.username || user.email?.split("@")[0],
    bio: user.user_metadata?.bio,
    website: user.user_metadata?.website,
    avatar: user.user_metadata?.avatar_url,
    createdAt: user.created_at || new Date().toISOString(),
    lastLoginAt: user.last_sign_in_at || new Date().toISOString(),
    authMethod: {
      type: user.app_metadata?.provider === "email" ? "email" : "oauth",
      provider: user.app_metadata?.provider as
        | "google"
        | "github"
        | "discord"
        | undefined,
      providerId: user.app_metadata?.provider_id,
    },
    isEmailVerified: !!user.email_confirmed_at,
    preferences: {
      theme: "system",
      notifications: {
        browser: true,
        email: true,
        analysisComplete: true,
        errorAlerts: true,
      },
      accessibility: {
        fontSize: "medium",
        highContrast: false,
        reduceAnimations: false,
      },
      interface: {
        compactMode: false,
        showTooltips: true,
        autoSave: true,
      },
    },
    connectedProviders:
      user.app_metadata?.providers?.map((provider) => ({
        provider: provider as "google" | "github" | "discord",
        providerId: user.id,
        email: user.email,
        connectedAt: user.created_at || new Date().toISOString(),
      })) || [],
    usage: {
      analysisCount: 0,
      savedQueries: 0,
      storageUsed: 0,
      storageLimit: 1024 * 1024 * 1024, // 1GB
    },
  };
};

export default function Navbar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileOpenDropdown, setMobileOpenDropdown] = useState<string | null>(
    null,
  );

  const navItems = [
    {
      name: "Transaction Analysis",
      href: "#",
      dropdown: [
        { name: "Debug Transaction", href: "/debug-trace" },
        { name: "Trace Transaction", href: "/trace-transaction" },
        { name: "Transaction Simulator", href: "/transaction-simulation" },
        { name: "Transaction Replay", href: "/replay-transactions" },
      ],
    },
    {
      name: "Block Analysis",
      href: "#",
      dropdown: [
        { name: "Block Trace Analyzer", href: "/trace-block" },
        { name: "Debug Block Trace", href: "/debug-block-trace" },
      ],
    },
    {
      name: "State & Storage",
      href: "#",
      dropdown: [
        { name: "Bytecode Analysis", href: "/bytecode-analysis" },
        { name: "Event Logs", href: "/event-logs" },
        { name: "Storage Analysis", href: "/storage-analysis" },
      ],
    },
    {
      name: "Network Monitor",
      href: "/network-monitor",
    },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const getActiveDropdownItemName = (
    dropdown: { name: string; href: string }[],
  ) => {
    const activeItem = dropdown.find((item) => isActiveLink(item.href));
    return activeItem?.name;
  };

  const getDisplayName = (item: (typeof navItems)[0]) => {
    if (!item.dropdown) return item.name;
    const activeChildName = getActiveDropdownItemName(item.dropdown);
    return activeChildName || item.name;
  };

  const toggleMobileDropdown = (itemName: string) => {
    setMobileOpenDropdown(mobileOpenDropdown === itemName ? null : itemName);
  };

  const closeMobileSheet = () => {
    setMobileSheetOpen(false);
    setMobileOpenDropdown(null);
  };

  return (
    <>
      <nav className="flex items-center px-4 md:px-6 py-3 bg-[rgba(25,28,40,0.7)] backdrop-blur-[10px] relative">
        <Link
          to="/"
          className="flex items-center gap-2 md:gap-3 text-xl md:text-2xl text-accent-primary tracking-wide font-audiowide"
        >
          <LogoComponent />
          <span className="font-regular">arguschain</span>
        </Link>

        {!isMobile && (
          <>
            <ul className="flex items-center list-none gap-3 ml-auto">
              {navItems.map((item) => (
                <li key={item.name} className="relative group">
                  {item.dropdown ? (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-haspopup="true"
                      aria-expanded="false"
                      className={`flex items-center px-4 py-2 text-[13px] font-medium tracking-[0.5px] rounded-[6px] transition-all duration-300 border no-underline cursor-pointer ${
                        item.dropdown.some((dropdownItem) =>
                          isActiveLink(dropdownItem.href),
                        )
                          ? "text-accent-primary bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.4)]"
                          : "text-[#a0a9c0] border-transparent hover:text-accent-primary hover:bg-[rgba(0,191,255,0.1)] hover:border-[rgba(0,191,255,0.3)] hover:-translate-y-px"
                      }`}
                    >
                      {getDisplayName(item)}
                      <ChevronDownIcon />
                    </span>
                  ) : (
                    <Link
                      to={item.href}
                      className={`block px-4 py-2 text-[13px] font-medium tracking-[0.5px] rounded-[6px] transition-all duration-300 border no-underline ${
                        isActiveLink(item.href)
                          ? "text-accent-primary bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.4)]"
                          : "text-[#a0a9c0] border-transparent hover:text-accent-primary hover:bg-[rgba(0,191,255,0.1)] hover:border-[rgba(0,191,255,0.3)] hover:-translate-y-px"
                      }`}
                    >
                      {item.name}
                    </Link>
                  )}

                  {item.dropdown && (
                    <ul className="absolute top-[120%] left-0 bg-[rgba(25,28,40)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg list-none p-2 min-w-[200px] opacity-0 invisible translate-y-[10px] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 z-50">
                      {item.dropdown.map((dropdownItem) => (
                        <li key={dropdownItem.name}>
                          <Link
                            to={dropdownItem.href}
                            className="block px-4 py-[10px] text-[13px] text-[#8b9dc3] no-underline rounded-[6px] transition-all duration-200 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary"
                          >
                            {dropdownItem.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 ml-6">
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center text-[#8b9dc3] transition-all duration-300 group hover:text-accent-primary outline-none"
                aria-label="Settings"
              >
                <SettingsIcon />
              </button>

              {user ? (
                <UserDropdown
                  user={transformUserToProfile(user)}
                  isAnonymous={!!user.is_anonymous}
                />
              ) : (
                <Link
                  to="/signin"
                  className="px-4 py-2 text-accent-primary no-underline text-[13px] font-medium tracking-[0.5px] rounded-[6px] transition-all duration-300 border border-[rgba(255,255,255,0.1)] bg-transparent hover:text-[#0f1419] hovetext-accent-primary hover:shadow-[0_0_12px_rgba(0,191,255,0.5)] hover:-translate-y-px"
                >
                  Sign In
                </Link>
              )}
            </div>
          </>
        )}

        {isMobile && (
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center text-[#8b9dc3] transition-all duration-300 group hover:text-accent-primary outline-none p-2"
              aria-label="Settings"
            >
              <SettingsIcon />
            </button>

            <MobileNavbar
              open={mobileSheetOpen}
              onOpenChange={setMobileSheetOpen}
              trigger={
                <button
                  className="flex items-center justify-center text-[#8b9dc3] transition-all duration-300 hover:text-accent-primary outline-none p-2"
                  aria-label="Toggle menu"
                >
                  <HamburgerIcon isOpen={mobileSheetOpen} />
                </button>
              }
            >
              <nav>
                <ul className="list-none space-y-2">
                  {navItems.map((item) => (
                    <li key={item.name}>
                      {item.dropdown ? (
                        <div>
                          <button
                            onClick={() => toggleMobileDropdown(item.name)}
                            className={`flex items-center justify-between w-full px-4 py-3 text-[15px] font-medium tracking-[0.5px] rounded-[10px] transition-all duration-300 border ${
                              item.dropdown.some((dropdownItem) =>
                                isActiveLink(dropdownItem.href),
                              )
                                ? "text-accent-primary bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.4)]"
                                : "text-[#a0a9c0] border-transparent hover:text-accent-primary hover:bg-[rgba(0,191,255,0.1)] hover:border-[rgba(0,191,255,0.3)]"
                            }`}
                          >
                            <span>{getDisplayName(item)}</span>
                            <MobileChevronDownIcon
                              isOpen={mobileOpenDropdown === item.name}
                            />
                          </button>

                          {mobileOpenDropdown === item.name && (
                            <div className="mt-2 ml-4 space-y-1">
                              {item.dropdown.map((dropdownItem) => (
                                <Link
                                  key={dropdownItem.name}
                                  to={dropdownItem.href}
                                  onClick={closeMobileSheet}
                                  className={`block px-4 py-3 text-[14px] rounded-[8px] transition-all duration-200 no-underline ${
                                    isActiveLink(dropdownItem.href)
                                      ? "text-accent-primary bg-[rgba(0,191,255,0.15)] border border-[rgba(0,191,255,0.3)]"
                                      : "text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary"
                                  }`}
                                >
                                  {dropdownItem.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={item.href}
                          onClick={closeMobileSheet}
                          className={`block px-4 py-3 text-[15px] font-medium tracking-[0.5px] rounded-[10px] transition-all duration-300 border no-underline ${
                            isActiveLink(item.href)
                              ? "text-accent-primary bg-gradient-to-br from-[rgba(0,191,255,0.2)] to-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.4)]"
                              : "text-[#a0a9c0] border-transparent hover:text-accent-primary hover:bg-[rgba(0,191,255,0.1)] hover:border-[rgba(0,191,255,0.3)]"
                          }`}
                        >
                          {item.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-6 pt-4 border-t border-[rgba(0,191,255,0.2)]">
                {user ? (
                  <div onClick={closeMobileSheet}>
                    <UserDropdown
                      user={transformUserToProfile(user)}
                      isAnonymous={!!user.is_anonymous}
                    />
                  </div>
                ) : (
                  <Link
                    to="/signin"
                    onClick={closeMobileSheet}
                    className="block w-full px-4 py-3 text-center text-accent-primary no-underline text-[15px] font-medium tracking-[0.5px] rounded-[10px] transition-all duration-300 border border-[rgba(0,191,255,0.4)] bg-transparent hover:text-[#0f1419] hovetext-accent-primary hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </MobileNavbar>
          </div>
        )}
      </nav>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
