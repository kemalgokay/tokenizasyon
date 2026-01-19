import { Button, Card, Col, Form, Input, Row, Select, Space, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, ProblemDetailsDrawer, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, tokenLifecycleClient, type Token } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const TokenManagement = () => {
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState(null);
  const [selectedTokenId, setSelectedTokenId] = useState('');

  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: () => tokenLifecycleClient.listAssets(tokenLifecycleBaseUrl)
  });

  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });

  const positionsQuery = useQuery({
    queryKey: ['positions', selectedTokenId],
    queryFn: () => (selectedTokenId ? tokenLifecycleClient.listPositions(tokenLifecycleBaseUrl, selectedTokenId) : []),
    enabled: !!selectedTokenId
  });

  const whitelistQuery = useQuery({
    queryKey: ['whitelist', selectedTokenId],
    queryFn: () => (selectedTokenId ? tokenLifecycleClient.listWhitelist(tokenLifecycleBaseUrl, selectedTokenId) : []),
    enabled: !!selectedTokenId
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      tokenLifecycleClient.createToken(tokenLifecycleBaseUrl, payload, uuid()),
    onSuccess: () => {
      message.success('Token created');
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
    },
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const activateMutation = useMutation({
    mutationFn: (tokenId: string) => tokenLifecycleClient.activateToken(tokenLifecycleBaseUrl, tokenId, uuid()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tokens'] })
  });

  const pauseMutation = useMutation({
    mutationFn: (tokenId: string) => tokenLifecycleClient.pauseToken(tokenLifecycleBaseUrl, tokenId, uuid()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tokens'] })
  });

  const resumeMutation = useMutation({
    mutationFn: (tokenId: string) => tokenLifecycleClient.resumeToken(tokenLifecycleBaseUrl, tokenId, uuid()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tokens'] })
  });

  const addWhitelistMutation = useMutation({
    mutationFn: (holderId: string) => tokenLifecycleClient.addWhitelist(tokenLifecycleBaseUrl, selectedTokenId, holderId, uuid()),
    onSuccess: () => whitelistQuery.refetch()
  });

  const removeWhitelistMutation = useMutation({
    mutationFn: (holderId: string) =>
      tokenLifecycleClient.removeWhitelist(tokenLifecycleBaseUrl, selectedTokenId, holderId, uuid()),
    onSuccess: () => whitelistQuery.refetch()
  });

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Symbol', dataIndex: 'symbol' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_: unknown, record: Token) => (
        <Space>
          <Button size="small" onClick={() => activateMutation.mutate(record.id)} disabled={record.status !== 'CREATED'}>
            Activate
          </Button>
          <Button size="small" onClick={() => pauseMutation.mutate(record.id)} disabled={record.status !== 'ACTIVE'}>
            Pause
          </Button>
          <Button size="small" onClick={() => resumeMutation.mutate(record.id)} disabled={record.status !== 'PAUSED'}>
            Resume
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Token Management</Title>
      <Row gutter={[16, 16]}>
        <Col span={10}>
          <RoleGuard allowed={['ADMIN', 'ISSUER']}>
            <Card title="Create Token">
              <Form
                layout="vertical"
                onFinish={(values) =>
                  createMutation.mutate({
                    ...values,
                    rules: { whitelistRequired: values.whitelistRequired }
                  })
                }
              >
                <Form.Item name="assetId" label="Approved Asset" rules={[{ required: true }]}>
                  <Select
                    options={(assetsQuery.data ?? [])
                      .filter((asset) => asset.status === 'APPROVED')
                      .map((asset) => ({ value: asset.id, label: `${asset.type} · ${asset.id}` }))}
                  />
                </Form.Item>
                <Form.Item name="symbol" label="Symbol" rules={[{ required: true }]}>
                  <Input placeholder="BND" />
                </Form.Item>
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input placeholder="Bond Token" />
                </Form.Item>
                <Form.Item name="decimals" label="Decimals" initialValue={2}>
                  <Input type="number" />
                </Form.Item>
                <Form.Item name="whitelistRequired" label="Whitelist Required" initialValue={false}>
                  <Select options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  Create Token
                </Button>
              </Form>
            </Card>
          </RoleGuard>
        </Col>
        <Col span={14}>
          <Card title="Tokens">
            <DataTable columns={columns} dataSource={tokensQuery.data ?? []} rowKey="id" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card title="Holder Positions">
            <Select
              style={{ width: '100%', marginBottom: 12 }}
              placeholder="Select token"
              value={selectedTokenId}
              onChange={(value) => setSelectedTokenId(value)}
              options={(tokensQuery.data ?? []).map((token) => ({ value: token.id, label: `${token.symbol} · ${token.id}` }))}
            />
            <DataTable
              columns={[
                { title: 'Holder', dataIndex: 'holderId' },
                { title: 'Balance', dataIndex: 'balance' }
              ]}
              dataSource={positionsQuery.data ?? []}
              rowKey="holderId"
            />
          </Card>
        </Col>
        <Col span={8}>
          <RoleGuard allowed={['OPS', 'ADMIN']}>
            <Card title="Whitelist Management">
              <Form
                layout="inline"
                onFinish={(values) => addWhitelistMutation.mutate(values.holderId)}
              >
                <Form.Item name="holderId" rules={[{ required: true }]}>
                  <Input placeholder="holder-1" />
                </Form.Item>
                <Button type="primary" htmlType="submit" disabled={!selectedTokenId}>
                  Add
                </Button>
              </Form>
              <DataTable
                style={{ marginTop: 12 }}
                columns={[
                  { title: 'Holder', dataIndex: 'holderId' },
                  { title: 'Status', dataIndex: 'status' },
                  {
                    title: 'Actions',
                    render: (_: unknown, record: { holderId: string }) => (
                      <Button
                        size="small"
                        danger
                        onClick={() => removeWhitelistMutation.mutate(record.holderId)}
                      >
                        Remove
                      </Button>
                    )
                  }
                ]}
                dataSource={whitelistQuery.data ?? []}
                rowKey="holderId"
              />
            </Card>
          </RoleGuard>
        </Col>
      </Row>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
