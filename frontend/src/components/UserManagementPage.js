// src/components/UserManagement.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Select, Table, Button, Modal, Input, Form, Popconfirm } from "antd";
import "../styles/UserManagementPage.css";  // Import file CSS

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";

    const fetchUsers = useCallback(
        async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE}/users`);
                setUsers(response.data);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
            setLoading(false);
        }, [API_BASE]
    );

    const fetchDepartments = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE}/departments`);
            setDepartments(response.data);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    }, [API_BASE]);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, [fetchUsers, fetchDepartments]);


    const handleDelete = async (userId) => {
        try {
            await axios.delete(`${API_BASE}/users/${userId}`);
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        form.setFieldsValue({
            username: user.Username,
            fullName: user.FullName,
            email: user.Email,
            idNumber: user.IDNumber,
            departmentId: user.DepartmentID
        });
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleSave = async (values) => {
        try {
            if (editingUser) {
                await axios.put(`${API_BASE}/users/${editingUser.UserID}`, values);
            } else {
                await axios.post(`${API_BASE}/users`, values);
            }
            fetchUsers();
            setIsModalVisible(false);
        } catch (error) {
            console.error("Error saving user:", error);
        }
    };
    const filteredUser = users.filter(us =>
        us.Username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const columns = [
        { title: "Username", dataIndex: "Username", key: "Username" },
        { title: "Full Name", dataIndex: "FullName", key: "FullName" },
        { title: "Email", dataIndex: "Email", key: "Email" },
        { title: "ID Number", dataIndex: "IDNumber", key: "IDNumber" },
        { title: "Department", dataIndex: "DepartmentName", key: "DepartmentName" },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <>
                    <Button onClick={() => handleEdit(record)} type="primary" style={{ marginRight: 8 }}>Edit</Button>
                    <Popconfirm
                        title="Are you sure to delete this user?"
                        onConfirm={() => handleDelete(record.UserID)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="danger">Delete</Button>
                    </Popconfirm>

                </>
            ),
        },
    ];

    return (
        <div className="user-management">
            <h3>User Management</h3>
            <Button
                className="add-user-button"
                type="primary"
                onClick={handleAdd}>
                Add User
            </Button>
            <Input
                className="user-search"
                placeholder="Search user by username"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 300, marginBottom: 16 }}
            />
            <Table
                className="user-management-table"
                columns={columns}
                dataSource={filteredUser}
                loading={loading}
                rowKey="UserID"
                bordered />

            <Modal
                title={editingUser ? "Edit User" : "Add User"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                className="modal-custom"
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item
                        name="username"
                        label="Username"
                        rules={[{ required: true, message: "Please enter username" }]}
                    >
                        <Input disabled={editingUser ? true : false} />
                    </Form.Item>
                    <Form.Item
                        name="fullName"
                        label="Full Name"
                        rules={[{ required: true, message: "Please enter full name" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, message: "Please enter email" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="idNumber"
                        label="ID Number"
                        rules={[{ required: true, message: "Please enter ID number" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="departmentId"
                        label="Department"
                        rules={[{ required: true, message: "Please select department" }]}
                    >
                        <Select>
                            {departments.map((dept) => (
                                <Select.Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                    {dept.DepartmentName}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement;
