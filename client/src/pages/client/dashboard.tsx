import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Dialog, DialogTrigger, DialogContent, DialogHeader as DialogHeaderUI, DialogTitle as DialogTitleUI, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function ClientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string | undefined>();
  const [selectedService, setSelectedService] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch clinics
  const { data: clinics = [] } = useQuery({
    queryKey: ["/api/clinics"],
    queryFn: async () => {
      const res = await fetch("/api/clinics");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
  const clinicId = selectedClinic || (clinics.length > 0 ? clinics[0].id : undefined);

  // Fetch available services for the selected clinic
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["/api/clinics", clinicId, "services"],
    enabled: !!clinicId,
    queryFn: async () => {
      if (!clinicId) return [];
      const res = await fetch(`/api/clinics/${clinicId}/services`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: [`/api/clients/${user?.id}/appointments`],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      console.log('Fetching appointments for user:', user.id);
      const res = await fetch(`/api/clients/${user.id}/appointments`);
      if (!res.ok) {
        console.error('Failed to fetch appointments:', await res.text());
        return [];
      }
      const data = await res.json();
      console.log('Fetched appointments:', data);
      return Array.isArray(data) ? data : [];
    },
  });

  // Book appointment mutation
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
      setModalOpen(false);
      setSelectedClinic(undefined);
      setSelectedService(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${user?.id}/appointments`] });
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
    if (!selectedClinic || !selectedService || !selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    bookAppointmentMutation.mutate({
      clinicId: selectedClinic ? Number(selectedClinic) : undefined,
      serviceId: selectedService,
      startTime: selectedDate.toISOString(),
      clientId: user?.id,
      status: "SCHEDULED",
      clientName: `${user?.firstName} ${user?.lastName}`,
      clientEmail: user?.email,
      clientPhone: user?.phone,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (apt: any) => new Date(apt.startTime) > new Date()
  ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const pastAppointments = appointments.filter(
    (apt: any) => new Date(apt.startTime) <= new Date()
  ).sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.firstName}
          </h2>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                <PlusCircle className="mr-2 h-4 w-4" /> Book Appointment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeaderUI>
                <DialogTitleUI>Book an Appointment</DialogTitleUI>
                <DialogDescription>
                  Select your clinic, service, date, and time
                </DialogDescription>
              </DialogHeaderUI>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Clinic</label>
                  <Select onValueChange={setSelectedClinic} value={selectedClinic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {clinics && Array.isArray(clinics) ? clinics.map((clinic: any) => (
                        <SelectItem key={clinic.id} value={String(clinic.id)}>
                          {clinic.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Service</label>
                  <Select onValueChange={setSelectedService} value={selectedService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services && Array.isArray(services) ? services.map((service: any) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - ${service.price}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Date & Time</label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left"
                        onClick={() => setDatePickerOpen(true)}
                      >
                        {selectedDate ?
                          `${selectedDate.toLocaleDateString()} ${selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                          "Pick date & time"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto">
                      <DatePicker
                        selected={selectedDate}
                        onChange={(date: Date | null) => {
                          setSelectedDate(date || undefined);
                          setDatePickerOpen(false);
                        }}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MMMM d, yyyy h:mm aa"
                        minDate={new Date()}
                        inline
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBookAppointment}
                    disabled={!selectedClinic || !selectedService || !selectedDate}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {bookAppointmentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      "Book Appointment"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{format(new Date(apt.startTime), "PPP")}</p>
                        <p className="text-sm text-gray-500">{format(new Date(apt.startTime), "p")}</p>
                        <p className="text-sm text-gray-500">Service: {apt.serviceName}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <Clock className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No upcoming appointments</p>
                  <Button
                    onClick={() => setModalOpen(true)}
                    variant="link"
                    className="mt-2"
                  >
                    Book your first appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Past Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {pastAppointments.length > 0 ? (
                <div className="space-y-4">
                  {pastAppointments.map((apt: any) => (
                    <div key={apt.id} className="flex items-center space-x-4 p-4 border rounded-lg bg-black/10 dark:border-gray-800">
                      <div className="flex-1">
                        <p className="font-medium text-gray-100">{format(new Date(apt.startTime), "MMMM do, yyyy")}</p>
                        <p className="text-sm text-gray-500">{format(new Date(apt.startTime), "h:mm a")}</p>
                        <p className="text-sm text-gray-500">Service: {apt.serviceName || "Specialist Consultation"}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <Clock className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No past appointments</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}