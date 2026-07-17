// src/components/ManagementModal.tsx
import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Save, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  company_name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  state?: string;
  status?: string;
}

interface Location {
  id: string;
  location_name: string;
  company_id: string;
  address?: string;
  state?: string;
  coordinator_id?: string;
  status?: string;
  company?: Company;
  coordinator?: Coordinator;
}

interface Coordinator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_id?: string;
  location_id?: string;
  role: string;
  status?: string;
  company?: Company;
  location?: Location;
}

type Tab = 'companies' | 'locations' | 'coordinators';

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Tab;
  onDataChange?: () => void;
  darkMode?: boolean;
}

export default function ManagementModal({
  isOpen,
  onClose,
  initialTab = 'companies',
  onDataChange,
  darkMode = false,
}: ManagementModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'companies') {
        const { data } = await supabase.from('companies').select('*').order('company_name');
        setCompanies(data || []);
      } else if (activeTab === 'locations') {
        const { data } = await supabase
          .from('locations')
          .select('*, company:companies(company_name), coordinator:users(id, name)')
          .order('location_name');
        setLocations(data || []);
      } else if (activeTab === 'coordinators') {
        const { data } = await supabase
          .from('users')
          .select('id, name, email, phone, company_id, location_id, role, status')
          .eq('role', 'COORDINATOR')
          .order('name');
        setCoordinators(data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    setEditingItem(null);
    setFormData({});
  }, [activeTab]);

  const handleAdd = () => {
    setEditingItem({ id: null });
    setFormData({});
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      let table = activeTab === 'companies' ? 'companies' : activeTab === 'locations' ? 'locations' : 'users';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted successfully');
      fetchData();
      if (onDataChange) onDataChange();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSave = async () => {
    try {
      let table = activeTab === 'companies' ? 'companies' : activeTab === 'locations' ? 'locations' : 'users';
      const isEdit = editingItem?.id;
      let payload = { ...formData };
      if (activeTab === 'coordinators') {
        payload.role = 'COORDINATOR';
        // If password is provided and it's a new user, you might need to handle auth creation separately
        // For simplicity, we'll just store the user profile
        if (payload.password && !isEdit) {
          // Optionally create auth user here (omitted for brevity)
        }
        delete payload.password; // remove password from payload after potential use
      }
      let result;
      if (isEdit) {
        result = await supabase.from(table).update(payload).eq('id', editingItem.id);
      } else {
        result = await supabase.from(table).insert([payload]);
      }
      if (result.error) throw result.error;
      toast.success(isEdit ? 'Updated successfully' : 'Added successfully');
      setEditingItem(null);
      setFormData({});
      fetchData();
      if (onDataChange) onDataChange();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const renderForm = () => {
    if (!editingItem) return null;

    const fields =
      activeTab === 'companies'
        ? [
            { key: 'company_name', label: 'Company Name', type: 'text', required: true },
            { key: 'code', label: 'Code', type: 'text' },
            { key: 'contact_person', label: 'Contact Person', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
          ]
        : activeTab === 'locations'
        ? [
            { key: 'location_name', label: 'Location Name', type: 'text', required: true },
            {
              key: 'company_id',
              label: 'Company',
              type: 'select',
              options: companies.map((c) => ({ value: c.id, label: c.company_name })),
              required: true,
            },
            { key: 'address', label: 'Address', type: 'text' },
            { key: 'state', label: 'State', type: 'text' },
            {
              key: 'coordinator_id',
              label: 'Coordinator',
              type: 'select',
              options: coordinators.map((c) => ({ value: c.id, label: c.name })),
            },
            { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
          ]
        : [
            { key: 'name', label: 'Full Name', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'phone', label: 'Phone', type: 'text' },
            {
              key: 'company_id',
              label: 'Company',
              type: 'select',
              options: companies.map((c) => ({ value: c.id, label: c.company_name })),
              required: true,
            },
            {
              key: 'location_id',
              label: 'Location',
              type: 'select',
              options: locations.map((l) => ({ value: l.id, label: l.location_name })),
            },
            { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
            {
              key: 'password',
              label: 'Password',
              type: 'password',
              required: !editingItem.id,
            },
          ];

    return (
      <div className={`mt-4 p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
          {editingItem.id ? 'Edit' : 'Add'} {activeTab.slice(0, -1)}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field) => (
            <div key={field.key} className={field.key === 'remarks' ? 'col-span-2' : ''}>
              <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className={`mt-1 block w-full border rounded-md text-sm py-1.5 px-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">Select...</option>
                  {field.options.map((opt: any) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  className={`mt-1 block w-full border rounded-md text-sm py-1.5 px-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setEditingItem(null)}
            className={`px-3 py-1.5 text-sm border rounded-md ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
          >
            <Save className="w-4 h-4" /> {editingItem.id ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    );
  };

  // Filter data for table
  const filteredData = () => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      if (activeTab === 'companies') return companies;
      if (activeTab === 'locations') return locations;
      return coordinators;
    }
    if (activeTab === 'companies') {
      return companies.filter(c =>
        c.company_name.toLowerCase().includes(term) ||
        c.code?.toLowerCase().includes(term) ||
        c.contact_person?.toLowerCase().includes(term)
      );
    } else if (activeTab === 'locations') {
      return locations.filter(l =>
        l.location_name.toLowerCase().includes(term) ||
        l.company?.company_name?.toLowerCase().includes(term) ||
        l.address?.toLowerCase().includes(term)
      );
    } else {
      return coordinators.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.phone?.toLowerCase().includes(term) ||
        u.company?.company_name?.toLowerCase().includes(term)
      );
    }
  };

  const filteredItems = filteredData();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col ${darkMode ? 'bg-gray-800' : ''}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Management</h2>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-6`}>
          <nav className="-mb-px flex space-x-6">
            {(['companies', 'locations', 'coordinators'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {loading ? 'Loading...' : `${activeTab.slice(0, -1)} management`}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className={`absolute left-2.5 top-2.5 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-8 pr-3 py-1.5 border rounded-md text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
                />
              </div>
              <button
                onClick={fetchData}
                className={`p-1.5 border rounded-md ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'hover:bg-gray-50'}`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {loading ? (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    {activeTab === 'companies' && (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Code</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Contact</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">State</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </>
                    )}
                    {activeTab === 'locations' && (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Company</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Coordinator</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">State</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </>
                    )}
                    {activeTab === 'coordinators' && (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Company</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Location</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {activeTab === 'companies' &&
                    filteredItems.map((c: Company) => (
                      <tr key={c.id}>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{c.company_name}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{c.code || '-'}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{c.contact_person || '-'}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{c.state || '-'}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            c.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {c.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-sm">
                          <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2">
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {activeTab === 'locations' &&
                    filteredItems.map((l: Location) => (
                      <tr key={l.id}>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{l.location_name}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{l.company?.company_name || '-'}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{l.coordinator?.name || '-'}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{l.state || '-'}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            l.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {l.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-sm">
                          <button onClick={() => handleEdit(l)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2">
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {activeTab === 'coordinators' &&
                    filteredItems.map((u: Coordinator) => (
                      <tr key={u.id}>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{u.name}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{u.email}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{u.phone || '-'}</td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {companies.find(c => c.id === u.company_id)?.company_name || '-'}
                        </td>
                        <td className={`px-3 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                          {locations.find(l => l.id === u.location_id)?.location_name || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            u.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {u.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-sm">
                          <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mr-2">
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {renderForm()}
        </div>
      </div>
    </div>
  );
}