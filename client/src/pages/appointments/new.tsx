import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewAppointment() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedDoctor, setSelectedDoctor] = useState<string>();
  const [selectedService, setSelectedService] = useState<string>();

  // Fetch available doctors
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ["/api/doctors"],
  });

  // Fetch available services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["/api/services"],
  });

  // Fetch doctor availability for selected date
  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["/api/doctors", selectedDoctor, "availability", selectedDate],
    enabled: !!(selectedDoctor && selectedDate),
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });
      if (!res.ok) throw new Error("Failed to book appointment");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Booked!",
        description: "You will receive a confirmation email shortly.",
      });
      setLocation("/client/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime || !selectedDoctor || !selectedService) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":");
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

    bookAppointmentMutation.mutate({
      doctorId: selectedDoctor,
      serviceId: selectedService,
      startTime: appointmentDateTime.toISOString(),
      clientId: user?.id,
      status: "SCHEDULED",
    });
  };

  if (loadingDoctors || loadingServices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Book an Appointment</CardTitle>
          <CardDescription>
            Select your preferred doctor, service, and time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Doctor
                </label>
                <Select
                  onValueChange={setSelectedDoctor}
                  value={selectedDoctor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor: any) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        Dr. {doctor.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Service
                </label>
                <Select
                  onValueChange={setSelectedService}
                  value={selectedService}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service: any) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Date
              </label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => {
                  // Disable past dates and weekends
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return (
                    date < today ||
                    date.getDay() === 0 ||
                    date.getDay() === 6
                  );
                }}
                className="rounded-md border"
              />
            </div>
          </div>

          {selectedDate && selectedDoctor && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Available Time Slots
              </label>
              <div className="grid grid-cols-4 gap-2">
                {loadingSlots ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  availableSlots.map((slot: string) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? "default" : "outline"}
                      onClick={() => setSelectedTime(slot)}
                      className="text-sm"
                    >
                      {slot}
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleBookAppointment}
            disabled={
              !selectedDate ||
              !selectedTime ||
              !selectedDoctor ||
              !selectedService ||
              bookAppointmentMutation.isPending
            }
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {bookAppointmentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CalendarIcon className="h-4 w-4 mr-2" />
            )}
            Book Appointment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
