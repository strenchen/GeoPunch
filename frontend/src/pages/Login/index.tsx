import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { authService } from '../../services/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setToken, setCurrentUser } = useAppStore();

  const handleSubmit = async (values: { username: string; password: string }) => {
    try {
      const { accessToken, employee } = await authService.login({ 
        employeeNumber: values.username, 
        password: values.password 
      });
      setToken(accessToken);
      const getRoleName = (role: any) => typeof role === 'string' ? role : role?.name || '';
      setCurrentUser({ 
        id: employee.id as number, 
        name: employee.name, 
        role: getRoleName(employee.role) 
      });
      message.success(t('common.success'));
      navigate('/employee');
    } catch (err) {
      message.error(t('common.error'));
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Attendance System</h1>
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="username" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Login</Button>
        </Form>
      </Card>
    </div>
  );
}
