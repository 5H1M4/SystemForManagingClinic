import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import StaffAuth from "@/pages/staff-auth";
import SuperAdminDashboard from "@/pages/superadmin/dashboard";
import ClinicDashboard from "@/pages/clinic/dashboard";
import DoctorDashboard from "@/pages/doctor/dashboard";
import ClientDashboard from "@/pages/client/dashboard";
import NewAppointment from "@/pages/appointments/new";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/staff" component={StaffAuth} />
      <ProtectedRoute path="/superadmin/dashboard" component={SuperAdminDashboard} />
      <ProtectedRoute path="/clinic/dashboard" component={ClinicDashboard} />
      <ProtectedRoute path="/doctor/dashboard" component={DoctorDashboard} />
      <ProtectedRoute path="/client/dashboard" component={ClientDashboard} />
      <ProtectedRoute path="/appointments/new" component={NewAppointment} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;