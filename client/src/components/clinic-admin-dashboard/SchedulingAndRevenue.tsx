import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, parseISO, isToday, startOfDay, endOfDay, addDays, isSameDay, isBefore } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Calendar as CalendarIcon, DollarSign, Clock, X, RefreshCw, ChevronLeft,
  ChevronRight, MoreHorizontal, Edit, Trash2, Check, Ban, Plus, User, CreditCard, Mail, Phone
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pencil } from 'lucide-react';
import {
  Box,
  TableContainer,
  TableSortLabel,
  TablePagination,
  Paper,
  Checkbox,
  Toolbar,
  Typography,
  Tooltip,
  IconButton,
} from '@mui/material';

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

// Define the props for the inline AppointmentTable component
interface AppointmentTableProps {
  appointments: Appointment[]; // Use the imported Appointment type
  getDoctorName: (id: number) => string; // Pass helper functions as props
  getServiceName: (id: number) => string;
}

// Inline Functional component to display appointments
const AppointmentTable: React.FC<AppointmentTableProps> = ({ appointments, getDoctorName, getServiceName }) => {
  // Helper to format date/time, adjust as needed
  const formatDateTime = (dateTimeString: string | Date): string => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString;
      return format(date, 'Pp'); // Example format: 09/04/2024, 2:00:00 PM
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  return (
    <div className="appointment-table-container border rounded-md shadow-sm overflow-x-auto">
      {appointments.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          <CalendarIcon className="h-12 w-12 mx-auto mb-2" />
          <p>No appointments found for this day.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="border p-2 text-left font-medium">Name</th>
              <th className="border p-2 text-left font-medium">Email</th>
              <th className="border p-2 text-left font-medium">Start Time</th>
              <th className="border p-2 text-left font-medium">End Time</th>
              <th className="border p-2 text-left font-medium">Service</th>
              <th className="border p-2 text-left font-medium">Doctor</th>
              <th className="border p-2 text-left font-medium">Status</th>
              {/* Add Actions header if needed */}
              {/* <th className="border p-2 text-left font-medium">Actions</th> */}
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-muted/10">
                <td className="border p-2">{appointment.clientName || 'N/A'}</td>
                <td className="border p-2">{appointment.clientEmail || 'N/A'}</td>
                <td className="border p-2">{formatDateTime(appointment.startTime)}</td>
                <td className="border p-2">{formatDateTime(appointment.endTime)}</td>
                <td className="border p-2">{getServiceName(appointment.serviceId)}</td>
                <td className="border p-2">{getDoctorName(appointment.doctorId)}</td>
                <td className="border p-2">
                   <Badge variant={getStatusBadgeVariant(appointment.status) as "default" | "destructive" | "outline" | "secondary" | null | undefined}>
                     {appointment.status}
                   </Badge>
                </td>
                 {/* Add Actions cell if needed */}
                 {/* <td className="border p-2"> ... actions buttons ... </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
       {/* Basic Pagination Placeholder - Replace with actual logic if needed */}
       {appointments.length > 0 && (
         <div className="flex items-center justify-between p-4 border-t">
           <div className="text-sm text-muted-foreground">
             Showing {appointments.length} appointments
           </div>
           {/* Add pagination controls if necessary */}
         </div>
       )}
    </div>
  );
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
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState<keyof Appointment>('startTime');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selected, setSelected] = useState<readonly number[]>([]);
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
  // Fetch appointments for the selected date
  const { 
    data: appointments = [], 
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments 
  } = useQuery<Appointment[]>({
    queryKey: ['appointments', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        // Format date as YYYY-MM-DD for API request
        const dateString = selectedDate.toISOString().split('T')[0];
        console.log(`Fetching appointments for date: ${dateString}`);
        
        // Add debugging for the raw response
        const response = await apiRequest('GET', `/api/appointments?date=${dateString}`);
        console.log('Raw API response for appointments:', response);
        
        // Process the response correctly based on whether it needs parsing
        let appointmentsData;
        if (response && typeof response.json === 'function') {
          appointmentsData = await response.json();
          console.log('Parsed appointments data:', appointmentsData);
        } else {
          appointmentsData = response;
          console.log('Pre-parsed appointments data:', appointmentsData);
        }
        
        // Ensure we're returning an array and handle date conversion
        if (Array.isArray(appointmentsData)) {
          // Convert date strings to Date objects for proper comparison
          const processedAppointments = appointmentsData.map(appointment => ({
            ...appointment,
            // Ensure dates are properly parsed
            startTime: new Date(appointment.startTime),
            endTime: new Date(appointment.endTime)
          }));
          
          console.log('Processed appointments with Date objects:', processedAppointments);
          
          // Debug: Check if any appointments match today's date
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          const selectedDateString = selectedDate.toISOString().split('T')[0];
          
          console.log(`Today's date: ${todayString}`);
          console.log(`Selected date: ${selectedDateString}`);
          
          // Log appointments that should match today's date
          if (todayString === selectedDateString) {
            const todaysAppointments = processedAppointments.filter(apt => {
              const aptDate = new Date(apt.startTime).toISOString().split('T')[0];
              console.log(`Appointment date: ${aptDate}, matches today: ${aptDate === todayString}`);
              return aptDate === todayString;
            });
            console.log(`Found ${todaysAppointments.length} appointments for today`);
          }
          
          return processedAppointments;
        }
        
        console.warn('Appointments API did not return an array:', appointmentsData);
        return [];
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: "Error Fetching Appointments",
          description: error instanceof Error ? error.message : "Could not load appointments.",
          variant: "destructive",
        });
        return [];
      }
    },
  });
  // Fetch doctors for dropdowns
  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ['doctors'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/doctors');
        // Check if response needs parsing (assuming apiRequest returns Response object)
        if (response && typeof response.json === 'function') {
          const data = await response.json();
          console.log('Fetched doctors:', data);
          return Array.isArray(data) ? data : [];
        }
        // If apiRequest already returns parsed data
        console.log('Fetched doctors (pre-parsed):', response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching doctors:", error);
        toast({
          title: "Error Fetching Doctors",
          description: error instanceof Error ? error.message : "Could not load doctors.",
          variant: "destructive",
        });
        return [];
      }
    },
  });
  // Fetch services for dropdowns
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
       try {
        const response = await apiRequest('GET', '/api/services');
         // Check if response needs parsing
        if (response && typeof response.json === 'function') {
          const data = await response.json();
          console.log('Fetched services:', data);
          return Array.isArray(data) ? data : [];
        }
        // If apiRequest already returns parsed data
        console.log('Fetched services (pre-parsed):', response);
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching services:", error);
        toast({
          title: "Error Fetching Services",
          description: error instanceof Error ? error.message : "Could not load services.",
          variant: "destructive",
        });
        return [];
      }
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
      // Assuming this was correct and apiRequest returns Response needing .json()
      const response = await apiRequest('GET', '/api/revenue');
      if (response && typeof response.json === 'function') {
         return response.json();
      }
      // Handle case where it might already be parsed (less likely based on .json() usage)
      return response;
    },
    refetchInterval: 60000, // Refetch every minute
  });
  // Add this after the appointments query to debug date comparison issues
  useEffect(() => {
    // Log detailed debugging information
    console.log('Current selected date:', selectedDate);
    console.log('Selected date as ISO string:', selectedDate.toISOString());
    console.log('Selected date as YYYY-MM-DD:', selectedDate.toISOString().split('T')[0]);
    
    if (Array.isArray(appointments)) {
      console.log(`Fetched ${appointments.length} appointments:`, appointments);
      
      // Verify appointment date formatting
      appointments.forEach((apt, index) => {
        const aptStartDate = new Date(apt.startTime);
        const aptDateString = aptStartDate.toISOString().split('T')[0];
        const selectedDateString = selectedDate.toISOString().split('T')[0];
        
        console.log(`Appointment #${index}:`, {
          id: apt.id,
          clientName: apt.clientName,
          startTime: apt.startTime,
          formattedStartDate: aptDateString,
          matchesSelectedDate: aptDateString === selectedDateString
        });
      });
      
      // Check if the appointment filtering might be happening incorrectly
      const manuallyFilteredAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.startTime).toISOString().split('T')[0];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        return aptDate === selectedDateStr;
      });
      
      console.log(`Manually filtered appointments for selected date: ${manuallyFilteredAppointments.length}`);
    } else {
      console.warn('appointments is not an array:', appointments);
    }
  }, [appointments, selectedDate]);
  // Modify this for safer checking
  const hasAppointmentsForSelectedDate = Array.isArray(appointments) && appointments.length > 0;
  // Create a new appointment
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      console.log('Creating appointment with data:', JSON.stringify(data, null, 2));
      
      const appointmentData = {
        clientId: data.clientId,
        doctorId: Number(data.doctorId),
        serviceId: Number(data.serviceId),
        startTime: data.startTime.toISOString(),
        notes: data.notes || '',
        status: 'SCHEDULED',
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone
      };
      
      console.log('Formatted appointment data:', JSON.stringify(appointmentData, null, 2));
      
      try {
        const response = await apiRequest('POST', '/api/appointments', appointmentData);
        console.log('API Response:', JSON.stringify(response, null, 2));
        return response;
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Appointment created successfully:', data);
      
      // Get date string from the form data's startTime
      const dateFromForm = createForm.getValues().startTime;
      const dateString = dateFromForm.toISOString().split('T')[0];
      
      // Invalidate both specific date query and general appointments query
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', dateString] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['appointments'] 
      });
      
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
      setIsCreateAppointmentOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      console.error('Appointment creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create appointment",
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
      
      // Update this line to invalidate the correct query
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', selectedDate.toISOString().split('T')[0]] 
      });
      
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
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', selectedDate.toISOString().split('T')[0]] 
      });
      // Close the alert dialog
      setIsDeleteAlertOpen(false);
      setAppointmentToCancel(null);
      
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
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', selectedDate.toISOString().split('T')[0]] 
      });
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
  const getServiceName = (serviceId: number): string => {
    // Ensure services is an array before finding
    if (!Array.isArray(services)) {
      console.warn('Services data is not an array:', services);
      return `Service ID: ${serviceId}`;
    }
    const service = services.find((s) => s.id === serviceId);
    return service?.name || `Service ID: ${serviceId}`;
  };
  const getServicePrice = (serviceId: number) => {
    const service = services.find((s) => s.id === serviceId);
    return service?.price || 0;
  };
  // Doctor helper functions
  const getDoctorName = (doctorId: number): string => {
     // Ensure doctors is an array before finding
    if (!Array.isArray(doctors)) {
      console.warn('Doctors data is not an array:', doctors);
      return `Doctor ID: ${doctorId}`;
    }
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : `Doctor ID: ${doctorId}`;
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

  // Fix the refresh functionality
  const handleRefresh = () => {
    console.log('Manually refreshing appointments...');
    const dateString = selectedDate.toISOString().split('T')[0];
    console.log(`Invalidating query for date: ${dateString}`);
    
    // Properly invalidate the query with the current date key
    queryClient.invalidateQueries({ 
      queryKey: ['appointments', dateString] 
    });
    
    // Then refetch
    refetchAppointments();
  };

  // Sorting function
  const handleRequestSort = (property: keyof Appointment) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Handle row selection
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = appointments.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Sort appointments
  const sortedAppointments = [...appointments].sort((a, b) => {
    if (a[orderBy] == null || b[orderBy] == null) {
      return 0; // Handle potential null values
    }
    if (order === 'asc') {
      return a[orderBy] < b[orderBy] ? -1 : 1;
    }
    return a[orderBy] > b[orderBy] ? -1 : 1;
  });

  // Paginate appointments
  const paginatedAppointments = sortedAppointments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            onClick={handleRefresh}
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
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <AppointmentTable
              appointments={appointments}
              getDoctorName={getDoctorName}
              getServiceName={getServiceName}
            />
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
                        // Ensure defaultValue is a string or undefined
                        defaultValue={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Add check to ensure doctors is an array */}
                          {Array.isArray(doctors) && doctors.length > 0 ? (
                            doctors.map((doctor: Doctor) => ( // Use Doctor type
                              <SelectItem key={doctor.id} value={String(doctor.id)}>
                                {`${doctor.firstName} ${doctor.lastName}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="nodata" disabled>No doctors available</SelectItem>
                          )}
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
                         // Ensure defaultValue is a string or undefined
                        defaultValue={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                         {/* Add check to ensure services is an array */}
                        {Array.isArray(services) && services.length > 0 ? (
                            services.map((service: Service) => ( // Use Service type
                            <SelectItem key={service.id} value={String(service.id)}>
                              {`${service.name} (${formatCurrency(service.price)})`}
                            </SelectItem>
                          ))
                         ) : (
                            <SelectItem value="nodata" disabled>No services available</SelectItem>
                         )}
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
                        // Ensure value is a string or undefined
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a doctor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {/* Add check to ensure doctors is an array */}
                          {Array.isArray(doctors) && doctors.length > 0 ? (
                            doctors.map((doctor: Doctor) => ( // Use Doctor type
                              <SelectItem key={doctor.id} value={String(doctor.id)}>
                                {`${doctor.firstName} ${doctor.lastName}`}
                              </SelectItem>
                            ))
                          ) : (
                             <SelectItem value="nodata" disabled>No doctors available</SelectItem>
                          )}
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
                        // Ensure value is a string or undefined
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Add check to ensure services is an array */}
                          {Array.isArray(services) && services.length > 0 ? (
                            services.map((service: Service) => ( // Use Service type
                              <SelectItem key={service.id} value={String(service.id)}>
                                {`${service.name} (${formatCurrency(service.price)})`}
                              </SelectItem>
                            ))
                          ) : (
                             <SelectItem value="nodata" disabled>No services available</SelectItem>
                          )}
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
