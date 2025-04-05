import React, { useEffect, useState } from "react";
import { Tabs, Table, Button, Modal, Input, Form, message } from "antd";
import axios from "axios";
import "../styles/AccessManagementPage.css";

const { TabPane } = Tabs;

const AccessManagementPage = () => {
    // State cho tab được chọn
    const [activeTab, setActiveTab] = useState("userPermissions");

    // ----- Tab 1: User Permissions -----
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [userPermModalVisible, setUserPermModalVisible] = useState(false);
    const [userPermForm] = Form.useForm();

    // ----- Tab 2: Group Management (chưa triển khai chi tiết) -----
    // Bạn có thể tách riêng trang quản lý nhóm nếu cần; ở đây tôi chỉ tập trung vào phần phân quyền user.

    // API base URL – điều chỉnh theo cấu hình của bạn
    const API_BASE = "http://sample.pihlgp.com:5000/api";

    // Lấy danh sách user từ API /users
    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE}/users`);
            setUsers(response.data);
            setFilteredUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
            message.error("Failed to load users");
        }
    };

    // Lấy quyền của user từ API /users/{userId}/permissions
    const fetchUserPermissions = async (userId) => {
        try {
            const response = await axios.get(`${API_BASE}/users/${userId}/permissions`);
            setUserPermissions(response.data);
        } catch (error) {
            console.error("Error fetching user permissions:", error);
            message.error("Failed to load user permissions");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Khi search term thay đổi, lọc danh sách user
    useEffect(() => {
        if (searchTerm === "") {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user =>
                user.Username.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    // Xử lý khi người dùng nhấn nút “Manage Permissions”
    const handleUserSelect = (user) => {
        setSelectedUser(user);
        fetchUserPermissions(user.UserID);
    };

    // Xử lý gán quyền cho user
    const handleAssignPermissionToUser = async (values) => {
        try {
            // values phải chứa: userId, permissionId
            await axios.post(`${API_BASE}/permissions/assign`, values);
            message.success("Permission assigned successfully");
            if (selectedUser) {
                fetchUserPermissions(selectedUser.UserID);
            }
            setUserPermModalVisible(false);
            userPermForm.resetFields();
        } catch (error) {
            console.error("Error assigning permission to user:", error);
            message.error("Failed to assign permission");
        }
    };

    // Xử lý xóa quyền của user
    const handleRemovePermissionFromUser = async (userId, permissionId) => {
        try {
            await axios.post(`${API_BASE}/permissions/remove`, { userId, permissionId });
            message.success("Permission removed successfully");
            fetchUserPermissions(userId);
        } catch (error) {
            console.error("Error removing permission from user:", error);
            message.error("Failed to remove permission");
        }
    };

    // Định nghĩa các cột cho bảng danh sách người dùng
    const userColumns = [
        { title: "Full Name", dataIndex: "FullName", key: "FullName" },
        { title: "Username", dataIndex: "Username", key: "Username" },
        { title: "Email", dataIndex: "Email", key: "Email" },
        {
            title: "Action",
            key: "action",
            render: (text, record) => (
                <Button type="primary" onClick={() => handleUserSelect(record)}>
                    Manage Permissions
                </Button>
            )
        }
    ];

    // Cột cho bảng quyền của user
    const userPermissionsColumns = [
        { title: "Permission", dataIndex: "PermissionName", key: "PermissionName" },
        {
            title: "Action",
            key: "action",
            render: (text, record) => (
                <Button type="danger" onClick={() => handleRemovePermissionFromUser(selectedUser.UserID, record.PermissionID)}>
                    Remove
                </Button>
            )
        }
    ];

    return (
        <div style={{ padding: 20 }}>
            <h2>Access Management - User Permissions</h2>
            <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
                <TabPane tab="User Permissions" key="userPermissions">
                    <div style={{ marginBottom: 16 }}>
                        <Input.Search
                            placeholder="Search by username"
                            enterButton="Search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: 300 }}
                        />
                    </div>
                    <Table columns={userColumns} dataSource={filteredUsers} rowKey="UserID" />
                    {selectedUser && (
                        <div style={{ marginTop: 20 }}>
                            <h3>
                                Permissions for: {selectedUser.FullName} ({selectedUser.Username})
                            </h3>
                            <Button type="primary" onClick={() => setUserPermModalVisible(true)} style={{ marginBottom: 16 }}>
                                Assign Permission
                            </Button>
                            <Table columns={userPermissionsColumns} dataSource={userPermissions} rowKey="PermissionID" />
                        </div>
                    )}
                    <Modal
                        title="Assign Permission to User"
                        open={userPermModalVisible}
                        onCancel={() => setUserPermModalVisible(false)}
                        onOk={() => userPermForm.submit()}
                    >
                        <Form form={userPermForm} layout="vertical" onFinish={handleAssignPermissionToUser}>
                            <Form.Item name="userId" initialValue={selectedUser?.UserID} hidden>
                                <Input />
                            </Form.Item>
                            <Form.Item name="permissionId" label="Permission ID" rules={[{ required: true, message: "Please enter permission ID" }]}>
                                <Input placeholder="e.g., 1" />
                            </Form.Item>
                        </Form>
                    </Modal>
                </TabPane>
                <TabPane tab="Group Management" key="groupManagement">
                    {/* Bạn có thể triển khai quản lý nhóm riêng tại đây nếu cần */}
                    <p>Group management functionality goes here.</p>
                </TabPane>
            </Tabs>
        </div>
    );
};

export default AccessManagementPage;
