import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [`/api/clients/${user?.id}/appointments`],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (apt: any) => new Date(apt.startTime) > new Date()
  );

  const pastAppointments = appointments.filter(
    (apt: any) => new Date(apt.startTime) <= new Date()
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.firstName}
        </h2>
        <Link href="/appointments/new">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <PlusCircle className="mr-2 h-4 w-4" /> Book Appointment 
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(appointment.startTime), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(appointment.startTime), "h:mm a")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {appointment.doctorName}
                      </p>
                    </div>
                    <Link href={`/appointments/${appointment.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No upcoming appointments</p>
                  <Link href="/appointments/new">
                    <Button variant="outline" className="mt-4">
                      Book Your First Appointment
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Past Appointments
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastAppointments.length > 0 ? (
                pastAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(appointment.startTime), "PPP")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Dr. {appointment.doctorName}
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
                <p className="text-center text-muted-foreground py-8">
                  No past appointments
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}