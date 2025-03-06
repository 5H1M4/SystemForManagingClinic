import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Edit, Trash } from "lucide-react";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import Modal from "@/components/ui/Modal";

interface Admin {
  id: number; // Changed to number to match your schema
  username: string;
  email: string;
}

interface ClinicAdminFormProps {
  clinicId: number; // Changed to number as per the error message
}

export function ClinicAdminForm({ clinicId }: ClinicAdminFormProps) {
  const fetchAdmins = async () => {
    const response = await fetch(`/api/clinics/${clinicId}/admins`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  };

  const { data: admins = [], isLoading } = useQuery({
    queryKey: [`/api/clinics/${clinicId}/admins`],
    queryFn: fetchAdmins,
    enabled: !!clinicId
  });

  const [isAdminModalOpen, setAdminModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({});

  const handleCreateAdminSuccess = () => {
    setAdminModalOpen(false);
    queryClient.invalidateQueries({ queryKey: [`/api/clinics/${clinicId}/admins`] });
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setAdminModalOpen(true);
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      await fetch(`/api/clinics/${clinicId}/admins/${adminId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: [`/api/clinics/${clinicId}/admins`] });
    }
  };

  const handleDelete = async (clinicId: any) => {
    if (window.confirm("Are you sure you want to delete this clinic?")) {
      const response = await fetch(`/api/clinics/${clinicId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert("Clinic deleted successfully.");
        // Redirect or update state as necessary
      } else {
        alert("Failed to delete clinic.");
      }
    }
  }

  const handleEditClick = async (clinicId: number) => {
    const response = await fetch(`/api/clinics/${clinicId}`);
    if (response.ok) {
      const clinicData = await response.json();
      setFormData(clinicData); // Assuming setFormData is a state setter for the form
    } else {
      alert("Failed to fetch clinic data.");
    }
  };

  const handleSave = async (clinicData: { id: any; }) => {
    const response = await fetch(`/api/clinics/${clinicData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clinicData)
    });

    if (response.ok) {
      alert("Clinic updated successfully.");
      // Update state or redirect as necessary
    } else {
      alert("Failed to update clinic.");
    }
  };

  const handleAddAdmin = async (clinicId: any, adminData: any) => {
    const response = await fetch(`/api/clinics/${clinicId}/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminData)
    });

    if (response.ok) {
      alert("Admin added successfully.");
      // Update state or redirect as necessary
    } else {
      alert("Failed to add admin.");
    }
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
        <Button onClick={() => { setSelectedAdmin(null); setAdminModalOpen(true); }} size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
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

      <Modal isOpen={isAdminModalOpen} onClose={() => setAdminModalOpen(false)}>
        {/* Admin form would go here - for now just a placeholder */}
        <div className="p-4">
          <h3 className="text-lg font-bold mb-4">{selectedAdmin ? 'Edit Admin' : 'Add New Admin'}</h3>
          {/* Your admin form fields would go here */}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAdminSuccess}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}