import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Edit, Trash } from "lucide-react";
import { useState, useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import Modal from "@/components/ui/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Define the admin schema for form validation
const adminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

interface Admin {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface ClinicAdminFormProps {
  clinicId: number;
}

export function ClinicAdminForm({ clinicId }: ClinicAdminFormProps) {
  const { toast } = useToast();
  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<number | null>(null);

  // Fetch clinic admins
  const { data: admins = [], isLoading, refetch } = useQuery({
    queryKey: [`/api/clinics/${clinicId}/admins`],
    queryFn: async () => {
      const response = await fetch(`/api/clinics/${clinicId}/admins`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch clinic admins");
      }
      return response.json();
    },
    enabled: !!clinicId
  });

  // Setup form with validation
  const form = useForm({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  // Reset form when selected admin changes
  useEffect(() => {
    if (selectedAdmin) {
      form.reset({
        username: selectedAdmin.username,
        password: "", // Don't populate password for security
        firstName: selectedAdmin.firstName,
        lastName: selectedAdmin.lastName,
        email: selectedAdmin.email,
        phone: selectedAdmin.phone || "",
      });
    } else {
      form.reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      });
    }
  }, [selectedAdmin, form]);

  // Create/update admin mutation
  const adminMutation = useMutation({
    mutationFn: async (data: any) => {
      // If editing an existing admin
      if (selectedAdmin) {
        const response = await fetch(`/api/clinics/${clinicId}/admins/${selectedAdmin.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update admin");
        }
        
        return response.json();
      } 
      // If creating a new admin
      else {
        const response = await fetch(`/api/clinics/${clinicId}/admin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add admin");
        }
        
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clinics/${clinicId}/admins`] });
      toast({
        title: "Success",
        description: selectedAdmin ? "Admin updated successfully" : "Admin added successfully",
      });
      setAdminModalOpen(false);
      setSelectedAdmin(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: number) => {
      const response = await fetch(`/api/clinics/${clinicId}/admins/${adminId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete admin");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clinics/${clinicId}/admins`] });
      toast({
        title: "Success",
        description: "Admin deleted successfully",
      });
      setConfirmDeleteOpen(false);
      setAdminToDelete(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddAdmin = () => {
    setSelectedAdmin(null);
    setAdminModalOpen(true);
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setAdminModalOpen(true);
  };

  const handleDeleteAdmin = (adminId: number) => {
    setAdminToDelete(adminId);
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (adminToDelete) {
      deleteAdminMutation.mutate(adminToDelete);
    }
  };

  const handleSubmit = (data: any) => {
    adminMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold">Clinic Admins</h4>
        <Button onClick={handleAddAdmin} size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
          <Plus className="mr-2 h-4 w-4" /> Add Admin
        </Button>
      </div>
      
      {admins.length > 0 ? (
        <div className="divide-y divide-border rounded-md border mt-4">
          {admins.map((admin: Admin) => (
            <div key={admin.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{admin.username}</p>
                <p className="text-sm text-muted-foreground">{admin.email}</p>
                <p className="text-xs text-muted-foreground">{admin.firstName} {admin.lastName}</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => handleEditAdmin(admin)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDeleteAdmin(admin.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
          No admins found for this clinic
        </div>
      )}

      {/* Admin Create/Edit Modal */}
      <Modal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)}>
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">{selectedAdmin ? 'Edit Admin' : 'Add New Admin'}</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!selectedAdmin && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {selectedAdmin && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password (leave blank to keep current)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={adminMutation.isPending}>
                  {adminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedAdmin ? 'Update Admin' : 'Add Admin'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
          <p>Are you sure you want to delete this admin? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteAdminMutation.isPending}
            >
              {deleteAdminMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}