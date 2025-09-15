import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect } from "react";

export type SettingsTab =
  | "profile"
  | "network"
  | "preferences"
  | "api"
  | "export"
  | "about";
export type ProfileSection = "info" | "personal" | "security" | "data";

interface ModalState {
  tab?: SettingsTab;
  section?: ProfileSection;
  editing?: boolean;
}

const VALID_TABS: SettingsTab[] = [
  "profile",
  "network",
  "preferences",
  "api",
  "export",
  "about",
];
const VALID_SECTIONS: ProfileSection[] = [
  "info",
  "personal",
  "security",
  "data",
];

export const useModalState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Validate and sanitize URL parameters
  const validateTab = (tab: string | null): SettingsTab | undefined => {
    return tab && VALID_TABS.includes(tab as SettingsTab)
      ? (tab as SettingsTab)
      : undefined;
  };

  const validateSection = (
    section: string | null
  ): ProfileSection | undefined => {
    return section && VALID_SECTIONS.includes(section as ProfileSection)
      ? (section as ProfileSection)
      : undefined;
  };

  const modalState: ModalState = {
    tab: validateTab(searchParams.get("tab")),
    section: validateSection(searchParams.get("section")),
    editing: searchParams.get("editing") === "true",
  };

  // Clean up invalid parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let hasInvalidParams = false;

    // Check for invalid tab
    const tabParam = params.get("tab");
    if (tabParam && !VALID_TABS.includes(tabParam as SettingsTab)) {
      params.delete("tab");
      hasInvalidParams = true;
    }

    // Check for invalid section
    const sectionParam = params.get("section");
    if (
      sectionParam &&
      !VALID_SECTIONS.includes(sectionParam as ProfileSection)
    ) {
      params.delete("section");
      hasInvalidParams = true;
    }

    // Check for invalid editing parameter
    const editingParam = params.get("editing");
    if (editingParam && editingParam !== "true" && editingParam !== "false") {
      params.delete("editing");
      hasInvalidParams = true;
    }

    // Update URL if we found invalid parameters
    if (hasInvalidParams) {
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const updateModalState = useCallback(
    (newState: Partial<ModalState>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newState).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== false) {
          // Validate the value before setting
          if (key === "tab" && !VALID_TABS.includes(value as SettingsTab)) {
            return;
          }
          if (
            key === "section" &&
            !VALID_SECTIONS.includes(value as ProfileSection)
          ) {
            return;
          }
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clearModalState = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    ["tab", "section", "editing"].forEach((key) => params.delete(key));
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const isModalOpen = Boolean(modalState.tab);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // The searchParams will automatically update when the URL changes
      // due to browser navigation, so we don't need to do anything special here
      // The components will re-render with the new state
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    modalState,
    updateModalState,
    clearModalState,
    isModalOpen,
  };
};
