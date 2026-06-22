import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocationVerification } from './useLocationVerification';
import { toast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  user_id: string;
  store_id: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_distance: number | null;
  check_out_distance: number | null;
  status: 'checked_in' | 'checked_out';
}

interface UseStaffAttendanceResult {
  isCheckedIn: boolean;
  currentRecord: AttendanceRecord | null;
  attendanceHistory: AttendanceRecord[];
  isLoading: boolean;
  isVerifying: boolean;
  checkIn: (verificationMethod?: 'face' | 'fingerprint') => Promise<boolean>;
  checkOut: (verificationMethod?: 'face' | 'fingerprint') => Promise<boolean>;
  refreshAttendance: () => Promise<void>;
}

export const useStaffAttendance = (userId?: string, storeId?: string): UseStaffAttendanceResult => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { verifyLocation, isVerifying, maxDistance } = useLocationVerification();

  const fetchAttendance = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check for active check-in today
      const { data: activeRecord, error: activeError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'checked_in')
        .gte('check_in_time', today.toISOString())
        .lt('check_in_time', tomorrow.toISOString())
        .maybeSingle();

      if (activeError) {
        console.error('Error fetching active attendance:', activeError);
      } else if (activeRecord) {
        setIsCheckedIn(true);
        setCurrentRecord(activeRecord as AttendanceRecord);
      } else {
        setIsCheckedIn(false);
        setCurrentRecord(null);
      }

      // Get attendance history (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: history, error: historyError } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', weekAgo.toISOString())
        .order('check_in_time', { ascending: false })
        .limit(10);

      if (historyError) {
        console.error('Error fetching attendance history:', historyError);
      } else {
        setAttendanceHistory((history || []) as AttendanceRecord[]);
      }
    } catch (error) {
      console.error('Error in fetchAttendance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const checkIn = useCallback(async (verificationMethod: 'face' | 'fingerprint' = 'face'): Promise<boolean> => {
    console.log('checkIn called with:', { userId, storeId, verificationMethod });
    
    if (!userId || !storeId) {
      console.error('Missing userId or storeId:', { userId, storeId });
      toast({
        title: 'Check-in Failed',
        description: 'User or store information missing. Please log in again.',
        variant: 'destructive'
      });
      return false;
    }

    console.log('Verifying location...');
    const result = await verifyLocation();
    console.log('Location verification result:', result);

    if (!result.success) {
      toast({
        title: 'Check-in Failed',
        description: result.error || `You must be within ${maxDistance}m of the store`,
        variant: 'destructive'
      });
      return false;
    }

    try {
      console.log('Inserting attendance record...');
      const { data, error } = await supabase
        .from('staff_attendance')
        .insert({
          user_id: userId,
          store_id: storeId,
          check_in_latitude: result.latitude,
          check_in_longitude: result.longitude,
          check_in_distance: result.distance,
          status: 'checked_in',
          verification_method: verificationMethod
        })
        .select()
        .single();

      if (error) {
        console.error('Check-in database error:', error);
        toast({
          title: 'Check-in Failed',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      console.log('Check-in successful:', data);
      setIsCheckedIn(true);
      setCurrentRecord(data as AttendanceRecord);
      
      toast({
        title: 'Checked In Successfully',
        description: `${verificationMethod === 'fingerprint' ? 'Fingerprint' : 'Face'} verified. Distance: ${result.distance}m. Have a great day!`
      });

      await fetchAttendance();
      return true;
    } catch (error) {
      console.error('Check-in unexpected error:', error);
      toast({
        title: 'Check-in Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
      return false;
    }
  }, [userId, storeId, verifyLocation, maxDistance, fetchAttendance]);

  const checkOut = useCallback(async (verificationMethod: 'face' | 'fingerprint' = 'face'): Promise<boolean> => {
    if (!currentRecord) {
      toast({
        title: 'Check-out Failed',
        description: 'No active check-in found',
        variant: 'destructive'
      });
      return false;
    }

    const result = await verifyLocation();

    if (!result.success) {
      toast({
        title: 'Check-out Failed',
        description: result.error || `You must be within ${maxDistance}m of the store`,
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('staff_attendance')
        .update({
          check_out_time: new Date().toISOString(),
          check_out_latitude: result.latitude,
          check_out_longitude: result.longitude,
          check_out_distance: result.distance,
          status: 'checked_out'
        })
        .eq('id', currentRecord.id);

      if (error) {
        console.error('Check-out error:', error);
        toast({
          title: 'Check-out Failed',
          description: error.message,
          variant: 'destructive'
        });
        return false;
      }

      setIsCheckedIn(false);
      setCurrentRecord(null);
      
      toast({
        title: 'Checked Out Successfully',
        description: `${verificationMethod === 'fingerprint' ? 'Fingerprint' : 'Face'} verified. Distance: ${result.distance}m. See you next time!`
      });

      await fetchAttendance();
      return true;
    } catch (error) {
      console.error('Check-out error:', error);
      toast({
        title: 'Check-out Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
      return false;
    }
  }, [currentRecord, verifyLocation, maxDistance, fetchAttendance]);

  return {
    isCheckedIn,
    currentRecord,
    attendanceHistory,
    isLoading,
    isVerifying,
    checkIn,
    checkOut,
    refreshAttendance: fetchAttendance
  };
};