import { Button, Card, Col, Form, Input, Row, Select, Space, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, ProblemDetailsDrawer, showConfirm, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, tokenLifecycleClient, type Asset } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const AssetManagement = () => {
  const queryClient = useQueryClient();
  const [problem, setProblem] = useState(null);

  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: () => tokenLifecycleClient.listAssets(tokenLifecycleBaseUrl)
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      tokenLifecycleClient.createAsset(tokenLifecycleBaseUrl, payload, uuid()),
    onSuccess: () => {
      message.success('Asset created');
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const submitMutation = useMutation({
    mutationFn: (assetId: string) => tokenLifecycleClient.submitAssetReview(tokenLifecycleBaseUrl, assetId, uuid()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] })
  });

  const approveMutation = useMutation({
    mutationFn: (assetId: string) => tokenLifecycleClient.approveAsset(tokenLifecycleBaseUrl, assetId, uuid()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] })
  });

  const rejectMutation = useMutation({
    mutationFn: (assetId: string) => tokenLifecycleClient.rejectAsset(tokenLifecycleBaseUrl, assetId, uuid()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets'] })
  });

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Issuer', dataIndex: 'issuerId' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Actions',
      render: (_: unknown, record: Asset) => (
        <Space>
          <Button size="small" onClick={() => submitMutation.mutate(record.id)} disabled={record.status !== 'DRAFT'}>
            Submit Review
          </Button>
          <Button size="small" onClick={() => approveMutation.mutate(record.id)} disabled={record.status !== 'REVIEW'}>
            Approve
          </Button>
          <Button size="small" danger onClick={() => rejectMutation.mutate(record.id)} disabled={record.status !== 'REVIEW'}>
            Reject
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Title level={3}>Asset Management</Title>
      <Row gutter={[16, 16]}>
        <Col span={10}>
          <RoleGuard allowed={['ADMIN', 'ISSUER']}>
            <Card title="Create Asset">
              <Form
                layout="vertical"
                onFinish={(values) =>
                  createMutation.mutate({
                    ...values,
                    metadata: values.metadata ? JSON.parse(values.metadata) : {},
                    valuation: values.valuation ? JSON.parse(values.valuation) : {}
                  })
                }
              >
                <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: 'BOND', label: 'Bond' },
                      { value: 'EQUITY', label: 'Equity' }
                    ]}
                  />
                </Form.Item>
                <Form.Item name="issuerId" label="Issuer ID" rules={[{ required: true }]}>
                  <Input placeholder="issuer-1" />
                </Form.Item>
                <Form.Item name="metadata" label="Metadata (JSON)" initialValue="{}">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="valuation" label="Valuation (JSON)" initialValue="{}">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="documents" label="Documents (stub)">
                  <Input placeholder="document placeholder" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                  Create
                </Button>
              </Form>
            </Card>
          </RoleGuard>
        </Col>
        <Col span={14}>
          <Card title="Asset List">
            <DataTable columns={columns} dataSource={assetsQuery.data ?? []} rowKey="id" />
          </Card>
        </Col>
      </Row>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
