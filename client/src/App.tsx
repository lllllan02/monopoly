import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import AdminLayout from './components/AdminLayout';
import AdminOverview from './components/AdminOverview';
import PropertyManager from './components/PropertyManager';
import ThemeManager from './components/ThemeManager';
import EconomicManager from './components/EconomicManager';
import MapManager from './components/MapManager';
import CardManager from './components/CardManager';
import './App.css';

// alert('App is loading...');

function App() {
  return (
    <ConfigProvider>
      <AntdApp>
        <BrowserRouter>
          <Routes>
            {/* 游戏主页入口 */}
            <Route path="/" element={
              <div style={{ 
                height: '100vh', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>大富翁联机版</h1>
                <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>局域网联机 · 策略博弈 · 地块经营</p>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button style={{ 
                    padding: '12px 30px', 
                    fontSize: '1rem', 
                    borderRadius: '25px', 
                    border: 'none', 
                    background: '#4CAF50', 
                    color: 'white', 
                    cursor: 'not-allowed',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    进入游戏 (开发中)
                  </button>
                  <button 
                    onClick={() => window.location.href = '/admin'}
                    style={{ 
                      padding: '12px 30px', 
                      fontSize: '1rem', 
                      borderRadius: '25px', 
                      border: '2px solid white', 
                      background: 'transparent', 
                      color: 'white', 
                      cursor: 'pointer'
                    }}>
                    后台管理
                  </button>
                </div>
              </div>
            } />

            {/* 管理后台路由 */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="properties" element={<PropertyManager />} />
              <Route path="rent-levels" element={<EconomicManager />} />
              <Route path="themes" element={<ThemeManager />} />
              <Route path="maps" element={<MapManager />} />
              <Route path="cards" element={<CardManager />} />
            </Route>

            {/* 404 跳转 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
