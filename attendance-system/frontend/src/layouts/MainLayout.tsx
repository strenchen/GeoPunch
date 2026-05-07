import { useTranslation } from 'react-i18next';
import { Layout, Menu } from 'antd';
import { UserOutlined, ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

const { Header, Content, Sider } = Layout;

export default function MainLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setLocale } = useAppStore();

  const menuItems = [
    { key: '/employee', icon: <UserOutlined />, label: t('menu.employee') },
    { key: '/attendance', icon: <ClockCircleOutlined />, label: t('menu.attendance') },
    { key: '/leave', icon: <CalendarOutlined />, label: t('menu.leave') },
    { key: '/approval', icon: <CheckCircleOutlined />, label: t('menu.approval') },
    { key: '/report', icon: <BarChartOutlined />, label: t('menu.report') }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Attendance System</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => setLocale('zh')} style={{ padding: '4px 12px', cursor: 'pointer' }}>中文</button>
          <button onClick={() => setLocale('en')} style={{ padding: '4px 12px', cursor: 'pointer' }}>EN</button>
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu mode="inline" items={menuItems} onClick={({ key }) => navigate(key)} style={{ height: '100%', borderRight: 0 }} />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content style={{ margin: '16px 0', minHeight: 280 }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}