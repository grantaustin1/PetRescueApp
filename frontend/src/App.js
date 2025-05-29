import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Admin Context
const AdminContext = React.createContext();

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/admin/login`, null, {
        params: { token }
      });
      
      if (response.data.success) {
        localStorage.setItem('adminToken', token);
        onLogin(token);
      }
    } catch (error) {
      alert('Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Login</h1>
          <p className="text-gray-600">Pet Tag System Administration</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter admin token"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [pets, setPets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchPets();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats?token=${token}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPets = async () => {
    try {
      const response = await axios.get(`${API}/admin/pets?token=${token}`);
      setPets(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setLoading(false);
    }
  };

  const generateBillingCSV = async () => {
    try {
      const response = await axios.post(`${API}/admin/billing/generate-csv?token=${token}`);
      if (response.data.success) {
        alert(`Billing CSV generated successfully!\n\nFile: ${response.data.filename}\nTotal Amount: R${response.data.total_amount}\nCustomers: ${response.data.customer_count}`);
        
        // Download the file
        const downloadUrl = `${BACKEND_URL}${response.data.download_url}?token=${token}`;
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      alert('Error generating billing CSV: ' + error.response?.data?.detail);
    }
  };

  const updatePaymentStatus = async (petId, status) => {
    try {
      await axios.post(`${API}/admin/pets/update-payment-status?token=${token}`, {
        pet_id: petId,
        status: status
      });
      fetchPets();
      fetchStats();
      alert(`Payment status updated to ${status}`);
    } catch (error) {
      alert('Error updating payment status');
    }
  };

  const updateTagStatus = async (petId, status) => {
    try {
      await axios.post(`${API}/admin/tags/update-status?token=${token}`, {
        pet_id: petId,
        status: status
      });
      fetchPets();
      fetchStats();
      alert(`Tag status updated to ${status}`);
    } catch (error) {
      alert('Error updating tag status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Pet Tag Admin Dashboard</h1>
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                window.location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
          
          <div className="flex space-x-4 mt-4">
            {['overview', 'pets', 'billing', 'tags'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Pets</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.total_pets}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Paid Up</h3>
              <p className="text-3xl font-bold text-green-600">{stats.pets_paid}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">In Arrears</h3>
              <p className="text-3xl font-bold text-red-600">{stats.pets_in_arrears}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Monthly Revenue</h3>
              <p className="text-3xl font-bold text-purple-600">R{stats.monthly_revenue}</p>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Billing Management</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Generate Monthly Billing</h3>
                <p className="text-gray-600 mb-4">
                  Generate CSV file for bank processing with all paid customers
                </p>
                <button
                  onClick={generateBillingCSV}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  Generate & Download CSV
                </button>
              </div>
              
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Import Payment Results</h3>
                <p className="text-gray-600 mb-4">
                  Upload CSV with payment results from bank
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('results_file', file);
                      
                      try {
                        const response = await axios.post(
                          `${API}/admin/payments/import-results?token=${token}`,
                          formData,
                          { headers: { 'Content-Type': 'multipart/form-data' } }
                        );
                        alert(response.data.message);
                        fetchPets();
                        fetchStats();
                      } catch (error) {
                        alert('Error importing results: ' + error.response?.data?.detail);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pets' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Pet Management</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pet ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pet Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tag Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pets.map((pet) => (
                    <tr key={pet.pet_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {pet.pet_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {pet.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{pet.owner.name}</div>
                          <div className="text-gray-500">{pet.owner.mobile}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          pet.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pet.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          pet.tag_status === 'delivered' ? 'bg-green-100 text-green-800' :
                          pet.tag_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          pet.tag_status === 'printed' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pet.tag_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <select
                          onChange={(e) => updatePaymentStatus(pet.pet_id, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                          defaultValue=""
                        >
                          <option value="" disabled>Payment</option>
                          <option value="paid">Mark Paid</option>
                          <option value="arrears">Mark Arrears</option>
                        </select>
                        <select
                          onChange={(e) => updateTagStatus(pet.pet_id, e.target.value)}
                          className="text-xs border rounded px-2 py-1"
                          defaultValue=""
                        >
                          <option value="" disabled>Tag Status</option>
                          <option value="printed">Printed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Tag Management</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Print Queue</h3>
                <p className="text-gray-600 mb-4">
                  {pets.filter(p => p.tag_status === 'ordered').length} tags need printing
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pets.filter(p => p.tag_status === 'ordered').map(pet => (
                    <div key={pet.pet_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-mono text-sm">{pet.pet_id}</span>
                      <span className="text-sm">{pet.name}</span>
                      <button
                        onClick={() => updateTagStatus(pet.pet_id, 'printed')}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Mark Printed
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Tag Status Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Ordered:</span>
                    <span className="font-semibold">{pets.filter(p => p.tag_status === 'ordered').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Printed:</span>
                    <span className="font-semibold">{pets.filter(p => p.tag_status === 'printed').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipped:</span>
                    <span className="font-semibold">{pets.filter(p => p.tag_status === 'shipped').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered:</span>
                    <span className="font-semibold">{pets.filter(p => p.tag_status === 'delivered').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Pet Registration Form
const Registration = () => {
  const [formData, setFormData] = useState({
    pet_name: '',
    breed: '',
    medical_info: '',
    instructions: '',
    owner_name: '',
    mobile: '',
    email: '',
    address: '',
    bank_account_number: '',
    branch_code: '',
    account_holder_name: ''
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('pet_data', JSON.stringify(formData));
      formDataToSend.append('photo', photo);
      
      const response = await axios.post(`${API}/pets/register`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setSuccess(response.data);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 mb-4">Pet ID: <span className="font-mono font-bold text-blue-600">{success.pet_id}</span></p>
          </div>
          
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">Your QR code has been generated. A physical tag will be mailed to you.</p>
            <img 
              src={`${BACKEND_URL}${success.qr_code_url}`} 
              alt="QR Code" 
              className="mx-auto border rounded-lg shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
          >
            Register Another Pet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Pet Tag Registration</h1>
            <p className="text-blue-100 mt-2">Register your pet and support rescue centers</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pet Name</label>
                <input
                  type="text"
                  required
                  value={formData.pet_name}
                  onChange={(e) => setFormData({...formData, pet_name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  placeholder="e.g., Buddy"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Breed</label>
                <input
                  type="text"
                  required
                  value={formData.breed}
                  onChange={(e) => setFormData({...formData, breed: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  placeholder="e.g., Golden Retriever"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Pet Photo</label>
              <input
                type="file"
                required
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Medical Information</label>
              <textarea
                value={formData.medical_info}
                onChange={(e) => setFormData({...formData, medical_info: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Any medical conditions, allergies, or special needs..."
                rows="3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Special Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                placeholder="Special care instructions, behavior notes..."
                rows="3"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Owner Information</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    placeholder="+27 XX XXX XXXX"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  rows="2"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Banking Details (for monthly R2 donation)</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({...formData, account_holder_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    required
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Branch Code</label>
                <input
                  type="text"
                  required
                  value={formData.branch_code}
                  onChange={(e) => setFormData({...formData, branch_code: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Monthly Donation:</strong> R2.00 will be automatically debited from your account each month to support local rescue centers.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700'
              }`}
            >
              {loading ? 'Registering...' : 'Register Pet & Generate QR Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// QR Code Scanner Result Page
const ScanResult = () => {
  const { petId } = useParams();
  const [petInfo, setPetInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPetInfo = async () => {
      try {
        const response = await axios.get(`${API}/scan/${petId}`);
        setPetInfo(response.data);
      } catch (err) {
        setError('Pet not found or QR code invalid');
      } finally {
        setLoading(false);
      }
    };

    fetchPetInfo();
  }, [petId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pet information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pet Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
        <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white text-center">Found Pet!</h1>
        </div>
        
        <div className="p-6">
          {petInfo.pet_photo_url && (
            <div className="mb-6 text-center">
              <img 
                src={`${BACKEND_URL}${petInfo.pet_photo_url}`} 
                alt={petInfo.pet_name}
                className="w-48 h-48 object-cover rounded-full mx-auto border-4 border-gray-200 shadow-lg"
              />
            </div>
          )}
          
          <div className="text-center space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{petInfo.pet_name}</h2>
              <p className="text-gray-600">is looking for their family!</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Owner Contact:</h3>
              <p className="text-lg font-bold text-gray-900">{petInfo.owner_name}</p>
              <p className="text-lg text-blue-600 font-mono">{petInfo.owner_mobile}</p>
            </div>
            
            <div className="space-y-3">
              <a 
                href={`tel:${petInfo.owner_mobile}`}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition duration-200 font-semibold flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span>Call Owner Now</span>
              </a>
              
              <a 
                href={`sms:${petInfo.owner_mobile}?body=Hi! I found ${petInfo.pet_name}. Please let me know where we can meet to return your pet safely.`}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                <span>Send SMS</span>
              </a>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800 text-center">
                Thank you for helping reunite {petInfo.pet_name} with their family! 🐾
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Home/Landing Page
const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">Pet Tag Registry</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Keep your pets safe with QR code tags while supporting local rescue centers with just R2/month
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Register Your Pet</h3>
            <p className="text-gray-600">Upload pet details and get a unique QR code tag</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Scan & Reunite</h3>
            <p className="text-gray-600">Anyone who finds your pet can scan and contact you instantly</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Support Rescues</h3>
            <p className="text-gray-600">Your R2/month helps fund local animal rescue centers</p>
          </div>
        </div>
        
        <div className="text-center space-y-4">
          <button 
            onClick={() => navigate('/register')}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-blue-700 hover:to-green-700 transition duration-200 shadow-lg"
          >
            Register Your Pet Now
          </button>
          
          <div className="mt-8">
            <button 
              onClick={() => navigate('/admin')}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Route Handler
const AdminRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setAdminToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token) => {
    setAdminToken(token);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return <AdminDashboard token={adminToken} />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/scan/:petId" element={<ScanResult />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
