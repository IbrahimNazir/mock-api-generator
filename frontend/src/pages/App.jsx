import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Signup from './Signup';
import Login from './Login';
import ProjectPage from './ProjectPage';
import ResourcePage from './ResourcePage';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('token'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      {isAuthenticated && <Navbar onLogout={handleLogout} />}
      <Routes>
        <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/projects" />} />
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/projects" />} />
        <Route path="/projects" element={isAuthenticated ? <ProjectPage /> : <Navigate to="/login" />} />
        <Route path="/resources/:apiId" element={isAuthenticated ? <ResourcePage /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/projects" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;