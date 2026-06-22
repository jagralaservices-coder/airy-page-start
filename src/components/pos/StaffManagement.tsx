import React, { useState, forwardRef, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStaff, setStaff, Staff, generateId, AttendanceRecord } from '@/lib/store';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { 
  UserPlus, 
  LogIn, 
  LogOut, 
  Clock, 
  Search,
  User,
  Phone,
  Shield,
  ArrowLeft,
  Camera,
  ScanFace,
  Loader2,
  DollarSign,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import FaceCaptureDialog from './FaceCaptureDialog';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunctionWithResponseFallback } from '@/lib/invokeFunctionWithResponseFallback';

interface CreateStaffResponse {
  success?: boolean;
  error?: string;
  staff_code?: string;
  pin?: string;
}

export const StaffManagement = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [staffList, setStaffList] = useState<Staff[]>(getStaff());
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    role: 'waiter' as Staff['role'],
    phone: '',
    pin: '',
    salary: ''
  });
  const [facePhotoBlob, setFacePhotoBlob] = useState<Blob | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const faceFileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toDateString();

  const handleFaceCapture = (blob: Blob) => {
    setFacePhotoBlob(blob);
    setFacePhotoPreview(URL.createObjectURL(blob));
    setShowFaceCapture(false);
    toast.success(t('common.success'));
  };

  const handleFaceFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      event.target.value = '';
      return;
    }

    setFacePhotoBlob(file);
    setFacePhotoPreview(URL.createObjectURL(file));
    event.target.value = '';
    toast.success('Photo selected');
  };

  const uploadFacePhoto = async (blob: Blob, staffId: string): Promise<string | null> => {
    try {
      const fileName = `${staffId}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('staff-faces')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) return null;

      const { data: urlData } = supabase.storage
        .from('staff-faces')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      return null;
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.phone || !newStaff.pin) {
      toast.error(t('common.required'));
      return;
    }

    if (!facePhotoBlob) {
      toast.error('Capture or upload a face photo first');
      return;
    }

    setIsUploading(true);
    const staffId = generateId();

    const facePhotoUrl = await uploadFacePhoto(facePhotoBlob, staffId);
    
    if (!facePhotoUrl) {
      toast.error(t('common.error'));
      setIsUploading(false);
      return;
    }

    try {
      // Get store context
      const storeData = (() => { try { const d = localStorage.getItem('pos_active_store_data'); return d ? JSON.parse(d) : null; } catch { return null; } })();
      const storeId = storeData?.id;
      const customerId = storeData?.customer_id;

      if (!storeId) {
        toast.error('Store not found');
        setIsUploading(false);
        return;
      }

      // Call create-staff edge function with email
      const data = await invokeFunctionWithResponseFallback<CreateStaffResponse>('create-staff', {
        name: newStaff.name,
        email: newStaff.email,
        role: newStaff.role,
        store_id: storeId,
        customer_id: customerId,
        pin: newStaff.pin,
        password: newStaff.pin,
        face_photo_url: facePhotoUrl,
        salary: newStaff.salary ? parseFloat(newStaff.salary) : 0,
        store_login_id: storeData?.storeCode ? storeId : undefined,
      });

      // Also save to local list for UI
      const staff: Staff = {
        id: staffId,
        ...newStaff,
        isActive: true,
        attendance: [],
        facePhotoUrl
      };

      const updatedList = [...staffList, staff];
      setStaffList(updatedList);
      setStaff(updatedList);

      toast.success(`Staff created! Email: ${newStaff.email} | PIN: ${data.pin || newStaff.pin}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create staff');
    }

    setNewStaff({ name: '', email: '', role: 'waiter', phone: '', pin: '', salary: '' });
    setFacePhotoBlob(null);
    setFacePhotoPreview(null);
    setShowAddStaff(false);
    setIsUploading(false);
  };

  const handleCheckIn = (staffId: string) => {
    const updatedList = staffList.map(s => {
      if (s.id === staffId) {
        const existingRecord = s.attendance.find(a => a.date === today);
        if (existingRecord?.checkIn) {
          toast.error(t('common.error'));
          return s;
        }

        const newRecord: AttendanceRecord = {
          date: today,
          checkIn: new Date(),
          status: 'present'
        };

        toast.success(t('msg.checkInSuccess'));
        return {
          ...s,
          attendance: [...s.attendance.filter(a => a.date !== today), newRecord]
        };
      }
      return s;
    });

    setStaffList(updatedList);
    setStaff(updatedList);
  };

  const handleCheckOut = (staffId: string) => {
    const updatedList = staffList.map(s => {
      if (s.id === staffId) {
        const existingRecord = s.attendance.find(a => a.date === today);
        if (!existingRecord?.checkIn) {
          toast.error(t('common.error'));
          return s;
        }
        if (existingRecord.checkOut) {
          toast.error(t('common.error'));
          return s;
        }

        toast.success(t('msg.checkOutSuccess'));
        return {
          ...s,
          attendance: s.attendance.map(a => 
            a.date === today ? { ...a, checkOut: new Date() } : a
          )
        };
      }
      return s;
    });

    setStaffList(updatedList);
    setStaff(updatedList);
  };

  const getTodayAttendance = (staff: Staff): AttendanceRecord | undefined => {
    return staff.attendance.find(a => a.date === today);
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const roleColors: Record<Staff['role'], string> = {
    admin: 'bg-destructive/20 text-destructive',
    cashier: 'bg-primary/20 text-primary',
    waiter: 'bg-success/20 text-success',
    kitchen: 'bg-warning/20 text-warning',
    delivery: 'bg-cat-drinks/20 text-cat-drinks'
  };

  const getRoleLabel = (role: Staff['role']) => {
    const roleMap: Record<Staff['role'], string> = {
      admin: t('staff.admin'),
      cashier: t('staff.cashier'),
      waiter: t('staff.waiter'),
      kitchen: t('staff.kitchen'),
      delivery: t('staff.deliveryBoy')
    };
    return roleMap[role] || role;
  };

  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">👥 {t('staff.staffManagement')}</h1>
            <p className="text-xs text-muted-foreground">{filteredStaff.length} {t('staff.manageTeam')}</p>
          </div>
          <Button size="sm" onClick={() => setShowAddStaff(true)} className="gap-1.5 rounded-xl">
            <UserPlus className="w-4 h-4" />
            {t('staff.addStaff')}
          </Button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('staff.searchStaff')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-24 space-y-4">

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">{t('staff.addNewStaff')}</h2>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
              {/* Face Photo Capture */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t('staff.facePhoto')} <span className="text-destructive">*</span> ({t('staff.compulsory')})
                </label>
                <div className="flex flex-col items-center gap-3">
                  <input
                    ref={faceFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFaceFileSelect}
                    className="hidden"
                  />

                  {facePhotoPreview ? (
                    <div className="relative">
                      <img 
                        src={facePhotoPreview} 
                        alt="Face preview" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                      />
                      <button
                        onClick={() => setShowFaceCapture(true)}
                        className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground"
                        type="button"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFaceCapture(true)}
                      className="w-32 h-32 rounded-full border-2 border-dashed border-primary flex flex-col items-center justify-center gap-2 hover:bg-primary/10 transition-colors"
                      type="button"
                    >
                      <ScanFace className="w-10 h-10 text-primary" />
                      <span className="text-xs text-primary font-medium">{t('staff.captureFace')}</span>
                    </button>
                  )}

                  <div className="flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowFaceCapture(true)}>
                      <Camera className="w-4 h-4 mr-2" />
                      Capture
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => faceFileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {t('staff.faceRecognition')}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('common.name')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="pos-input pl-10"
                    placeholder={t('staff.enterName')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email <span className="text-destructive">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="pos-input pl-10"
                    placeholder="staff@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('staff.role')}</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as Staff['role'] })}
                    className="pos-input pl-10"
                  >
                    <option value="admin">{t('staff.admin')}</option>
                    <option value="cashier">{t('staff.cashier')}</option>
                    <option value="waiter">{t('staff.waiter')}</option>
                    <option value="kitchen">{t('staff.kitchen')}</option>
                    <option value="delivery">{t('staff.deliveryBoy')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('common.phone')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="pos-input pl-10"
                    placeholder={t('staff.enterPhone')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t('staff.pinDigits')}</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newStaff.pin}
                  onChange={(e) => setNewStaff({ ...newStaff, pin: e.target.value })}
                  className="pos-input text-center tracking-widest"
                  placeholder="****"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Monthly Salary (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    value={newStaff.salary}
                    onChange={(e) => setNewStaff({ ...newStaff, salary: e.target.value })}
                    className="pos-input pl-10"
                    placeholder="e.g. 15000"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-border mt-4">
              <button
                onClick={() => {
                  setShowAddStaff(false);
                  setFacePhotoBlob(null);
                  setFacePhotoPreview(null);
                }}
                className="flex-1 pos-btn-secondary py-3"
                disabled={isUploading}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddStaff}
                className="flex-1 pos-btn-primary py-3 flex items-center justify-center gap-2"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('staff.addStaff')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Face Capture Dialog */}
      <FaceCaptureDialog
        open={showFaceCapture}
        onOpenChange={setShowFaceCapture}
        onCapture={handleFaceCapture}
        title={t('staff.captureFace')}
        description={t('staff.faceRecognition')}
      />

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredStaff.map((staff) => {
          const todayRecord = getTodayAttendance(staff);
          const isCheckedIn = todayRecord?.checkIn && !todayRecord?.checkOut;

          return (
            <div key={staff.id} className="bg-card border border-border/60 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  {staff.facePhotoUrl ? (
                    <img 
                      src={staff.facePhotoUrl} 
                      alt={staff.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                    isCheckedIn ? 'bg-success' : 'bg-muted'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{staff.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', roleColors[staff.role])}>
                      {getRoleLabel(staff.role)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      ID: {staff.id.substring(0, 6)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{staff.phone}</p>
              </div>

              {/* Attendance Status */}
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {todayRecord?.checkIn ? (
                    <span>
                      In: {new Date(todayRecord.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      {todayRecord.checkOut && (
                        <span className="ml-1.5">
                          • Out: {new Date(todayRecord.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>{t('staff.notCheckedIn')}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                {!todayRecord?.checkIn ? (
                  <Button
                    onClick={() => handleCheckIn(staff.id)}
                    className="flex-1 h-9 text-xs rounded-xl gap-1.5"
                    size="sm"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    {t('staff.checkIn')}
                  </Button>
                ) : !todayRecord?.checkOut ? (
                  <Button
                    variant="outline"
                    onClick={() => handleCheckOut(staff.id)}
                    className="flex-1 h-9 text-xs rounded-xl gap-1.5"
                    size="sm"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t('staff.checkOut')}
                  </Button>
                ) : (
                  <div className="flex-1 text-center text-xs text-success py-2 font-medium">
                    ✓ {t('orders.completed')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('common.noData')}</p>
        </div>
      )}
      </div>
    </div>
  );
});

StaffManagement.displayName = 'StaffManagement';

export default StaffManagement;