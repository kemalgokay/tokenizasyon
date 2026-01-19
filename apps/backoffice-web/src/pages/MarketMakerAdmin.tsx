import { Button, Card, Form, Input, Select, Space, Typography } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DataTable, ProblemDetailsDrawer, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, marketMakerClient, tradingVenueClient } from '@tokenizasyon/web-api';
import { marketMakerBaseUrl, tradingVenueBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const MarketMakerAdmin = () => {
  const [problem, setProblem] = useState(null);
  const [marketId, setMarketId] = useState('');

  const marketsQuery = useQuery({
    queryKey: ['markets'],
    queryFn: () => tradingVenueClient.listMarkets(tradingVenueBaseUrl)
  });

  const configQuery = useQuery({
    queryKey: ['mm-config', marketId],
    queryFn: () => (marketId ? marketMakerClient.getConfig(marketMakerBaseUrl, marketId) : null),
    enabled: !!marketId
  });

  const inventoryQuery = useQuery({
    queryKey: ['mm-inventory', marketId],
    queryFn: () => (marketId ? marketMakerClient.getInventory(marketMakerBaseUrl, marketId) : null),
    enabled: !!marketId && configQuery.isSuccess
  });

  const ordersQuery = useQuery({
    queryKey: ['mm-orders', marketId],
    queryFn: () => (marketId ? marketMakerClient.listOrders(marketMakerBaseUrl, marketId) : []),
    enabled: !!marketId && configQuery.isSuccess
  });

  const statusQuery = useQuery({
    queryKey: ['mm-status', marketId],
    queryFn: () => (marketId ? marketMakerClient.getStatus(marketMakerBaseUrl, marketId) : null),
    enabled: !!marketId && configQuery.isSuccess
  });

  const updateConfig = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      marketMakerClient.upsertConfig(marketMakerBaseUrl, marketId, payload, uuid()),
    onSuccess: () => configQuery.refetch(),
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const toggleEnable = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled
        ? marketMakerClient.enable(marketMakerBaseUrl, marketId, uuid())
        : marketMakerClient.disable(marketMakerBaseUrl, marketId, uuid()),
    onSuccess: () => configQuery.refetch()
  });

  const setPrice = useMutation({
    mutationFn: (midPrice: string) =>
      marketMakerClient.setManualPrice(marketMakerBaseUrl, marketId, { midPrice }, uuid()),
    onSuccess: () => configQuery.refetch()
  });

  const runMM = useMutation({
    mutationFn: () => marketMakerClient.run(marketMakerBaseUrl, marketId, { reason: 'MANUAL' }, uuid())
  });

  const killSwitch = useMutation({
    mutationFn: (enabled: boolean) => marketMakerClient.toggleKillSwitch(marketMakerBaseUrl, marketId, enabled, uuid())
  });

  const riskLimit = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      marketMakerClient.updateRiskLimits(marketMakerBaseUrl, marketId, payload, uuid())
  });

  return (
    <div>
      <Title level={3}>Market Maker Admin</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="Select Market">
          <Select
            style={{ width: 320 }}
            placeholder="Select market"
            value={marketId}
            onChange={(value) => setMarketId(value)}
            options={(marketsQuery.data ?? []).map((market) => ({ value: market.id, label: market.id }))}
          />
        </Card>
        <RoleGuard allowed={['ADMIN', 'OPS', 'MARKET_MAKER']}>
          <Card title="MM Configuration">
            <Form layout="inline" onFinish={(values) => updateConfig.mutate(values)}>
              <Form.Item name="baseSpreadBps" initialValue={configQuery.data?.baseSpreadBps ?? 20}>
                <Input placeholder="Base Spread (bps)" />
              </Form.Item>
              <Form.Item name="stepBps" initialValue={configQuery.data?.stepBps ?? 5}>
                <Input placeholder="Step (bps)" />
              </Form.Item>
              <Form.Item name="levels" initialValue={configQuery.data?.levels ?? 5}>
                <Input placeholder="Levels" />
              </Form.Item>
              <Form.Item name="baseQty" initialValue={configQuery.data?.baseQty ?? '1000'}>
                <Input placeholder="Base Qty" />
              </Form.Item>
              <Button type="primary" htmlType="submit" disabled={!marketId}>
                Save
              </Button>
            </Form>
          </Card>
          <Card title="Controls">
            <Space>
              <Button type="primary" onClick={() => toggleEnable.mutate(true)} disabled={!marketId}>
                Enable
              </Button>
              <Button danger onClick={() => toggleEnable.mutate(false)} disabled={!marketId}>
                Disable
              </Button>
              <Button onClick={() => runMM.mutate()} disabled={!marketId || statusQuery.data?.riskLimit?.killSwitch}>
                Run
              </Button>
            </Space>
          </Card>
          <Card title="Manual Price">
            <Form layout="inline" onFinish={(values) => setPrice.mutate(values.midPrice)}>
              <Form.Item name="midPrice" rules={[{ required: true }]}>
                <Input placeholder="Mid price" />
              </Form.Item>
              <Button type="primary" htmlType="submit" disabled={!marketId}>
                Set Price
              </Button>
            </Form>
          </Card>
          <Card title="Risk Limits & Kill Switch">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form layout="inline" onFinish={(values) => riskLimit.mutate(values)}>
                <Form.Item name="maxNetPosition" rules={[{ required: true }]}>
                  <Input placeholder="Max Net Position" />
                </Form.Item>
                <Form.Item name="maxNotionalPerOrder" rules={[{ required: true }]}>
                  <Input placeholder="Max Notional / Order" />
                </Form.Item>
                <Form.Item name="maxOpenOrders" rules={[{ required: true }]}>
                  <Input placeholder="Max Open Orders" />
                </Form.Item>
                <Form.Item name="maxDailyNotional" rules={[{ required: true }]}>
                  <Input placeholder="Max Daily Notional" />
                </Form.Item>
                <Button type="primary" htmlType="submit" disabled={!marketId}>
                  Update Limits
                </Button>
              </Form>
              <Button danger onClick={() => killSwitch.mutate(true)} disabled={!marketId}>
                Activate Kill Switch
              </Button>
              <Button onClick={() => killSwitch.mutate(false)} disabled={!marketId}>
                Deactivate Kill Switch
              </Button>
            </Space>
          </Card>
          <Card title="Inventory">
            <DataTable
              columns={[
                { title: 'Market', dataIndex: 'marketId' },
                { title: 'Net Position', dataIndex: 'netPosition' },
                { title: 'Token Balance', dataIndex: 'balanceToken' },
                { title: 'Fiat Stub', dataIndex: 'balanceFiatStub' }
              ]}
              dataSource={inventoryQuery.data ? [inventoryQuery.data] : []}
              rowKey="marketId"
            />
          </Card>
          <Card title="Open Orders">
            <DataTable
              columns={[
                { title: 'Order ID', dataIndex: 'orderId' },
                { title: 'Side', dataIndex: 'side' },
                { title: 'Level', dataIndex: 'level' }
              ]}
              dataSource={ordersQuery.data ?? []}
              rowKey="orderId"
            />
          </Card>
        </RoleGuard>
      </Space>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
