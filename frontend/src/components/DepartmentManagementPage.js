// src/components/DepartmentManagement.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Table, Button, Modal, Input, Form, Popconfirm } from "antd";
import "../styles/DepartmentManagementPage.css";
import { useTranslation } from "react-i18next";

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [form] = Form.useForm();
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const { t } = useTranslation();

    const fetchDepartments = useCallback(
        async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE}/departments`);
                setDepartments(response.data);
            } catch (error) {
                console.error("Error fetching departments:", error);
            }
            setLoading(false);
        }, [API_BASE]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);



    const handleDelete = async (departmentId) => {
        try {
            await axios.delete(`${API_BASE}/departments/${departmentId}`);
            fetchDepartments();
        } catch (error) {
            console.error("Error deleting department:", error);
        }
    };

    const handleEdit = (department) => {
        setEditingDepartment(department);
        form.setFieldsValue({
            departmentName: department.DepartmentName,
        });
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingDepartment(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleSave = async (values) => {
        try {
            if (editingDepartment) {
                await axios.put(
                    `${API_BASE}/departments/${editingDepartment.DepartmentID}`, { DepartmentName: values.departmentName }, { headers: { "Content-Type": "application/json" } }
                );
            } else {
                await axios.post(
                    `${API_BASE}/departments`, { DepartmentName: values.departmentName }, { headers: { "Content-Type": "application/json" } });
            }
            fetchDepartments();
            setIsModalVisible(false);
        } catch (error) {
            console.error("Error saving department:", error);
        }
    };

    const columns = [
        { title: t("departmentName"), dataIndex: "DepartmentName", key: "DepartmentName" },
        {
            title: t("action"),
            key: "actions",
            render: (_, record) => (
                <>
                    <Button onClick={() => handleEdit(record)} type="primary" style={{ marginRight: 8 }}>
                        {t("edit")}
                    </Button>
                    <Popconfirm
                        title={t("deleteConfirm")}
                        onConfirm={() => handleDelete(record.DepartmentID)}
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
        <div className="department-management">
            <h2>{t("departments")}</h2>
            <Button type="primary" onClick={handleAdd} className="add-department-button">{t("add")}</Button>
            <Table
                className="department-management-table"
                columns={columns}
                dataSource={departments}
                loading={loading}
                rowKey="DepartmentID"
            />

            <Modal
                title={editingDepartment ? t("edit") : t("add")}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                className="modal-custom"
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item
                        name="departmentName"
                        label={t("departmentName")}
                        rules={[{ required: true, message: "Please enter department name" }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DepartmentManagement;
