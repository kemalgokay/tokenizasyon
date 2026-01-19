import { Button, Card, Form, Input, Select, Space, Typography, message } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DataTable, ProblemDetailsDrawer, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, tokenLifecycleClient } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const CorporateActions = () => {
  const [problem, setProblem] = useState(null);
  const [tokenId, setTokenId] = useState<string>('');

  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });

  const actionsQuery = useQuery({
    queryKey: ['corporate-actions', tokenId],
    queryFn: () => (tokenId ? tokenLifecycleClient.listCorporateActions(tokenLifecycleBaseUrl, tokenId) : []),
    enabled: !!tokenId
  });

  const scheduleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      tokenLifecycleClient.scheduleCorporateAction(tokenLifecycleBaseUrl, tokenId, payload, uuid()),
    onSuccess: () => {
      message.success('Corporate action scheduled');
      actionsQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const executeMutation = useMutation({
    mutationFn: (actionId: string) =>
      tokenLifecycleClient.executeCorporateAction(tokenLifecycleBaseUrl, tokenId, actionId, uuid()),
    onSuccess: () => actionsQuery.refetch()
  });

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Record Date', dataIndex: 'recordDate' },
    { title: 'Pay Date', dataIndex: 'payDate' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_: unknown, record: { id: string; status: string }) => (
        <Button size="small" onClick={() => executeMutation.mutate(record.id)} disabled={record.status !== 'SCHEDULED'}>
          Execute
        </Button>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Corporate Actions</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="Select Token">
          <Select
            style={{ width: 320 }}
            placeholder="Select token"
            value={tokenId}
            onChange={(value) => setTokenId(value)}
            options={(tokensQuery.data ?? []).map((token) => ({ value: token.id, label: `${token.symbol} · ${token.id}` }))}
          />
        </Card>
        <RoleGuard allowed={['OPS', 'ADMIN']}>
          <Card title="Schedule Corporate Action">
            <Form layout="inline" onFinish={(values) => scheduleMutation.mutate(values)}>
              <Form.Item name="type" rules={[{ required: true }]}>
                <Select
                  style={{ width: 160 }}
                  placeholder="Type"
                  options={[
                    { value: 'COUPON', label: 'Coupon' },
                    { value: 'DIVIDEND', label: 'Dividend' },
                    { value: 'SPLIT', label: 'Split' },
                    { value: 'MERGE', label: 'Merge' }
                  ]}
                />
              </Form.Item>
              <Form.Item name="recordDate" rules={[{ required: true }]}>
                <Input placeholder="2025-01-01" />
              </Form.Item>
              <Form.Item name="payDate" rules={[{ required: true }]}>
                <Input placeholder="2025-01-05" />
              </Form.Item>
              <Form.Item name="ratio" rules={[{ required: false }]}>
                <Input placeholder="Ratio (optional)" />
              </Form.Item>
              <Button type="primary" htmlType="submit" disabled={!tokenId}>
                Schedule
              </Button>
            </Form>
          </Card>
        </RoleGuard>
        <Card title="Corporate Actions">
          <DataTable columns={columns} dataSource={actionsQuery.data ?? []} rowKey="id" />
        </Card>
      </Space>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
