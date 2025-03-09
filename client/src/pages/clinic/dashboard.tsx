import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Users,
  Calendar,
  DollarSign,
  UserPlus,
  FilePlus,
  Clock,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { CalendarView } from "@/components/appointments/calendar-view";

export default function ClinicDashboard() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  // Fetch clinic data for the current admin
  const { data: clinic, isLoading: isClinicLoading } = useQuery({
    queryKey: ["/api/clinics/current"],
    queryFn: async () => {
      const response = await fetch("/api/clinics/current");
      if (!response.ok) {
        throw new Error("Failed to fetch clinic data");
      }
      return response.json();
    },
    enabled: !!user && user.role === "CLINIC_ADMIN"
  });

  // Fetch appointments for this clinic
  const { data: appointments = [], isLoading: isAppointmentsLoading } = useQuery({
    queryKey: [`/api/clinics/${user?.clinicId}/appointments`],
    queryFn: async () => {
      const response = await fetch(`/api/clinics/${user?.clinicId}/appointments`);
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json();
    },
    enabled: !!user?.clinicId
  });

  // Fetch services for this clinic
  const { data: services = [], isLoading: isServicesLoading } = useQuery({
    queryKey: [`/api/clinics/${user?.clinicId}/services`],
    queryFn: async () => {
      const response = await fetch(`/api/clinics/${user?.clinicId}/services`);
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }
      return response.json();
    },
    enabled: !!user?.clinicId
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/");
  };

  if (isClinicLoading || isAppointmentsLoading || isServicesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clinic Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>

      {clinic && (
        <div className="mb-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <CardTitle>{clinic.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p><strong>Address:</strong> {clinic.address}</p>
              <p><strong>Phone:</strong> {clinic.phone}</p>
              <p><strong>Email:</strong> {clinic.email}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Services Offered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* This would need a staff count query */}
              {clinic?.staffCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add more dashboard sections as needed */}
    </div>
  );
}