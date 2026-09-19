import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FaBuilding, FaSearch, FaUndo, FaFileExport, FaHashtag, 
  FaCode, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, 
  FaUserTie, FaFlag, FaClock, FaCog, FaEdit, FaTrash, FaEye,
  FaChevronDown, FaChevronUp, FaFilter, FaDownload, FaSync,
  FaCheckCircle, FaTimesCircle, FaUserCheck, FaUsers,
  FaUserPlus, FaUserMinus, FaChartBar, FaChartLine,
  FaBriefcase, FaUserGraduate, FaClock as FaClockIcon,
  FaUsers as FaUsersIcon, FaSpinner, FaArrowLeft,
  FaDatabase, FaCalendarAlt, FaInfoCircle, FaExclamationTriangle,
  FaMoon, FaSun, FaWifi
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { useTheme } from '../lib/theme/ThemeProvider';

// Type definitions
interface Headcount {
  id: string;
  company_id: string;
  location_id: string;
  coordinator_id: string;
  shift: string | null;
  requirement: number;
  filled: number;
  vacant: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  company_name: string;
  company_code: string;
  contact_person: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  created_at: string;
  updated_at: string;
  coordinatorassigned: string;
  locationassigned: string;
}

interface CompanyWithHeadcount extends Company {
  headcount?: Headcount;
  allHeadcounts?: Headcount[];
  lastUpdated?: string;
  hasHeadcountData?: boolean;
  recordNumber?: number;
  totalRecords?: number;
}

interface SortConfig {
  key: keyof CompanyWithHeadcount;
  direction: 'asc' | 'desc';
}

interface StatusConfig {
  bg: string;
  text: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const CompanyDashboard: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyWithHeadcount[]>([]);
  const [filteredData, setFilteredData] = useState<CompanyWithHeadcount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [hasDataFilter, setHasDataFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'company_name', direction: 'asc' });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [syncingHeadcount, setSyncingHeadcount] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const { isDark: darkMode, toggleTheme } = useTheme();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Disconnected');
  const [allHeadcountRecords, setAllHeadcountRecords] = useState<Headcount[]>([]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Fetch ALL companies and their headcount from Supabase
  const fetchCompaniesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch ALL companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('company_name', { ascending: true });

      if (companiesError) throw companiesError;

      // Fetch ALL headcount records
      const { data: headcountData, error: headcountError } = await supabase
        .from('headcount')
        .select('*')
        .order('updated_at', { ascending: false });

      if (headcountError) throw headcountError;

      console.log('Total companies in database:', companiesData?.length || 0);
      console.log('Total headcount records:', headcountData?.length || 0);
      console.log('Headcount records:', headcountData);

      // Store all headcount records for reference
      setAllHeadcountRecords(headcountData || []);

      // Group headcount by company_id
      const headcountMap = new Map<string, Headcount[]>();
      headcountData?.forEach((hc: Headcount) => {
        const existing = headcountMap.get(hc.company_id) || [];
        existing.push(hc);
        headcountMap.set(hc.company_id, existing);
      });

      // Map headcount to ALL companies
      const companiesWithHeadcount = (companiesData || []).map((company: Company) => {
        const allHeadcounts = headcountMap.get(company.id) || [];
        const hasData = allHeadcounts.length > 0;
        const primaryHeadcount = hasData 
          ? allHeadcounts.reduce((latest, current) => 
              new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
            )
          : undefined;
        
        return {
          ...company,
          headcount: primaryHeadcount,
          allHeadcounts: allHeadcounts,
          hasHeadcountData: hasData,
          lastUpdated: hasData 
            ? new Date(Math.max(...allHeadcounts.map(h => new Date(h.updated_at).getTime()))).toLocaleString()
            : 'N/A'
        };
      });

      // Create a flat list of all headcount records with company info
      const flatRecords: CompanyWithHeadcount[] = [];
      companiesWithHeadcount.forEach(company => {
        if (company.allHeadcounts && company.allHeadcounts.length > 0) {
          // For companies with headcount, create one entry per record
          company.allHeadcounts.forEach((hc, index) => {
            flatRecords.push({
              ...company,
              headcount: hc,
              allHeadcounts: [hc],
              hasHeadcountData: true,
              recordNumber: index + 1,
              totalRecords: company.allHeadcounts?.length || 0,
              lastUpdated: new Date(hc.updated_at).toLocaleString()
            });
          });
        } else {
          // For companies without headcount, create one entry with no data
          flatRecords.push({
            ...company,
            headcount: undefined,
            allHeadcounts: [],
            hasHeadcountData: false,
            recordNumber: 0,
            totalRecords: 0,
            lastUpdated: 'N/A'
          });
        }
      });

      console.log('Total flat records:', flatRecords.length);
      console.log('Flat records:', flatRecords.map(r => ({
        company: r.company_name,
        hasData: r.hasHeadcountData,
        recordNumber: r.recordNumber,
        totalRecords: r.totalRecords,
        shift: r.headcount?.shift
      })));

      setCompanies(flatRecords);
      setFilteredData(flatRecords);
      setLastSyncTime(new Date().toLocaleString());
      setIsConnected(true);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data from Supabase. Please check your connection.');
      setIsConnected(false);
      
      // Use fallback data if in development
      if (import.meta.env.DEV) {
        console.log('Using fallback sample data');
        const fallbackData = getFallbackData();
        setCompanies(fallbackData);
        setFilteredData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup Supabase Realtime Subscriptions
  const setupRealtimeSubscriptions = () => {
    try {
      const companiesChannel = supabase
        .channel('companies-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'companies'
          },
          (payload) => {
            console.log('Companies change received:', payload);
            fetchCompaniesData();
          }
        )
        .subscribe((status) => {
          setRealtimeStatus(status);
          console.log('Companies subscription status:', status);
        });

      const headcountChannel = supabase
        .channel('headcount-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'headcount'
          },
          (payload) => {
            console.log('Headcount change received:', payload);
            fetchCompaniesData();
          }
        )
        .subscribe((status) => {
          console.log('Headcount subscription status:', status);
        });

      realtimeChannelRef.current = companiesChannel;

      return () => {
        supabase.removeChannel(companiesChannel);
        supabase.removeChannel(headcountChannel);
      };
    } catch (err) {
      console.error('Error setting up realtime subscriptions:', err);
    }
  };

  // Initial data fetch and realtime setup
  useEffect(() => {
    fetchCompaniesData();
    
    const cleanup = setupRealtimeSubscriptions();

    const interval = setInterval(() => {
      fetchCompaniesData();
    }, 300000);
    
    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, []);

  // Manual sync/refresh
  const syncHeadcountData = async () => {
    try {
      setSyncingHeadcount(true);
      await fetchCompaniesData();
      setLastSyncTime(new Date().toLocaleString());
    } catch (err) {
      console.error('Error syncing headcount:', err);
      setError('Failed to sync headcount data');
    } finally {
      setSyncingHeadcount(false);
    }
  };

  // Unique shifts and cities for filters
  const uniqueShifts = useMemo(() => {
    const shifts = new Set<string>();
    companies.forEach(company => {
      if (company.headcount?.shift) {
        const shift = company.headcount.shift.trim() || 'No Shift';
        shifts.add(shift);
      }
    });
    return Array.from(shifts);
  }, [companies]);

  const uniqueCities = useMemo(() => {
    const cities = companies.map(company => company.city);
    return [...new Set(cities)];
  }, [companies]);

  // Filter and search logic
  useEffect(() => {
    let result = companies;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(company =>
        company.company_name.toLowerCase().includes(term) ||
        company.company_code.toLowerCase().includes(term) ||
        company.contact_person.toLowerCase().includes(term) ||
        company.email.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(company => company.status === statusFilter);
    }

    if (cityFilter !== 'all') {
      result = result.filter(company => company.city === cityFilter);
    }

    if (shiftFilter !== 'all') {
      result = result.filter(company => {
        const shift = company.headcount?.shift?.trim() || 'No Shift';
        return shift === shiftFilter;
      });
    }

    if (hasDataFilter !== 'all') {
      const hasData = hasDataFilter === 'hasData';
      result = result.filter(company => company.hasHeadcountData === hasData);
    }

    result.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof CompanyWithHeadcount] || '';
      const bVal = b[sortConfig.key as keyof CompanyWithHeadcount] || '';
      if (sortConfig.direction === 'asc') {
        return aVal.toString().localeCompare(bVal.toString());
      }
      return bVal.toString().localeCompare(aVal.toString());
    });

    setFilteredData(result);
    setVisibleCount(20);
  }, [searchTerm, statusFilter, cityFilter, shiftFilter, hasDataFilter, companies, sortConfig]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore && visibleCount < filteredData.length) {
          setLoadingMore(true);
          setTimeout(() => {
            setVisibleCount(prev => Math.min(prev + 20, filteredData.length));
            setLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [visibleCount, filteredData.length, loadingMore]);

  const currentItems = filteredData.slice(0, visibleCount);

  // Statistics
  const totalCompanies = companies.filter((c, index, self) => 
    self.findIndex(t => t.id === c.id) === index
  ).length;
  const totalRecords = companies.length;
  const companiesWithHeadcount = companies.filter(c => c.hasHeadcountData).length;
  const companiesWithoutHeadcount = companies.filter(c => !c.hasHeadcountData).length;
  const totalHeadcountRecords = companies.filter(c => c.hasHeadcountData).length;
  const totalRequirement = companies.reduce((sum, c) => sum + (c.headcount?.requirement || 0), 0);
  const totalFilled = companies.reduce((sum, c) => sum + (c.headcount?.filled || 0), 0);
  const totalVacant = companies.reduce((sum, c) => sum + (c.headcount?.vacant || 0), 0);
  const fillRate = totalRequirement > 0 ? Math.round((totalFilled / totalRequirement) * 100) : 0;

  const getStatusBadge = (status: Company['status']): StatusConfig => {
    const config: Record<Company['status'], StatusConfig> = {
      'ACTIVE': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', Icon: FaCheckCircle },
      'INACTIVE': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-400', Icon: FaTimesCircle },
      'PENDING': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', Icon: FaClock }
    };
    return config[status] || config.ACTIVE;
  };

  const getShiftBadge = (shift: string | null): string => {
    const shiftStr = shift?.trim() || 'No Shift';
    const config: Record<string, string> = {
      'Morning': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      'Evening': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      'Night': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
      'Afternoon': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      'No Shift': 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
    };
    return config[shiftStr] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const handleExportExcel = (): void => {
    const excelData: any[] = [];

    filteredData.forEach(company => {
      excelData.push({
        'Company Name': company.company_name,
        'Company Code': company.company_code,
        'Contact Person': company.contact_person,
        'Email': company.email,
        'Mobile': company.mobile,
        'City': company.city,
        'State': company.state,
        'Status': company.status,
        'Has Headcount Data': company.hasHeadcountData ? 'Yes' : 'No',
        'Record #': company.recordNumber || 'N/A',
        'Total Records for Company': company.totalRecords || 0,
        'Shift': company.headcount?.shift || 'N/A',
        'Requirement': company.headcount?.requirement ?? 'N/A',
        'Filled': company.headcount?.filled ?? 'N/A',
        'Vacant': company.headcount?.vacant ?? 'N/A',
        'Fill Rate %': company.headcount?.requirement ? Math.round((company.headcount.filled / company.headcount.requirement) * 100) : 'N/A',
        'Remarks': company.headcount?.remarks || 'N/A',
        'Last Updated': company.headcount?.updated_at ? formatDate(company.headcount.updated_at) : 'N/A',
        'Created At': formatDate(company.created_at)
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Companies');
    
    const fileName = `companies_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const resetFilters = (): void => {
    setSearchTerm('');
    setStatusFilter('all');
    setCityFilter('all');
    setShiftFilter('all');
    setHasDataFilter('all');
    setSortConfig({ key: 'company_name', direction: 'asc' });
  };

  const handleSort = (key: keyof CompanyWithHeadcount): void => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleExpand = (companyId: string): void => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  const handleBack = (): void => {
    window.history.back();
  };

  // Fallback data with 6 headcount records
  const getFallbackData = (): CompanyWithHeadcount[] => {
    // Get all companies
    const companies: Company[] = [
      {
        id: '05a2b238-d5a4-4c85-8218-38e31eb76b74',
        company_name: 'Varroc VEL3',
        company_code: 'VAR001',
        contact_person: 'Chetan Ahir',
        email: 'info.varroc3@dmcfs.in',
        mobile: '7767004275',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: 'b97bbd28-502b-4c5e-832f-876c90ea9f53',
        locationassigned: '8d502c45-a214-4adb-bd9e-a68ca306b53f'
      },
      {
        id: '18e20d31-81d2-41b8-b7d7-6616bc7a926e',
        company_name: 'PSML',
        company_code: 'PSM001',
        contact_person: 'Sagar Sawant',
        email: 'info.psml@dmcfs.in',
        mobile: '7767002412',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '1b7ad08a-4e99-4f35-883d-de52d6451ff4',
        locationassigned: '5c26a98c-c5b3-48ba-8a3d-939333dfd091'
      },
      {
        id: '222de5fc-2ebe-408d-a628-3950b617f2db',
        company_name: 'Sindok',
        company_code: 'SIN001',
        contact_person: 'Shubham Landge',
        email: 'info.sindok@dmcfs.in',
        mobile: '7767002406',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '49b9930d-4c65-4aa7-9641-c070754d57ab',
        locationassigned: 'ec3dc87d-575f-44b1-836a-93d7c5ccdfc4'
      },
      {
        id: '2a64c020-97fa-49cd-91be-87fc039eabfb',
        company_name: 'SSPL (Chakan)',
        company_code: 'SSP001',
        contact_person: 'Prathmesh Deshmukh',
        email: 'info.sspl@dmcfs.in',
        mobile: '9322618736',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '18dc987a-5381-4bf6-b9b1-b0d3f0718572',
        locationassigned: 'e3cef35a-55a6-401b-bda0-3d943cd27c75'
      },
      {
        id: '503d8ef6-72d0-42df-8609-822f4835921b',
        company_name: 'Trend Technology',
        company_code: 'TRE001',
        contact_person: 'Yuvraj Parkhe',
        email: 'info.trend@dmcfs.in',
        mobile: '7767002417',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '89b66d81-38fb-4770-a60e-e47abc23c73c',
        locationassigned: '6c8a6aaf-041f-44dc-8dd5-593584a8d41a'
      },
      {
        id: '620c17df-30ae-4c84-b4bb-102efcb72006',
        company_name: 'Aditya Auto (Edscha Eng)',
        company_code: 'ADA001',
        contact_person: 'Sameer Kamble',
        email: 'info.adityaauto@dmcfs.in',
        mobile: '7769003368',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: 'e31772af-c2e0-4970-9a1e-1e1ead524ec7',
        locationassigned: 'a14a0b8e-c218-4d8a-b0a3-83a0ff874370'
      },
      {
        id: '8c554f74-1049-49bf-a6b0-32e838feec9b',
        company_name: 'Uno Minda Sensor',
        company_code: 'UMS002',
        contact_person: 'Varsha Aadak',
        email: 'info.mindasensor@dmcfs.in',
        mobile: '7767002403',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '3867ce1c-c4a3-4df3-8a97-5f3b56867f24',
        locationassigned: '8499bb49-1894-401d-b489-904b176bb64d'
      },
      {
        id: '925fc488-2eb7-4d87-8d00-b70d66e78d9b',
        company_name: 'Tata Toyo',
        company_code: 'TTY001',
        contact_person: 'Shubham Landge',
        email: 'info.tatatoyo@dmcfs.in',
        mobile: '7767002406',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: 'facdf46c-822a-4526-a350-a01a680b6e29',
        locationassigned: '0cf62b55-3e5f-4083-a092-5779ecf1c81a'
      },
      {
        id: '9efc103e-5d6a-4acc-9994-98c206ba5cdb',
        company_name: 'Uno Minda Switch',
        company_code: 'UMS001',
        contact_person: 'Pranita Shinde',
        email: 'info.mindaswitch@dmcfs.in',
        mobile: '8669607322',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '30ae6cc8-d69d-4242-be44-4e2e021148ee',
        locationassigned: '5a515fab-ce0c-4092-af73-5b65411e0e0e'
      },
      {
        id: 'ba82023a-9d33-49b2-a743-f1210f409332',
        company_name: 'Gestamp',
        company_code: 'GST001',
        contact_person: 'Dhiraj Shinde',
        email: 'info.gestamp@dmcfs.in',
        mobile: '7767002401',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '978f45b4-885d-4e2f-8950-38e7dcc940a0',
        locationassigned: '19ae4f3b-e506-4a70-8cf0-23e10cc727f5'
      },
      {
        id: 'd7661914-de02-4108-bb0a-1fdf0b2e40d4',
        company_name: 'Chakan Field Officer',
        company_code: 'CFO001',
        contact_person: 'Ganesh Abhang',
        email: 'info.cfo@dmcfs.in',
        mobile: '8669607332',
        address: 'NA',
        city: 'Pune',
        state: 'Maharashtra',
        status: 'ACTIVE',
        created_at: '2026-07-31 07:36:26.514726+00',
        updated_at: '2026-07-31 10:23:24.998984+00',
        coordinatorassigned: '',
        locationassigned: '50ca144c-ffe1-4e46-9e41-6b6dc22fb022'
      }
    ];

    // Headcount records (6 records)
    const headcountRecords: Headcount[] = [
      {
        id: '2561a968-14e0-491f-afb1-f1e2d404a939',
        company_id: '8c554f74-1049-49bf-a6b0-32e838feec9b',
        location_id: '8499bb49-1894-401d-b489-904b176bb64d',
        coordinator_id: '3867ce1c-c4a3-4df3-8a97-5f3b56867f24',
        shift: null,
        requirement: 23,
        filled: 0,
        vacant: -23,
        remarks: '',
        created_at: '2026-07-31 19:53:38.995+00',
        updated_at: '2026-07-31 19:53:44.690635+00'
      },
      {
        id: '55850d20-3eb5-4ef7-b7d3-c1799681a717',
        company_id: '222de5fc-2ebe-408d-a628-3950b617f2db',
        location_id: 'ec3dc87d-575f-44b1-836a-93d7c5ccdfc4',
        coordinator_id: '49b9930d-4c65-4aa7-9641-c070754d57ab',
        shift: 'Morning',
        requirement: 81,
        filled: 55,
        vacant: -26,
        remarks: 'Testing system',
        created_at: '2026-07-31 10:28:10.84+00',
        updated_at: '2026-07-31 10:28:11.017195+00'
      },
      {
        id: '5d336236-35ef-499a-aa29-688affcfe144',
        company_id: '503d8ef6-72d0-42df-8609-822f4835921b',
        location_id: '6c8a6aaf-041f-44dc-8dd5-593584a8d41a',
        coordinator_id: '89b66d81-38fb-4770-a60e-e47abc23c73c',
        shift: null,
        requirement: 22,
        filled: 3,
        vacant: -19,
        remarks: '',
        created_at: '2026-07-31 19:55:24.046+00',
        updated_at: '2026-07-31 19:55:30.030802+00'
      },
      {
        id: '68474532-5a47-414e-9f85-c13a9bdf182e',
        company_id: '05a2b238-d5a4-4c85-8218-38e31eb76b74',
        location_id: '8d502c45-a214-4adb-bd9e-a68ca306b53f',
        coordinator_id: 'b97bbd28-502b-4c5e-832f-876c90ea9f53',
        shift: 'Night',
        requirement: 22,
        filled: 18,
        vacant: -4,
        remarks: 'opps',
        created_at: '2026-07-31 11:35:30.632+00',
        updated_at: '2026-07-31 11:35:30.686687+00'
      },
      {
        id: '9a4296ee-e4ce-4b30-acdf-378f79a9049a',
        company_id: 'd7661914-de02-4108-bb0a-1fdf0b2e40d4',
        location_id: '50ca144c-ffe1-4e46-9e41-6b6dc22fb022',
        coordinator_id: 'c4892df5-4944-46b5-9663-bd248c3114fd',
        shift: 'Afternoon',
        requirement: 22,
        filled: 19,
        vacant: -3,
        remarks: 'nobaody can ss',
        created_at: '2026-07-31 12:26:57.455+00',
        updated_at: '2026-07-31 12:26:57.628756+00'
      },
      {
        id: 'b092a3c6-29bc-4676-96b2-da187ed93c7d',
        company_id: 'd7661914-de02-4108-bb0a-1fdf0b2e40d4',
        location_id: '50ca144c-ffe1-4e46-9e41-6b6dc22fb022',
        coordinator_id: 'c4892df5-4944-46b5-9663-bd248c3114fd',
        shift: 'Morning',
        requirement: 22,
        filled: 11,
        vacant: -11,
        remarks: '',
        created_at: '2026-07-31 12:21:37.339+00',
        updated_at: '2026-07-31 12:21:37.355037+00'
      }
    ];

    // Group headcount by company_id
    const headcountMap = new Map<string, Headcount[]>();
    headcountRecords.forEach(hc => {
      const existing = headcountMap.get(hc.company_id) || [];
      existing.push(hc);
      headcountMap.set(hc.company_id, existing);
    });

    // Create flat list with all records
    const flatRecords: CompanyWithHeadcount[] = [];
    
    companies.forEach(company => {
      const companyHeadcounts = headcountMap.get(company.id) || [];
      
      if (companyHeadcounts.length > 0) {
        // Company has headcount - show each record separately
        companyHeadcounts.forEach((hc, index) => {
          flatRecords.push({
            ...company,
            headcount: hc,
            allHeadcounts: [hc],
            hasHeadcountData: true,
            recordNumber: index + 1,
            totalRecords: companyHeadcounts.length,
            lastUpdated: new Date(hc.updated_at).toLocaleString()
          });
        });
      } else {
        // Company has no headcount
        flatRecords.push({
          ...company,
          headcount: undefined,
          allHeadcounts: [],
          hasHeadcountData: false,
          recordNumber: 0,
          totalRecords: 0,
          lastUpdated: 'N/A'
        });
      }
    });

    return flatRecords;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30'}`}>
        <div className="text-center">
          <FaSpinner className={`animate-spin text-5xl ${darkMode ? 'text-indigo-400' : 'text-indigo-500'} mx-auto mb-4`} />
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Loading company data from Supabase...</p>
        </div>
      </div>
    );
  }

  if (error && companies.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30'} p-6`}>
        <div className={`${darkMode ? 'bg-slate-800' : 'bg-white'} rounded-2xl p-8 shadow-lg text-center max-w-md`}>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'} mb-2`}>Connection Error</h2>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{error}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={fetchCompaniesData}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30'}`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className={`p-3 ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'} rounded-2xl shadow-sm border transition-colors group`}
                title="Go Back"
              >
                <FaArrowLeft className={`${darkMode ? 'text-slate-400 group-hover:text-indigo-400' : 'text-slate-600 group-hover:text-indigo-600'} transition-colors`} size={18} />
              </button>
              <div>
                <h1 className={`text-4xl font-bold ${darkMode ? 'text-slate-200' : 'bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent'} flex items-center gap-3`}>
                  <FaBuilding className="text-indigo-500" />
                  Company Headcount Dashboard
                </h1>
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1 text-sm flex items-center gap-2 flex-wrap`}>
                  <FaDatabase className="text-indigo-400" size={12} />
                  Real-time data from Supabase
                  <span className={`ml-2 text-xs ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'} px-2 py-0.5 rounded-full`}>
                    {companiesWithHeadcount} with data, {companiesWithoutHeadcount} without
                  </span>
                  <span className={`ml-2 text-xs ${darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-700'} px-2 py-0.5 rounded-full`}>
                    {totalHeadcountRecords} total records
                  </span>
                  {lastSyncTime && (
                    <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-1`}>
                      <FaClockIcon size={10} />
                      Last synced: {lastSyncTime}
                    </span>
                  )}
                  <span className={`text-xs flex items-center gap-1 ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isConnected ? <FaWifi size={10} /> : <FaExclamationTriangle size={10} />}
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Theme Toggle and Stats */}
            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={toggleTheme}
                className={`p-3 ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'} rounded-2xl shadow-sm border transition-colors`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <FaSun className="text-yellow-400 text-xl" /> : <FaMoon className="text-slate-600 text-xl" />}
              </button>
              
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-2xl px-6 py-3 shadow-sm border flex items-center gap-3`}>
                <div className={`p-2 ${darkMode ? 'bg-slate-700' : 'bg-indigo-50'} rounded-xl`}>
                  <FaBuilding className="text-indigo-500" />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{totalCompanies}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Companies</div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-2xl px-6 py-3 shadow-sm border flex items-center gap-3`}>
                <div className={`p-2 ${darkMode ? 'bg-slate-700' : 'bg-emerald-50'} rounded-xl`}>
                  <FaUsers className="text-emerald-500" />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{totalHeadcountRecords}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Records</div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-2xl px-6 py-3 shadow-sm border flex items-center gap-3`}>
                <div className={`p-2 ${darkMode ? 'bg-slate-700' : 'bg-amber-50'} rounded-xl`}>
                  <FaExclamationTriangle className="text-amber-500" />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{companiesWithoutHeadcount}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Without Data</div>
                </div>
              </div>
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-2xl px-6 py-3 shadow-sm border flex items-center gap-3`}>
                <div className={`p-2 ${darkMode ? 'bg-slate-700' : 'bg-amber-50'} rounded-xl`}>
                  <FaChartLine className="text-amber-500" />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{fillRate || 'N/A'}%</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Fill Rate</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-2xl shadow-sm border p-4 mb-6`}
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search companies, contacts, emails..."
                className={`w-full pl-11 pr-4 py-2.5 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'} border rounded-xl transition-colors flex items-center gap-2`}
              >
                <FaFilter className="text-sm" />
                Filters
                <FaChevronDown className={`text-xs transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={syncHeadcountData}
                disabled={syncingHeadcount}
                className={`px-4 py-2.5 ${darkMode ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'} border rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50`}
              >
                {syncingHeadcount ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaSync className="text-sm" />
                )}
                Sync
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                <FaDownload />
                Export Excel
              </button>
              <button
                onClick={resetFilters}
                className={`px-4 py-2.5 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'} border rounded-xl transition-colors flex items-center gap-2`}
              >
                <FaUndo className="text-sm" />
                Reset
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className={`pt-4 mt-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'} border-t flex flex-wrap gap-4`}>
                  <div>
                    <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'} block mb-1.5`}>Status</label>
                    <select
                      className={`px-4 py-2 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'} block mb-1.5`}>City</label>
                    <select
                      className={`px-4 py-2 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                    >
                      <option value="all">All Cities</option>
                      {uniqueCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'} block mb-1.5`}>Shift</label>
                    <select
                      className={`px-4 py-2 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
                      value={shiftFilter}
                      onChange={(e) => setShiftFilter(e.target.value)}
                    >
                      <option value="all">All Shifts</option>
                      {uniqueShifts.map(shift => (
                        <option key={shift} value={shift}>{shift}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'} block mb-1.5`}>Data Status</label>
                    <select
                      className={`px-4 py-2 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`}
                      value={hasDataFilter}
                      onChange={(e) => setHasDataFilter(e.target.value)}
                    >
                      <option value="all">All Records</option>
                      <option value="hasData">Has Headcount Data</option>
                      <option value="noData">No Headcount Data</option>
                    </select>
                  </div>
                  <div className="flex-1" />
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center`}>
                    Showing {currentItems.length} of {filteredData.length} records
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Table */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200/60'} rounded-2xl shadow-sm border overflow-hidden`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/80 border-slate-200'} border-b`}>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider w-12`}>
                    #
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider min-w-[180px]`}>
                    <button onClick={() => handleSort('company_name')} className={`flex items-center gap-1 ${darkMode ? 'hover:text-slate-300' : 'hover:text-slate-700'}`}>
                      Company
                      {sortConfig.key === 'company_name' && (
                        sortConfig.direction === 'asc' ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider min-w-[100px]`}>
                    Code
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider hidden md:table-cell`}>
                    Contact
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
                    Record Info
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider min-w-[180px]`}>
                    <div className="flex items-center gap-1">
                      <FaUsersIcon />
                      Headcount
                    </div>
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider hidden xl:table-cell`}>
                    Last Updated
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-center text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider w-24`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-slate-100'}`}>
                {currentItems.map((company, index) => {
                  const statusConfig = getStatusBadge(company.status);
                  const StatusIcon = statusConfig.Icon;
                  const hasHeadcount = company.hasHeadcountData || false;
                  const primaryHeadcount = company.headcount;
                  const fillPercentage = primaryHeadcount && primaryHeadcount.requirement 
                    ? Math.round((primaryHeadcount.filled / primaryHeadcount.requirement) * 100) 
                    : 0;
                  
                  return (
                    <motion.tr
                      key={`${company.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.3) }}
                      className={`${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50/50'} transition-colors group`}
                    >
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{company.company_name}</div>
                        {hasHeadcount && company.totalRecords && company.totalRecords > 1 && (
                          <span className={`inline-flex items-center gap-1 text-xs ${darkMode ? 'text-purple-400 bg-purple-900/30' : 'text-purple-600 bg-purple-50'} px-2 py-0.5 rounded-full mt-1`}>
                            <FaInfoCircle size={10} />
                            Record {company.recordNumber} of {company.totalRecords}
                          </span>
                        )}
                        {hasHeadcount && company.totalRecords === 1 && (
                          <span className={`inline-flex items-center gap-1 text-xs ${darkMode ? 'text-indigo-400 bg-indigo-900/30' : 'text-indigo-600 bg-indigo-50'} px-2 py-0.5 rounded-full mt-1`}>
                            <FaInfoCircle size={10} />
                            Single record
                          </span>
                        )}
                        {!hasHeadcount && (
                          <span className={`inline-flex items-center gap-1 text-xs ${darkMode ? 'text-amber-400 bg-amber-900/30' : 'text-amber-600 bg-amber-50'} px-2 py-0.5 rounded-full mt-1`}>
                            <FaInfoCircle size={10} />
                            No headcount data
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'} rounded-lg text-xs font-mono`}>
                          {company.company_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{company.contact_person}</div>
                        <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{company.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {hasHeadcount && company.headcount?.shift && (
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${getShiftBadge(company.headcount.shift)}`}>
                              {company.headcount.shift}
                            </span>
                          )}
                          {!hasHeadcount && (
                            <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No shift data</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {primaryHeadcount ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{primaryHeadcount.filled}</span>
                              <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/</span>
                              <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{primaryHeadcount.requirement}</span>
                            </div>
                            <div className={`w-16 h-1.5 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-full overflow-hidden`}>
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  fillPercentage >= 80 ? 'bg-emerald-500' :
                                  fillPercentage >= 50 ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{fillPercentage}%</span>
                          </div>
                        ) : (
                          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {hasHeadcount && company.headcount ? (
                          <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            <FaCalendarAlt size={12} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                            {formatDate(company.headcount.updated_at)}
                          </div>
                        ) : (
                          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-full text-xs font-medium`}>
                          <StatusIcon size={12} />
                          {company.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700 text-slate-500 hover:text-amber-400' : 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'} transition-colors`}
                            title="Edit"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaEdit size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          <div ref={loadMoreRef} className={`py-6 text-center ${darkMode ? 'border-slate-700' : 'border-slate-100'} border-t`}>
            {loadingMore ? (
              <div className={`flex items-center justify-center gap-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <FaSpinner className="animate-spin" />
                <span className="text-sm">Loading more records...</span>
              </div>
            ) : visibleCount < filteredData.length ? (
              <button
                onClick={() => setVisibleCount(prev => Math.min(prev + 20, filteredData.length))}
                className={`text-sm ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'} font-medium hover:underline`}
              >
                Load more records
              </button>
            ) : filteredData.length > 0 ? (
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                ✓ All {filteredData.length} records loaded
              </div>
            ) : (
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                No records found
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompanyDashboard;