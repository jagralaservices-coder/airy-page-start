import React, { useState, useEffect } from 'react';
import { MapPin, Save, Navigation, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLocationVerification } from '@/hooks/useLocationVerification';

interface StoreLocationSettingsProps {
  storeId: string;
  storeName?: string;
}

export const StoreLocationSettings: React.FC<StoreLocationSettingsProps> = ({ storeId, storeName }) => {
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(false);

  const { getCurrentLocation, setStoreLocation } = useLocationVerification();

  useEffect(() => {
    const fetchStoreLocation = async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('latitude, longitude')
        .eq('id', storeId)
        .maybeSingle();

      if (!error && data) {
        if (data.latitude) setLatitude(data.latitude.toString());
        if (data.longitude) setLongitude(data.longitude.toString());
        setHasLocation(data.latitude != null && data.longitude != null);
      }
      setIsLoading(false);
    };

    fetchStoreLocation();
  }, [storeId]);

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    const location = await getCurrentLocation();
    setIsGettingLocation(false);

    if (location) {
      setLatitude(location.latitude.toFixed(6));
      setLongitude(location.longitude.toFixed(6));
      toast({
        title: 'Location Captured',
        description: 'Your current location has been captured. Click Save to apply.'
      });
    } else {
      toast({
        title: 'Location Failed',
        description: 'Could not get your location. Please enable location access.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: 'Invalid Coordinates',
        description: 'Please enter valid latitude and longitude values.',
        variant: 'destructive'
      });
      return;
    }

    if (lat < -90 || lat > 90) {
      toast({
        title: 'Invalid Latitude',
        description: 'Latitude must be between -90 and 90.',
        variant: 'destructive'
      });
      return;
    }

    if (lon < -180 || lon > 180) {
      toast({
        title: 'Invalid Longitude',
        description: 'Longitude must be between -180 and 180.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    const success = await setStoreLocation(lat, lon, storeId);
    setIsSaving(false);

    if (success) {
      setHasLocation(true);
      toast({
        title: 'Location Saved',
        description: 'Store location has been updated successfully.'
      });
    } else {
      toast({
        title: 'Save Failed',
        description: 'Could not save store location. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Store Location
          {hasLocation && <CheckCircle className="w-4 h-4 text-success" />}
        </CardTitle>
        <CardDescription>
          Set the store location for staff check-in/check-out verification.
          {storeName && <span className="block mt-1 font-medium">{storeName}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGetCurrentLocation}
          variant="outline"
          className="w-full"
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 mr-2" />
              Use Current Location
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="e.g., 28.6139"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="e.g., 77.2090"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="w-full"
          disabled={isSaving || !latitude || !longitude}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Location
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Staff must be within 500m of this location to check in/out.
        </p>
      </CardContent>
    </Card>
  );
};