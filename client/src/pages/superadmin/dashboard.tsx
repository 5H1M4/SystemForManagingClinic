import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Users, Calendar, DollarSign, LogOut, Edit, Trash, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ClinicForm } from "@/components/clinics/clinic-form";
import Modal from "@/components/ui/Modal";
import { queryClient } from "@/lib/queryClient";
import { ClinicAdminForm } from "@/components/clinics/clinic-admin-form";

// Updated to match your exact schema with number id
interface Clinic {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface Revenue {
  totalRevenue: number;
  currency: string;
}

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function SuperAdminDashboard() {
  const fetchClinics = async () => {
    const response = await fetch("/api/clinics");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  };

  const fetchTotalRevenue = async () => {
    const response = await fetch("/api/revenue/total");
    if (!response.ok) {
      throw new Error("Failed to fetch total revenue");
    }
    return response.json();
  };

  const { data: clinics, isLoading: isLoadingClinics } = useQuery({
    queryKey: ["/api/clinics"],
    queryFn: fetchClinics,
  });

  const { data: revenue, isLoading: isLoadingRevenue } = useQuery<Revenue>({
    queryKey: ["/api/revenue/total"],
    queryFn: fetchTotalRevenue,
  });

  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/");
  };

  const handleCreateClinicSuccess = () => {
    setModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
  };

  const handleEditClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setModalOpen(true);
  };

  const handleDeleteClinic = async (clinicId: number) => {
    if (window.confirm("Are you sure you want to delete this clinic?")) {
      const response = await fetch(`/api/clinics/${clinicId}`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
          // Authorization header if required
        },
      });
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/clinics"] });
        alert("Clinic deleted successfully.");
      } else {
        const errorData = await response.json();
        alert(`Failed to delete clinic: ${errorData.message}`);
      }
    }
  };

  const handleViewClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setViewModalOpen(true);
  };

  const isLoading = isLoadingClinics || isLoadingRevenue;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">SuperAdmin Dashboard</h2>
        <div className="flex space-x-4">
          <Button onClick={() => { setSelectedClinic(null); setModalOpen(true); }} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Plus className="mr-2 h-4 w-4" /> Create Clinic
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(clinics) ? clinics.length : 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue?.totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Managed Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(clinics) && clinics.length ? (
              <div className="divide-y divide-border rounded-md border">
                {clinics.map((clinic: Clinic) => (
                  <div
                    key={clinic.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-medium">{clinic.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {clinic.address}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => handleViewClinic(clinic)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => handleEditClinic(clinic)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => handleDeleteClinic(clinic.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">No clinics found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setModalOpen(true)}
                >
                  Create Your First Clinic
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <ClinicForm onSuccess={handleCreateClinicSuccess} clinic={selectedClinic} />
      </Modal>

      <Modal isOpen={isViewModalOpen} onClose={() => setViewModalOpen(false)}>
        {selectedClinic && (
          <div>
            <h3 className="text-xl font-bold">{selectedClinic.name}</h3>
            <p>{selectedClinic.address}</p>
            <p>{selectedClinic.phone}</p>
            <p>{selectedClinic.email}</p>
            <ClinicAdminForm clinicId={selectedClinic.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}