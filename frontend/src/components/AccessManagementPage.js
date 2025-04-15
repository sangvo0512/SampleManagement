import React, { useEffect, useState, useCallback } from "react";
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
    const [permissions, setPermissions] = useState([]);
    const [userPermManageModalVisible, setUserPermManageModalVisible] = useState(false);
    const [groupAssignModalVisible, setGroupAssignModalVisible] = useState(false);
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";

    const fetchUsers = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/users`);
            setUsers(res.data);
            setFilteredUsers(res.data);
        } catch (err) {
            message.error("Failed to load users");
        }
    }, [API_BASE]);

    const fetchGroups = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/groups`);
            setGroups(res.data);
            setFilteredGroups(res.data);
        } catch (err) {
            message.error("Failed to load groups");
        }
    }, [API_BASE]);

    const fetchPermissions = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/permissions`);
            setPermissions(res.data);
        } catch (err) {
            message.error("Failed to load permissions");
        }
    }, [API_BASE]);
    useEffect(() => {
        fetchUsers();
        fetchGroups();
        fetchPermissions();
    }, [fetchUsers, fetchGroups, fetchPermissions]);

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

    const handleAssignPermissionToGroup = async (values) => {
        try {
            const currentPermissionIds = groupPermissions.map((p) => p.PermissionID);
            const merged = Array.from(new Set([...currentPermissionIds, ...values.permissionIds]));

            const payload = {
                groupId: values.groupId,
                permissionIds: merged,
            };

            await axios.post(`${API_BASE}/permissions/group`, payload);
            message.success("Permissions assigned to group");
            fetchGroupPermissions(values.groupId);
            setGroupAssignModalVisible(false);
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

                                            setGroupAssignModalVisible(true);
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

                                <Modal
                                    title="Assign Permission to Group"
                                    open={groupAssignModalVisible}
                                    onCancel={() => setGroupAssignModalVisible(false)}
                                    onOk={() => groupPermForm.submit()}
                                >
                                    <Form form={groupPermForm} layout="vertical" onFinish={handleAssignPermissionToGroup}>
                                        <Form.Item name="groupId" hidden>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            name="permissionIds"
                                            label="Select Permissions"
                                            rules={[{ required: true, message: "Please select at least one permission" }]}
                                        >
                                            <Select mode="multiple" placeholder="Select permissions" allowClear>
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
                ]}
            />
        </div>
    );
};

export default AccessManagementPage;