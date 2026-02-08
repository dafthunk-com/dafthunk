import React from "react";
import { Navigate, useLocation, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";

interface OrgRedirectProps {
  to: string;
  replace?: boolean;
}

export const OrgRedirect: React.FC<OrgRedirectProps> = ({
  to,
  replace = true,
}) => {
  const { organization } = useAuth();
  const params = useParams();
  const location = useLocation();

  const orgHandle = params.handle || organization?.handle;

  if (!orgHandle) {
    const returnTo = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // Replace all :param placeholders with actual route params
  let redirectTo = to.replace(":handle", orgHandle);
  for (const [key, value] of Object.entries(params)) {
    if (key !== "handle" && value) {
      redirectTo = redirectTo.replace(`:${key}`, value);
    }
  }

  return <Navigate to={redirectTo} replace={replace} />;
};
