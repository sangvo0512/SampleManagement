// src/components/UserManagement.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Select, Table, Button, Modal, Input, Form } from "antd";
import "../styles/UserManagementPage.css";  // Import file CSS

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://sample.pihlgp.com:5000/api/users");
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
        setLoading(false);
    };

    const fetchDepartments = async () => {
        try {
            const response = await axios.get("http://sample.pihlgp.com:5000/api/departments");
            setDepartments(response.data);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    const handleDelete = async (userId) => {
        try {
            await axios.delete(`http://sample.pihlgp.com:5000/api/users/${userId}`);
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
                await axios.put(`http://sample.pihlgp.com:5000/api/users/${editingUser.UserID}`, values);
            } else {
                await axios.post("http://sample.pihlgp.com:5000/api/users", values);
            }
            fetchUsers();
            setIsModalVisible(false);
        } catch (error) {
            console.error("Error saving user:", error);
        }
    };

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
                    <Button onClick={() => handleDelete(record.UserID)} type="danger">Delete</Button>
                </>
            ),
        },
    ];

    return (
        <div className="user-management">
            <h3>User Management</h3>
            <Button className="add-user-button" type="primary" onClick={handleAdd}>
                Add
            </Button>
            <Table className="user-management-table" columns={columns} dataSource={users} loading={loading} rowKey="UserID" />

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
