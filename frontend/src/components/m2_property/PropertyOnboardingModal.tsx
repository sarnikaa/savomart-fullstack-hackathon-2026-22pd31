import React, { useState } from 'react';
import { Property, User, Hotspot } from '../../types';
import { api } from '../../services/api';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Ruler, 
  Camera, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface PropertyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPropertyCreated: (prop: Property) => void;
  initialHotspot?: Hotspot | null;
}

export const PropertyOnboardingModal: React.FC<PropertyOnboardingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPropertyCreated,
  initialHotspot
}) => {
  const [name, setName] = useState(initialHotspot ? `${initialHotspot.name} Retail Site` : '');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('600042');
  const [lat, setLat] = useState(initialHotspot ? initialHotspot.lat : 12.9775);
  const [lon, setLon] = useState(initialHotspot ? initialHotspot.lon : 80.2205);
  const [rentMonthly, setRentMonthly] = useState<number | ''>(220000);
  const [depositAmount, setDepositAmount] = useState<number | ''>(1320000);
  const [carpetAreaSqft, setCarpetAreaSqft] = useState<number>(3000);
  const [frontageFt, setFrontageFt] = useState<number>(30);
  const [ceilingHeightFt, setCeilingHeightFt] = useState<number>(11.5);
  const [floorPosition, setFloorPosition] = useState('ground_floor');
  const [roadWidthFt, setRoadWidthFt] = useState<number>(45);
  const [parkingFourWheeler, setParkingFourWheeler] = useState<number>(4);
  const [hasPowerBackup, setHasPowerBackup] = useState(true);
  const [hasLoadingDock, setHasLoadingDock] = useState(true);
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600'
  ]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const created = await api.onboardProperty({
        name,
        address: address || `Corner Plot on 100ft Road, ${pincode}`,
        pincode,
        lat,
        lon,
        rent_monthly: rentMonthly === '' ? null : Number(rentMonthly),
        deposit_amount: depositAmount === '' ? null : Number(depositAmount),
        carpet_area_sqft: carpetAreaSqft,
        frontage_ft: frontageFt,
        ceiling_height_ft: ceilingHeightFt,
        floor_position: floorPosition,
        road_width_ft: roadWidthFt,
        parking_four_wheeler: parkingFourWheeler,
        has_power_backup: hasPowerBackup,
        has_loading_dock: hasLoadingDock,
        photos,
        contact_name: contactName,
        contact_phone: contactPhone,
      });

      onPropertyCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to onboard property.');
    } finally {
      setLoading(false);
    }
  };

  const rentPerSqft = rentMonthly && carpetAreaSqft > 0 ? (Number(rentMonthly) / carpetAreaSqft).toFixed(1) : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-savo-purple flex items-center justify-center text-savo-yellow font-black">
              M2
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Onboard New Property (Field Intake)
              </h3>
              <p className="text-xs text-slate-500">
                BD Executive quick intake with instant multi-factor evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
          
          {/* Property Name & Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-600 mb-1">Property Title / Identifier *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Bypass Road Commercial Ground Floor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-savo-purple focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Chennai Pincode *</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                placeholder="600042"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-savo-purple focus:outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-slate-600 mb-1">Street Address / Landmark *</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 77, 100 Feet Bypass Road, near Vijaya Nagar Junction"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-savo-purple focus:outline-none"
            />
          </div>

          {/* Geolocation */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
            <div>
              <label className="block text-slate-600 mb-1">Latitude (GPS) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={e => setLat(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Longitude (GPS) *</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lon}
                onChange={e => setLon(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Commercials: Rent, Deposit, Rate */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                value={rentMonthly}
                onChange={e => setRentMonthly(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="240000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Security Deposit (₹)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1440000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Calculated Rent/sqft</label>
              <div className="px-3 py-2 bg-slate-100 rounded-xl font-mono font-bold text-savo-purple">
                {rentPerSqft ? `₹${rentPerSqft} / sqft` : 'Enter rent & area'}
              </div>
            </div>
          </div>

          {/* Physical Specifications */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Carpet Area (sq ft) *</label>
              <input
                type="number"
                required
                value={carpetAreaSqft}
                onChange={e => setCarpetAreaSqft(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Frontage (ft) *</label>
              <input
                type="number"
                required
                value={frontageFt}
                onChange={e => setFrontageFt(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Floor Position</label>
              <select
                value={floorPosition}
                onChange={e => setFloorPosition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              >
                <option value="ground_floor">Ground Floor (Optimal)</option>
                <option value="first_floor">First Floor</option>
                <option value="basement_gf">Basement + Ground</option>
              </select>
            </div>
          </div>

          {/* Road Width & Logistics */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Road Width (ft)</label>
              <input
                type="number"
                value={roadWidthFt}
                onChange={e => setRoadWidthFt(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">4-Wheeler Parking Bays</label>
              <input
                type="number"
                value={parkingFourWheeler}
                onChange={e => setParkingFourWheeler(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center space-x-6 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPowerBackup}
                onChange={e => setHasPowerBackup(e.target.checked)}
                className="rounded text-savo-purple focus:ring-savo-purple"
              />
              <span>100% DG Power Backup</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLoadingDock}
                onChange={e => setHasLoadingDock(e.target.checked)}
                className="rounded text-savo-purple focus:ring-savo-purple"
              />
              <span>Dedicated Loading Dock</span>
            </label>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-slate-600 mb-1">Landlord / Broker Name</label>
              <input
                type="text"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                placeholder="e.g. Mr. Sundaram"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="+91 94440 12345"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-savo-purple hover:bg-savo-purple-dark text-white font-extrabold rounded-xl shadow-lg transition flex items-center space-x-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-savo-yellow" />
              <span>{loading ? 'Evaluating Site...' : 'Submit & Run Instant Evaluation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
