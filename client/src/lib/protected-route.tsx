import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Role-based routing
  const roleBasedPath = {
    SUPER_ADMIN: "/superadmin/dashboard",
    CLINIC_ADMIN: "/clinic/dashboard",
    DOCTOR: "/doctor/dashboard",
    CLIENT: "/client/dashboard",
  }[user.role];

  // Redirect if trying to access wrong role's dashboard
  if (!path.startsWith(roleBasedPath)) {
    return (
      <Route path={path}>
        <Redirect to={roleBasedPath} />
      </Route>
    );
  }

  return <Component />;
}