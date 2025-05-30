import React, { useState, useEffect } from "react";
import "./App.css";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Customer Login Component
const CustomerLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    pet_id: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/customer/login`, formData);
      
      if (response.data.access_token) {
        localStorage.setItem('customerToken', response.data.access_token);
        navigate('/customer/dashboard');
      }
    } catch (error) {
      alert('Invalid email or Pet ID. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Customer Portal</h1>
          <p className="text-gray-600">Access your pet's information</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pet ID</label>
            <input
              type="text"
              value={formData.pet_id}
              onChange={(e) => setFormData({...formData, pet_id: e.target.value.toUpperCase()})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
              placeholder="e.g., PET000123"
              required
            />
            <p className="text-sm text-gray-500 mt-1">Use any Pet ID from your registered pets</p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition duration-200 font-semibold"
          >
            {loading ? 'Logging in...' : 'Access Portal'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

// Customer Dashboard Component
const CustomerDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [editingPet, setEditingPet] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) {
      navigate('/customer');
      return;
    }
    fetchProfile();
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('customerToken');
      const response = await axios.get(`${API}/customer/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      if (response.data.pets.length > 0) {
        setSelectedPet(response.data.pets[0]);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('customerToken');
        navigate('/customer');
      } else {
        alert('Error loading profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePet = async (petId, updateData) => {
    try {
      const token = localStorage.getItem('customerToken');
      await axios.put(`${API}/customer/pet/${petId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Pet information updated successfully!');
      fetchProfile();
      setEditingPet(null);
    } catch (error) {
      alert('Error updating pet information');
    }
  };

  const updateProfile = async (updateData) => {
    try {
      const token = localStorage.getItem('customerToken');
      await axios.put(`${API}/customer/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profile updated successfully!');
      fetchProfile();
      setEditingProfile(false);
    } catch (error) {
      alert('Error updating profile');
    }
  };

  const downloadQR = async (petId) => {
    try {
      console.log('Downloading QR code for:', petId);
      const token = localStorage.getItem('customerToken');
      const response = await axios.get(`${API}/customer/download-qr/${petId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${petId}_qr_code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Error downloading QR code: ' + (error.response?.data?.detail || error.message));
    }
  };

  const requestReplacement = async (petId) => {
    const reason = prompt('Reason for replacement (lost/damaged/stolen):');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('customerToken');
      const response = await axios.post(`${API}/customer/request-replacement/${petId}?reason=${reason}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Replacement request submitted! Fee: R${response.data.replacement_fee}`);
    } catch (error) {
      alert('Error submitting replacement request');
    }
  };

  const logout = () => {
    localStorage.removeItem('customerToken');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pet information...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">Unable to load profile</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Pets Dashboard</h1>
              <p className="text-gray-600">Welcome back! Manage your pet's information</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-800"
              >
                Homepage
              </button>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex space-x-4 mt-4">
            {['overview', 'pets', 'profile', 'payments'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === tab
                    ? 'bg-green-600 text-white'
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Pets</h3>
                <p className="text-3xl font-bold text-green-600">{profile.total_pets}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Payments</h3>
                <p className="text-3xl font-bold text-blue-600">{profile.active_payments}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Monthly Donation</h3>
                <p className="text-3xl font-bold text-purple-600">R{profile.total_donations}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Rescue Support</h3>
                <p className="text-3xl font-bold text-orange-600">Active</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profile.pets.map((pet) => (
                  <div key={pet.pet_id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center space-x-4">
                      {pet.photo_url && (
                        <img 
                          src={`${BACKEND_URL}${pet.photo_url}`} 
                          alt={pet.name}
                          className="w-16 h-16 object-cover rounded-full"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{pet.name}</h4>
                        <p className="text-sm text-gray-600">{pet.pet_id}</p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          pet.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {pet.payment_status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => downloadQR(pet.pet_id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Download QR
                      </button>
                      <button
                        onClick={() => requestReplacement(pet.pet_id)}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                      >
                        Replace Tag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pets Management Tab */}
        {activeTab === 'pets' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-800">Pet Management</h2>
              </div>
              
              <div className="p-6">
                {profile.pets.map((pet) => (
                  <div key={pet.pet_id} className="border rounded-lg p-6 mb-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div className="flex space-x-6">
                        {pet.photo_url && (
                          <img 
                            src={`${BACKEND_URL}${pet.photo_url}`} 
                            alt={pet.name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          {editingPet === pet.pet_id ? (
                            <EditPetForm 
                              pet={pet} 
                              onSave={(data) => updatePet(pet.pet_id, data)}
                              onCancel={() => setEditingPet(null)}
                            />
                          ) : (
                            <PetDetails 
                              pet={pet} 
                              onEdit={() => setEditingPet(pet.pet_id)}
                              onDownloadQR={() => downloadQR(pet.pet_id)}
                              onRequestReplacement={() => requestReplacement(pet.pet_id)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Contact Information</h2>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            
            {editingProfile ? (
              <EditProfileForm 
                profile={profile.pets[0]?.owner}
                onSave={updateProfile}
                onCancel={() => setEditingProfile(false)}
              />
            ) : (
              <ProfileDetails profile={profile.pets[0]?.owner} />
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Payment Information</h2>
            
            <div className="space-y-4">
              {profile.pets.map((pet) => (
                <div key={pet.pet_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-gray-800">{pet.name} ({pet.pet_id})</h4>
                      <p className="text-sm text-gray-600">Monthly Fee: R{pet.monthly_fee}</p>
                      <p className="text-sm text-gray-600">
                        Last Payment: {pet.last_payment ? new Date(pet.last_payment).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        pet.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {pet.payment_status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Tag Status: {pet.tag_status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">💚 Supporting Rescue Centers</h4>
              <p className="text-green-700">
                Your monthly donation of R{profile.total_donations} helps fund local animal rescue operations. 
                Thank you for making a difference!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const PetDetails = ({ pet, onEdit, onDownloadQR, onRequestReplacement }) => (
  <div>
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-xl font-bold text-gray-800">{pet.name}</h3>
        <p className="text-gray-600">{pet.breed} • {pet.pet_id}</p>
      </div>
      <button
        onClick={onEdit}
        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
      >
        Edit Details
      </button>
    </div>
    
    {pet.medical_info && (
      <div className="mb-3">
        <h4 className="font-semibold text-gray-700">Medical Info:</h4>
        <p className="text-gray-600">{pet.medical_info}</p>
      </div>
    )}
    
    {pet.instructions && (
      <div className="mb-4">
        <h4 className="font-semibold text-gray-700">Special Instructions:</h4>
        <p className="text-gray-600">{pet.instructions}</p>
      </div>
    )}
    
    <div className="flex space-x-3">
      <button
        onClick={onDownloadQR}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Download QR Code
      </button>
      <button
        onClick={onRequestReplacement}
        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
      >
        Request Replacement
      </button>
    </div>
  </div>
);

const EditPetForm = ({ pet, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: pet.name,
    breed: pet.breed,
    medical_info: pet.medical_info || '',
    instructions: pet.instructions || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Pet Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Breed</label>
          <input
            type="text"
            value={formData.breed}
            onChange={(e) => setFormData({...formData, breed: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Medical Information</label>
        <textarea
          value={formData.medical_info}
          onChange={(e) => setFormData({...formData, medical_info: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          rows="3"
        />
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Special Instructions</label>
        <textarea
          value={formData.instructions}
          onChange={(e) => setFormData({...formData, instructions: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          rows="3"
        />
      </div>
      
      <div className="flex space-x-3">
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const ProfileDetails = ({ profile }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Contact Details</h4>
      <p className="text-gray-600 mb-1"><strong>Name:</strong> {profile?.name}</p>
      <p className="text-gray-600 mb-1"><strong>Email:</strong> {profile?.email}</p>
      <p className="text-gray-600 mb-1"><strong>Mobile:</strong> {profile?.mobile}</p>
    </div>
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Address</h4>
      <p className="text-gray-600">{profile?.address}</p>
    </div>
  </div>
);

const EditProfileForm = ({ profile, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    mobile: profile?.mobile || '',
    address: profile?.address || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => setFormData({...formData, mobile: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          rows="3"
        />
      </div>
      
      <div className="flex space-x-3">
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Save Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Admin Dashboard Component (existing code with enhancements)
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

// Enhanced Admin Dashboard with automation features
const AdminDashboard = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [pets, setPets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeTagTab, setActiveTagTab] = useState('print-queue');
  const [selectedPets, setSelectedPets] = useState([]);
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

  const sendPaymentReminders = async () => {
    try {
      const response = await axios.post(`${API}/admin/automation/send-payment-reminders?token=${token}`);
      alert(`Success! Sent ${response.data.reminders_sent} payment reminder emails.`);
    } catch (error) {
      alert('Error sending payment reminders');
    }
  };

  const applyAnnualAdjustment = async () => {
    const percentage = prompt('Enter annual fee adjustment percentage (e.g., 5 for 5%):');
    if (!percentage || isNaN(percentage)) return;
    
    try {
      const response = await axios.post(`${API}/admin/automation/annual-fee-adjustment?token=${token}&percentage=${percentage}`);
      alert(`Success! Applied ${percentage}% increase to ${response.data.affected_pets} pets.`);
      fetchStats();
      fetchPets();
    } catch (error) {
      alert('Error applying fee adjustment');
    }
  };

  const generateBillingCSV = async () => {
    try {
      console.log('Generating billing CSV...');
      const response = await axios.post(`${API}/admin/billing/generate-csv?token=${token}`);
      console.log('CSV Response:', response.data);
      
      if (response.data.success) {
        alert(`Billing CSV generated successfully!\n\nFile: ${response.data.filename}\nTotal Amount: R${response.data.total_amount}\nCustomers: ${response.data.customer_count}`);
        
        // Create download link and trigger download
        const downloadUrl = `${BACKEND_URL}/billing/${response.data.filename}`;
        console.log('Download URL:', downloadUrl);
        
        // Method 1: Try direct download
        try {
          const downloadResponse = await axios.get(downloadUrl, {
            responseType: 'blob',
          });
          
          // Create blob and download
          const blob = new Blob([downloadResponse.data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = response.data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
        } catch (downloadError) {
          console.error('Blob download failed, trying window.open:', downloadError);
          // Method 2: Fallback to window.open
          window.open(downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error generating billing CSV:', error);
      alert('Error generating billing CSV: ' + (error.response?.data?.detail || error.message));
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

  const generatePrintReport = async (petIds, jobName = '') => {
    try {
      console.log('Generating print report...');
      const response = await axios.post(`${API}/admin/tags/generate-print-report?token=${token}`, {
        pet_ids: petIds,
        job_name: jobName || `Print Job ${new Date().toLocaleDateString()}`
      });
      
      console.log('Print Report Response:', response.data);
      
      if (response.data.success) {
        alert(`Print report generated successfully!\n\nFile: ${response.data.filename}\nPet Count: ${response.data.pet_count}`);
        
        // Create download link and trigger download
        const downloadUrl = `${BACKEND_URL}/reports/${response.data.filename}`;
        console.log('Download URL:', downloadUrl);
        
        // Try direct download
        try {
          const downloadResponse = await axios.get(downloadUrl, {
            responseType: 'blob',
          });
          
          // Create blob and download
          const blob = new Blob([downloadResponse.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = response.data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
        } catch (downloadError) {
          console.error('Blob download failed, trying window.open:', downloadError);
          // Fallback to window.open
          window.open(downloadUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error generating print report:', error);
      alert('Error generating print report: ' + (error.response?.data?.detail || error.message));
    }
  };

  const createManufacturingBatch = async (petIds, notes = '') => {
    try {
      const response = await axios.post(`${API}/admin/tags/create-manufacturing-batch?token=${token}`, petIds, {
        params: { notes }
      });
      
      if (response.data.success) {
        alert(`Manufacturing batch created!\n\nBatch ID: ${response.data.batch_id}\nPets: ${response.data.pet_count}`);
        fetchPets();
        fetchStats();
      }
    } catch (error) {
      alert('Error creating manufacturing batch: ' + error.response?.data?.detail);
    }
  };

  const createShippingBatch = async (petIds, courier, trackingNumber = '') => {
    try {
      const response = await axios.post(`${API}/admin/tags/create-shipping-batch?token=${token}`, petIds, {
        params: { courier, tracking_number: trackingNumber }
      });
      
      if (response.data.success) {
        alert(`Shipping batch created!\n\nShipping ID: ${response.data.shipping_id}\nPets: ${response.data.pet_count}\n\nCustomers will receive email notifications!`);
        fetchPets();
        fetchStats();
      }
    } catch (error) {
      alert('Error creating shipping batch: ' + error.response?.data?.detail);
    }
  };

  const bulkUpdateTagStatus = async (petIds, newStatus) => {
    try {
      const response = await axios.post(`${API}/admin/tags/bulk-update?token=${token}`, {
        pet_ids: petIds,
        new_status: newStatus,
        notes: `Bulk update to ${newStatus}`
      });
      
      if (response.data.success) {
        alert(`Updated ${response.data.updated_count} pets to ${newStatus}`);
        fetchPets();
        fetchStats();
        setSelectedPets([]);
      }
    } catch (error) {
      alert('Error bulk updating tag status');
    }
  };

  const createTagReplacement = async (petId, reason) => {
    try {
      const response = await axios.post(`${API}/admin/tags/create-replacement?token=${token}`, null, {
        params: { original_pet_id: petId, reason }
      });
      
      if (response.data.success) {
        alert(`Tag replacement created!\n\nOriginal ID: ${response.data.original_pet_id}\nNew ID: ${response.data.new_pet_id}\nFee: R${response.data.replacement_fee}`);
        fetchPets();
        fetchStats();
      }
    } catch (error) {
      alert('Error creating tag replacement: ' + error.response?.data?.detail);
    }
  };

  // Tag Management Sub-Component
  const TagManagementContent = ({ activeTab, pets, token, onUpdate }) => {
    const [selectedPetIds, setSelectedPetIds] = useState([]);

    const PrintQueueTab = () => {
      const queuePets = pets.filter(p => p.tag_status === 'ordered');
      
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Print Queue ({queuePets.length} pets)</h3>
            <div className="space-x-2">
              <button
                onClick={() => {
                  const selectedIds = selectedPetIds.length > 0 ? selectedPetIds : queuePets.map(p => p.pet_id);
                  if (selectedIds.length > 0) {
                    generatePrintReport(selectedIds);
                  }
                }}
                disabled={queuePets.length === 0}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Generate Print Report
              </button>
              <button
                onClick={() => {
                  const selectedIds = selectedPetIds.length > 0 ? selectedPetIds : queuePets.map(p => p.pet_id);
                  if (selectedIds.length > 0) {
                    createManufacturingBatch(selectedIds);
                  }
                }}
                disabled={queuePets.length === 0}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
              >
                Create Batch
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {queuePets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pets in print queue</p>
            ) : (
              queuePets.map(pet => (
                <div key={pet.pet_id} className="flex items-center justify-between p-3 bg-white rounded-lg mb-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedPetIds.includes(pet.pet_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPetIds([...selectedPetIds, pet.pet_id]);
                        } else {
                          setSelectedPetIds(selectedPetIds.filter(id => id !== pet.pet_id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="font-mono text-sm font-medium">{pet.pet_id}</span>
                    <span className="text-sm">{pet.name}</span>
                    <span className="text-xs text-gray-500">{pet.owner.name}</span>
                  </div>
                  <button
                    onClick={() => updateTagStatus(pet.pet_id, 'printed')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Mark Printed
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    };

    const ManufacturingTab = () => {
      return (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Printed Tags ({pets.filter(p => p.tag_status === 'printed').length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pets.filter(p => p.tag_status === 'printed').map(pet => (
                  <div key={pet.pet_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-mono text-sm">{pet.pet_id}</span>
                    <button
                      onClick={() => updateTagStatus(pet.pet_id, 'manufactured')}
                      className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Mark Manufactured
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Manufactured Tags ({pets.filter(p => p.tag_status === 'manufactured').length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pets.filter(p => p.tag_status === 'manufactured').map(pet => (
                  <div key={pet.pet_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-mono text-sm">{pet.pet_id}</span>
                    <button
                      onClick={() => {
                        const courier = prompt('Enter courier name:');
                        const tracking = prompt('Enter tracking number (optional):') || '';
                        if (courier) {
                          createShippingBatch([pet.pet_id], courier, tracking);
                        }
                      }}
                      className="bg-indigo-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Ship
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    };

    const ShippingTab = () => {
      const shippingPets = pets.filter(p => ['shipped'].includes(p.tag_status));
      
      return (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Shipped Tags ({shippingPets.length})</h4>
              <button
                onClick={() => {
                  const selectedIds = shippingPets.map(p => p.pet_id);
                  if (selectedIds.length > 0) {
                    bulkUpdateTagStatus(selectedIds, 'delivered');
                  }
                }}
                disabled={shippingPets.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                Mark All Delivered
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {shippingPets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tags currently in shipping</p>
              ) : (
                shippingPets.map(pet => (
                  <div key={pet.pet_id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-mono text-sm font-medium">{pet.pet_id}</span>
                      <span className="text-sm ml-2">{pet.name}</span>
                      {pet.shipping_tracking && (
                        <span className="text-xs text-blue-600 ml-2">#{pet.shipping_tracking}</span>
                      )}
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => updateTagStatus(pet.pet_id, 'delivered')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Mark Delivered
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    };

    const ReplacementsTab = () => {
      return (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-4">Create Tag Replacement</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter Pet ID for replacement"
                className="w-full px-3 py-2 border rounded-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const petId = e.target.value.trim();
                    const reason = prompt('Reason for replacement (lost/damaged/stolen):');
                    if (petId && reason) {
                      createTagReplacement(petId, reason);
                      e.target.value = '';
                    }
                  }
                }}
              />
              <p className="text-sm text-gray-600">Press Enter after typing Pet ID</p>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Recent Replacements</h4>
            <div className="space-y-2">
              {pets.filter(p => p.replacement_count > 0).slice(0, 5).map(pet => (
                <div key={pet.pet_id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                  <div>
                    <span className="font-mono text-sm">{pet.pet_id}</span>
                    <span className="text-sm ml-2">{pet.name}</span>
                    <span className="text-xs text-orange-600 ml-2">Replacement #{pet.replacement_count}</span>
                  </div>
                  <span className="text-xs text-gray-500">R25.00 fee</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    switch (activeTab) {
      case 'print-queue': return <PrintQueueTab />;
      case 'manufacturing': return <ManufacturingTab />;
      case 'shipping': return <ShippingTab />;
      case 'replacements': return <ReplacementsTab />;
      default: return <PrintQueueTab />;
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
            {['overview', 'pets', 'billing', 'tags', 'automation'].map((tab) => (
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

        {activeTab === 'automation' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Automation & Communication</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Management</h3>
                  <div className="space-y-4">
                    <button
                      onClick={sendPaymentReminders}
                      className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-semibold"
                    >
                      Send Payment Reminders
                    </button>
                    <p className="text-sm text-gray-600">
                      Automatically send email reminders to customers with arrears
                    </p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Annual Fee Adjustment</h3>
                  <div className="space-y-4">
                    <button
                      onClick={applyAnnualAdjustment}
                      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 font-semibold"
                    >
                      Apply Inflation Adjustment
                    </button>
                    <p className="text-sm text-gray-600">
                      Apply percentage-based fee increase to all active customers
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📧 Email Notifications</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• QR codes sent automatically after registration</li>
                  <li>• Shipping notifications with tracking info</li>
                  <li>• Payment reminders for failed transactions</li>
                  <li>• All emails use professional HTML templates</li>
                </ul>
              </div>
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
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Tag Management Dashboard</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{pets.filter(p => p.tag_status === 'ordered').length}</div>
                  <div className="text-sm text-orange-700">Ordered</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{pets.filter(p => p.tag_status === 'printed').length}</div>
                  <div className="text-sm text-blue-700">Printed</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{pets.filter(p => p.tag_status === 'manufactured').length}</div>
                  <div className="text-sm text-purple-700">Manufactured</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-600">{pets.filter(p => p.tag_status === 'shipped').length}</div>
                  <div className="text-sm text-indigo-700">Shipped</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{pets.filter(p => p.tag_status === 'delivered').length}</div>
                  <div className="text-sm text-green-700">Delivered</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => setActiveTagTab('print-queue')}
                  className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTagTab === 'print-queue' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>Print Queue</span>
                </button>
                
                <button
                  onClick={() => setActiveTagTab('manufacturing')}
                  className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTagTab === 'manufacturing' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>Manufacturing</span>
                </button>
                
                <button
                  onClick={() => setActiveTagTab('shipping')}
                  className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTagTab === 'shipping' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>Shipping</span>
                </button>
                
                <button
                  onClick={() => setActiveTagTab('replacements')}
                  className={`px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                    activeTagTab === 'replacements' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>Replacements</span>
                </button>
              </div>

              <TagManagementContent 
                activeTab={activeTagTab} 
                pets={pets} 
                token={token} 
                onUpdate={() => { fetchPets(); fetchStats(); }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Pet Registration Form (existing)
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
            <p className="text-sm text-gray-600 mb-4">Your QR code has been generated and emailed to you. A physical tag will be mailed to your address.</p>
            <img 
              src={`${BACKEND_URL}${success.qr_code_url}`} 
              alt="QR Code" 
              className="mx-auto border rounded-lg shadow-sm"
            />
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
            >
              Register Another Pet
            </button>
            
            <button 
              onClick={() => window.location.href = '/customer'}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition duration-200 font-semibold"
            >
              Access Customer Portal
            </button>
          </div>
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

// QR Code Scanner Result Page (existing)
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
      <Routes>
        <Route path="/register" element={<Registration />} />
        <Route path="/scan/:petId" element={<ScanResult />} />
        <Route path="/customer" element={<CustomerLogin />} />
        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/admin" element={<AdminRoute />} />
      </Routes>
    </div>
  );
}

export default App;
