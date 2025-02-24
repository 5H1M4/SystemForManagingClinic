import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Clock, CheckCircle } from "lucide-react";
import { CalendarView } from "@/components/appointments/calendar-view";
import { format } from "date-fns";

export default function DoctorDashboard() {
  const { user } = useAuth();

  const { data: appointments, isLoading } = useQuery({
    queryKey: [`/api/doctors/${user?.id}/appointments`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const todayAppointments = appointments?.filter((apt: any) => {
    const today = new Date().toISOString().split("T")[0];
    return apt.startTime.startsWith(today);
  });

  const completedAppointments = appointments?.filter(
    (apt: any) => apt.status === "COMPLETED"
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome, Dr. {user?.lastName}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayAppointments?.[0]
                ? format(new Date(todayAppointments[0].startTime), "h:mm a")
                : "No appointments"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Appointments
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedAppointments?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>My Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarView clinicId={user?.clinicId!} doctorId={user?.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments?.length ? (
                todayAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(appointment.startTime), "h:mm a")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Patient: {appointment.clientName}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 text-xs rounded-full ${
                        appointment.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {appointment.status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  No appointments scheduled for today
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
