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
} from "lucide-react";
import { Link } from "wouter";
import { CalendarView } from "@/components/appointments/calendar-view";

export default function ClinicDashboard() {
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const { data: appointments, isLoading: loadingAppointments } = useQuery({
    queryKey: [`/api/clinics/${clinicId}/appointments`],
  });

  const { data: doctors, isLoading: loadingDoctors } = useQuery({
    queryKey: [`/api/clinics/${clinicId}/doctors`],
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: [`/api/clinics/${clinicId}/payments`],
  });

  if (loadingAppointments || loadingDoctors || loadingPayments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalRevenue = payments?.reduce(
    (sum: number, payment: any) => sum + Number(payment.amount),
    0
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h2>
        <div className="flex gap-2">
          <Link href="/clinic/doctors/new">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <UserPlus className="mr-2 h-4 w-4" /> Add Doctor
            </Button>
          </Link>
          <Link href="/clinic/services/new">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <FilePlus className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments?.filter((apt: any) => {
                const today = new Date().toISOString().split("T")[0];
                return apt.startTime.startsWith(today);
              }).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRevenue?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Appointments Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarView clinicId={clinicId!} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
