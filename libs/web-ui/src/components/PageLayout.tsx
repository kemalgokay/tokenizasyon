import { Layout, Menu, Typography, Space, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { getAuthContext, getCorrelationId } from '@tokenizasyon/web-api';
import { useMemo } from 'react';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export interface PageLayoutProps {
  title: string;
  menuItems: MenuProps['items'];
  selectedKey: string;
  onMenuSelect: (key: string) => void;
  children: React.ReactNode;
}

export const PageLayout = ({ title, menuItems, selectedKey, onMenuSelect, children }: PageLayoutProps) => {
  const auth = useMemo(() => getAuthContext(), []);
  const correlationId = useMemo(() => getCorrelationId(), []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={260} style={{ background: '#0f1f39' }}>
        <div style={{ padding: '20px', color: '#fff' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            Tokenizasyon
          </Title>
          <Text style={{ color: '#9fb3d1' }}>{title}</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          items={menuItems}
          selectedKeys={[selectedKey]}
          onClick={(info) => onMenuSelect(info.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <Space style={{ height: '100%', alignItems: 'center' }} size="large">
            <Title level={4} style={{ margin: 0 }}>{title}</Title>
            {auth ? (
              <Tag color="blue">{auth.actorRole} · {auth.actorId}</Tag>
            ) : (
              <Tag color="red">Not authenticated</Tag>
            )}
            <Tag color="default">Correlation: {correlationId}</Tag>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f7fb' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};
