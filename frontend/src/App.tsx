import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';
import EmployeePage from './pages/Employee';
import AttendancePage from './pages/Attendance';
import LeavePage from './pages/Leave';
import ApprovalPage from './pages/Approval';
import ReportPage from './pages/Report';
import SchedulePage from './pages/Schedule';
import DepartmentPage from './pages/Department';
import RolePage from './pages/Role';
import SettingsPage from './pages/Settings';
import { useAppStore } from './store/appStore';
import './i18n';

const queryClient = new QueryClient();

function AppContent() {
  const { locale, token } = useAppStore();
  return (
    <ConfigProvider locale={locale === 'zh' ? zhCN : enUS}>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/employee" replace /> : <LoginPage />} />
        <Route path="/" element={token ? <MainLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/employee" replace />} />
          <Route path="employee" element={<EmployeePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="approval" element={<ApprovalPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="department" element={<DepartmentPage />} />
          <Route path="role" element={<RolePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
