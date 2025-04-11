import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet, Navigate } from "react-router-dom";

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

import { PermissionProvider, PermissionContext } from './context/PermissionContext';

const RequirePermission = ({ permission, children }) => {
  const { permissions } = React.useContext(PermissionContext);
  return permissions.includes(permission) ? children : <Navigate to="/dashboard" />;
};

const LayoutWithNavbar = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== "/login";
  return (
    <>
      {showNavbar && <Navbar />}
      <Outlet />
    </>
  );
};

function App() {
  return (
    <PermissionProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<LayoutWithNavbar />}>
            <Route path="/dashboard" element={<HomePage />} />
            <Route path="/dashboard/main" element={<DashboardPage />} />

            <Route path="/samples" element={
              <RequirePermission permission="sample">
                <SamplesPage />
              </RequirePermission>
            } />

            <Route path="/qr-scan" element={
              <RequirePermission permission="scan">
                <QRScanPage />
              </RequirePermission>
            } />

            <Route path="/system-management" element={
              <RequirePermission permission="system_management">
                <SystemManagementPage />
              </RequirePermission>
            } />

            <Route path="/users-management" element={
              <RequirePermission permission="users">
                <UserManagementPage />
              </RequirePermission>
            } />

            <Route path="/department-management" element={
              <RequirePermission permission="dept">
                <DepartmentManagementPage />
              </RequirePermission>
            } />

            <Route path="/operation-code-management" element={
              <RequirePermission permission="operation_code">
                <OperationCodeManagement />
              </RequirePermission>
            } />

            <Route path="/access-management" element={
              <RequirePermission permission="permission">
                <AccessManagementPage />
              </RequirePermission>
            } />

            <Route path="/group-management" element={
              <RequirePermission permission="groups">
                <GroupManagementPage />
              </RequirePermission>
            } />

            <Route path="/warehouse-management" element={
              <RequirePermission permission="warehouse">
                <WarehouseManagementPage />
              </RequirePermission>
            } />

            <Route path="/history-management" element={
              <RequirePermission permission="history">
                <HistoryManagementPage />
              </RequirePermission>
            } />
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Router>
    </PermissionProvider>
  );
}

export default App;
