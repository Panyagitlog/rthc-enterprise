// src/pages/CoordinatorForm.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Loader2, Building2, MapPin, Users, UserCheck, UserX,
  MessageSquare, ArrowLeft, CheckCircle, Clock, RefreshCw, Lock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  fetchCompanies,
  fetchLocationsByCompany,
  createHeadcountUpdate,
} from '../services/headcountService';
import { supabase } from '../services/supabase';

export default function CoordinatorForm() {
  const navigate = useNavigate();

  // ---------- State ----------
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(null);

  const [companyId, setCompanyId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [requirement, setRequirement] = useState('');
  const [filled, setFilled] = useState('');
  const [remarks, setRemarks] = useState('');

  const [companySearch, setCompanySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // ---------- Live clock ----------
  const [now, setNow] = useState(new Date());
  const clockInterval = useRef(null);

  useEffect(() => {
    clockInterval.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval.current);
  }, []);

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // ---------- Computed ----------
  // VACANT = FILLED - REQUIREMENT
  const vacant = useMemo(() => {
    const req = parseFloat(requirement) || 0;
    const fill = parseFloat(filled) || 0;
    return fill - req;
  }, [requirement, filled]);

  const vacantStatus = useMemo(() => {
    if (vacant > 0) return { label: 'Overstaffed', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: UserCheck };
    if (vacant < 0) return { label: 'Understaffed', color: 'text-red-700 bg-red-50 border-red-200', icon: UserX };
    return { label: 'Balanced', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: CheckCircle };
  }, [vacant]);

  const filteredCompanies = companies.filter((c) =>
    c.company_name.toLowerCase().includes(companySearch.toLowerCase())
  );
  const filteredLocations = locations.filter((l) =>
    l.location_name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // ---------- Validation flags ----------
  const isLocationReady = companyId && locationId;
  const isHeadCountReady = isLocationReady && requirement !== '' && filled !== '';
  const isFormValid = isHeadCountReady && parseFloat(requirement) >= 0 && parseFloat(filled) >= 0 && parseFloat(filled) <= 99999;

  // ---------- Effects ----------
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const data = await fetchCompanies();
        setCompanies(data);
      } catch (err) {
        toast.error('Failed to load companies: ' + err.message);
      } finally {
        setLoadingCompanies(false);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!companyId) {
      setLocations([]);
      setLocationId('');
      return;
    }
    const loadLocations = async () => {
      try {
        setLoadingLocations(true);
        const data = await fetchLocationsByCompany(companyId);
        setLocations(data);
      } catch (err) {
        toast.error('Failed to load locations: ' + err.message);
      } finally {
        setLoadingLocations(false);
      }
    };
    loadLocations();
  }, [companyId]);

  useEffect(() => {
    if (!isLocationOpen) setLocationSearch('');
  }, [isLocationOpen]);
  useEffect(() => {
    if (!isCompanyOpen) setCompanySearch('');
  }, [isCompanyOpen]);

  // ---------- Helpers ----------
  const getCoordinatorProfileId = async (authUserId) => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();
    if (error || !data) {
      toast.error('User profile not found. Please contact support.');
      navigate('/login');
      return null;
    }
    return data.id;
  };

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error('You must be logged in.');
      navigate('/login');
      return;
    }

    const coordinatorId = await getCoordinatorProfileId(user.id);
    if (!coordinatorId) return;

    if (!companyId || !locationId) {
      toast.error('Please select company and location first.');
      return;
    }
    const reqNum = parseFloat(requirement);
    const fillNum = parseFloat(filled);
    if (isNaN(reqNum) || reqNum < 0) {
      toast.error('Requirement must be a number >= 0.');
      return;
    }
    if (isNaN(fillNum) || fillNum < 0) {
      toast.error('Filled must be a number >= 0.');
      return;
    }
    if (fillNum > 99999) {
      toast.error('Filled cannot exceed 99,999.');
      return;
    }

    const payload = {
      company_id: companyId,
      location_id: locationId,
      requirement: reqNum,
      filled: fillNum,
      vacant: vacant,
      remarks: remarks.trim() || null,
      coordinator_id: coordinatorId,
      created_at: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      await createHeadcountUpdate(payload);
      toast.success('Head count submitted successfully!');
      setLastSubmitTime(new Date());
      // Reset form
      setCompanyId('');
      setLocationId('');
      setRequirement('');
      setFilled('');
      setRemarks('');
      setLocations([]);
    } catch (err) {
      toast.error('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Render dropdown ----------
  const renderDropdown = ({
    options,
    displayKey,
    valueKey,
    selectedValue,
    onSelect,
    searchValue,
    onSearchChange,
    isOpen,
    setIsOpen,
    placeholder,
    loading,
    disabled,
    icon: Icon,
    label,
    required = false,
  }) => {
    const selectedOption = options.find((o) => o[valueKey] === selectedValue);

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div
          className={`flex items-center border rounded-lg px-4 py-2.5 bg-white cursor-pointer transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'hover:border-blue-400'
          } ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {Icon && <Icon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />}
          <span className="flex-1 truncate text-gray-700">
            {selectedOption ? selectedOption[displayKey] : placeholder}
          </span>
          <span className="text-gray-400 text-sm ml-2">
            {isOpen ? '▲' : '▼'}
          </span>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto animate-fadeIn">
            <div className="sticky top-0 bg-white p-2 border-b">
              <input
                type="text"
                className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : options.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No options</div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt[valueKey]}
                  className={`px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors ${
                    opt[valueKey] === selectedValue ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onSelect(opt[valueKey]);
                    setIsOpen(false);
                  }}
                >
                  {opt[displayKey]}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  // ---------- JSX ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70">
      <Toaster position="top-right" toastOptions={{ className: 'font-sans' }} />

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">RTHC</span>
                Coordinator Dashboard
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">Submit head count updates for your locations</p>
            </div>
          </div>a
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">{formattedDate}</span>
              <span className="font-mono font-medium">{formattedTime}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/70 overflow-hidden transition-all hover:shadow-xl">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border-b border-gray-200/70 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                New Head Count Entry
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Fill in the details below to update your head count data.</p>
            </div>
            {lastSubmitTime && (
              <div className="text-xs text-gray-400 flex items-center gap-1 bg-white/70 px-3 py-1 rounded-full border border-gray-200">
                <RefreshCw className="w-3 h-3" />
                Last updated {lastSubmitTime.toLocaleTimeString()}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Company & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {renderDropdown({
                  options: filteredCompanies,
                  displayKey: 'company_name',
                  valueKey: 'id',
                  selectedValue: companyId,
                  onSelect: (val) => {
                    setCompanyId(val);
                    setLocationId('');
                  },
                  searchValue: companySearch,
                  onSearchChange: setCompanySearch,
                  isOpen: isCompanyOpen,
                  setIsOpen: setIsCompanyOpen,
                  placeholder: 'Select a company',
                  loading: loadingCompanies,
                  disabled: loadingCompanies || submitting,
                  icon: Building2,
                  label: 'Company',
                  required: true,
                })}
              </div>
              <div>
                {renderDropdown({
                  options: filteredLocations,
                  displayKey: 'location_name',
                  valueKey: 'id',
                  selectedValue: locationId,
                  onSelect: setLocationId,
                  searchValue: locationSearch,
                  onSearchChange: setLocationSearch,
                  isOpen: isLocationOpen,
                  setIsOpen: setIsLocationOpen,
                  placeholder: !companyId ? 'Select a company first' : 'Select a location',
                  loading: loadingLocations,
                  disabled: !companyId || loadingLocations || submitting,
                  icon: MapPin,
                  label: 'Location',
                  required: true,
                })}
              </div>
            </div>

            {/* Head Count Fields with validation */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4" />
                <span>Head Count Details</span>
                {!isLocationReady && (
                  <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Select company & location first
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Requirement <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={requirement}
                      onChange={(e) => setRequirement(e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2.5 transition-shadow ${
                        isLocationReady
                          ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                      required
                      disabled={!isLocationReady || submitting}
                      placeholder={isLocationReady ? '0' : 'Locked'}
                    />
                    {!isLocationReady && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Filled <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99999"
                      step="1"
                      value={filled}
                      onChange={(e) => setFilled(e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2.5 transition-shadow ${
                        isLocationReady
                          ? 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                      required
                      disabled={!isLocationReady || submitting}
                      placeholder={isLocationReady ? '0' : 'Locked'}
                    />
                    {!isLocationReady && (
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Max 99,999</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vacant
                  </label>
                  <div
                    className={`w-full rounded-lg px-4 py-2.5 font-semibold border ${
                      isLocationReady ? vacantStatus.color : 'bg-gray-50 border-gray-200 text-gray-400'
                    } flex items-center gap-2`}
                  >
                    {isLocationReady ? (
                      <>
                        <span>{vacant >= 0 ? '+' : ''}{vacant}</span>
                        <span className="text-xs font-normal ml-auto">{vacantStatus.label}</span>
                        {vacant > 0 && <UserCheck className="w-4 h-4 ml-1" />}
                        {vacant === 0 && <CheckCircle className="w-4 h-4 ml-1" />}
                        {vacant < 0 && <UserX className="w-4 h-4 ml-1" />}
                      </>
                    ) : (
                      <span className="text-gray-400">Awaiting selection</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Remarks
              </label>
              <textarea
                rows="3"
                maxLength="300"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes (max 300 characters)"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-shadow resize-y"
                disabled={submitting}
              />
              <div className="flex justify-end text-xs text-gray-400 mt-1">
                {remarks.length}/300
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Head Count
                  </>
                )}
              </button>
              {!isLocationReady && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  Please select a company and location to enable head count fields.
                </p>
              )}
              {isLocationReady && !isFormValid && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  Please fill in valid Requirement and Filled numbers.
                </p>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200/70 pt-4 flex flex-wrap justify-center gap-4">
          <span>Real Time Head Count System v1.0</span>
          <span>•</span>
          <span>Enterprise Workforce Management</span>
          <span>•</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}