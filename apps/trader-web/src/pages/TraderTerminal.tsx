import { Button, Card, Col, Form, Input, Row, Select, Space, Tag, Typography, message } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageLayout, DataTable } from '@tokenizasyon/web-ui';
import {
  ProblemDetailsError,
  tradingVenueClient,
  tokenLifecycleClient,
  marketMakerClient,
  getAuthContext,
  type Order
} from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl, tradingVenueBaseUrl, marketMakerBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const { Title, Text } = Typography;

export const TraderTerminal = () => {
  const [marketId, setMarketId] = useState('');

  const marketsQuery = useQuery({
    queryKey: ['markets'],
    queryFn: () => tradingVenueClient.listMarkets(tradingVenueBaseUrl)
  });

  const orderbookQuery = useQuery({
    queryKey: ['orderbook', marketId],
    queryFn: () => (marketId ? tradingVenueClient.getOrderBook(tradingVenueBaseUrl, marketId) : null),
    enabled: !!marketId,
    refetchInterval: 4000
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', marketId],
    queryFn: () => (marketId ? tradingVenueClient.listOrders(tradingVenueBaseUrl, marketId) : []),
    enabled: !!marketId,
    refetchInterval: 4000
  });

  const tradesQuery = useQuery({
    queryKey: ['trades', marketId],
    queryFn: () => (marketId ? tradingVenueClient.listTrades(tradingVenueBaseUrl, marketId) : []),
    enabled: !!marketId,
    refetchInterval: 4000
  });

  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });

  const mmStatusQuery = useQuery({
    queryKey: ['mm-status', marketId],
    queryFn: () => (marketId ? marketMakerClient.getStatus(marketMakerBaseUrl, marketId) : null),
    enabled: !!marketId,
    retry: false
  });

  const placeOrderMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      tradingVenueClient.placeOrder(tradingVenueBaseUrl, marketId, payload, uuid()),
    onSuccess: () => {
      message.success('Order placed');
      ordersQuery.refetch();
      tradesQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        message.error(error.problem.detail ?? error.problem.title ?? 'Order failed');
      }
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => tradingVenueClient.cancelOrder(tradingVenueBaseUrl, marketId, orderId, uuid()),
    onSuccess: () => ordersQuery.refetch()
  });

  const selectedMarket = (marketsQuery.data ?? []).find((market) => market.id === marketId);
  const selectedToken = (tokensQuery.data ?? []).find((token) => token.id === selectedMarket?.tokenId);

  const positionsQuery = useQuery({
    queryKey: ['positions', selectedMarket?.tokenId],
    queryFn: () =>
      selectedMarket?.tokenId ? tokenLifecycleClient.listPositions(tokenLifecycleBaseUrl, selectedMarket.tokenId) : [],
    enabled: !!selectedMarket?.tokenId
  });
  const auth = getAuthContext();
  const filteredPositions = (positionsQuery.data ?? []).filter((position) => position.holderId === auth?.actorId);

  const ladderData = (orderbookQuery.data?.bids ?? []).slice(0, 5).map((order) => ({
    price: order.price ?? '0',
    bidQty: Number(order.remainingQty),
    askQty: 0
  }));

  const askData = (orderbookQuery.data?.asks ?? []).slice(0, 5).map((order) => ({
    price: order.price ?? '0',
    bidQty: 0,
    askQty: Number(order.remainingQty)
  }));

  const mergedLadder = [...ladderData, ...askData].sort((a, b) => Number(a.price) - Number(b.price));

  const alerts = [
    selectedMarket?.status === 'PAUSED' ? 'Market paused' : null,
    selectedToken?.status === 'PAUSED' ? 'Token paused' : null,
    mmStatusQuery.data?.riskLimit?.killSwitch ? 'Market maker kill switch active' : null
  ].filter(Boolean) as string[];

  return (
    <PageLayout
      title="Trader Terminal"
      menuItems={[
        { key: 'terminal', label: 'Terminal' },
        { key: 'orders', label: 'Open Orders' },
        { key: 'trades', label: 'Trades Tape' },
        { key: 'positions', label: 'Positions' },
        { key: 'alerts', label: 'Alerts' }
      ]}
      selectedKey="terminal"
      onMenuSelect={() => null}
    >
      <Title level={3}>Market Selector</Title>
      <Space>
        <Select
          style={{ width: 300 }}
          placeholder="Select market"
          value={marketId}
          onChange={(value) => setMarketId(value)}
          options={(marketsQuery.data ?? []).map((market) => ({ value: market.id, label: market.id }))}
        />
        {selectedMarket && <Tag color={selectedMarket.status === 'ACTIVE' ? 'green' : 'red'}>{selectedMarket.status}</Tag>}
        {selectedToken && <Tag color={selectedToken.status === 'ACTIVE' ? 'green' : 'red'}>{selectedToken.status}</Tag>}
      </Space>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card title="Order Book Ladder">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mergedLadder}>
                <XAxis dataKey="price" />
                <Tooltip />
                <Bar dataKey="bidQty" fill="#1f77b4" />
                <Bar dataKey="askQty" fill="#ff7f0e" />
              </BarChart>
            </ResponsiveContainer>
            <Space style={{ marginTop: 16 }}>
              <DataTable
                columns={[
                  { title: 'Bid Price', dataIndex: 'price' },
                  { title: 'Bid Qty', dataIndex: 'remainingQty' }
                ]}
                dataSource={orderbookQuery.data?.bids ?? []}
                rowKey={(record: Order) => record.id}
              />
              <DataTable
                columns={[
                  { title: 'Ask Price', dataIndex: 'price' },
                  { title: 'Ask Qty', dataIndex: 'remainingQty' }
                ]}
                dataSource={orderbookQuery.data?.asks ?? []}
                rowKey={(record: Order) => record.id}
              />
            </Space>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="Place Order">
            <Form
              layout="vertical"
              onFinish={(values) =>
                placeOrderMutation.mutate({
                  ...values,
                  traderId: values.traderId,
                  price: values.type === 'MARKET' ? null : values.price,
                  timeInForce: values.timeInForce
                })
              }
            >
              <Form.Item name="traderId" label="Trader ID" rules={[{ required: true }]}>
                <Input placeholder="trader-1" />
              </Form.Item>
              <Form.Item name="side" label="Side" rules={[{ required: true }]}>
                <Select options={[{ value: 'BUY' }, { value: 'SELL' }]} />
              </Form.Item>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select options={[{ value: 'LIMIT' }, { value: 'MARKET' }]} />
              </Form.Item>
              <Form.Item name="price" label="Price">
                <Input placeholder="100" />
              </Form.Item>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                <Input placeholder="10" />
              </Form.Item>
              <Form.Item name="timeInForce" label="TIF" rules={[{ required: true }]}>
                <Select options={[{ value: 'GTC' }, { value: 'IOC' }]} />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                disabled={
                  !marketId ||
                  selectedMarket?.status !== 'ACTIVE' ||
                  selectedToken?.status === 'PAUSED' ||
                  mmStatusQuery.data?.riskLimit?.killSwitch
                }
              >
                Submit
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Open Orders">
            <DataTable
              columns={[
                { title: 'Order ID', dataIndex: 'id' },
                { title: 'Side', dataIndex: 'side' },
                { title: 'Price', dataIndex: 'price' },
                { title: 'Remaining', dataIndex: 'remainingQty' },
                {
                  title: 'Action',
                  render: (_: unknown, record: Order) => (
                    <Button size="small" onClick={() => cancelMutation.mutate(record.id)}>
                      Cancel
                    </Button>
                  )
                }
              ]}
              dataSource={(ordersQuery.data ?? []).filter((order) => order.status === 'OPEN')}
              rowKey="id"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Trades Tape">
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
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Positions">
            <Text type="secondary">Trader ID = holder mapping stub.</Text>
            <DataTable
              columns={[
                { title: 'Token', dataIndex: 'tokenId' },
                { title: 'Balance', dataIndex: 'balance' }
              ]}
              dataSource={filteredPositions.map((position) => ({
                tokenId: selectedMarket?.tokenId ?? '-',
                balance: position.balance
              }))}
              rowKey="tokenId"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Alerts">
            {alerts.length === 0 ? <Text>No alerts</Text> : alerts.map((alert) => <Tag key={alert}>{alert}</Tag>)}
          </Card>
        </Col>
      </Row>
    </PageLayout>
  );
};
