import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Modal, Form, Input, message, Popconfirm } from "antd";
import axios from "axios";
import "../styles/WarehouseManagementPage.css";
import { useTranslation } from "react-i18next";

const WarehouseManagementPage = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [form] = Form.useForm();
    const [searchTerm, setSearchTerm] = useState("");
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const { t } = useTranslation();

    const fetchWarehouses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/warehouses`);
            setWarehouses(res.data);
        } catch (err) {
            console.error(err);
            message.error("Failed to load warehouses");
        }
        setLoading(false);
    }, [API_BASE]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);
    const filteredWarehouses = warehouses.filter(wh =>
        wh.WarehouseName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (values) => {
        try {
            if (editingWarehouse) {
                await axios.put(`${API_BASE}/warehouses/${editingWarehouse.WarehouseID}`, {
                    warehouseName: values.WarehouseName,
                });


                message.success("Warehouse updated");
            } else {
                await axios.post(`${API_BASE}/warehouses`, {
                    warehouseName: values.WarehouseName,
                });


                message.success("Warehouse created");
            }
            fetchWarehouses();
            setModalVisible(false);
            setEditingWarehouse(null);
            form.resetFields();
        } catch (err) {
            console.error(err);
            message.error("Failed to save warehouse");
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE}/warehouses/${id}`);
            message.success("Warehouse deleted");
            fetchWarehouses();
        } catch (err) {
            console.error(err);
            message.error("Failed to delete warehouse");
        }
    };

    const openEdit = (record) => {
        setEditingWarehouse(record);
        form.setFieldsValue({ WarehouseName: record.WarehouseName });
        setModalVisible(true);
    };

    const columns = [
        {
            title: t("warehouseName"),
            dataIndex: "WarehouseName",
            key: "WarehouseName",
        },
        {
            title: t("action"),
            key: "actions",
            render: (_, record) => (
                <>
                    <Button type="primary" style={{ marginRight: 8 }} onClick={() => openEdit(record)}>
                        {t("edit")}
                    </Button>
                    <Popconfirm
                        title={t("deleteConfirm")}
                        onConfirm={() => handleDelete(record.WarehouseID)}
                        okText={t("yes")}
                        cancelText={t("no")}
                    >
                        <Button type="danger">
                            {t("delete")}
                        </Button>

                    </Popconfirm>
                </>
            ),
        },
    ];

    return (
        <div className="warehouse-management" style={{ padding: 20 }}>
            <h2>{t("warehouse")}</h2>
            <Button className="add-warehouse-button" type="primary" onClick={() => setModalVisible(true)} style={{ marginBottom: 16 }}>
                {t("add")}
            </Button>
            <Input
                className="warehouse-search"
                placeholder="Search warehouse by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 300, marginBottom: 16 }}
            />
            <Table
                className="warehouse-table"
                columns={columns}
                dataSource={filteredWarehouses}
                rowKey="WarehouseID"
                loading={loading}
                bordered
            />

            <Modal
                title={editingWarehouse ? t("edit") : t("add")}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingWarehouse(null);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="WarehouseName"
                        label={t("warehouseName")}
                        rules={[{ required: true, message: "Please input warehouse name" }]}
                    >
                        <Input placeholder="Enter warehouse name" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default WarehouseManagementPage;
