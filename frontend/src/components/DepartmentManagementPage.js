// src/components/DepartmentManagement.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button, Modal, Input, Form } from "antd";
import "../styles/DepartmentManagementPage.css";

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://sample.pihlgp.com:5000/api/departments");
            setDepartments(response.data);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
        setLoading(false);
    };

    const handleDelete = async (departmentId) => {
        try {
            await axios.delete(`http://sample.pihlgp.com:5000/api/departments/${departmentId}`);
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
                    `http://sample.pihlgp.com:5000/api/departments/${editingDepartment.DepartmentID}`,
                    { DepartmentName: values.departmentName },
                    { headers: { "Content-Type": "application/json" } }
                );
            } else {
                await axios.post(
                    "http://sample.pihlgp.com:5000/api/departments",
                    { DepartmentName: values.departmentName },
                    { headers: { "Content-Type": "application/json" } }
                );
            }
            fetchDepartments();
            setIsModalVisible(false);
        } catch (error) {
            console.error("Error saving department:", error);
        }
    };

    const columns = [
        { title: "Department Name", dataIndex: "DepartmentName", key: "DepartmentName" },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <>
                    <Button onClick={() => handleEdit(record)} type="primary" style={{ marginRight: 8 }}>
                        Edit
                    </Button>
                    <Button onClick={() => handleDelete(record.DepartmentID)} type="danger">
                        Delete
                    </Button>
                </>
            ),
        },
    ];

    return (
        <div className="department-management">
            <h2>Department Management</h2>
            <Button type="primary" onClick={handleAdd} className="add-department-button">Add</Button>
            <Table
                className="department-management-table"
                columns={columns}
                dataSource={departments}
                loading={loading}
                rowKey="DepartmentID"
            />

            <Modal
                title={editingDepartment ? "Edit Department" : "Add Department"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                className="modal-custom"
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item
                        name="departmentName"
                        label="Department Name"
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
