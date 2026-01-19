import { Drawer, Descriptions } from 'antd';
import type { ProblemDetails } from '@tokenizasyon/web-api';

export interface ProblemDetailsDrawerProps {
  problem: ProblemDetails | null;
  onClose: () => void;
}

export const ProblemDetailsDrawer = ({ problem, onClose }: ProblemDetailsDrawerProps) => {
  return (
    <Drawer
      title="Problem Details"
      placement="right"
      open={!!problem}
      onClose={onClose}
      width={420}
    >
      {problem && (
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Title">{problem.title}</Descriptions.Item>
          <Descriptions.Item label="Status">{problem.status}</Descriptions.Item>
          <Descriptions.Item label="Detail">{problem.detail}</Descriptions.Item>
          <Descriptions.Item label="Type">{problem.type}</Descriptions.Item>
          <Descriptions.Item label="Instance">{problem.instance}</Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
};
