import { Button, Card, Form, Select, Space, Typography } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DataTable, ProblemDetailsDrawer, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, tokenLifecycleClient, tradingVenueClient } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl, tradingVenueBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const TradingAdmin = () => {
  const [problem, setProblem] = useState(null);
  const [marketId, setMarketId] = useState('');

  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });

  const marketsQuery = useQuery({
    queryKey: ['markets'],
    queryFn: () => tradingVenueClient.listMarkets(tradingVenueBaseUrl)
  });

  const orderbookQuery = useQuery({
    queryKey: ['orderbook', marketId],
    queryFn: () => (marketId ? tradingVenueClient.getOrderBook(tradingVenueBaseUrl, marketId) : null),
    enabled: !!marketId
  });

  const tradesQuery = useQuery({
    queryKey: ['trades', marketId],
    queryFn: () => (marketId ? tradingVenueClient.listTrades(tradingVenueBaseUrl, marketId) : []),
    enabled: !!marketId
  });

  const createMarket = useMutation({
    mutationFn: (tokenId: string) => tradingVenueClient.createMarket(tradingVenueBaseUrl, { tokenId }, uuid()),
    onSuccess: () => marketsQuery.refetch(),
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const pauseMarket = useMutation({
    mutationFn: (id: string) => tradingVenueClient.pauseMarket(tradingVenueBaseUrl, id, uuid()),
    onSuccess: () => marketsQuery.refetch()
  });

  const resumeMarket = useMutation({
    mutationFn: (id: string) => tradingVenueClient.resumeMarket(tradingVenueBaseUrl, id, uuid()),
    onSuccess: () => marketsQuery.refetch()
  });

  const marketColumns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Token', dataIndex: 'tokenId' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_: unknown, record: { id: string; status: string }) => (
        <Space>
          <Button size="small" onClick={() => pauseMarket.mutate(record.id)} disabled={record.status !== 'ACTIVE'}>
            Pause
          </Button>
          <Button size="small" onClick={() => resumeMarket.mutate(record.id)} disabled={record.status !== 'PAUSED'}>
            Resume
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Trading Venue Admin</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <RoleGuard allowed={['OPS', 'ADMIN']}>
          <Card title="Create Market">
            <Form layout="inline" onFinish={(values) => createMarket.mutate(values.tokenId)}>
              <Form.Item name="tokenId" rules={[{ required: true }]}>
                <Select
                  style={{ width: 320 }}
                  options={(tokensQuery.data ?? []).map((token) => ({ value: token.id, label: `${token.symbol} · ${token.id}` }))}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit">Create</Button>
            </Form>
          </Card>
        </RoleGuard>
        <Card title="Markets">
          <DataTable columns={marketColumns} dataSource={marketsQuery.data ?? []} rowKey="id" />
        </Card>
        <Card title="Order Book Viewer">
          <Select
            style={{ width: 320, marginBottom: 12 }}
            placeholder="Select market"
            value={marketId}
            onChange={(value) => setMarketId(value)}
            options={(marketsQuery.data ?? []).map((market) => ({ value: market.id, label: market.id }))}
          />
          <Space align="start" size="large">
            <DataTable
              columns={[
                { title: 'Bid Price', dataIndex: 'price' },
                { title: 'Bid Qty', dataIndex: 'remainingQty' }
              ]}
              dataSource={orderbookQuery.data?.bids ?? []}
              rowKey={(record) => `${record.price}-${record.id}`}
            />
            <DataTable
              columns={[
                { title: 'Ask Price', dataIndex: 'price' },
                { title: 'Ask Qty', dataIndex: 'remainingQty' }
              ]}
              dataSource={orderbookQuery.data?.asks ?? []}
              rowKey={(record) => `${record.price}-${record.id}`}
            />
          </Space>
        </Card>
        <Card title="Recent Trades">
          <DataTable
            columns={[
              { title: 'Trade ID', dataIndex: 'id' },
              { title: 'Price', dataIndex: 'price' },
              { title: 'Qty', dataIndex: 'quantity' },
              { title: 'Time', dataIndex: 'executedAt' }
            ]}
            dataSource={tradesQuery.data ?? []}
            rowKey="id"
          />
        </Card>
      </Space>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
