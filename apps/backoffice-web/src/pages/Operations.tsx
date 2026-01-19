import { Button, Card, Col, Form, Input, Row, Select, Typography, message } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ProblemDetailsDrawer, RoleGuard } from '@tokenizasyon/web-ui';
import { ProblemDetailsError, tokenLifecycleClient } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl } from '../config';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

const { Title } = Typography;

export const Operations = () => {
  const [problem, setProblem] = useState(null);
  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });

  const mintMutation = useMutation({
    mutationFn: ({ tokenId, payload }: { tokenId: string; payload: Record<string, unknown> }) =>
      tokenLifecycleClient.mint(tokenLifecycleBaseUrl, tokenId, payload, uuid()),
    onSuccess: () => message.success('Mint executed'),
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const burnMutation = useMutation({
    mutationFn: ({ tokenId, payload }: { tokenId: string; payload: Record<string, unknown> }) =>
      tokenLifecycleClient.burn(tokenLifecycleBaseUrl, tokenId, payload, uuid()),
    onSuccess: () => message.success('Burn executed'),
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const transferMutation = useMutation({
    mutationFn: ({ tokenId, payload }: { tokenId: string; payload: Record<string, unknown> }) =>
      tokenLifecycleClient.transfer(tokenLifecycleBaseUrl, tokenId, payload, uuid()),
    onSuccess: () => message.success('Transfer executed'),
    onError: (error) => {
      if (error instanceof ProblemDetailsError) {
        setProblem(error.problem);
      }
    }
  });

  const tokenOptions = (tokensQuery.data ?? []).map((token) => ({
    value: token.id,
    label: `${token.symbol} · ${token.status}`,
    disabled: token.status === 'PAUSED'
  }));

  return (
    <div>
      <Title level={3}>Operations</Title>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <RoleGuard allowed={['OPS', 'ADMIN']}>
            <Card title="Mint">
              <Form
                layout="vertical"
                onFinish={(values) => mintMutation.mutate({ tokenId: values.tokenId, payload: values })}
              >
                <Form.Item name="tokenId" label="Token" rules={[{ required: true }]}>
                  <Select options={tokenOptions} />
                </Form.Item>
                <Form.Item name="toHolderId" label="To Holder" rules={[{ required: true }]}>
                  <Input placeholder="holder-1" />
                </Form.Item>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit">Mint</Button>
              </Form>
            </Card>
          </RoleGuard>
        </Col>
        <Col span={8}>
          <RoleGuard allowed={['OPS', 'ADMIN']}>
            <Card title="Burn">
              <Form
                layout="vertical"
                onFinish={(values) => burnMutation.mutate({ tokenId: values.tokenId, payload: values })}
              >
                <Form.Item name="tokenId" label="Token" rules={[{ required: true }]}>
                  <Select options={tokenOptions} />
                </Form.Item>
                <Form.Item name="fromHolderId" label="From Holder" rules={[{ required: true }]}>
                  <Input placeholder="holder-1" />
                </Form.Item>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit">Burn</Button>
              </Form>
            </Card>
          </RoleGuard>
        </Col>
        <Col span={8}>
          <RoleGuard allowed={['OPS', 'ADMIN']}>
            <Card title="Transfer">
              <Form
                layout="vertical"
                onFinish={(values) => transferMutation.mutate({ tokenId: values.tokenId, payload: values })}
              >
                <Form.Item name="tokenId" label="Token" rules={[{ required: true }]}>
                  <Select options={tokenOptions} />
                </Form.Item>
                <Form.Item name="fromHolderId" label="From Holder" rules={[{ required: true }]}>
                  <Input placeholder="holder-1" />
                </Form.Item>
                <Form.Item name="toHolderId" label="To Holder" rules={[{ required: true }]}>
                  <Input placeholder="holder-2" />
                </Form.Item>
                <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit">Transfer</Button>
              </Form>
            </Card>
          </RoleGuard>
        </Col>
      </Row>
      <ProblemDetailsDrawer problem={problem} onClose={() => setProblem(null)} />
    </div>
  );
};
