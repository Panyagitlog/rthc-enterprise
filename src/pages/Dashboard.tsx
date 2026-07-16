import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Building2, MapPin, Users, UserCheck, UserX, Clock, Calendar,
  Plus, RefreshCw, Search, Filter, Download, FileText, Printer,
  ChevronDown, ChevronUp, MoreVertical
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// ---------- Helper: status colors ----------
const getStatus = (requirement, filled) => {
  if (filled >= requirement) return { label: 'Fully Filled', color: 'text-green-700 bg-green-100' };
  if (filled === requirement) return { label: 'Balanced', color: 'text-yellow-700 bg-yellow-100' };
  return { label: 'Understaffed', color: 'text-red-700 bg-red-100' };
};

// ---------- Main Dashboard Component ----------
export default function Dashboard() {
  const navigate = useNavigate();

  // ----- State -----
  const [loading, setLoading] = useState(true);
  const [headcounts, setHeadcounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    companyId: '',
    locationId: '',
    shift: '',
    coordinatorId: '',
    dateRange: 'today', // 'today', 'week', 'month'
    search: '',
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // ----- Fetch Data -----
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Companies
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name');
      setCompanies(companiesData || []);

      // 2. Locations (all, for filter dropdown)
      const { data: locationsData } = await supabase
        .from('locations')
        .select('id, location_name, company_id')
        .order('location_name');
      setLocations(locationsData || []);

      // 3. Coordinators (users with role = 'COORDINATOR')
      const { data: coordinatorsData } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'COORDINATOR')
        .order('name');
      setCoordinators(coordinatorsData || []);

      // 4. Headcount updates with joins
      let query = supabase
        .from('headcount_updates')
        .select(`
          id,
          requirement,
          filled,
          vacant,
          remarks,
          created_at,
          company:companies (id, company_name),
          location:locations (id, location_name),
          coordinator:users (id, name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId);
      }
      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters.coordinatorId) {
        query = query.eq('coordinator_id', filters.coordinatorId);
      }
      if (filters.shift) {
        // Assuming a 'shift' column exists in headcount_updates; if not, adjust/remove
        query = query.eq('shift', filters.shift);
      }
      if (filters.dateRange === 'today') {
        const today = new Date();
        query = query
          .gte('created_at', startOfDay(today).toISOString())
          .lte('created_at', endOfDay(today).toISOString());
      } else if (filters.dateRange === 'week') {
        const weekAgo = subDays(new Date(), 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (filters.dateRange === 'month') {
        const monthAgo = subDays(new Date(), 30);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      const { data: headcountsData } = await query;
      setHeadcounts(headcountsData || []);

      // 5. Recent updates (last 5 for live feed)
      const { data: recent } = await supabase
        .from('headcount_updates')
        .select(`
          id,
          created_at,
          coordinator:users (name),
          company:companies (company_name),
          location:locations (location_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentUpdates(recent || []);

    } catch (error) {
      toast.error('Failed to load dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]); // refetch when filters change

  // ----- Computed KPIs -----
  const kpis = useMemo(() => {
    const totalCompanies = companies.length;
    const totalLocations = locations.length;
    const totalRequirement = headcounts.reduce((sum, h) => sum + (h.requirement || 0), 0);
    const totalFilled = headcounts.reduce((sum, h) => sum + (h.filled || 0), 0);
    const totalVacant = headcounts.reduce((sum, h) => sum + (h.vacant || 0), 0);
    const todayUpdates = headcounts.length; // since we filter by date, this is the count for the filtered period
    return { totalCompanies, totalLocations, totalRequirement, totalFilled, totalVacant, todayUpdates };
  }, [companies, locations, headcounts]);

  // ----- Filter handlers -----
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      companyId: '',
      locationId: '',
      shift: '',
      coordinatorId: '',
      dateRange: 'today',
      search: '',
    });
  };

  // ----- Table data (with search) -----
  const filteredTableData = useMemo(() => {
    const searchTerm = filters.search.toLowerCase().trim();
    if (!searchTerm) return headcounts;
    return headcounts.filter(h =>
      h.company?.company_name?.toLowerCase().includes(searchTerm) ||
      h.location?.location_name?.toLowerCase().includes(searchTerm) ||
      h.coordinator?.name?.toLowerCase().includes(searchTerm) ||
      h.remarks?.toLowerCase().includes(searchTerm)
    );
  }, [headcounts, filters.search]);

  // ----- Analytics data -----
  const companyWiseData = useMemo(() => {
    const map = {};
    headcounts.forEach(h => {
      const name = h.company?.company_name || 'Unknown';
      if (!map[name]) map[name] = { company: name, requirement: 0, filled: 0, vacant: 0 };
      map[name].requirement += h.requirement || 0;
      map[name].filled += h.filled || 0;
      map[name].vacant += h.vacant || 0;
    });
    return Object.values(map);
  }, [headcounts]);

  const vacancyDistribution = useMemo(() => {
    const counts = { filled: 0, vacant: 0 };
    headcounts.forEach(h => {
      if ((h.vacant || 0) > 0) counts.vacant += h.vacant;
      else counts.filled += h.filled || 0;
    });
    return [
      { name: 'Filled', value: counts.filled },
      { name: 'Vacant', value: counts.vacant },
    ];
  }, [headcounts]);

  // Hourly timeline (last 24 hours)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      submissions: 0,
    }));
    const now = new Date();
    const todayStart = startOfDay(now);
    headcounts.forEach(h => {
      const createdAt = new Date(h.created_at);
      if (createdAt >= todayStart) {
        const hour = createdAt.getHours();
        hours[hour].submissions += 1;
      }
    });
    return hours;
  }, [headcounts]);

  // ----- Render helpers -----
  const KpiCard = ({ icon: Icon, label, value, color = 'text-blue-600' }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-3">
      <div className={`p-2 rounded-full bg-${color.split('-')[1]}-50`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );

  // ----- JSX -----
  return (
    <div className="min-h-screen bg-gray-50/90">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">🏢 Real Time Head Count</h1>
            <span className="text-sm text-gray-500 hidden sm:inline">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 mr-1 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/companies/new')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Company
            </button>
            <button
              onClick={() => navigate('/locations/new')}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-1" /> Location
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KpiCard icon={Building2} label="Companies" value={kpis.totalCompanies} color="text-blue-600" />
          <KpiCard icon={MapPin} label="Locations" value={kpis.totalLocations} color="text-indigo-600" />
          <KpiCard icon={Users} label="Requirement" value={kpis.totalRequirement} color="text-purple-600" />
          <KpiCard icon={UserCheck} label="Filled" value={kpis.totalFilled} color="text-green-600" />
          <KpiCard icon={UserX} label="Vacant" value={kpis.totalVacant} color="text-red-600" />
          <KpiCard icon={Clock} label="Today's Updates" value={kpis.todayUpdates} color="text-orange-600" />
        </div>

        {/* Main Content: Table + Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Table & Filters */}
          <div className="lg:col-span-3 space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Filters
                    {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </button>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    <Download className="w-4 h-4 mr-1" /> Export
                  </button>
                </div>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-t pt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Company</label>
                    <select
                      value={filters.companyId}
                      onChange={(e) => handleFilterChange('companyId', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md text-sm py-1.5 px-2"
                    >
                      <option value="">All</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Location</label>
                    <select
                      value={filters.locationId}
                      onChange={(e) => handleFilterChange('locationId', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md text-sm py-1.5 px-2"
                    >
                      <option value="">All</option>
                      {locations
                        .filter(l => !filters.companyId || l.company_id === filters.companyId)
                        .map(l => (
                          <option key={l.id} value={l.id}>{l.location_name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Shift</label>
                    <select
                      value={filters.shift}
                      onChange={(e) => handleFilterChange('shift', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md text-sm py-1.5 px-2"
                    >
                      <option value="">All</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Coordinator</label>
                    <select
                      value={filters.coordinatorId}
                      onChange={(e) => handleFilterChange('coordinatorId', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md text-sm py-1.5 px-2"
                    >
                      <option value="">All</option>
                      {coordinators.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Date Range</label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md text-sm py-1.5 px-2"
                    >
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinator</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Req</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Filled</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Vacant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                    ) : filteredTableData.length === 0 ? (
                      <tr><td colSpan="11" className="px-4 py-8 text-center text-gray-500">No records found</td></tr>
                    ) : (
                      filteredTableData.map((h) => {
                        const status = getStatus(h.requirement, h.filled);
                        return (
                          <tr key={h.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{h.company?.company_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{h.location?.location_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{h.coordinator?.name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{h.requirement || 0}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{h.filled || 0}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{h.vacant || 0}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {format(new Date(h.created_at), 'MMM d, HH:mm')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-xs">{h.remarks || '-'}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Live Feed */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔄 Live Updates</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentUpdates.map((u) => (
                  <div key={u.id} className="border-b border-gray-100 pb-2 last:border-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{u.coordinator?.name || 'Unknown'}</span>
                      <span className="text-gray-500"> updated </span>
                      <span className="font-medium">{u.company?.company_name}</span>
                      <span className="text-gray-500"> → </span>
                      <span className="font-medium">{u.location?.location_name}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(u.created_at), 'hh:mm a')}
                    </p>
                  </div>
                ))}
                {recentUpdates.length === 0 && (
                  <p className="text-sm text-gray-400">No recent updates</p>
                )}
              </div>
            </div>
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">⚡ Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-md">+ Company</button>
                <button className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-md">+ Location</button>
                <button className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-2 rounded-md">+ Coordinator</button>
                <button className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-md">Export</button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Overview / Analytics / Reports */}
        <div className="mt-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-1 border-b-2 text-sm font-medium ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reports
              </button>
            </nav>
          </div>

          {/* Tab Panels */}
          <div className="py-6">
            {activeTab === 'overview' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Summary</h3>
                <p className="text-gray-500">Detailed overview is shown in the table above. Use filters to narrow down.</p>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">Company-wise Head Count</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={companyWiseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="company" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="requirement" fill="#8884d8" name="Requirement" />
                      <Bar dataKey="filled" fill="#82ca9d" name="Filled" />
                      <Bar dataKey="vacant" fill="#ffc658" name="Vacant" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4">Vacancy Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={vacancyDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          <Cell fill="#82ca9d" />
                          <Cell fill="#ff6b6b" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-4">Hourly Submissions (Today)</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="submissions" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Generate Reports</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <FileText className="w-5 h-5 mr-2 text-gray-600" />
                    Daily
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <FileText className="w-5 h-5 mr-2 text-gray-600" />
                    Weekly
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <FileText className="w-5 h-5 mr-2 text-gray-600" />
                    Monthly
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="w-5 h-5 mr-2 text-gray-600" />
                    Export Excel
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Download className="w-5 h-5 mr-2 text-gray-600" />
                    Export PDF
                  </button>
                  <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Printer className="w-5 h-5 mr-2 text-gray-600" />
                    Print
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}