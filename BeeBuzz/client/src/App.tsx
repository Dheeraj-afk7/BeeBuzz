import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Loads from './pages/Loads.tsx';
import LoadDetail from './pages/LoadDetail.tsx';
import CreateLoad from './pages/CreateLoad.tsx';
import JobBoard from './pages/JobBoard.tsx';
import MyBids from './pages/MyBids.tsx';
import Earnings from './pages/Earnings.tsx';
import Notifications from './pages/Notifications.tsx';
import Profile from './pages/Profile.tsx';

// Admin Portal — hidden from all navigation, accessible only via direct URL
import AdminLogin from './pages/admin/AdminLogin.tsx';
import AdminLayout from './pages/admin/AdminLayout.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import AdminUsers from './pages/admin/AdminUsers.tsx';
import AdminOrders from './pages/admin/AdminOrders.tsx';
import AdminPayments from './pages/admin/AdminPayments.tsx';
import AdminDocuments from './pages/admin/AdminDocuments.tsx';
import AdminReports from './pages/admin/AdminReports.tsx';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      
      {/* ── Main App Routes ── */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="loads" element={<Loads />} />
        <Route path="loads/new" element={<CreateLoad />} />
        <Route path="loads/:id" element={<LoadDetail />} />
        <Route path="jobs" element={<JobBoard />} />
        <Route path="my-bids" element={<MyBids />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      {/* ── Admin Portal — Hidden, accessed only by typing /admin/login directly ── */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="documents" element={<AdminDocuments />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>
    </Routes>
  );
};

export default App;
