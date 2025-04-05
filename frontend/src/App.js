import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import SamplesPage from './components/SamplesPage';
import QRScanPage from './components/QRScanPage';
import SystemManagementPage from './components/SystemManagementPage';
import UserManagementPage from './components/UserManagementPage';
import DashboardPage from './components/DashboardPage';
import DepartmentManagementPage from './components/DepartmentManagementPage';
import OperationCodeManagement from './components/OperationCodeManagementPage';
import AccessManagementPage from './components/AccessManagementPage';
import GroupManagementPage from './components/GroupManagementPage';
import WarehouseManagementPage from './components/WarehouseManagementPage';
import HistoryManagementPage from './components/HistoryPage';
const LayoutWithNavbar = ({ children }) => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/login";
  return (
    <>
      {showNavbar && <Navbar />}
      {children}
    </>
  );
};
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<LayoutWithNavbar><HomePage /></LayoutWithNavbar>} />
        <Route path="/dashboard/main" element={<LayoutWithNavbar><DashboardPage /></LayoutWithNavbar>} />
        <Route path="/samples" element={<LayoutWithNavbar><SamplesPage /></LayoutWithNavbar>} />
        <Route path="/qr-scan" element={<LayoutWithNavbar><QRScanPage /></LayoutWithNavbar>} />
        <Route path="/system-management" element={<LayoutWithNavbar><SystemManagementPage /></LayoutWithNavbar>} />
        <Route path="/users-management" element={<LayoutWithNavbar><UserManagementPage /></LayoutWithNavbar>} />
        <Route path="/department-management" element={<LayoutWithNavbar><DepartmentManagementPage /></LayoutWithNavbar>} />
        <Route path="/operation-code-management" element={<LayoutWithNavbar><OperationCodeManagement /></LayoutWithNavbar>} />
        <Route path="/access-management" element={<LayoutWithNavbar><AccessManagementPage /></LayoutWithNavbar>} />
        <Route path="/group-management" element={<LayoutWithNavbar><GroupManagementPage /></LayoutWithNavbar>} />
        <Route path="/warehouse-management" element={<LayoutWithNavbar><WarehouseManagementPage /></LayoutWithNavbar>} />
        <Route path="/history-management" element={<LayoutWithNavbar><HistoryManagementPage /></LayoutWithNavbar>} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
