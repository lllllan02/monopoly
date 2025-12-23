import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, message, Tag } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { type Property, PropertyService } from '../services/PropertyService';

const PropertyManager: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [form] = Form.useForm();

  const fetchProperties = async () => {
    try {
      const data = await PropertyService.getAll();
      setProperties(data);
    } catch (error) {
      message.error('获取房产列表失败');
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAdd = () => {
    setEditingProperty(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Property) => {
    setEditingProperty(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await PropertyService.delete(id);
      message.success('删除成功');
      fetchProperties();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingProperty) {
        await PropertyService.update(editingProperty.id, values);
        message.success('更新成功');
      } else {
        await PropertyService.create(values);
        message.success('添加成功');
      }
      setIsModalVisible(false);
      fetchProperties();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { 
      title: '颜色组', 
      dataIndex: 'colorGroup', 
      key: 'colorGroup',
      render: (color: string) => <Tag color={color}>{color}</Tag>
    },
    { title: '价格', dataIndex: 'price', key: 'price' },
    { title: '建房费', dataIndex: 'houseCost', key: 'houseCost' },
    { title: '基础租金', dataIndex: 'baseRent', key: 'baseRent' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Property) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-content-fade-in">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>房产库管理</h2>
          <p style={{ color: '#8c8c8c', marginTop: 4 }}>定义全局房产的元数据，供不同地图引用。</p>
        </div>
        <Button type="primary" size="large" icon={<BankOutlined />} onClick={handleAdd}>
          添加新房产
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={properties} 
        rowKey="id" 
        pagination={{ pageSize: 8 }}
        bordered
      />

      <Modal
        title={editingProperty ? '编辑房产' : '添加房产'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="房产名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="colorGroup" label="颜色组" rules={[{ required: true }]}>
            <Input placeholder="例如: red, blue, #ff0000" />
          </Form.Item>
          <Form.Item name="price" label="购买价格" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="houseCost" label="建房费用" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="baseRent" label="基础租金" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PropertyManager;

