import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CalendarViewProps {
  clinicId: number;
  doctorId?: number;
}

export function CalendarView({ clinicId, doctorId }: CalendarViewProps) {
  const queryKey = doctorId
    ? [`/api/doctors/${doctorId}/appointments`]
    : [`/api/clinics/${clinicId}/appointments`];

  const { data: appointments, isLoading } = useQuery({
    queryKey,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const appointmentsByDate = appointments?.reduce((acc: any, appointment: any) => {
    const date = format(new Date(appointment.startTime), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(appointment);
    return acc;
  }, {});

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Appointments Calendar
          </CardTitle>
          <CardDescription>
            View and manage scheduled appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            className="rounded-md border"
            modifiers={{
              booked: (date) =>
                appointmentsByDate?.[format(date, "yyyy-MM-dd")]?.length > 0,
            }}
            modifiersClassNames={{
              booked: "bg-primary/10 font-bold",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments
              ?.filter(
                (appointment: any) =>
                  format(new Date(appointment.startTime), "yyyy-MM-dd") ===
                  format(new Date(), "yyyy-MM-dd"),
              )
              .map((appointment: any) => (
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
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
