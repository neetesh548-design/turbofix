/**
 * Ant Design Modals & Feedback Components
 * Comprehensive feedback system: modals, notifications, messages, confirmations
 */

import React from 'react';
import { Modal, Drawer, Popconfirm, notification, message, Tooltip, Spin, Skeleton, Empty } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

/**
 * Confirmation Dialog — Simple yes/no confirmation
 */
export const AntDConfirmDialog = ({
  title = 'Confirm',
  message: msg = 'Are you sure?',
  okText = 'Yes',
  cancelText = 'No',
  okType = 'primary',
  danger = false,
  onOk,
  onCancel,
}) => {
  return Modal.confirm({
    title,
    content: msg,
    okText,
    cancelText,
    okType: danger ? 'danger' : okType,
    onOk() {
      return new Promise((resolve) => {
        onOk?.();
        resolve();
      });
    },
    onCancel() {
      onCancel?.();
    },
  });
};

/**
 * Alert Dialog — For alerts, warnings, errors
 */
export const AntDAlertDialog = ({
  type = 'info', // info, success, warning, error
  title = 'Alert',
  message: msg = 'Message',
  onOk,
}) => {
  const iconMap = {
    info: <InfoCircleOutlined />,
    success: <CheckCircleOutlined />,
    warning: <ExclamationCircleOutlined />,
    error: <CloseCircleOutlined />,
  };

  return Modal.info({
    icon: iconMap[type],
    title,
    content: msg,
    okText: 'OK',
    onOk() {
      onOk?.();
    },
  });
};

/**
 * Modal Dialog — Full-featured modal
 */
export const AntDModalDialog = ({
  title,
  children,
  visible = true,
  width = 600,
  footer = null,
  okText = 'OK',
  cancelText = 'Cancel',
  onOk,
  onCancel,
  loading = false,
  centered = true,
}) => {
  return (
    <Modal
      title={title}
      visible={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      width={width}
      footer={footer}
      confirmLoading={loading}
      centered={centered}
    >
      {children}
    </Modal>
  );
};

/**
 * Side Drawer — For detailed views, forms
 */
export const AntDDrawer = ({
  title,
  children,
  visible = true,
  placement = 'right',
  width = 400,
  onClose,
  footer = null,
  closable = true,
}) => {
  return (
    <Drawer
      title={title}
      placement={placement}
      onClose={onClose}
      open={visible}
      width={width}
      closable={closable}
      footer={footer}
    >
      {children}
    </Drawer>
  );
};

/**
 * Notification System — Toast-style notifications
 */
export const AntDNotify = {
  success: (message, description, duration = 4.5) => {
    notification.success({
      message,
      description,
      duration,
      placement: 'topRight',
    });
  },

  error: (message, description, duration = 4.5) => {
    notification.error({
      message,
      description,
      duration,
      placement: 'topRight',
    });
  },

  warning: (message, description, duration = 4.5) => {
    notification.warning({
      message,
      description,
      duration,
      placement: 'topRight',
    });
  },

  info: (message, description, duration = 4.5) => {
    notification.info({
      message,
      description,
      duration,
      placement: 'topRight',
    });
  },

  open: (config) => {
    notification.open(config);
  },

  close: (key) => {
    notification.close(key);
  },
};

/**
 * Message System — Quick feedback messages
 */
export const AntDMessage = {
  success: (content, duration = 2) => {
    message.success(content, duration);
  },

  error: (content, duration = 2) => {
    message.error(content, duration);
  },

  warning: (content, duration = 2) => {
    message.warning(content, duration);
  },

  info: (content, duration = 2) => {
    message.info(content, duration);
  },

  loading: (content, duration = 0) => {
    return message.loading(content, duration);
  },
};

/**
 * Popconfirm — Inline confirmation (on buttons)
 */
export const AntDPopConfirm = ({
  title = 'Are you sure?',
  description = '',
  okText = 'Yes',
  cancelText = 'No',
  onConfirm,
  onCancel,
  danger = false,
  children,
}) => {
  return (
    <Popconfirm
      title={title}
      description={description}
      okText={okText}
      cancelText={cancelText}
      onConfirm={onConfirm}
      onCancel={onCancel}
      okButtonProps={{ danger }}
    >
      {children}
    </Popconfirm>
  );
};

/**
 * Loading Spinner — Full-screen or inline loader
 */
export const AntDLoader = ({ fullScreen = false, tip = 'Loading...' }) => {
  if (fullScreen) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <Spin size="large" />
        <span>{tip}</span>
      </div>
    );
  }

  return <Spin tip={tip} />;
};

/**
 * Skeleton Loader — Content placeholder
 */
export const AntDSkeleton = ({
  type = 'card', // card, list, form, table
  count = 1,
  active = true,
}) => {
  const skeletons = Array(count).fill(0).map((_, i) => (
    <Skeleton
      key={i}
      active={active}
      paragraph={{
        rows: type === 'card' ? 3 : type === 'list' ? 1 : 4,
      }}
      style={{ marginBottom: '16px' }}
    />
  ));

  return <>{skeletons}</>;
};

/**
 * Empty State — Friendly empty messages
 */
export const AntDEmptyMessage = ({
  message = 'No data',
  description = 'Nothing to display here',
  type = 'default', // default, notfound, servererror
}) => {
  const typeMap = {
    default: Empty.PRESENTED_IMAGE_DEFAULT,
    notfound: Empty.PRESENTED_IMAGE_SIMPLE,
    servererror: Empty.PRESENTED_IMAGE_DEFAULT,
  };

  return (
    <Empty
      image={typeMap[type]}
      description={
        <div>
          <div style={{ fontWeight: 500 }}>{message}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            {description}
          </div>
        </div>
      }
    />
  );
};

/**
 * Tooltip — Information popover
 */
export const AntDTooltip = ({
  title,
  children,
  placement = 'top',
  color = 'rgba(0,0,0,0.85)',
}) => {
  return (
    <Tooltip title={title} placement={placement} color={color}>
      {children}
    </Tooltip>
  );
};

export default {
  AntDConfirmDialog,
  AntDAlertDialog,
  AntDModalDialog,
  AntDDrawer,
  AntDNotify,
  AntDMessage,
  AntDPopConfirm,
  AntDLoader,
  AntDSkeleton,
  AntDEmptyMessage,
  AntDTooltip,
};
