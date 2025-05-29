// src/components/UserManagement.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Select, Table, Button, Modal, Input, Form, Popconfirm, message } from "antd";
import "../styles/UserManagementPage.css";
import { useTranslation } from "react-i18next";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();
    const [departments, setDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const { t } = useTranslation();

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
            message.success(t("userDeletedSuccess"));
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            const errorMessage = error.response?.data?.message || t("failedToDeleteUser");
            message.error(errorMessage);
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
        { title: t("username"), dataIndex: "Username", key: "Username" },
        { title: t("fullname"), dataIndex: "FullName", key: "FullName" },
        { title: t("email"), dataIndex: "Email", key: "Email" },
        { title: t("idNumber"), dataIndex: "IDNumber", key: "IDNumber" },
        { title: t("departments"), dataIndex: "DepartmentName", key: "DepartmentName" },
        {
            title: t("action"),
            key: "actions",
            render: (_, record) => (
                <>
                    <Button onClick={() => handleEdit(record)} type="primary" style={{ marginRight: 8 }}>{t("edit")}</Button>
                    <Popconfirm
                        title={t("deleteConfirm", { username: record.Username })}
                        onConfirm={() => handleDelete(record.UserID)}
                        okText={t("yes")}
                        cancelText={t("no")}>
                        <Button type="danger">{t("delete")}</Button>
                    </Popconfirm>

                </>
            ),
        },
    ];

    return (
        <div className="user-management">
            <h3>{t("users")}</h3>
            <Button
                className="add-user-button"
                type="primary"
                onClick={handleAdd}>
                {t("add")}
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
                title={editingUser ? t("edit") : t("add")}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                className="modal-custom"
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item
                        name="username"
                        label={t("username")}
                        rules={[{ required: true, message: "Please enter username" }]}
                    >
                        <Input disabled={editingUser ? true : false} />
                    </Form.Item>
                    <Form.Item
                        name="fullName"
                        label={t("fullname")}
                        rules={[{ required: true, message: "Please enter full name" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label={t("email")}
                        rules={[{ required: true, message: "Please enter email" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="idNumber"
                        label={t("idNumber")}
                        rules={[{ required: true, message: "Please enter ID number" }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="departmentId"
                        label={t("departments")}
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