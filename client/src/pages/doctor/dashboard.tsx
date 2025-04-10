import { DashboardHeader } from "@/components/layout/dashboard-header";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Clock, CheckCircle } from "lucide-react";
import { CalendarView } from "@/components/appointments/calendar-view";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch appointments query. Refetch on mount and window focus are disabled.
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [`/api/doctors/${user?.id}/appointments`],
    enabled: !!user?.id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Dedicated mutation for completing an appointment.
  const completeAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Attempting to complete appointment ${id}`);
      const response = await apiRequest("POST", `/api/appointments/${id}/complete`);
      return response;
    },
    onSuccess: (_, appointmentId) => {
      console.log(`Appointment ${appointmentId} completed successfully`);
      // Invalidate the specific query key for this doctor's appointments
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${user?.id}/appointments`] });
      toast({
        title: "Appointment Completed",
        description: "The appointment has been marked as completed.",
      });
    },
    onError: (error: any) => {
      console.error(`Error completing appointment:`, error);
      let errorMessage = "Could not complete the appointment. Please try again.";
      
      if (error.status === 404) {
        errorMessage = "Appointment not found. It may have been deleted.";
      } else if (error.status === 403) {
        errorMessage = "You don't have permission to complete this appointment.";
      } else if (error.status === 400) {
        errorMessage = error.message || "Only scheduled appointments can be completed.";
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Dedicated mutation for cancelling an appointment.
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Attempting to cancel appointment ${id}`);
      const response = await apiRequest("POST", `/api/appointments/${id}/cancel`);
      return response;
    },
    onSuccess: (_, appointmentId) => {
      console.log(`Appointment ${appointmentId} cancelled successfully`);
      // Invalidate the specific query key for this doctor's appointments
      queryClient.invalidateQueries({ queryKey: [`/api/doctors/${user?.id}/appointments`] });
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });
    },
    onError: (error: any) => {
      console.error(`Error cancelling appointment:`, error);
      let errorMessage = "Could not cancel the appointment. Please try again.";
      
      if (error.status === 404) {
        errorMessage = "Appointment not found. It may have been deleted.";
      } else if (error.status === 403) {
        errorMessage = "You don't have permission to cancel this appointment.";
      } else if (error.status === 400) {
        errorMessage = error.message || "Only scheduled appointments can be cancelled.";
      }
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update function to call the appropriate endpoint based on the status.
  const updateAppointmentStatus = (id: number, status: string) => {
    if (status === "COMPLETED") {
      completeAppointmentMutation.mutate(id);
    } else if (status === "CANCELLED") {
      cancelAppointmentMutation.mutate(id);
    }
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
                                    : appointment.status === "CANCELLED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {appointment.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right space-x-2">
                              {appointment.status === "SCHEDULED" ? (
                                <>
                                  <Button
                                    onClick={() =>
                                      updateAppointmentStatus(Number(appointment.id), "COMPLETED")
                                    }
                                    className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700"
                                    disabled={completeAppointmentMutation.isPending || cancelAppointmentMutation.isPending}
                                  >
                                    {completeAppointmentMutation.isPending && appointment.id === completeAppointmentMutation.variables ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : null}
                                    Complete
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      updateAppointmentStatus(Number(appointment.id), "CANCELLED")
                                    }
                                    className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                                    disabled={completeAppointmentMutation.isPending || cancelAppointmentMutation.isPending}
                                  >
                                    {cancelAppointmentMutation.isPending && appointment.id === cancelAppointmentMutation.variables ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    ) : null}
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-500 italic">
                                  Appointment Closed
                                </span>
                              )}
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
