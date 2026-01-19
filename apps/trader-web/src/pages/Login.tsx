import { Button, Card, Form, Input, Select, Typography } from 'antd';
import { setAuthContext, type ActorRole } from '@tokenizasyon/web-api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const roleOptions: ActorRole[] = ['TRADER'];

export const Login = () => {
  const navigate = useNavigate();

  const handleFinish = (values: { actorId: string; actorRole: ActorRole }) => {
    setAuthContext(values);
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 120 }}>
      <Card style={{ width: 420 }}>
        <Title level={4}>Trader Login</Title>
        <Text type="secondary">Role ve actor kimliği ile işlem ekranına giriş.</Text>
        <Form layout="vertical" onFinish={handleFinish} style={{ marginTop: 24 }}>
          <Form.Item name="actorId" label="Actor ID" rules={[{ required: true }]}>
            <Input placeholder="trader-1" />
          </Form.Item>
          <Form.Item name="actorRole" label="Role" rules={[{ required: true }]}>
            <Select options={roleOptions.map((role) => ({ value: role, label: role }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Login
          </Button>
        </Form>
      </Card>
    </div>
  );
};
