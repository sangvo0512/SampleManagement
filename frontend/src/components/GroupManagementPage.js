import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Input, Form, message, AutoComplete, Popconfirm } from "antd";
import axios from "axios";
import "../styles/GroupManagementPage.css";

const GroupManagementPage = () => {
    const API_BASE = "http://sample.pihlgp.com:5000/api";

    // State cho danh sách nhóm và loading
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);

    // State cho modal nhóm (tạo/chỉnh sửa)
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupForm] = Form.useForm();

    // State cho danh sách thành viên của nhóm đang chỉnh sửa
    const [groupUsers, setGroupUsers] = useState([]);

    // State cho modal thêm user vào nhóm
    const [addUserModalVisible, setAddUserModalVisible] = useState(false);
    const [addUserForm] = Form.useForm();

    // State cho toàn bộ người dùng và tìm kiếm (AutoComplete options)
    const [allUsers, setAllUsers] = useState([]);
    const [searchOptions, setSearchOptions] = useState([]);

    // Lấy danh sách nhóm
    const fetchGroups = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/groups`);
            setGroups(response.data);
        } catch (error) {
            console.error("Error fetching groups:", error);
            message.error("Failed to load groups");
        }
        setLoading(false);
    };

    // Lấy danh sách thành viên của một nhóm
    const fetchGroupUsers = async (groupId) => {
        try {
            const response = await axios.get(`${API_BASE}/groups/${groupId}/users`);
            setGroupUsers(response.data);
        } catch (error) {
            console.error("Error fetching group users:", error);
            message.error("Failed to load group users");
        }
    };

    // Lấy danh sách tất cả user
    const fetchAllUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE}/users`);
            setAllUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
            message.error("Failed to load users");
        }
    };

    useEffect(() => {
        fetchGroups();
        fetchAllUsers();
    }, []);

    const handleUserSearchModal = (value) => {
        if (!value) {
            setSearchOptions([]);
            return;
        }
        const filtered = allUsers.filter(
            (user) =>
                user.Username.toLowerCase().includes(value.toLowerCase()) ||
                user.FullName.toLowerCase().includes(value.toLowerCase())
        );
        const options = filtered.map((user) => ({
            value: user.UserID.toString(),
            label: `${user.FullName} (${user.Username})`
        }));
        setSearchOptions(options);
    };


    // Xử lý tạo hoặc cập nhật nhóm
    const handleGroupSubmit = async (values) => {
        try {
            if (editingGroup) {
                await axios.put(`${API_BASE}/groups/${editingGroup.GroupID}`, values);
                message.success("Group updated successfully");
            } else {
                await axios.post(`${API_BASE}/groups`, values);
                message.success("Group created successfully");
            }
            fetchGroups();
            setGroupModalVisible(false);
            groupForm.resetFields();
            setEditingGroup(null);
            setGroupUsers([]); // Reset danh sách thành viên
        } catch (error) {
            console.error("Error saving group:", error);
            message.error("Failed to save group");
        }
    };

    // Xử lý xóa nhóm
    const handleDeleteGroup = async (groupId) => {
        try {
            await axios.delete(`${API_BASE}/groups/${groupId}`);
            message.success("Group deleted successfully");
            fetchGroups();
        } catch (error) {
            console.error("Error deleting group:", error);
            message.error("Failed to delete group");
        }
    };

    // Mở modal chỉnh sửa nhóm và tải danh sách thành viên
    const openEditGroup = async (group) => {
        setEditingGroup(group);
        groupForm.setFieldsValue({ groupName: group.GroupName });
        await fetchGroupUsers(group.GroupID);
        setGroupModalVisible(true);
    };

    // Xử lý thêm user vào nhóm
    const handleAddUserToGroup = async (values) => {
        try {
            const payload = {
                groupId: editingGroup ? Number(editingGroup.GroupID) : Number(values.groupId),
                userId: Number(values.userId)
            };
            await axios.post(`${API_BASE}/groups/addUser`, payload);
            message.success("User added to group successfully");
            await fetchGroupUsers(payload.groupId);
            setAddUserModalVisible(false);
            addUserForm.resetFields();
            setSearchOptions([]);
        } catch (error) {
            console.error("Error adding user to group:", error.response ? error.response.data : error);
            message.error("Failed to add user to group");
        }
    };

    // Xử lý xóa user khỏi nhóm
    const handleRemoveUserFromGroup = async (groupId, userId) => {
        try {
            await axios.post(`${API_BASE}/groups/removeUser`, { userId, groupId });
            message.success("User removed from group successfully");
            await fetchGroupUsers(groupId);
        } catch (error) {
            console.error("Error removing user from group:", error);
            message.error("Failed to remove user from group");
        }
    };

    // Các cột cho bảng nhóm
    const groupColumns = [
        { title: "Group Name", dataIndex: "GroupName", key: "GroupName" },
        {
            title: "Actions",
            key: "action",
            render: (text, record) => (
                <>
                    <Button type="primary" style={{ marginRight: 8 }} onClick={() => openEditGroup(record)}>
                        Edit
                    </Button>
                    <Popconfirm
                        title="Are you sure to delete this group?"
                        onConfirm={() => handleDeleteGroup(record.GroupID)}
                        okText="Yes"
                        cancelText="No"
                    ><Button type="danger" >
                            Delete
                        </Button>

                    </Popconfirm>

                </>
            ),
        },
    ];

    // Các cột cho bảng thành viên của nhóm
    const groupUsersColumns = [
        { title: "Full Name", dataIndex: "FullName", key: "FullName" },
        { title: "Username", dataIndex: "Username", key: "Username" },
        { title: "Email", dataIndex: "Email", key: "Email" },
        {
            title: "Action",
            key: "action",
            render: (text, record) => (
                <Button type="danger" onClick={() => handleRemoveUserFromGroup(editingGroup.GroupID, record.UserID)}>
                    Remove
                </Button>
            ),
        },
    ];

    return (
        <div className="group-management">
            <div style={{ padding: 20 }}>
                <h2>Group Management</h2>
                <Button
                    className="add-group-button"
                    type="primary"
                    onClick={() => {
                        setEditingGroup(null);
                        groupForm.resetFields();
                        setGroupUsers([]);
                        setGroupModalVisible(true);
                    }}
                    style={{ marginBottom: 16 }}
                >
                    Add Group
                </Button>
                <Table columns={groupColumns} dataSource={groups} rowKey="GroupID" loading={loading} />

                {/* Modal tạo/chỉnh sửa nhóm */}
                <Modal
                    className="modal-custom"
                    title={editingGroup ? "Edit Group" : "Add Group"}
                    open={groupModalVisible}
                    onCancel={() => {
                        setGroupModalVisible(false);
                        setEditingGroup(null);
                        setGroupUsers([]);
                    }}
                    onOk={() => groupForm.submit()}
                    width={600}
                >
                    <Form form={groupForm} layout="vertical" onFinish={handleGroupSubmit}>
                        <Form.Item
                            name="groupName"
                            label="Group Name"
                            rules={[{ required: true, message: "Please enter group name" }]}
                        >
                            <Input placeholder="Enter group name" />
                        </Form.Item>
                    </Form>
                    {editingGroup && (
                        <div style={{ marginTop: 20 }}>
                            <h3>Group Members</h3>
                            <Table columns={groupUsersColumns} dataSource={groupUsers} rowKey="UserID" size="small" pagination={false} />
                            <Button type="dashed" onClick={() => setAddUserModalVisible(true)} style={{ marginTop: 10 }}>
                                Add User
                            </Button>
                        </div>
                    )}
                </Modal>

                <Modal
                    title="Add User to Group"
                    open={addUserModalVisible}
                    onCancel={() => {
                        setAddUserModalVisible(false);
                        setSearchOptions([]);
                        addUserForm.resetFields();
                    }}
                    onOk={() => addUserForm.submit()}
                >
                    <Form
                        form={addUserForm}
                        layout="vertical"
                        onFinish={handleAddUserToGroup}
                        initialValues={{
                            groupId: editingGroup ? editingGroup.GroupID : null
                        }}
                    >
                        <Form.Item name="groupId" hidden>
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="userId"
                            label="Search User by Username"
                            rules={[{ required: true, message: "Please select a user" }]}
                        >
                            <AutoComplete
                                options={searchOptions}
                                placeholder="Type username..."
                                onSearch={handleUserSearchModal}
                                onSelect={(value) => {
                                    addUserForm.setFieldsValue({ userId: value });
                                }}
                                filterOption={false}
                            />
                        </Form.Item>
                    </Form>
                </Modal>

            </div>
        </div>

    );
};

export default GroupManagementPage;
