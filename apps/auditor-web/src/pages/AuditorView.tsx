import { Button, Card, Col, DatePicker, Form, Input, Row, Select, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { DataTable, PageLayout } from '@tokenizasyon/web-ui';
import { requestJson, tradingVenueClient, marketMakerClient } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl, tradingVenueBaseUrl, marketMakerBaseUrl } from '../config';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const { Title, Text } = Typography;

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

export const AuditorView = () => {
  const [marketId, setMarketId] = useState('');

  const auditQuery = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => requestJson<AuditEntry[]>({ baseUrl: tokenLifecycleBaseUrl, path: '/audit-log' })
  });

  const marketsQuery = useQuery({
    queryKey: ['markets'],
    queryFn: () => tradingVenueClient.listMarkets(tradingVenueBaseUrl)
  });

  const tradesQuery = useQuery({
    queryKey: ['trades', marketId],
    queryFn: () => (marketId ? tradingVenueClient.listTrades(tradingVenueBaseUrl, marketId) : []),
    enabled: !!marketId
  });

  const mmRunsQuery = useQuery({
    queryKey: ['mm-runs', marketId],
    queryFn: () => (marketId ? marketMakerClient.listRuns(marketMakerBaseUrl, marketId) : []),
    enabled: !!marketId
  });

  const mmOrdersQuery = useQuery({
    queryKey: ['mm-orders', marketId],
    queryFn: () => (marketId ? marketMakerClient.listOrders(marketMakerBaseUrl, marketId) : []),
    enabled: !!marketId
  });

  const surveillance = tradesQuery.data ?? [];
  const volumeData = surveillance.map((trade) => ({
    trade: trade.id,
    notional: Number(trade.quantity) * Number(trade.price)
  }));

  return (
    <PageLayout
      title="Auditor View"
      menuItems={[
        { key: 'timeline', label: 'Audit Timeline' },
        { key: 'immutable', label: 'Immutable Audit Log' },
        { key: 'surveillance', label: 'Trading Surveillance' },
        { key: 'mm', label: 'Market Maker Activity' },
        { key: 'export', label: 'Export' }
      ]}
      selectedKey="timeline"
      onMenuSelect={() => null}
    >
      <Title level={3}>Audit Timeline</Title>
      <Card>
        <Form layout="inline">
          <Form.Item label="Token/Asset ID">
            <Input placeholder="token-1" />
          </Form.Item>
          <Form.Item label="Actor ID">
            <Input placeholder="ops-1" />
          </Form.Item>
          <Form.Item label="Date">
            <DatePicker />
          </Form.Item>
          <Button>Filter</Button>
        </Form>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Immutable Audit Log">
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
        </Col>
        <Col span={12}>
          <Card title="Trading Surveillance (stub)">
            <Text type="secondary">Daily volume & largest trades.</Text>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData}>
                <XAxis dataKey="trade" hide />
                <Tooltip />
                <Bar dataKey="notional" fill="#0f1f39" />
              </BarChart>
            </ResponsiveContainer>
            <DataTable
              columns={[
                { title: 'Trade ID', dataIndex: 'id' },
                { title: 'Price', dataIndex: 'price' },
                { title: 'Qty', dataIndex: 'quantity' }
              ]}
              dataSource={tradesQuery.data ?? []}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="Market Selector">
            <Select
              style={{ width: '100%' }}
              placeholder="Select market"
              value={marketId}
              onChange={(value) => setMarketId(value)}
              options={(marketsQuery.data ?? []).map((market) => ({ value: market.id, label: market.id }))}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="MM Runs">
            <DataTable
              columns={[
                { title: 'Run ID', dataIndex: 'id' },
                { title: 'Reason', dataIndex: 'reason' },
                { title: 'Status', dataIndex: 'status' },
                { title: 'Started', dataIndex: 'startedAt' }
              ]}
              dataSource={mmRunsQuery.data ?? []}
              rowKey="id"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="MM Orders">
            <DataTable
              columns={[
                { title: 'Order ID', dataIndex: 'orderId' },
                { title: 'Side', dataIndex: 'side' },
                { title: 'Level', dataIndex: 'level' }
              ]}
              dataSource={mmOrdersQuery.data ?? []}
              rowKey="orderId"
            />
          </Card>
        </Col>
      </Row>

      <Card title="Export" style={{ marginTop: 16 }}>
        <Space>
          <Button>Export Audit CSV</Button>
          <Button>Export Trades CSV</Button>
          <Button>Export Corporate Actions CSV</Button>
        </Space>
      </Card>
    </PageLayout>
  );
};
