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
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="loads" element={<Loads />} />
        <Route path="loads/new" element={<CreateLoad />} />
        <Route path="loads/:id" element={<LoadDetail />} />
        <Route path="jobs" element={<JobBoard />} />
        <Route path="my-bids" element={<MyBids />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
    </Routes>
  );
};

export default App;
