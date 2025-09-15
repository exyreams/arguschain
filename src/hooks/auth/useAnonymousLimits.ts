import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth";
import {
  AnonymousUserService,
  type QueryLimitResult,
} from "@/lib/auth/anonymous-service";
import { toast } from "@/hooks/global/useToast";
import { useEffect } from "react";

export const useAnonymousLimits = () => {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const isAnonymous = !session?.user || session.user.is_anonymous;

  // Query to check current limit status
  const {
    data: limitStatus,
    isLoading,
    refetch: checkLimits,
  } = useQuery({
    queryKey: ["anonymous-limits", AnonymousUserService.getOrCreateSessionId()],
    queryFn: () => AnonymousUserService.checkQueryLimit(),
    enabled: isAnonymous,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Refetch every minute to stay updated
  });

  // Mutation to increment query count
  const incrementQuery = useMutation({
    mutationFn: async (params: {
      queryType: string;
      queryParams: any;
      executionTimeMs?: number;
      resultCount?: number;
      success?: boolean;
      errorMessage?: string;
    }) => {
      return AnonymousUserService.incrementQueryCount(
        params.queryType,
        params.queryParams,
        params.executionTimeMs,
        params.resultCount,
        params.success,
        params.errorMessage
      );
    },
    onSuccess: (newCount) => {
      // Refetch limit status after incrementing
      queryClient.invalidateQueries({ queryKey: ["anonymous-limits"] });

      // Show progress toast
      const remaining = Math.max(0, 5 - newCount);
      if (remaining > 0) {
        toast.info("Query Completed", {
          description: `${remaining} free analyses remaining. Sign in for unlimited access.`,
        });
      }
    },
    onError: (error) => {
      console.error("Failed to track query:", error);
    },
  });

  // Mutation to upgrade session when user signs in
  const upgradeSession = useMutation({
    mutationFn: async (userId: string) => {
      return AnonymousUserService.upgradeToAuthenticated(userId);
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["anonymous-limits"] });
        toast.success("Welcome back!", {
          description:
            "Your session has been upgraded. You now have unlimited access to all features.",
        });
      }
    },
  });

  // Auto-upgrade session when user becomes authenticated
  useEffect(() => {
    if (session?.user && !session.user.is_anonymous && isAnonymous) {
      upgradeSession.mutate(session.user.id);
    }
  }, [session?.user, isAnonymous, upgradeSession]);

  const canMakeQuery = !isAnonymous || !limitStatus?.isExceeded;

  const showLimitWarning = (onSignInClick?: () => void) => {
    if (!limitStatus) return;

    const message = AnonymousUserService.getLimitMessage(limitStatus);

    if (limitStatus.isExceeded) {
      toast.error("Analysis Limit Reached", {
        description: message,
        action: {
          label: "Sign In Now",
          onClick: onSignInClick || (() => (window.location.href = "/signin")),
        },
      });
    } else if (limitStatus.remainingQueries <= 2) {
      toast.warning("Almost at Limit", {
        description: message,
        action: {
          label: "Upgrade Now",
          onClick: onSignInClick || (() => (window.location.href = "/signin")),
        },
      });
    }
  };

  const showUpgradeBenefits = (onSignInClick?: () => void) => {
    const benefits = AnonymousUserService.getUpgradeBenefits();
    toast.info("Unlock Full Access", {
      description: `Sign in to get: ${benefits.slice(0, 3).join(", ")} and more!`,
      action: {
        label: "Sign In",
        onClick: onSignInClick || (() => (window.location.href = "/signin")),
      },
    });
  };

  return {
    isAnonymous,
    limitStatus,
    canMakeQuery,
    isLoading,
    incrementQuery,
    upgradeSession,
    checkLimits,
    showLimitWarning,
    showUpgradeBenefits,
  };
};
