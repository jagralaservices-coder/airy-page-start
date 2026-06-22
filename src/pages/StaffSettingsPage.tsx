import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  Search,
  User,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Loader2,
  Store,
  Building,
  Camera,
  RefreshCw,
  Fingerprint,
  Clock,
  Calendar,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useOwnerStore } from '@/hooks/useOwnerStore';
import { OwnerStoreSelectionDialog } from '@/components/pos/OwnerStoreSelectionDialog';
import FaceCaptureDialog from '@/components/pos/FaceCaptureDialog';
import { invokeFunctionWithResponseFallback } from '@/lib/invokeFunctionWithResponseFallback';

interface StaffMember {
  id: string;
  staffCode: string;
  name: string;
  email?: string;
  role: string;
  phone: string;
  pin: string | null;
  createdAt: string;
  isActive: boolean;
  userId: string;
  storeId: string | null;
  facePhotoUrl: string | null;
  workStartTime: string | null;
  workEndTime: string | null;
  fingerprintEnabled: boolean;
}

interface StoreOption {
  id: string;
  name: string;
}

interface CreateStaffResponse {
  success?: boolean;
  error?: string;
  staff_code?: string;
  password?: string;
  pin?: string;
}

const StaffSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole, store } = useSupabaseAuth();
  const { selectedStore, selectedStoreId, selectedStoreName, isOwner, selectStore } = useOwnerStore();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [storesList, setStoresList] = useState<StoreOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showStoreSelection, setShowStoreSelection] = useState(false);
  
  // Face capture states
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [showUpdateFaceCapture, setShowUpdateFaceCapture] = useState(false);
  const [facePhotoBlob, setFacePhotoBlob] = useState<Blob | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [updatingFaceStaff, setUpdatingFaceStaff] = useState<StaffMember | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFacePhotoBlob(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFacePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [isUploadingFace, setIsUploadingFace] = useState(false);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'staff',
    phone: '',
    pin: '',
    storeId: '',
    addressLine1: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    aadhaarNumber: '',
    aadhaarName: '',
    workStartTime: '09:00',
    workEndTime: '18:00',
    fingerprintEnabled: false,
    salary: ''
  });

  // Aadhaar files & preview
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [aadhaarFrontPreview, setAadhaarFrontPreview] = useState<string | null>(null);
  const [aadhaarBackPreview, setAadhaarBackPreview] = useState<string | null>(null);

  // OTP Verification states
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const aadhaarFrontInputRef = useRef<HTMLInputElement>(null);
  const aadhaarBackInputRef = useRef<HTMLInputElement>(null);

  const handleAadhaarUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      if (side === 'front') {
        setAadhaarFrontFile(file);
        setAadhaarFrontPreview(URL.createObjectURL(file));
      } else {
        setAadhaarBackFile(file);
        setAadhaarBackPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSendOtp = () => {
    if (!newStaff.phone || newStaff.phone.length < 10) {
      toast({
        title: 'Error',
        description: 'Please enter a valid mobile number for verification.',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    // Real OTP via Edge Function using useOTP would go here.
    // However, since this page isn't using useOTP yet, we will just use the standard toast
    // and block creation until a real system is integrated here.
    // For now, we enforce that mock logic is DEAD.
    toast({
      title: 'Error',
      description: 'Real OTP Verification is strictly enforced. Please connect Edge Function here.',
      variant: 'destructive'
    });
    setIsVerifying(false);
  };

  const handleVerifyOtp = () => {
    if (enteredOtp === otpCode) {
      setOtpVerified(true);
      toast({
        title: 'Success',
        description: 'Mobile number verified successfully!',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Invalid OTP. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const uploadAadhaarScan = async (file: File, side: 'front' | 'back', name: string) => {
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${name.replace(/\s+/g, '_')}_aadhaar_${side}_${Date.now()}.${extension}`;
      
      const { data, error } = await supabase.storage
        .from('aadhaar-documents')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) {
        console.error(`Aadhaar ${side} upload error:`, error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('aadhaar-documents')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error in uploadAadhaarScan:', err);
      return null;
    }
  };

  // Get store_id from context, owner selection, or localStorage
  const getStoreId = () => {
    // For owners, use selected store
    if (isOwner && selectedStoreId) return selectedStoreId;
    // For store managers, use their assigned store
    if (store?.id) return store.id;
    // Fallback to pos_active_store_data or store_login
    try {
      const activeStore = localStorage.getItem('pos_active_store_data');
      if (activeStore) return JSON.parse(activeStore).id || null;
      const storeLogin = localStorage.getItem('store_login');
      if (storeLogin) return JSON.parse(storeLogin).store_id || null;
    } catch {
      return null;
    }
    return null;
  };

  const getCustomerId = () => {
    if (userRole?.customer_id) return userRole.customer_id;
    try {
      const activeStore = localStorage.getItem('pos_active_store_data');
      if (activeStore) return JSON.parse(activeStore).customer_id || null;
      const storeLogin = localStorage.getItem('store_login');
      if (storeLogin) return JSON.parse(storeLogin).customer_id || null;
    } catch {
      return null;
    }
    return null;
  };

  // Face capture handlers
  const handleFaceCapture = useCallback((blob: Blob) => {
    setFacePhotoBlob(blob);
    const previewUrl = URL.createObjectURL(blob);
    setFacePhotoPreview(previewUrl);
    setShowFaceCapture(false);
  }, []);

  const uploadFacePhoto = async (blob: Blob, staffId: string): Promise<string | null> => {
    const fileName = `${staffId}_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('staff-faces')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (error) {
      console.error('Face upload error:', error);
      return null;
    }
    
    const { data: publicUrl } = supabase.storage
      .from('staff-faces')
      .getPublicUrl(fileName);
    
    return publicUrl.publicUrl;
  };

  const handleUpdateFaceCapture = useCallback(async (blob: Blob) => {
    if (!updatingFaceStaff) return;
    
    setIsUploadingFace(true);
    try {
      const faceUrl = await uploadFacePhoto(blob, updatingFaceStaff.id);
      if (!faceUrl) {
        throw new Error('Failed to upload face photo');
      }
      
      const { error } = await supabase
        .from('user_roles')
        .update({ face_photo_url: faceUrl })
        .eq('id', updatingFaceStaff.id);
      
      if (error) throw error;
      
      toast({
        title: 'Face Updated',
        description: `Face photo updated for ${updatingFaceStaff.name}`,
      });
      
      fetchStaff();
    } catch (error: any) {
      console.error('Error updating face:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update face photo',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingFace(false);
      setShowUpdateFaceCapture(false);
      setUpdatingFaceStaff(null);
    }
  }, [updatingFaceStaff]);

  const openUpdateFaceDialog = (staff: StaffMember) => {
    setUpdatingFaceStaff(staff);
    setShowUpdateFaceCapture(true);
  };

  // Fetch staff from database
  const fetchStaff = async () => {
    setIsFetching(true);
    try {
      const storeId = getStoreId();
      if (!storeId) {
        console.log('No store ID found');
        setIsFetching(false);
        return;
      }

      // Fetch staff using the edge function
      const storeCode = (() => { try { const d = localStorage.getItem('pos_active_store_data'); return d ? JSON.parse(d)?.storeCode : null; } catch { return null; } })();
      const { data, error } = await supabase.functions.invoke('get-store-staff', {
        body: { store_id: storeId, store_code: storeCode }
      });

      if (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch staff list',
          variant: 'destructive'
        });
        return;
      }

      if (data?.staff) {
        const mappedStaff: StaffMember[] = data.staff.map((s: any) => ({
          id: s.id,
          staffCode: s.staff_code || '',
          name: s.full_name || 'Unknown',
          role: s.role || 'staff',
          phone: s.phone || '',
          pin: s.pin,
          createdAt: s.created_at,
          isActive: s.is_active,
          userId: s.user_id,
          storeId: s.store_id,
          facePhotoUrl: s.face_photo_url,
          workStartTime: s.work_start_time || '09:00:00',
          workEndTime: s.work_end_time || '18:00:00',
          fingerprintEnabled: s.fingerprint_enabled || false
        }));
        setStaffList(mappedStaff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch all stores for owner to assign staff
  const fetchStores = async () => {
    if (!isOwner || !userRole?.customer_id) return;
    
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_name')
        .eq('customer_id', userRole.customer_id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      setStoresList(data?.map(s => ({ id: s.id, name: s.store_name })) || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [store?.id, selectedStoreId]);

  useEffect(() => {
    fetchStores();
  }, [isOwner, userRole?.customer_id]);

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email.trim() || !newStaff.phone.trim() || !newStaff.pin) {
      toast({
        title: 'Missing Information',
        description: 'Please fill name, email, mobile number and password',
        variant: 'destructive'
      });
      return;
    }

    if (newStaff.pin.trim().length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }

    if (!newStaff.addressLine1 || !newStaff.locality || !newStaff.city || !newStaff.state || !newStaff.pincode) {
      toast({
        title: 'Complete Address Required',
        description: 'Please fill in all address components (Line 1, Locality, City, State, and Pincode)',
        variant: 'destructive'
      });
      return;
    }

    if (!newStaff.aadhaarNumber || !newStaff.aadhaarName || !aadhaarFrontFile || !aadhaarBackFile) {
      toast({
        title: 'Aadhaar Details Required',
        description: 'Aadhaar Number, Name, and Front/Back scans are mandatory',
        variant: 'destructive'
      });
      return;
    }

    if (!/^\d{12}$/.test(newStaff.aadhaarNumber.trim())) {
      toast({
        title: 'Invalid Aadhaar Format',
        description: 'Aadhaar Number must be exactly 12 digits and numeric',
        variant: 'destructive'
      });
      return;
    }

    if (!otpVerified) {
      toast({
        title: 'OTP Verification Required',
        description: 'Mobile OTP verification is mandatory before staff creation',
        variant: 'destructive'
      });
      return;
    }

    if (!facePhotoBlob) {
      toast({
        title: 'Face Photo Required',
        description: 'Please capture face photo for the staff member',
        variant: 'destructive'
      });
      return;
    }

    // For owners, use the selected store from the form, otherwise use getStoreId()
    const storeId = newStaff.storeId || getStoreId();
    const customerId = getCustomerId();
    
    if (!storeId) {
      toast({
        title: 'Error',
        description: 'Could not determine store. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Upload face photo
      const tempId = `temp_${Date.now()}`;
      const faceUrl = await uploadFacePhoto(facePhotoBlob, tempId);
      if (!faceUrl) {
        throw new Error('Failed to upload face photo');
      }

      // 2. Upload Aadhaar Front Scan
      const frontUrl = await uploadAadhaarScan(aadhaarFrontFile, 'front', newStaff.name);
      if (!frontUrl) {
        throw new Error('Failed to upload Aadhaar front scan');
      }

      // 3. Upload Aadhaar Back Scan
      const backUrl = await uploadAadhaarScan(aadhaarBackFile, 'back', newStaff.name);
      if (!backUrl) {
        throw new Error('Failed to upload Aadhaar back scan');
      }

      await invokeFunctionWithResponseFallback<CreateStaffResponse>('create-staff', {
        name: newStaff.name,
        email: newStaff.email.trim().toLowerCase(),
        phone: newStaff.phone.trim(),
        role: newStaff.role,
        store_id: storeId,
        customer_id: customerId,
        pin: newStaff.pin,
        password: newStaff.pin,
        face_photo_url: faceUrl,
        work_start_time: newStaff.workStartTime,
        work_end_time: newStaff.workEndTime,
        fingerprint_enabled: newStaff.fingerprintEnabled,
        salary: newStaff.salary ? Number(newStaff.salary) : 0,
        address_line1: newStaff.addressLine1,
        locality: newStaff.locality,
        city: newStaff.city,
        state: newStaff.state,
        pincode: newStaff.pincode,
        aadhaar_number: newStaff.aadhaarNumber.trim(),
        aadhaar_name: newStaff.aadhaarName.trim(),
        aadhaar_front_url: frontUrl,
        aadhaar_back_url: backUrl
      });

      toast({
        title: 'Staff Created',
        description: `${newStaff.name} created successfully as pending verification.`,
      });

      setNewStaff({ 
        name: '', 
        email: '', 
        role: 'staff', 
        phone: '', 
        pin: '', 
        storeId: '', 
        addressLine1: '',
        locality: '',
        city: '',
        state: '',
        pincode: '',
        aadhaarNumber: '',
        aadhaarName: '',
        workStartTime: '09:00', 
        workEndTime: '18:00', 
        fingerprintEnabled: false, 
        salary: '' 
      });
      setFacePhotoBlob(null);
      setFacePhotoPreview(null);
      setAadhaarFrontFile(null);
      setAadhaarBackFile(null);
      setAadhaarFrontPreview(null);
      setAadhaarBackPreview(null);
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode('');
      setEnteredOtp('');
      setShowAddStaff(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create staff',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-staff', {
        body: { role_id: id }
      });

      if (error) throw error;

      toast({
        title: 'Staff Removed',
        description: `${staff.name} has been removed`,
      });
      
      fetchStaff();
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete staff',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setShowEditStaff(true);
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    setIsLoading(true);
    try {
      // Update user_roles table
      const { error } = await supabase
        .from('user_roles')
        .update({
          role: editingStaff.role as any,
          pin: editingStaff.pin,
          is_active: editingStaff.isActive,
          store_id: editingStaff.storeId,
          work_start_time: editingStaff.workStartTime,
          work_end_time: editingStaff.workEndTime,
          fingerprint_enabled: editingStaff.fingerprintEnabled
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      // Update profile name
      await supabase
        .from('profiles')
        .update({ full_name: editingStaff.name })
        .eq('id', editingStaff.userId);

      toast({
        title: 'Staff Updated',
        description: 'Staff information has been updated',
      });
      
      setShowEditStaff(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStaffStatus = async (id: string) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: !staff.isActive })
        .eq('id', id);

      if (error) throw error;
      
      fetchStaff();
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff status',
        variant: 'destructive'
      });
    }
  };

  const filteredStaff = staffList.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery)
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/15 text-destructive',
    owner: 'bg-purple-500/15 text-purple-600',
    store_manager: 'bg-purple-500/15 text-purple-600',
    manager: 'bg-purple-500/15 text-purple-600',
    cashier: 'bg-green-500/15 text-green-600',
    staff: 'bg-blue-500/15 text-blue-600',
    waiter: 'bg-blue-500/15 text-blue-600',
    chef: 'bg-orange-500/15 text-orange-600',
    kitchen: 'bg-orange-500/15 text-orange-600',
    delivery: 'bg-teal-500/15 text-teal-600',
    cleaner: 'bg-slate-500/15 text-slate-600'
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Staff Settings</h1>
              <p className="text-muted-foreground">Create and manage staff members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Store selector for owners */}
            {isOwner && (
              <Button 
                variant="outline" 
                onClick={() => setShowStoreSelection(true)}
                className="gap-2"
              >
                <Store className="w-4 h-4" />
                {selectedStoreName}
              </Button>
            )}
            <Button onClick={() => setShowAddStaff(true)} disabled={isLoading}>
              <UserPlus className="w-5 h-5 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* Quick Links - Schedule, Attendance, Approvals */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/staff-schedule')}>
            <Calendar className="w-4 h-4" />
            Staff Schedule
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/attendance-reports')}>
            <Clock className="w-4 h-4" />
            Attendance
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin-approvals')}>
            <CheckCircle className="w-4 h-4" />
            Approvals
          </Button>
        </div>

        {/* Store selection hint for owners (non-blocking) */}
        {isOwner && !selectedStoreId && !getStoreId() && (
          <div className="mb-6 p-4 bg-muted/50 border border-border rounded-xl flex items-center gap-3">
            <Building className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Tip: Select a Store</p>
              <p className="text-sm text-muted-foreground">Select a store to filter staff by location</p>
            </div>
            <Button variant="outline" onClick={() => setShowStoreSelection(true)}>
              Select Store
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-2xl font-bold">{staffList.length}</p>
            <p className="text-sm text-muted-foreground">Total Staff</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-2xl font-bold text-success">{staffList.filter(s => s.isActive).length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-2xl font-bold text-warning">{staffList.filter(s => !s.isActive).length}</p>
            <p className="text-sm text-muted-foreground">Inactive</p>
          </div>
        </div>

        {/* Staff List */}
        <div className="space-y-3">
          {isFetching ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No staff members found</p>
              <Button className="mt-4" onClick={() => setShowAddStaff(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Staff
              </Button>
            </div>
          ) : (
            filteredStaff.map(staff => (
              <div 
                key={staff.id} 
                className={`bg-card rounded-2xl border p-4 ${
                  staff.isActive ? 'border-border' : 'border-warning/30 bg-warning/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                      staff.isActive ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      {staff.facePhotoUrl ? (
                        <img src={staff.facePhotoUrl} alt={staff.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className={`w-6 h-6 ${staff.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{staff.name}</h3>
                        {!staff.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-mono">{staff.staffCode}</span>
                        {staff.phone && (
                          <>
                            <span>•</span>
                            <span>{staff.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={roleColors[staff.role] || 'bg-secondary'}>
                      {staff.role}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openUpdateFaceDialog(staff)}
                      disabled={isLoading || isUploadingFace}
                      title="Update Face Photo"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditStaff(staff)}
                      disabled={isLoading}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => toggleStaffStatus(staff.id)}
                      disabled={isLoading}
                    >
                      {staff.isActive ? (
                        <XCircle className="w-4 h-4 text-warning" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteStaff(staff.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                  <span>PIN: {staff.pin ? '****' : 'Not set'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {staff.workStartTime?.slice(0, 5) || '09:00'} - {staff.workEndTime?.slice(0, 5) || '18:00'}
                  </span>
                  <span>•</span>
                  {staff.fingerprintEnabled && (
                    <>
                      <span className="flex items-center gap-1 text-primary">
                        <Fingerprint className="w-3 h-3" /> Fingerprint
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>Added: {new Date(staff.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Staff Dialog */}
        <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Staff</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 max-h-[55vh] overflow-y-auto pr-2">
              {/* Name */}
              <div>
                <Label>Full Name *</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter full name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Login Email *</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="pl-10"
                    type="email"
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <Label>Role *</Label>
                <Select value={newStaff.role} onValueChange={(v) => setNewStaff({ ...newStaff, role: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="store_manager">Store Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone OTP */}
              <div>
                <Label>Phone Number (Mobile) *</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="10-digit Mobile Number"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                      disabled={otpVerified}
                      className="pl-10 h-11"
                      type="tel"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpVerified || isSendingOtp}
                    variant="outline"
                    className="h-11"
                  >
                    {isSendingOtp ? 'Sending...' : otpSent ? 'Resend' : 'Send OTP'}
                  </Button>
                </div>
                {otpSent && !otpVerified && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Enter 6-digit OTP"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      className="h-9 px-3 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Verify
                    </Button>
                  </div>
                )}
                {otpVerified && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-medium font-mono">
                    ✓ Mobile Number Verified
                  </p>
                )}
              </div>

              {/* Complete Address */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Complete Address *</Label>
                <div>
                  <Label className="text-xs">Address Line 1 *</Label>
                  <Input
                    placeholder="Address Line 1"
                    value={newStaff.addressLine1}
                    onChange={(e) => setNewStaff({ ...newStaff, addressLine1: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Area / Locality *</Label>
                  <Input
                    placeholder="Locality / Area"
                    value={newStaff.locality}
                    onChange={(e) => setNewStaff({ ...newStaff, locality: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">City *</Label>
                    <Input
                      placeholder="City"
                      value={newStaff.city}
                      onChange={(e) => setNewStaff({ ...newStaff, city: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">State *</Label>
                    <Input
                      placeholder="State"
                      value={newStaff.state}
                      onChange={(e) => setNewStaff({ ...newStaff, state: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Pincode *</Label>
                  <Input
                    placeholder="Pincode"
                    value={newStaff.pincode}
                    onChange={(e) => setNewStaff({ ...newStaff, pincode: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Aadhaar Verification */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Mandatory Aadhaar Verification *</Label>
                <div>
                  <Label className="text-xs">Aadhaar Number *</Label>
                  <Input
                    placeholder="12-digit Aadhaar Number"
                    value={newStaff.aadhaarNumber}
                    onChange={(e) => setNewStaff({ ...newStaff, aadhaarNumber: e.target.value })}
                    maxLength={12}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Aadhaar Name (As printed) *</Label>
                  <Input
                    placeholder="Name on Aadhaar Card"
                    value={newStaff.aadhaarName}
                    onChange={(e) => setNewStaff({ ...newStaff, aadhaarName: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <Label className="text-xs">Aadhaar Front Image *</Label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={aadhaarFrontInputRef}
                      onChange={e => handleAadhaarUpload(e, 'front')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => aadhaarFrontInputRef.current?.click()}
                      className="w-full mt-1 text-xs truncate"
                    >
                      {aadhaarFrontFile ? aadhaarFrontFile.name : 'Upload Front Scan'}
                    </Button>
                    {aadhaarFrontPreview && (
                      <img src={aadhaarFrontPreview} alt="Aadhaar Front Preview" className="mt-2 w-full h-20 object-contain border rounded bg-secondary/20" />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Aadhaar Back Image *</Label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={aadhaarBackInputRef}
                      onChange={e => handleAadhaarUpload(e, 'back')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => aadhaarBackInputRef.current?.click()}
                      className="w-full mt-1 text-xs truncate"
                    >
                      {aadhaarBackFile ? aadhaarBackFile.name : 'Upload Back Scan'}
                    </Button>
                    {aadhaarBackPreview && (
                      <img src={aadhaarBackPreview} alt="Aadhaar Back Preview" className="mt-2 w-full h-20 object-contain border rounded bg-secondary/20" />
                    )}
                  </div>
                </div>
              </div>

              {/* Store Assignment - only for owners */}
              {isOwner && storesList.length > 0 && (
                <div>
                  <Label>Assigned Store *</Label>
                  <Select 
                    value={newStaff.storeId || ''} 
                    onValueChange={(v) => setNewStaff({ ...newStaff, storeId: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <Store className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      {storesList.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* PIN */}
              <div>
                <Label>Login Password *</Label>
                <div className="relative mt-1">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter password"
                    value={newStaff.pin}
                    onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value })}
                    className="pl-10 pr-10"
                    type={showPin ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Min 6 characters. Staff will use email + this password to login</p>
              </div>

              {/* Face Photo Capture & Upload */}
              <div>
                <Label>Face Photo *</Label>
                <div className="mt-1 flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {facePhotoPreview ? (
                    <div className="flex items-center gap-4 bg-secondary/30 p-2.5 rounded-xl border border-border">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-background flex-shrink-0">
                        <img src={facePhotoPreview} alt="Face preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setShowFaceCapture(true)}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Retake Photo (Camera)
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Different Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowFaceCapture(true)}
                        className="h-14 gap-2 flex items-center justify-center border-dashed"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Face
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-14 gap-2 flex items-center justify-center border-dashed"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Photo
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Required for attendance verification</p>
              </div>

              {/* Working Hours */}
              <div>
                <Label>Working Hours</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1">
                    <Input
                      type="time"
                      value={newStaff.workStartTime}
                      onChange={(e) => setNewStaff({ ...newStaff, workStartTime: e.target.value })}
                    />
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="flex-1">
                    <Input
                      type="time"
                      value={newStaff.workEndTime}
                      onChange={(e) => setNewStaff({ ...newStaff, workEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Fingerprint Authentication */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Enable Fingerprint</p>
                    <p className="text-xs text-muted-foreground">Allow fingerprint for check-in/out</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newStaff.fingerprintEnabled}
                  onChange={(e) => setNewStaff({ ...newStaff, fingerprintEnabled: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>

              {/* Salary */}
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Salary (₹)</label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={newStaff.salary}
                  onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })}
                />
              </div>

            </div>
            <div className="flex gap-2 pt-4 border-t border-border mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddStaff(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleAddStaff}
                disabled={isLoading || !otpVerified}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Staff
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={showEditStaff} onOpenChange={setShowEditStaff}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Staff</DialogTitle>
            </DialogHeader>
            {editingStaff && (
              <div className="space-y-4 pt-4">


                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editingStaff.name}
                    onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select 
                    value={editingStaff.role} 
                    onValueChange={(v) => setEditingStaff({ ...editingStaff, role: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="store_manager">Store Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Store Assignment - only for owners */}
                {isOwner && storesList.length > 0 && (
                  <div>
                    <Label>Assigned Store</Label>
                    <Select 
                      value={editingStaff.storeId || ''} 
                      onValueChange={(v) => setEditingStaff({ ...editingStaff, storeId: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <Store className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {storesList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Login PIN</Label>
                  <Input
                    value={editingStaff.pin || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, pin: e.target.value.replace(/\D/g, '') })}
                    className="mt-1 tracking-widest"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="Enter new PIN"
                  />
                </div>

                {/* Working Hours in Edit */}
                <div>
                  <Label>Working Hours</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1">
                      <Input
                        type="time"
                        value={editingStaff.workStartTime?.slice(0, 5) || '09:00'}
                        onChange={(e) => setEditingStaff({ ...editingStaff, workStartTime: e.target.value })}
                      />
                    </div>
                    <span className="text-muted-foreground">to</span>
                    <div className="flex-1">
                      <Input
                        type="time"
                        value={editingStaff.workEndTime?.slice(0, 5) || '18:00'}
                        onChange={(e) => setEditingStaff({ ...editingStaff, workEndTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Fingerprint Toggle in Edit */}
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Enable Fingerprint</p>
                      <p className="text-xs text-muted-foreground">Allow fingerprint for check-in/out</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingStaff.fingerprintEnabled || false}
                    onChange={(e) => setEditingStaff({ ...editingStaff, fingerprintEnabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditStaff(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleUpdateStaff}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Update
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Owner Store Selection Dialog */}
        <OwnerStoreSelectionDialog
          isOpen={showStoreSelection}
          onClose={() => setShowStoreSelection(false)}
          onSelectStore={selectStore}
        />

        {/* Face Capture Dialog for New Staff */}
        <FaceCaptureDialog
          open={showFaceCapture}
          onOpenChange={setShowFaceCapture}
          onCapture={handleFaceCapture}
          title="Capture Staff Face Photo"
          description="Position the staff member's face in the frame and capture"
        />

        {/* Face Capture Dialog for Updating Existing Staff */}
        <FaceCaptureDialog
          open={showUpdateFaceCapture}
          onOpenChange={(open) => {
            setShowUpdateFaceCapture(open);
            if (!open) setUpdatingFaceStaff(null);
          }}
          onCapture={handleUpdateFaceCapture}
          title={`Update Face Photo - ${updatingFaceStaff?.name || ''}`}
          description="Capture new face photo for attendance verification"
        />
      </div>
    </div>
  );
};

export default StaffSettingsPage;