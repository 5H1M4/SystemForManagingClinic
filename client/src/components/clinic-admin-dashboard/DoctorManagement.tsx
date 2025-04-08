import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Pencil, Trash2, Plus, Mail, Phone } from 'lucide-react';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Define the doctor schema using Zod for form validation
const doctorSchema = z.object({
  id: z.number().optional(),
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  username: z.string().min(4, { message: "Username must be at least 4 characters." }),
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters." })
    .or(z.string().length(0))
    .optional(),
});

// TypeScript interface for doctor data
type DoctorFormValues = z.infer<typeof doctorSchema>;

export default function DoctorManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorFormValues | null>(null);

  // Form for creating a new doctor
  const createForm = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
    },
  });

  // Form for editing an existing doctor
  const editForm = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema.extend({
      // Make password optional for editing
      password: z.string().optional(),
    })),
    defaultValues: {
      id: undefined,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
    },
  });

  /**
   * Helper function to safely parse JSON responses.
   * If the response is empty or not JSON, returns null instead of throwing an error.
   */
  async function parseJsonSafe(response: Response) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    try {
      return await response.json();
    } catch {
      // If there's no JSON (e.g., 204 No Content), return null or an empty object
      return null;
    }
  }

  // ----- GET: Fetch doctors for this clinic -----
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/doctors');
      const data = await parseJsonSafe(response);
      // If data is null or not an array, you might want to return [] or throw an error
      if (!data || !Array.isArray(data)) {
        return [];
      }
      return data;
    },
    // Refresh data every minute to see new doctors or changes
    refetchInterval: 60000,
  });

  // ----- POST: Create a new doctor -----
  const createDoctorMutation = useMutation({
    mutationFn: async (formData: DoctorFormValues) => {
      const response = await apiRequest('POST', '/api/doctors', formData);
      return parseJsonSafe(response);
    },
    onSuccess: () => {
      // Reset form and close dialog
      createForm.reset();
      setIsCreateDialogOpen(false);
      
      // Invalidate and refetch doctors
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      
      // Show success toast
      toast({
        title: "Doctor created",
        description: "The new doctor account has been created successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Failed to create doctor",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // ----- PUT: Update an existing doctor -----
  const updateDoctorMutation = useMutation({
    mutationFn: async (formData: DoctorFormValues) => {
      const { id, ...updateData } = formData;
      const response = await apiRequest('PUT', `/api/doctors/${id}`, updateData);
      return parseJsonSafe(response);
    },
    onSuccess: () => {
      // Reset form and close dialog
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedDoctor(null);
      
      // Invalidate and refetch doctors
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      
      // Show success toast
      toast({
        title: "Doctor updated",
        description: "The doctor account has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Failed to update doctor",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // ----- DELETE: Delete a doctor -----
  const deleteDoctorMutation = useMutation({
    mutationFn: async (doctorId: number) => {
      const response = await apiRequest('DELETE', `/api/doctors/${doctorId}`);
      // Safely parse the response. If it's 204, parseJsonSafe returns null without error.
      return parseJsonSafe(response);
    },
    onSuccess: () => {
      // Close confirmation dialog
      setIsDeleteAlertOpen(false);
      setDoctorToDelete(null);
      
      // Invalidate and refetch doctors
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      
      // Show success toast
      toast({
        title: "Doctor deleted",
        description: "The doctor account has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Failed to delete doctor",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onCreateSubmit = (data: DoctorFormValues) => {
    createDoctorMutation.mutate(data);
  };

  const onEditSubmit = (data: DoctorFormValues) => {
    updateDoctorMutation.mutate(data);
  };

  // Event handlers
  const handleEditDoctor = (doctor: any) => {
    setSelectedDoctor(doctor);
    
    // Reset and populate the edit form
    editForm.reset({
      id: doctor.id,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      email: doctor.email,
      phone: doctor.phone || '',
      username: doctor.username,
      password: '', // Don't populate the password field
    });
    
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (doctor: any) => {
    setDoctorToDelete(doctor);
    setIsDeleteAlertOpen(true);
  };

  const confirmDeleteDoctor = () => {
    if (doctorToDelete) {
      deleteDoctorMutation.mutate(doctorToDelete.id);
    }
  };

  // Render
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Doctor Management</CardTitle>
          <CardDescription>
            Create, view, edit, and manage doctor accounts for your clinic.
          </CardDescription>
        </div>

        {/* Create Doctor Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Doctor</DialogTitle>
              <DialogDescription>
                Create a new doctor account for your clinic.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="dr.johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createDoctorMutation.isPending}>
                    {createDoctorMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Doctor
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Doctor Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Doctor</DialogTitle>
              <DialogDescription>
                Update information for Dr. {selectedDoctor?.firstName} {selectedDoctor?.lastName}.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="dr.johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Leave blank to keep current password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter a new password only if you want to change it.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateDoctorMutation.isPending}>
                    {updateDoctorMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Doctor
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : Array.isArray(doctors) && doctors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No doctors found. Add your first doctor to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(doctors) && doctors.map((doctor: any) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">
                    {doctor.firstName} {doctor.lastName}
                  </TableCell>
                  <TableCell>{doctor.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        {doctor.email}
                      </div>
                      {doctor.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          {doctor.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditDoctor(doctor)}
                        title="Edit Doctor"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(doctor)}
                        title="Delete Doctor"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Delete Confirmation Alert */}
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete Dr. {doctorToDelete?.firstName} {doctorToDelete?.lastName}'s account.
                This action cannot be undone and may affect existing appointments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteDoctor}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteDoctorMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
