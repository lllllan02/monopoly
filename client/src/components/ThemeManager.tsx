import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Popconfirm, Tag, Typography, Divider, InputNumber, Row, Col, Card, Select } from 'antd';
import { RocketOutlined, BankOutlined, EnvironmentOutlined, PlusOutlined, DeleteOutlined, BuildOutlined } from '@ant-design/icons';
import { type Theme, ThemeService } from '../services/ThemeService';
import { PropertyService } from '../services/PropertyService';
import { MapService } from '../services/MapService';

interface ThemeWithStats extends Theme {
  propertyCount: number;
  mapCount: number;
}

const ThemeManager: React.FC = () => {
  const [themes, setThemes] = useState<ThemeWithStats[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [form] = Form.useForm();

  const fetchThemesAndStats = async () => {
    try {
      const [themesData, propsData, mapsData] = await Promise.all([
        ThemeService.getAll().catch(() => []),
        PropertyService.getAll().catch(() => []),
        MapService.getAll().catch(() => [])
      ]);

      const safeThemes = Array.isArray(themesData) ? themesData : [];
      const safeProps = Array.isArray(propsData) ? propsData : [];
      const safeMaps = Array.isArray(mapsData) ? mapsData : [];

      const themesWithStats = safeThemes.map(theme => {
        if (!theme || !theme.id) return null;
        return {
          ...theme,
          propertyCount: safeProps.filter((p: any) => p && p.themeId === theme.id).length,
          mapCount: safeMaps.filter((m: any) => m && m.themeId === theme.id).length
        };
      }).filter(Boolean) as ThemeWithStats[];

      setThemes(themesWithStats);
    } catch (error) {
      console.error('Fetch error:', error);
      message.error('获取主题列表及统计失败');
    }
  };

  useEffect(() => {
    fetchThemesAndStats();
  }, []);

  const handleAdd = () => {
    setEditingTheme(null);
    form.resetFields();
    form.setFieldsValue({ 
      name: '', 
      stationRent: [25, 50, 100, 200],
      utilityMultipliers: [4, 10]
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Theme) => {
    setEditingTheme(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await ThemeService.delete(id);
      message.success('删除成功');
      fetchThemesAndStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingTheme) {
        await ThemeService.update(editingTheme.id, values);
        message.success('修改成功');
      } else {
        await ThemeService.create(values);
        message.success('添加成功');
      }
      setIsModalVisible(false);
      fetchThemesAndStats();
    } catch (error) {
      console.error('Submit error:', error);
      message.error('操作失败');
    }
  };

  const columns = [
    { 
      title: '主题名称', 
      dataIndex: 'name', 
      key: 'name',
      width: 200,
      render: (text: string, record: ThemeWithStats) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong style={{ fontSize: '16px' }}>{text}</Typography.Text>
          <Space size={8} style={{ fontSize: '12px', color: '#bfbfbf' }}>
            <Space size={4}><BankOutlined />{record.propertyCount}</Space>
            <Space size={4}><EnvironmentOutlined />{record.mapCount}</Space>
          </Space>
        </Space>
      )
    },
    {
      title: '特殊资产规则',
      key: 'rules',
      render: (_: any, record: Theme) => (
        <Row gutter={24} style={{ maxWidth: 500 }}>
          <Col span={13}>
            <div style={{ paddingLeft: 8, borderLeft: '3px solid #fa8c16' }}>
              <div style={{ fontSize: '11px', color: '#bfbfbf', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <RocketOutlined /> 车站租金 (1-4座)
              </div>
              <Typography.Text strong style={{ color: '#fa8c16', fontSize: '14px', letterSpacing: '1px' }}>
                {Array.isArray(record.stationRent) ? record.stationRent.join(' → ') : '-'}
              </Typography.Text>
            </div>
          </Col>
          <Col span={11}>
            <div style={{ paddingLeft: 8, borderLeft: '3px solid #13c2c2' }}>
              <div style={{ fontSize: '11px', color: '#bfbfbf', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <BankOutlined /> 公用倍率 (1-2个)
              </div>
              <Typography.Text strong style={{ color: '#13c2c2', fontSize: '14px', letterSpacing: '1px' }}>
                {Array.isArray(record.utilityMultipliers) ? record.utilityMultipliers.map(v => `x${v}`).join(' / ') : '-'}
              </Typography.Text>
            </div>
          </Col>
        </Row>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'right',
      render: (_: any, record: ThemeWithStats) => (
        <Space size="middle">
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm 
            title="确定要删除这个主题吗？" 
            description={record.propertyCount > 0 ? `该主题下尚有 ${record.propertyCount} 个房产，删除后它们将失去分类。` : undefined}
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" style={{ padding: 0 }}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="admin-content-fade-in" style={{ padding: 0, background: '#fff', minHeight: '100%' }}>
      <div style={{ padding: '32px 40px 24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 12, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            <RocketOutlined style={{ marginRight: 16, color: '#722ed1' }} />
            主题分类管理
          </Typography.Title>
          <Typography.Paragraph style={{ color: '#8c8c8c', fontSize: '15px', maxWidth: 600, marginBottom: 0 }}>
            定义游戏的不同章节。每个主题不仅包含视觉风格，还定义了专属的车站、公用事业等特殊资产配置。
          </Typography.Paragraph>
        </div>
        <Button 
          type="primary" 
          size="large" 
          icon={<PlusOutlined />} 
          onClick={handleAdd}
          style={{ 
            borderRadius: '8px', 
            height: '50px', 
            padding: '0 32px', 
            fontSize: '16px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(114, 46, 209, 0.25)'
          }}
        >
          创建新主题
        </Button>
      </div>
      
      <div style={{ padding: '0 40px' }}>
        <Table 
          columns={columns} 
          dataSource={themes} 
          rowKey="id" 
          bordered={false} 
          pagination={false} 
          size="middle"
        />
      </div>

      <Modal
        title={
          <Space>
            <BuildOutlined style={{ color: '#722ed1' }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{editingTheme ? '主题规则配置' : '创建新主题'}</span>
          </Space>
        }
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        width={720}
        destroyOnClose
        okText="保存更改"
        cancelText="取消"
        forceRender
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item 
            name="name" 
            label={<Typography.Text strong style={{ fontSize: '15px' }}>主题名称</Typography.Text>} 
            rules={[{ required: true }]}
            style={{ marginBottom: 32 }}
          >
            <Input placeholder="例如: 经典大富翁 / 繁华北京" size="large" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BankOutlined style={{ color: '#722ed1', fontSize: '16px' }} />
            <Typography.Text strong style={{ fontSize: '15px' }}>全局收益规则设置</Typography.Text>
          </div>
          
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card 
                size="small" 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Space><RocketOutlined style={{ color: '#fa8c16' }} /><span>车站 (越多越贵逻辑)</span></Space>
                    <Typography.Text type="secondary" style={{ fontSize: '11px', fontWeight: 'normal' }}>
                      解释：这是一种“成套”资产。玩家每多拿下一座车站，该主题下所有车站的租金都会集体涨价。
                    </Typography.Text>
                  </div>
                }
                style={{ borderRadius: '12px', background: '#fff7e6', border: '1px solid #ffd591' }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <Form.List name="stationRent">
                  {(fields) => (
                    <Row gutter={16}>
                      {fields.map((field, index) => (
                        <Col span={6} key={field.key}>
                          <Form.Item 
                            {...field} 
                            label={<span style={{ fontSize: '12px', color: '#8c8c8c' }}>持有 {index + 1} 座车站时</span>}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber 
                              style={{ width: '100%', borderRadius: '6px' }} 
                              prefix="¥" 
                              controls={false}
                              placeholder="金额"
                            />
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Form.List>
              </Card>
            </Col>

            <Col span={24}>
              <Card 
                size="small" 
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <Space><BankOutlined style={{ color: '#13c2c2' }} /><span>公用事业 (点数乘法逻辑)</span></Space>
                    <Typography.Text type="secondary" style={{ fontSize: '11px', fontWeight: 'normal' }}>
                      解释：租金 = 访客踩到时甩出的“骰子点数之和” × 下方的倍率。
                    </Typography.Text>
                  </div>
                }
                style={{ borderRadius: '12px', background: '#e6fffb', border: '1px solid #87e8de' }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <Form.List name="utilityMultipliers">
                  {(fields) => (
                    <Row gutter={16}>
                      {fields.map((field, index) => (
                        <Col span={12} key={field.key}>
                          <Form.Item 
                            {...field} 
                            label={<span style={{ fontSize: '12px', color: '#8c8c8c' }}>持有 {index + 1} 个事业地块时</span>}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber 
                              style={{ width: '100%', borderRadius: '6px' }} 
                              prefix="点数 ×" 
                              controls={false}
                              placeholder="倍率"
                            />
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Form.List>
              </Card>
            </Col>
          </Row>
          
          <div style={{ marginTop: 24, padding: '12px 20px', background: '#f5f5f5', borderRadius: '10px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px' }}>💡</span>
            <Typography.Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <strong>规则提示：</strong> 此处定义的数值是全局生效的。例如，如果你在房产库中创建了 4 个关联到此主题的车站，当玩家持有多座时，租金将自动按此处的阶梯价格计算。具体的名称和地块买入价请前往【房产库管理】。
            </Typography.Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ThemeManager;
