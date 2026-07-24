/**
 * Ant Design Navigation Layout
 * Replaces custom AppShell navigation with Ant Design Layout + Menu
 * Provides: Sidebar, Header, Breadcrumbs, responsive layout
 */

import React, { useState } from 'react';
import { Layout, Menu, Breadcrumb, Button, Dropdown, Space, Badge } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { useI18n } from '../utils/i18n';

const { Header, Sider, Content, Footer } = Layout;

/**
 * Navigation menu items with icons
 */
const getNavMenuItems = (t) => [
  { key: 'dashboard', label: t('nav.dashboard'), path: '/dashboard.html', icon: '📊' },
  { key: 'machines', label: 'Machines', path: '/machines.html', icon: '⚙️' },
  { key: 'records', label: 'AI Records', path: '/records.html', icon: '📋' },
  { key: 'tickets', label: 'Tickets', path: '/tickets.html', icon: '🎫' },
  { key: 'assistant', label: 'AI Assistant', path: '/assistant.html', icon: '🤖' },
  { key: 'shutdown', label: 'Shutdown Planner', path: '/shutdown-planner.html', icon: '🛑' },
  { key: 'technician', label: 'Technician', path: '/technician.html', icon: '🔧' },
  { key: 'inventory', label: 'Inventory', path: '/inventory.html', icon: '📦' },
  { key: 'support', label: 'Support & Decisions', path: '/support.html', icon: '💡' },
  { key: 'kaizen', label: 'Kaizen', path: '/kaizen.html', icon: '✨' },
  { key: 'team', label: 'Team', path: '/team.html', icon: '👥' },
  { key: 'settings', label: t('nav.settings'), path: '/settings.html', icon: '⚡' },
];

/**
 * User menu items (top-right dropdown)
 */
const getUserMenuItems = (onLogout) => [
  { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
  { key: 'settings', label: 'Settings', icon: <SettingOutlined /> },
  { type: 'divider' },
  { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, onClick: onLogout },
];

/**
 * AntDNavigationLayout — Main layout component
 * Replaces custom AppShell with Ant Design Layout
 */
export const AntDNavigationLayout = ({
  children,
  activeNav = 'dashboard',
  userName = 'User',
  unreadNotifications = 0,
  onNavigate,
  onLogout,
  onUserMenuClick,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useI18n();

  const menuItems = getNavMenuItems(t);
  const userMenuItems = getUserMenuItems(onLogout);

  const handleMenuClick = (key) => {
    const item = menuItems.find(m => m.key === key);
    if (item && onNavigate) {
      onNavigate(item.path);
    }
  };

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout' && onLogout) {
      onLogout();
    } else if (onUserMenuClick) {
      onUserMenuClick(key);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        breakpoint="lg"
        collapsedWidth={80}
        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        {/* Logo */}
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {!collapsed ? '🚀 TurboFix' : '🚀'}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[activeNav]}
          selectedKeys={[activeNav]}
          items={menuItems.map(item => ({
            key: item.key,
            label: item.label,
            icon: <span style={{ fontSize: '18px', marginRight: '8px' }}>{item.icon}</span>,
          }))}
          onClick={(e) => handleMenuClick(e.key)}
          style={{ borderRight: 'none' }}
        />
      </Sider>

      {/* Main Content */}
      <Layout>
        {/* Header */}
        <Header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}>
          {/* Toggle Button */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          {/* Right Actions */}
          <Space size="large" align="center">
            {/* Notifications */}
            <Badge count={unreadNotifications} overflowCount={99}>
              <Button type="text" icon={<BellOutlined style={{ fontSize: '18px' }} />} />
            </Badge>

            {/* User Menu */}
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} trigger={['click']}>
              <Button type="text" style={{ padding: '0 8px' }}>
                <UserOutlined style={{ marginRight: '8px' }} />
                {userName}
              </Button>
            </Dropdown>
          </Space>
        </Header>

        {/* Content Area */}
        <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px - 70px)' }}>
          {children}
        </Content>

        {/* Footer */}
        <Footer style={{
          textAlign: 'center',
          background: '#fafafa',
          borderTop: '1px solid #e8e8e8',
          padding: '12px 24px',
          fontSize: '12px',
          color: '#999',
        }}>
          TurboFix © 2026 · AI Maintenance Decision Platform
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AntDNavigationLayout;
