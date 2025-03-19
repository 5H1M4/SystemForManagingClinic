import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, parseISO, isToday, startOfDay, endOfDay, addDays, isSameDay, isBefore } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Calendar as CalendarIcon, DollarSign, Clock, X, RefreshCw, ChevronLeft,
  ChevronRight, MoreHorizontal, Edit, Trash2, Check, Ban, Plus, User, CreditCard
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Appointment } from '@shared/schema';
// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Define the appointment form schema
const appointmentFormSchema = z.object({
  id: z.number().optional(),
  clientId: z.number().optional(),
  clientName: z.string().min(2, "Client name is required"),
  clientEmail: z.string().email("Valid email is required"),
  clientPhone: z.string().optional(),
  doctorId: z.number().or(z.string()).optional(),
  serviceId: z.number().or(z.string()),
  startTime: z.date(),
  endTime: z.date().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
// Define proper types for your data
interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Revenue {
  dailyRevenue: Array<{
    date: string;
    amount: number;
  }>;
  weekly: Array<{
    date: string;
    amount: number;
  }>;
  monthly: number;
  serviceRevenue: Array<{
    serviceId: number;
    count: number;
    revenue: number;
  }>;
}
// Utility functions
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
const formatAppointmentTime = (dateTimeString: string | Date): string => {
  if (!dateTimeString) return '';
  const date = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString;
  return format(date, 'h:mm a');
};
const formatAppointmentDate = (dateTimeString: string | Date): string => {
  if (!dateTimeString) return '';
  const date = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString;
  return format(date, 'MMM d, yyyy');
};
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'default';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'secondary';
  }
};
export default function SchedulingAndRevenue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  // Create appointment form
  const createForm = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      doctorId: '', 
      serviceId: '',
      startTime: new Date(),
      notes: '',
    },
  });
  // Edit appointment form
  const editForm = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      id: undefined,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      doctorId: '',
      serviceId: '',
      startTime: new Date(),
      notes: '',
    },
  });
  // Fetch appointments
  const { 
    data: appointments = [], 
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments
  } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/appointments');
      return response;
    },
    // Refetch every 30 seconds to keep data fresh
    refetchInterval: 30000,
  });
  // Fetch doctors for dropdowns
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/doctors');
      return response.json();
    },
  });
  // Fetch services for dropdowns
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/services');
      return response.json();
    },
  });
  // Fetch revenue data
  const { 
    data: revenue, 
    isLoading: isLoadingRevenue,
    refetch: refetchRevenue
  } = useQuery<Revenue>({
    queryKey: ['revenue'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/revenue');
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });
  // Filter appointments for the selected date
  const filteredAppointments = Array.isArray(appointments) 
    ? appointments.filter((appointment: any) => {
        if (!appointment.startTime) return false;
        const appointmentDate = new Date(appointment.startTime);
        return isSameDay(appointmentDate, selectedDate);
      })
    : [];
  // Create a new appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      // Format the date and time for the API
      const date = data.startTime;
      // Assuming startTime is a Date object and includes the time
      // Prepare the data for the API
      const appointmentData = {
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        doctorId: Number(data.doctorId),
        serviceId: Number(data.serviceId),
        startTime: date.toISOString(),
        notes: data.notes,
      };
      return await apiRequest('POST', '/api/appointments', appointmentData);
    },
    onSuccess: () => {
      // Reset form and close dialog
      createForm.reset();
      setIsCreateAppointmentOpen(false);
      
      // Refetch appointments to update the UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      toast({
        title: "Appointment created",
        description: "The appointment has been scheduled successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create appointment",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });
  // Update an existing appointment
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      if (!data.id) throw new Error("Appointment ID is required");
      
      // Format the date and time for the API
      const date = data.startTime;
      // Assuming startTime is a Date object and includes the time
      // Prepare the data for the API
      const appointmentData = {
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        doctorId: Number(data.doctorId),
        serviceId: Number(data.serviceId),
        startTime: date.toISOString(),
        notes: data.notes,
      };
      return await apiRequest('PUT', `/api/appointments/${data.id}`, appointmentData);
    },
    onSuccess: () => {
      // Reset form and close dialog
      editForm.reset();
      setIsEditAppointmentOpen(false);
      setSelectedAppointment(null);
      
      // Refetch appointments to update the UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      toast({
        title: "Appointment updated",
        description: "The appointment has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update appointment",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });
  // Cancel an appointment
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return await apiRequest('POST', `/api/appointments/${appointmentId}/cancel`);
    },
    onSuccess: () => {
      // Close the alert dialog
      setIsDeleteAlertOpen(false);
      setAppointmentToCancel(null);
      
      // Refetch appointments to update the UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      toast({
        title: "Appointment cancelled",
        description: "The appointment has been cancelled successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel appointment",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });
  // Complete appointment mutation
  const completeAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      return await apiRequest('POST', `/api/appointments/${appointmentId}/complete`);
    },
    onSuccess: () => {
      // Refetch appointments and revenue to update the UI
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
      
      toast({
        title: "Appointment completed",
        description: "The appointment has been marked as completed.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to complete appointment",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });
  // Event handlers
  const handleNewAppointment = () => {
    createForm.reset({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      doctorId: '',
      serviceId: '',
      startTime: selectedDate,
      notes: '',
    });
    setIsCreateAppointmentOpen(true);
  };
  const handleEditAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    
    // Format the date for the form
    const startTime = new Date(appointment.startTime);
    
    editForm.reset({
      id: appointment.id,
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone || '',
      doctorId: appointment.doctorId ? appointment.doctorId.toString() : '',
      serviceId: appointment.serviceId.toString(),
      startTime: startTime,
      notes: appointment.notes || '',
    });
    
    setIsEditAppointmentOpen(true);
  };
  const handleCancelAppointment = (appointment: any) => {
    setAppointmentToCancel(appointment);
    setIsDeleteAlertOpen(true);
  };
  const confirmCancelAppointment = () => {
    if (appointmentToCancel) {
      cancelAppointmentMutation.mutate(appointmentToCancel.id);
    }
  };
  const handleCompleteAppointment = (appointmentId: number) => {
    completeAppointmentMutation.mutate(appointmentId);
  };
  const handleCreateSubmit = (data: AppointmentFormValues) => {
    createAppointmentMutation.mutate(data);
  };
  const handleEditSubmit = (data: AppointmentFormValues) => {
    updateAppointmentMutation.mutate(data);
  };
  // Date navigation
  const goToPreviousDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };
  const goToNextDay = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  // Service helper functions
  const getServiceName = (serviceId: number) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };
  const getServicePrice = (serviceId: number) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.price || 0;
  };
  // Doctor helper functions
  const getDoctorName = (doctorId: number) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Unknown Doctor';
  };

  // Calculate daily revenue
  const calculateDailyRevenue = () => {
    if (!revenue || !revenue.dailyRevenue) return formatCurrency(0);
    const todayRevenue = revenue.dailyRevenue.find((day: any) => 
      isSameDay(parseISO(day.date), selectedDate)
    );
    return formatCurrency(todayRevenue?.amount || 0);
  };

  // Calculate weekly revenue
  const calculateWeeklyRevenue = () => {
    if (!revenue || !revenue.weekly) return formatCurrency(0);
    return formatCurrency(revenue.weekly.reduce((total: number, day: any) => total + day.amount, 0));
  };

  // Calculate monthly revenue
  const calculateMonthlyRevenue = () => {
    if (!revenue || !revenue.monthly) return formatCurrency(0);
    return formatCurrency(revenue.monthly);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scheduling & Revenue</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            disabled={isToday(selectedDate)}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => date && setSelectedDate(date)}
                inline
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAppointments()}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {isToday(selectedDate) ? "Today's Schedule" : `Schedule for ${format(selectedDate, 'MMMM d, yyyy')}`}
            </h2>
            <Button onClick={handleNewAppointment}>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </div>

          {isLoadingAppointments ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center text-muted-foreground">
                  <p>No appointments scheduled for this day.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleNewAppointment}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAppointments
                .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((appointment: any) => (
                  <Card key={appointment.id} className={appointment.status === 'CANCELLED' ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{appointment.clientName}</CardTitle>
                          <CardDescription>{appointment.clientEmail}</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusBadgeVariant(appointment.status) as "default" | "destructive" | "secondary" | "outline"}>{appointment.status}</Badge>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48" align="end">
                              <div className="grid gap-1">
                                {appointment.status === 'SCHEDULED' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      className="flex items-center justify-start"
                                      onClick={() => handleEditAppointment(appointment)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="flex items-center justify-start"
                                      onClick={() => handleCompleteAppointment(appointment.id)}
                                    >
                                      <Check className="h-4 w-4 mr-2" />
                                      Mark Completed
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="flex items-center justify-start text-destructive"
                                      onClick={() => handleCancelAppointment(appointment)}
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Cancel
                                    </Button>
                                  </>
                                )}
                                {appointment.status === 'COMPLETED' && (
                                  <Button
                                    variant="ghost"
                                    className="flex items-center justify-start"
                                    onClick={() => handleEditAppointment(appointment)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            {formatAppointmentTime(appointment.startTime)}
                          </div>
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            {getDoctorName(appointment.doctorId)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                            {getServiceName(appointment.serviceId)}
                          </div>
                          <div className="flex items-center text-sm">
                            <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            {formatCurrency(getServicePrice(appointment.serviceId))}
                          </div>
                        </div>
                      </div>
                      {appointment.notes && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <p className="font-medium">Notes:</p>
                          <p>{appointment.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          {isLoadingRevenue ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Daily Revenue</CardTitle>
                  <CardDescription>
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{calculateDailyRevenue()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Weekly Revenue</CardTitle>
                  <CardDescription>Last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{calculateWeeklyRevenue()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Monthly Revenue</CardTitle>
                  <CardDescription>Current month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{calculateMonthlyRevenue()}</div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Revenue by service type</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenue && revenue.serviceRevenue ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Appointments</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {revenue.serviceRevenue.map((item: any) => (
                          <TableRow key={item.serviceId}>
                            <TableCell>{getServiceName(item.serviceId)}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No revenue data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Appointment Dialog */}
      <Dialog open={isCreateAppointmentOpen} onOpenChange={setIsCreateAppointmentOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Create a new appointment for {format(selectedDate, 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(doctors) && doctors.map((doctor: any) => (
                            <SelectItem key={doctor.id} value={doctor.id.toString()}>
                              {`${doctor.firstName} ${doctor.lastName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {Array.isArray(services) && services.map((service: any) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {`${service.name} (${formatCurrency(service.price)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <div className="flex flex-col space-y-2">
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => date && field.onChange(date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateAppointmentOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Appointment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update appointment details for {selectedAppointment?.clientName}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(doctors) && doctors.map((doctor: any) => (
                            <SelectItem key={doctor.id} value={doctor.id.toString()}>
                              {`${doctor.firstName} ${doctor.lastName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(services) && services.map((service: any) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {`${service.name} (${formatCurrency(service.price)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <div className="flex flex-col space-y-2">
                        <DatePicker
                          selected={field.value}
                          onChange={(date) => date && field.onChange(date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditAppointmentOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateAppointmentMutation.isPending}
                >
                  {updateAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Appointment"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cancel Appointment Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}