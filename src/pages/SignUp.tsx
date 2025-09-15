import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const redirectTo = searchParams.get("redirect");
    const signInUrl = redirectTo
      ? `/signin?redirect=${encodeURIComponent(redirectTo)}&mode=signup`
      : "/signin?mode=signup";
    navigate(signInUrl, { replace: true });
  }, [navigate, searchParams]);

  return null;
}
