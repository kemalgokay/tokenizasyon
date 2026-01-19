import { Button, Card, Select, Space, Typography } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DataTable, ProblemDetailsDrawer, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, tokenLifecycleClient } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const Redemptions = () => {
  const [problem, setProblem] = useState(null);
  const [tokenId, setTokenId] = useState('');

  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });

  const redemptionsQuery = useQuery({
    queryKey: ['redemptions', tokenId],
    queryFn: () => (tokenId ? tokenLifecycleClient.listRedemptions(tokenLifecycleBaseUrl, tokenId) : []),
    enabled: !!tokenId
  });

  const approveMutation = useMutation({
    mutationFn: (redemptionId: string) =>
      tokenLifecycleClient.approveRedemption(tokenLifecycleBaseUrl, tokenId, redemptionId, uuid()),
    onSuccess: () => redemptionsQuery.refetch(),
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (redemptionId: string) =>
      tokenLifecycleClient.rejectRedemption(tokenLifecycleBaseUrl, tokenId, redemptionId, uuid()),
    onSuccess: () => redemptionsQuery.refetch()
  });

  const settleMutation = useMutation({
    mutationFn: (redemptionId: string) =>
      tokenLifecycleClient.settleRedemption(tokenLifecycleBaseUrl, tokenId, redemptionId, uuid()),
    onSuccess: () => redemptionsQuery.refetch()
  });

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_: unknown, record: { id: string; status: string }) => (
        <Space>
          <Button size="small" onClick={() => approveMutation.mutate(record.id)} disabled={record.status !== 'REQUESTED'}>
            Approve
          </Button>
          <Button size="small" onClick={() => rejectMutation.mutate(record.id)} disabled={record.status !== 'REQUESTED'}>
            Reject
          </Button>
          <Button size="small" onClick={() => settleMutation.mutate(record.id)} disabled={record.status !== 'APPROVED'}>
            Settle
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Redemptions</Title>
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
          <Card title="Redemption Requests">
            <DataTable columns={columns} dataSource={redemptionsQuery.data ?? []} rowKey="id" />
          </Card>
        </RoleGuard>
      </Space>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
