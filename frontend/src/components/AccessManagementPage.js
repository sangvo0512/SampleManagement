import React, { useEffect, useState } from "react";
import {
    Tabs,
    Table,
    Button,
    Modal,
    Input,
    Form,
    message,
    Select,
} from "antd";
import axios from "axios";
import "../styles/AccessManagementPage.css";

const AccessManagementPage = () => {
    const [activeTab, setActiveTab] = useState("userPermissions");

    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchUser, setSearchUser] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [userPermModalVisible, setUserPermModalVisible] = useState(false);
    const [userPermForm] = Form.useForm();

    const [groups, setGroups] = useState([]);
    const [filteredGroups, setFilteredGroups] = useState([]);
    const [searchGroup, setSearchGroup] = useState("");
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupPermissions, setGroupPermissions] = useState([]);
    const [groupPermModalVisible, setGroupPermModalVisible] = useState(false);
    const [groupPermForm] = Form.useForm();

    const [permissions, setPermissions] = useState([]);  // Lưu danh sách tất cả quyền
    // New state to manage user modal for permission management
    const [userPermManageModalVisible, setUserPermManageModalVisible] = useState(false);

    const API_BASE = "http://sample.pihlgp.com:5000/api";

    useEffect(() => {
        fetchUsers();
        fetchGroups();
        fetchPermissions();  // Fetch permissions
    }, []);

    useEffect(() => {
        const filtered = users.filter((u) =>
            u.Username.toLowerCase().includes(searchUser.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchUser, users]);

    useEffect(() => {
        const filtered = groups.filter((g) =>
            g.GroupName.toLowerCase().includes(searchGroup.toLowerCase())
        );
        setFilteredGroups(filtered);
    }, [searchGroup, groups]);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API_BASE}/users`);
            setUsers(res.data);
            setFilteredUsers(res.data);
        } catch (err) {
            message.error("Failed to load users");
        }
    };

    const fetchGroups = async () => {
        try {
            const res = await axios.get(`${API_BASE}/groups`);
            setGroups(res.data);
            setFilteredGroups(res.data);
        } catch (err) {
            message.error("Failed to load groups");
        }
    };

    const fetchPermissions = async () => {  // Fetch all permissions
        try {
            const res = await axios.get(`${API_BASE}/permissions`);
            setPermissions(res.data);
        } catch (err) {
            message.error("Failed to load permissions");
        }
    };

    const fetchUserPermissions = async (userId) => {
        try {
            const res = await axios.get(`${API_BASE}/permissions/user/${userId}`);
            setUserPermissions(res.data);
        } catch {
            message.error("Failed to load user permissions");
        }
    };

    const fetchGroupPermissions = async (GroupId) => {
        try {
            const res = await axios.get(`${API_BASE}/permissions/group/${GroupId}`);
            setGroupPermissions(res.data);
        } catch {
            message.error("Failed to load group permissions");
        }
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        fetchUserPermissions(user.UserID);
        setUserPermManageModalVisible(true);
    };

    const handleGroupSelect = (group) => {
        setSelectedGroup(group);
        fetchGroupPermissions(group.GroupID);
        setGroupPermModalVisible(true);
    };

    // Xử lý gán quyền cho user (merge quyền cũ với quyền mới được chọn)
    const handleAssignPermissionToUser = async (values) => {
        try {
            const currentPermissionIds = userPermissions.map((p) => p.PermissionID);
            const merged = Array.from(new Set([...currentPermissionIds, ...values.permissionIds]));

            const payload = {
                userId: values.userId,
                permissionIds: merged,
            };

            await axios.post(`${API_BASE}/permissions/user`, payload);
            message.success("Permissions assigned to user");

            fetchUserPermissions(values.userId);
            setUserPermModalVisible(false);
            userPermForm.resetFields();
        } catch (err) {
            console.error("Failed to assign permission:", err?.response?.data || err.message);
            message.error("Failed to assign permission");
        }
    };

    const handleRemovePermissionFromUser = async (userId, permissionIdToRemove) => {
        try {
            await axios.post(`${API_BASE}/permissions/remove/user`, {
                userId,
                permissionId: permissionIdToRemove,
            });
            message.success("Permission removed");
            fetchUserPermissions(userId);
        } catch (err) {
            console.error("Failed to remove permission:", err);
            message.error("Failed to remove permission");
        }
    };

    // Sửa hàm gán quyền cho group để merge các quyền hiện có và cho phép chọn nhiều quyền
    const handleAssignPermissionToGroup = async (values) => {
        try {
            const currentPermissionIds = groupPermissions.map((p) => p.PermissionID);
            const merged = Array.from(new Set([...currentPermissionIds, ...values.permissionIds]));

            const payload = {
                groupId: values.groupId,
                permissionIds: merged,
            };
            console.log("Payload gửi lên:", payload);
            await axios.post(`${API_BASE}/permissions/group`, payload);
            message.success("Permissions assigned to group");
            fetchGroupPermissions(values.groupId);
            setGroupPermModalVisible(false);
            groupPermForm.resetFields();
        } catch (err) {
            console.error("Failed to assign permission to group:", err?.response?.data || err.message);
            message.error("Failed to assign permission");
        }
    };

    const handleRemovePermissionFromGroup = async (groupId, permissionId) => {
        try {
            await axios.post(`${API_BASE}/permissions/remove/group`, {
                groupId,
                permissionId,
            });

            message.success("Permission removed from group");
            fetchGroupPermissions(groupId);
        } catch (err) {
            console.error("Failed to remove group permission:", err);
            message.error("Failed to remove permission");
        }
    };

    const userColumns = [
        { title: "Full Name", dataIndex: "FullName", key: "FullName" },
        { title: "Username", dataIndex: "Username", key: "Username" },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Button type="primary" onClick={() => handleUserSelect(record)}>
                    Manage Permissions
                </Button>
            ),
        },
    ];

    const userPermissionsColumns = [
        { title: "Permission", dataIndex: "PermissionName", key: "PermissionName" },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Button
                    danger
                    onClick={() => handleRemovePermissionFromUser(selectedUser.UserID, record.PermissionID)}
                >
                    Remove
                </Button>
            ),
        },
    ];

    const groupColumns = [
        { title: "Group Name", dataIndex: "GroupName", key: "GroupName" },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Button type="primary" onClick={() => handleGroupSelect(record)}>
                    Manage Permissions
                </Button>
            ),
        },
    ];

    const groupPermissionsColumns = [
        { title: "Permission", dataIndex: "PermissionName", key: "PermissionName" },
        {
            title: "Action",
            key: "action",
            render: (_, record) => (
                <Button
                    danger
                    onClick={() => handleRemovePermissionFromGroup(selectedGroup.GroupID, record.PermissionID)}
                >
                    Remove
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <h2>Access Management</h2>
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={[
                    {
                        key: "userPermissions",
                        label: "User Permissions",
                        children: (
                            <>
                                <Input.Search
                                    placeholder="Search by username"
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    style={{ width: 300, marginBottom: 16 }}
                                />
                                <Table columns={userColumns} dataSource={filteredUsers} rowKey="UserID" />
                                <Modal
                                    title={`Permissions for: ${selectedUser?.FullName} (${selectedUser?.Username})`}
                                    open={userPermManageModalVisible}
                                    onCancel={() => setUserPermManageModalVisible(false)}
                                    footer={null}
                                    width={700}
                                >
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            // Set current permissions into form so user sees merge values
                                            userPermForm.setFieldsValue({
                                                userId: selectedUser?.UserID,
                                                permissionIds: userPermissions.map((p) => p.PermissionID),
                                            });
                                            setUserPermModalVisible(true);
                                        }}
                                        style={{ marginBottom: 16 }}
                                    >
                                        Assign Permission
                                    </Button>
                                    <Table
                                        columns={userPermissionsColumns}
                                        dataSource={userPermissions}
                                        rowKey="PermissionID"
                                        pagination={false}
                                    />
                                </Modal>

                                <Modal
                                    title="Assign Permission to User"
                                    open={userPermModalVisible}
                                    onCancel={() => setUserPermModalVisible(false)}
                                    onOk={() => userPermForm.submit()}
                                >
                                    <Form form={userPermForm} layout="vertical" onFinish={handleAssignPermissionToUser}>
                                        <Form.Item name="userId" hidden>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            name="permissionIds"
                                            label="Select Permissions"
                                            rules={[{ required: true, message: "Please select at least one permission" }]}
                                        >
                                            <Select
                                                mode="multiple"
                                                placeholder="Select permissions"
                                                allowClear
                                            >
                                                {permissions.map((permission) => (
                                                    <Select.Option key={permission.PermissionID} value={permission.PermissionID}>
                                                        {permission.PermissionName}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Form>
                                </Modal>
                            </>
                        ),
                    },
                    {
                        key: "groupPermissions",
                        label: "Group Permissions",
                        children: (
                            <>
                                <Input.Search
                                    placeholder="Search by group name"
                                    value={searchGroup}
                                    onChange={(e) => setSearchGroup(e.target.value)}
                                    style={{ width: 300, marginBottom: 16 }}
                                />
                                <Table columns={groupColumns} dataSource={filteredGroups} rowKey="GroupID" />

                                <Modal
                                    title={`Permissions for group: ${selectedGroup?.GroupName}`}
                                    open={groupPermModalVisible}
                                    onCancel={() => setGroupPermModalVisible(false)}
                                    footer={null}
                                    width={700}
                                >
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            if (!selectedGroup || !selectedGroup.GroupID) {
                                                message.error("Group not selected properly");
                                                return;
                                            }

                                            groupPermForm.setFieldsValue({
                                                groupId: selectedGroup.GroupID,
                                                permissionIds: groupPermissions.map((p) => p.PermissionID),
                                            });

                                            // Mở modal gán quyền
                                            setTimeout(() => {
                                                Modal.confirm({
                                                    title: "Assign Permission to Group",
                                                    content: (
                                                        <Form form={groupPermForm} layout="vertical" onFinish={handleAssignPermissionToGroup}>
                                                            <Form.Item name="groupId" hidden>
                                                                <Input />
                                                            </Form.Item>
                                                            <Form.Item
                                                                name="permissionIds"
                                                                label="Select Permissions"
                                                                rules={[{ required: true, message: "Please select at least one permission" }]}
                                                            >
                                                                <Select
                                                                    mode="multiple"
                                                                    placeholder="Select permissions"
                                                                    allowClear
                                                                >
                                                                    {permissions.map((permission) => (
                                                                        <Select.Option key={permission.PermissionID} value={permission.PermissionID}>
                                                                            {permission.PermissionName}
                                                                        </Select.Option>
                                                                    ))}
                                                                </Select>
                                                            </Form.Item>
                                                        </Form>
                                                    ),
                                                    onOk: () => groupPermForm.submit(),
                                                    onCancel: () => groupPermForm.resetFields(),
                                                    okText: "Submit",
                                                });
                                            }, 100);
                                        }}
                                        style={{ marginBottom: 16 }}
                                    >
                                        Assign Permission
                                    </Button>

                                    <Table
                                        columns={groupPermissionsColumns}
                                        dataSource={groupPermissions}
                                        rowKey="PermissionID"
                                        pagination={false}
                                    />
                                </Modal>
                            </>

                        ),
                    },
                ]}
            />
        </div>
    );
};

export default AccessManagementPage;
