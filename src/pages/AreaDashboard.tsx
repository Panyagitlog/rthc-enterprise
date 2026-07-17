import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Users,
  ClipboardList,
  LogOut,
} from "lucide-react";

export default function AreaDashboard() {
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Area Admin Dashboard
            </h1>

            <p className="text-sm text-gray-500">
              Company & Location Monitoring
            </p>
          </div>

          <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">

        {/* Stats */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="bg-white rounded-xl shadow p-6">
            <Building2 className="text-blue-600 mb-3" size={32} />
            <h2 className="text-gray-500">Assigned Companies</h2>
            <p className="text-3xl font-bold">3</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <MapPin className="text-green-600 mb-3" size={32} />
            <h2 className="text-gray-500">Locations</h2>
            <p className="text-3xl font-bold">8</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <Users className="text-purple-600 mb-3" size={32} />
            <h2 className="text-gray-500">Coordinators</h2>
            <p className="text-3xl font-bold">18</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <ClipboardList className="text-orange-500 mb-3" size={32} />
            <h2 className="text-gray-500">Today's Updates</h2>
            <p className="text-3xl font-bold">11</p>
          </div>

        </div>

        {/* Company List */}

        <div className="mt-8 bg-white rounded-xl shadow">

          <div className="p-5 border-b">
            <h2 className="font-semibold text-lg">
              Assigned Companies
            </h2>
          </div>

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="p-4 text-left">Company</th>

                <th className="p-4 text-left">Locations</th>

                <th className="p-4 text-left">Requirement</th>

                <th className="p-4 text-left">Filled</th>

                <th className="p-4 text-left">Vacant</th>

              </tr>

            </thead>

            <tbody>

              <tr className="border-t">

                <td className="p-4">Infosys</td>

                <td className="p-4">3</td>

                <td className="p-4">120</td>

                <td className="p-4">102</td>

                <td className="p-4 text-red-600 font-semibold">18</td>

              </tr>

              <tr className="border-t">

                <td className="p-4">TCS</td>

                <td className="p-4">2</td>

                <td className="p-4">80</td>

                <td className="p-4">74</td>

                <td className="p-4 text-red-600 font-semibold">6</td>

              </tr>

            </tbody>

          </table>

        </div>

        <div className="mt-8">

          <Link
            to="/coordinator"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Open Coordinator Page
          </Link>

        </div>

      </div>

    </div>
  );
}