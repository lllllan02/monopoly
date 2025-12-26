import React from 'react';
import { Layout, Menu, ConfigProvider, theme, App as AntdApp } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  BankOutlined, 
  EnvironmentOutlined, 
  IdcardOutlined,
  LogoutOutlined,
  PercentageOutlined,
  RocketOutlined
} from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '后台纵览',
    },
    {
      key: '/admin/themes',
      icon: <RocketOutlined />,
      label: '主题管理',
    },
    {
      key: '/admin/rent-levels',
      icon: <PercentageOutlined />,
      label: '经济体系',
    },
    {
      key: '/admin/properties',
      icon: <BankOutlined />,
      label: '地块管理',
    },
    {
      key: '/admin/cards',
      icon: <IdcardOutlined />,
      label: '卡组管理',
    },
    {
      key: '/admin/maps',
      icon: <EnvironmentOutlined />,
      label: '地图设计',
    }
  ];

  return (
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          theme="dark"
          breakpoint="lg"
          collapsedWidth="80"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100
          }}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <BankOutlined style={{ marginRight: 8, color: '#b37feb' }} />
            <span>大富翁管理</span>
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname === '/admin' ? '/admin' : location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ marginTop: 16 }}
          />
        </Sider>
        <Layout style={{ marginLeft: 200, transition: 'all 0.2s' }}>
          <Header style={{ 
            background: token.colorBgContainer, 
            padding: '0 24px', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            width: '100%'
          }}>
            <span style={{ fontSize: '16px', fontWeight: 500 }}>
              {menuItems.find(item => item.key === (location.pathname === '/admin' ? '/admin' : location.pathname))?.label || '管理后台'}
            </span>
            <div 
              onClick={() => navigate('/')} 
              style={{ cursor: 'pointer', color: token.colorTextSecondary }}
            >
              <LogoutOutlined style={{ marginRight: 4 }} />
              返回大厅
            </div>
          </Header>
          <Content style={{ margin: '24px', minHeight: 280 }}>
            <div style={{ 
              padding: 24, 
              background: token.colorBgContainer, 
              borderRadius: token.borderRadiusLG,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
  );
};

export default AdminLayout;
