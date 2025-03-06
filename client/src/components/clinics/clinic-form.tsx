import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClinicSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface ClinicFormProps {
  onSuccess?: () => void;
  clinic?: { id: number; name: string; address: string; phone: string; email: string } | null;
}

export function ClinicForm({ onSuccess, clinic }: ClinicFormProps) {
  const { toast } = useToast();
  const isEditing = !!clinic;

  const form = useForm({
    resolver: zodResolver(insertClinicSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  // Set form values when editing an existing clinic
  useEffect(() => {
    if (clinic) {
      form.reset({
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        email: clinic.email,
      });
    }
  }, [clinic, form]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // If editing, use PUT request with clinic ID
      if (isEditing && clinic) {
        const res = await apiRequest("PUT", `/api/clinics/${clinic.id}`, data);
        return res.json();
      } else {
        // If creating, use POST request
        const res = await apiRequest("POST", "/api/clinics", data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
      toast({
        title: "Success",
        description: isEditing ? "Clinic updated successfully" : "Clinic created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Clinic Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter clinic name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter clinic address" {...field} />
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

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter clinic email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEditing ? "Update Clinic" : "Create Clinic"}
        </Button>
      </form>
    </Form>
  );
}
