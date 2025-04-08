import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Clock, CheckCircle } from "lucide-react";
import { CalendarView } from "@/components/appointments/calendar-view";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch appointments with refetch disabled on mount & window focus for development.
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [`/api/doctors/${user?.id}/appointments`],
    enabled: !!user?.id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Mutation to update appointment status.
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PUT", `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/doctors/${user?.id}/appointments`],
      });
      toast({
        title: "Appointment Updated",
        description: "The appointment status has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Could not update the appointment.",
        variant: "destructive",
      });
    },
  });

  // Update appointment status convenience method.
  const updateAppointmentStatus = (id: number, status: string) => {
    updateAppointmentMutation.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = (appointments as any[]).filter((apt) =>
    apt.startTime.startsWith(today)
  );
  const completedAppointments = (appointments as any[]).filter(
    (apt) => apt.status === "COMPLETED"
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome, Dr. {user?.lastName}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Today's Appointments
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {todayAppointments.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Next Appointment
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {todayAppointments[0]
                    ? format(new Date(todayAppointments[0].startTime), "h:mm a")
                    : "No appointments"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Appointments
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {completedAppointments.length}
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
                <CardTitle>Today's Appointments (Table View)</CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Time
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Patient
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {todayAppointments.map((appointment: any) => (
                          <tr key={appointment.id}>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {format(new Date(appointment.startTime), "h:mm a")}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {appointment.clientName}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  appointment.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {appointment.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                              <button
                                onClick={() =>
                                  updateAppointmentStatus(appointment.id, "COMPLETED")
                                }
                                className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700"
                              >
                                Completed
                              </button>
                              <button
                                onClick={() =>
                                  updateAppointmentStatus(appointment.id, "CANCELED")
                                }
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                              >
                                Canceled
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">
                    No appointments scheduled for today
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
