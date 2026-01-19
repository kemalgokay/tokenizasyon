import { Table } from 'antd';
import type { TableProps } from 'antd';

export const DataTable = <T extends object>(props: TableProps<T>) => {
  return <Table<T> size="small" bordered pagination={{ pageSize: 8 }} {...props} />;
};
