import React from "react";
import { Navigate, useLocation, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLoading } from "@/components/inset-loading";

interface OrgRedirectProps {
  to: string;
  replace?: boolean;
}

export const OrgRedirect: React.FC<OrgRedirectProps> = ({
  to,
  replace = true,
}) => {
  const { organization, isLoading } = useAuth();
  const params = useParams();
  const location = useLocation();

  const orgId = params.organizationId || organization?.id;

  // The organization arrives with the user, and the user arrives over the
  // network. Redirecting before it lands reads "signed out" off a request that
  // has not finished, which sends an authenticated visitor through /login for
  // no reason — and costs them the query string on the way, since a bounce
  // carries only what we put in returnTo.
  if (isLoading) {
    return <InsetLoading />;
  }

  if (!orgId) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // Replace all :param placeholders with actual route params
  let redirectTo = to.replace(":organizationId", orgId);
  for (const [key, value] of Object.entries(params)) {
    if (key !== "organizationId" && value) {
      redirectTo = redirectTo.replace(`:${key}`, value);
    }
  }

  // The query string belongs to the destination, not to this hop: filling in
  // an org id is not a reason to drop what the caller was asking for.
  return <Navigate to={`${redirectTo}${location.search}`} replace={replace} />;
};
