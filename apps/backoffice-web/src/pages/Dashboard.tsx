import { Card, Col, Row, Statistic, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { tokenLifecycleClient, tradingVenueClient, marketMakerClient } from '@tokenizasyon/web-api';
import { tokenLifecycleBaseUrl, tradingVenueBaseUrl, marketMakerBaseUrl } from '../config';

const { Title } = Typography;

export const Dashboard = () => {
  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: () => tokenLifecycleClient.listAssets(tokenLifecycleBaseUrl)
  });
  const tokensQuery = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokenLifecycleClient.listTokens(tokenLifecycleBaseUrl)
  });
  const marketsQuery = useQuery({
    queryKey: ['markets'],
    queryFn: () => tradingVenueClient.listMarkets(tradingVenueBaseUrl)
  });
  const mmQuery = useQuery({
    queryKey: ['mm-config', marketsQuery.data?.[0]?.id ?? ''],
    queryFn: () =>
      marketsQuery.data?.[0]?.id
        ? marketMakerClient.getConfig(marketMakerBaseUrl, marketsQuery.data[0].id)
        : Promise.resolve(null)
  });

  const assets = assetsQuery.data ?? [];
  const tokens = tokensQuery.data ?? [];
  const markets = marketsQuery.data ?? [];

  return (
    <div>
      <Title level={3}>Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="Active Tokens" value={tokens.filter((token) => token.status === 'ACTIVE').length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Asset Review"
              value={assets.filter((asset) => asset.status === 'REVIEW').length}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Active Markets" value={markets.filter((market) => market.status === 'ACTIVE').length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="MM Status"
              value={mmQuery.data?.enabled ? 'ENABLED' : 'DISABLED'}
              valueStyle={{ color: mmQuery.data?.enabled ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
