import { useTranslation } from 'react-i18next';
import { Layout, Menu, Button } from 'antd';
import { UserOutlined, ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined, BarChartOutlined, ScheduleOutlined, SettingOutlined, LogoutOutlined, TeamOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

const { Header, Content, Sider } = Layout;

export default function MainLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setLocale, locale, setToken, setCurrentUser, currentUser } = useAppStore();

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    navigate('/login');
  };

  const menuItems = [
    { key: '/employee', icon: <UserOutlined />, label: t('menu.employee') },
    { key: '/attendance', icon: <ClockCircleOutlined />, label: t('menu.attendance') },
    { key: '/leave', icon: <CalendarOutlined />, label: t('menu.leave') },
    { key: '/approval', icon: <CheckCircleOutlined />, label: t('menu.approval') },
    { key: '/report', icon: <BarChartOutlined />, label: t('menu.report') },
    { key: '/schedule', icon: <ScheduleOutlined />, label: t('menu.schedule') },
    { key: '/department', icon: <TeamOutlined />, label: t('menu.department') },
    { key: '/settings', icon: <SettingOutlined />, label: t('menu.settings') }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001529', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{t('app.title')}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {currentUser && (
            <span style={{ color: '#fff', fontSize: 14 }}>
              {currentUser.name} ({currentUser.role})
            </span>
          )}
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ color: '#fff' }}
          >
            {t('common.logout') || '退出'}
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setLocale('zh')}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              background: locale === 'zh' ? '#1890ff' : 'transparent',
              color: '#fff',
              border: '1px solid #fff',
              borderRadius: 4
            }}
          >
            中文
          </button>
          <button
            onClick={() => setLocale('en')}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              background: locale === 'en' ? '#1890ff' : 'transparent',
              color: '#fff',
              border: '1px solid #fff',
              borderRadius: 4
            }}
          >
            EN
          </button>
        </div>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: '#fff' }}>
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
