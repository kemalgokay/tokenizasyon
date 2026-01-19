import { Modal } from 'antd';

export interface ConfirmOptions {
  title: string;
  content: string;
  onOk: () => void;
}

export const showConfirm = ({ title, content, onOk }: ConfirmOptions) => {
  Modal.confirm({
    title,
    content,
    onOk
  });
};
