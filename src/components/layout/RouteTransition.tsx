import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageLoader } from "@/components/global/Loader";

interface RouteTransitionProps {
  children: React.ReactNode;
  delay?: number;
}

export function RouteTransition({
  children,
  delay = 300,
}: RouteTransitionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    setShowContent(false);

    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [location.pathname, delay]);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div
      className={`transition-opacity duration-300 ${
        showContent ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
