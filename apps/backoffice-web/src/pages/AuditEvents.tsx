import { Button, Card, DatePicker, Form, Input, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@tokenizasyon/web-ui';
import { requestJson } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl } from '../config';

const { Title } = Typography;

interface AuditEntry {
  aggregateType: string;
  aggregateId: string;
  action: string;
  actorId: string;
  role: string;
  beforeHash: string | null;
  afterHash: string | null;
  createdAt: string;
}

interface OutboxEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  status: string;
  createdAt: string;
}

export const AuditEvents = () => {
  const auditQuery = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => requestJson<AuditEntry[]>({ baseUrl: tokenLifecycleBaseUrl, path: '/audit-log' })
  });

  const outboxQuery = useQuery({
    queryKey: ['outbox-events'],
    queryFn: () => requestJson<OutboxEvent[]>({ baseUrl: tokenLifecycleBaseUrl, path: '/outbox-events' })
  });

  return (
    <div>
      <Title level={3}>Audit & Events</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="Filters (client-side)">
          <Form layout="inline">
            <Form.Item label="Aggregate">
              <Input placeholder="Token / Asset" />
            </Form.Item>
            <Form.Item label="Actor ID">
              <Input placeholder="ops-1" />
            </Form.Item>
            <Form.Item label="Date">
              <DatePicker />
            </Form.Item>
            <Button>Apply</Button>
          </Form>
        </Card>
        <Card title="Audit Log">
          <DataTable
            columns={[
              { title: 'Aggregate', dataIndex: 'aggregateType' },
              { title: 'Aggregate ID', dataIndex: 'aggregateId' },
              { title: 'Action', dataIndex: 'action' },
              { title: 'Actor', dataIndex: 'actorId' },
              { title: 'Role', dataIndex: 'role' },
              { title: 'Before Hash', dataIndex: 'beforeHash' },
              { title: 'After Hash', dataIndex: 'afterHash' },
              { title: 'Timestamp', dataIndex: 'createdAt' }
            ]}
            dataSource={auditQuery.data ?? []}
            rowKey={(record) => `${record.aggregateId}-${record.createdAt}`}
          />
        </Card>
        <Card title="Outbox Events">
          <DataTable
            columns={[
              { title: 'Aggregate', dataIndex: 'aggregateType' },
              { title: 'Aggregate ID', dataIndex: 'aggregateId' },
              { title: 'Event', dataIndex: 'eventType' },
              { title: 'Status', dataIndex: 'status' },
              { title: 'Timestamp', dataIndex: 'createdAt' }
            ]}
            dataSource={outboxQuery.data ?? []}
            rowKey={(record) => `${record.aggregateId}-${record.createdAt}`}
          />
        </Card>
      </Space>
    </div>
  );
};
