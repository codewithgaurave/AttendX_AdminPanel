import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import Toast from './components/Toast';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scan" element={<Scan />} />
        </Routes>
        <Toast />
      </Router>
    </AuthProvider>
  );
}

function ProtectedRoute({ children }) {
  const { auth } = useAuth();
  
  console.log('ProtectedRoute - auth state:', auth);
  
  if (!auth?.token) {
    console.log('No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Only allow admin role
  if (auth.role !== 'admin') {
    console.log('Wrong role:', auth.role, 'redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('Auth successful, rendering dashboard');
  return children;
}

export default App;