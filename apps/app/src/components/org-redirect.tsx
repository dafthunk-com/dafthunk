import React from "react";
import { Navigate, useParams } from "react-router";

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
  const { handle } = useParams<{ handle: string }>();

  const orgHandle = handle || organization?.handle;

  if (!orgHandle) {
    // Fallback to login if no organization handle is available
    return <Navigate to="/login" replace />;
  }

  // Replace :handle with the actual organization handle
  const redirectTo = to.replace(":handle", orgHandle);

  return <Navigate to={redirectTo} replace={replace} />;
};
