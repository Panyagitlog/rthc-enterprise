import { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
// @ts-ignore
import { supabase } from '../services/supabase';
// @ts-ignore
import { fetchLocationsByCompany } from '../services/headcountService';

export default function LocationSelect({ onSelect }: { onSelect: (locationId: string) => void }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch coordinator's company and locations
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('company_id, location_id')
            .eq('auth_user_id', user.id)
            .single();
          
          if (profile?.company_id) {
            const locs = await fetchLocationsByCompany(profile.company_id);
            setLocations(locs || []);
            
            // Auto-select if coordinator is assigned to a specific location
            if (profile?.location_id) {
              setSelectedLocation(profile.location_id);
              onSelect(profile.location_id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [onSelect]);

  const handleSelect = (locId: string) => {
    setSelectedLocation(locId);
    onSelect(locId);
    setIsOpen(false);
  };

  const selectedLoc = locations.find(l => l.id === selectedLocation);

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:border-slate-400 transition disabled:opacity-50"
      >
        <MapPin className="w-4 h-4 text-slate-600" />
        <span className="flex-1 text-left text-sm">
          {loading ? 'Loading...' : selectedLoc?.location_name || 'Select Location'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {locations.map(loc => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelect(loc.id)}
              className={`w-full text-left px-3 py-2 hover:bg-slate-100 transition ${
                selectedLocation === loc.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
              }`}
            >
              {loc.location_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
