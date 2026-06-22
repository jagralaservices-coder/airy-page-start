import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Clock, User, Save, Loader2, Edit2, Fingerprint, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StaffMember {
  user_id: string;
  role: string;
  work_start_time: string | null;
  work_end_time: string | null;
  fingerprint_enabled: boolean;
  face_photo_url: string | null;
  staff_code: string | null;
  is_active: boolean;
  profile?: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
}

interface StaffShiftSettingsProps {
  storeId: string;
  customerId: string;
}

const StaffShiftSettings: React.FC<StaffShiftSettingsProps> = ({ storeId, customerId }) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    work_start_time: '09:00',
    work_end_time: '18:00',
    fingerprint_enabled: false
  });

  useEffect(() => {
    fetchStaffList();
  }, [storeId, customerId]);

  const fetchStaffList = async () => {
    setIsLoading(true);
    
    // Fetch staff from user_roles with profile info
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('store_id', storeId)
      .in('role', ['staff', 'store_manager']);

    if (rolesError) {
      console.error('Error fetching staff:', rolesError);
      setIsLoading(false);
      return;
    }

    if (rolesData && rolesData.length > 0) {
      // Fetch profiles for these users
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const staffWithProfiles = rolesData.map(role => ({
        ...role,
        profile: profilesData?.find(p => p.id === role.user_id)
      }));

      setStaffList(staffWithProfiles);
    }
    
    setIsLoading(false);
  };

  const handleEditClick = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditForm({
      work_start_time: staff.work_start_time?.slice(0, 5) || '09:00',
      work_end_time: staff.work_end_time?.slice(0, 5) || '18:00',
      fingerprint_enabled: staff.fingerprint_enabled || false
    });
    setShowEditDialog(true);
  };

  const sendStaffNotification = (staffName: string, staffUserId: string, startTime: string, endTime: string) => {
    // Get existing notifications or create new array
    const existingNotifications = JSON.parse(localStorage.getItem('pos_notifications') || '[]');
    
    const newNotification = {
      id: `shift_${Date.now()}`,
      type: 'shift_update',
      title: 'Shift Updated',
      message: `Your new shift timing: ${formatTime(startTime + ':00')} to ${formatTime(endTime + ':00')}`,
      read: false,
      createdAt: new Date().toISOString(),
      targetUserId: staffUserId,
      staffName: staffName
    };
    
    existingNotifications.push(newNotification);
    localStorage.setItem('pos_notifications', JSON.stringify(existingNotifications));
  };

  const handleSaveShift = async () => {
    if (!editingStaff) return;
    
    setIsSaving(true);
    
    const oldStartTime = editingStaff.work_start_time;
    const oldEndTime = editingStaff.work_end_time;
    const newStartTime = editForm.work_start_time + ':00';
    const newEndTime = editForm.work_end_time + ':00';
    
    const { error } = await supabase
      .from('user_roles')
      .update({
        work_start_time: newStartTime,
        work_end_time: newEndTime,
        fingerprint_enabled: editForm.fingerprint_enabled
      })
      .eq('user_id', editingStaff.user_id)
      .eq('store_id', storeId);

    if (error) {
      console.error('Error updating shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to update staff settings',
        variant: 'destructive'
      });
    } else {
      // Send notification if shift timing changed
      if (oldStartTime !== newStartTime || oldEndTime !== newEndTime) {
        const staffName = editingStaff.profile?.full_name || 'Staff';
        sendStaffNotification(staffName, editingStaff.user_id, editForm.work_start_time, editForm.work_end_time);
      }
      
      toast({
        title: 'Updated',
        description: 'Staff shift settings saved. Notification sent to staff.'
      });
      fetchStaffList();
      setShowEditDialog(false);
    }
    
    setIsSaving(false);
  };

  const formatTime = (time: string | null): string => {
    if (!time) return 'Not set';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const calculateShiftDuration = (start: string | null, end: string | null): string => {
    if (!start || !end) return '-';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const totalMins = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Staff Shift Settings
          </CardTitle>
          <CardDescription>
            Configure working hours and biometric settings for each staff member
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staffList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No staff members found for this store</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffList.map(staff => (
                <div 
                  key={staff.user_id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {staff.face_photo_url ? (
                        <img 
                          src={staff.face_photo_url} 
                          alt="" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {staff.profile?.full_name || staff.profile?.email || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {staff.role}
                        </Badge>
                        {staff.staff_code && (
                          <span>Code: {staff.staff_code}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Shift Info */}
                    <div className="text-right text-sm hidden md:block">
                      <p className="font-medium">
                        {formatTime(staff.work_start_time)} - {formatTime(staff.work_end_time)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calculateShiftDuration(staff.work_start_time, staff.work_end_time)} shift
                      </p>
                    </div>
                    
                    {/* Biometric Badges */}
                    <div className="flex gap-1">
                      {staff.fingerprint_enabled && (
                        <Badge variant="secondary" className="gap-1">
                          <Fingerprint className="w-3 h-3" />
                        </Badge>
                      )}
                      {staff.face_photo_url && (
                        <Badge variant="secondary" className="gap-1">
                          <Camera className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                    
                    {/* Edit Button */}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEditClick(staff)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Settings</DialogTitle>
            <DialogDescription>
              Update shift timings and biometric preferences for {editingStaff?.profile?.full_name || 'this staff member'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {/* Shift Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Shift Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={editForm.work_start_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, work_start_time: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end_time">Shift End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={editForm.work_end_time}
                  onChange={(e) => setEditForm(prev => ({ ...prev, work_end_time: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Calculated Duration */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Shift Duration:</p>
              <p className="font-bold text-lg">
                {calculateShiftDuration(editForm.work_start_time + ':00', editForm.work_end_time + ':00')}
              </p>
            </div>
            
            {/* Fingerprint Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Fingerprint Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Allow fingerprint for check-in/out
                  </p>
                </div>
              </div>
              <Switch
                checked={editForm.fingerprint_enabled}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, fingerprint_enabled: checked }))}
              />
            </div>
            
            {/* Save Button */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveShift}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffShiftSettings;
