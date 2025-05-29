import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Modal, Input, Form, message, AutoComplete, Popconfirm } from "antd";
import axios from "axios";
import "../styles/GroupManagementPage.css";
import { useTranslation } from "react-i18next";

const GroupManagementPage = () => {
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const { t } = useTranslation();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupForm] = Form.useForm();
    const [groupUsers, setGroupUsers] = useState([]);
    const [addUserModalVisible, setAddUserModalVisible] = useState(false);
    const [addUserForm] = Form.useForm();
    const [allUsers, setAllUsers] = useState([]);
    const [searchOptions, setSearchOptions] = useState([]);
    const [selectedUserDisplay, setSelectedUserDisplay] = useState("");

    const fetchGroups = useCallback(
        async () => {
            setLoading(true);
            try {
                const response = await axios.get(`${API_BASE}/groups`);
                setGroups(response.data);
            } catch (error) {
                console.error("Error fetching groups:", error);
                message.error("Failed to load groups");
            }
            setLoading(false);
        }, [API_BASE]
    );

    const fetchGroupUsers = async (groupId) => {
        try {
            const response = await axios.get(`${API_BASE}/groups/${groupId}/users`);
            setGroupUsers(response.data);
        } catch (error) {
            console.error("Error fetching group users:", error);
            message.error("Failed to load group users");
        }
    };

    const fetchAllUsers = useCallback(
        async () => {
            try {
                const response = await axios.get(`${API_BASE}/users`);
                setAllUsers(response.data);
            } catch (error) {
                console.error("Error fetching users:", error);
                message.error("Failed to load users");
            }
        }, [API_BASE]
    );

    useEffect(() => {
        fetchGroups();
        fetchAllUsers();
    }, [fetchGroups, fetchAllUsers]);

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
            label: `${user.FullName} (${user.Username})`,
            user
        }));
        setSearchOptions(options);
    };

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
            setGroupUsers([]);
        } catch (error) {
            console.error("Error saving group:", error);
            message.error("Failed to save group");
        }
    };

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

    const openEditGroup = async (group) => {
        setEditingGroup(group);
        groupForm.setFieldsValue({ groupName: group.GroupName });
        await fetchGroupUsers(group.GroupID);
        setGroupModalVisible(true);
    };

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
            setSelectedUserDisplay(""); // Reset giá trị hiển thị
        } catch (error) {
            console.error("Error adding user to group:", error.response ? error.response.data : error);
            message.error("Failed to add user to group");
        }
    };

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

    const groupColumns = [
        { title: t("groupName"), dataIndex: "GroupName", key: "GroupName" },
        {
            title: t("action"),
            key: "action",
            render: (text, record) => (
                <>
                    <Button type="primary" style={{ marginRight: 8 }} onClick={() => openEditGroup(record)}>
                        {t("edit")}
                    </Button>
                    <Popconfirm
                        title={t("groupConfirm")}
                        onConfirm={() => handleDeleteGroup(record.GroupID)}
                        okText={t("yes")}
                        cancelText={t("no")}
                    >
                        <Button type="danger">{t("delete")}</Button>
                    </Popconfirm>
                </>
            ),
        },
    ];

    const groupUsersColumns = [
        { title: t("fullname"), dataIndex: "FullName", key: "FullName" },
        { title: t("username"), dataIndex: "Username", key: "Username" },
        { title: t("email"), dataIndex: "Email", key: "Email" },
        {
            title: t("action"),
            key: "action",
            render: (text, record) => (
                <Button type="danger" onClick={() => handleRemoveUserFromGroup(editingGroup.GroupID, record.UserID)}>
                    {t("delete")}
                </Button>
            ),
        },
    ];

    return (
        <div className="group-management">
            <div style={{ padding: 20 }}>
                <h2>{t("groups")}</h2>
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
                    {t("add")}
                </Button>
                <Table columns={groupColumns} dataSource={groups} rowKey="GroupID" loading={loading} />

                <Modal
                    className="modal-custom"
                    title={editingGroup ? t("edit") : t("add")}
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
                            label={t("groupName")}
                            rules={[{ required: true, message: "Vui lòng nhập tên nhóm" }]}
                        >
                            <Input placeholder="Nhập tên nhóm" />
                        </Form.Item>
                    </Form>
                    {editingGroup && (
                        <div style={{ marginTop: 20 }}>
                            <h3>{t("groupMember")}</h3>
                            <Table columns={groupUsersColumns} dataSource={groupUsers} rowKey="UserID" size="small" pagination={false} />
                            <Button type="dashed" onClick={() => setAddUserModalVisible(true)} style={{ marginTop: 10 }}>
                                {t("add")}
                            </Button>
                        </div>
                    )}
                </Modal>

                <Modal
                    title="Thêm Người Dùng Vào Nhóm"
                    open={addUserModalVisible}
                    onCancel={() => {
                        setAddUserModalVisible(false);
                        setSearchOptions([]);
                        addUserForm.resetFields();
                        setSelectedUserDisplay("");
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
                            label="Tìm Kiếm Người Dùng Theo Tên"
                            rules={[{ required: true, message: "Vui lòng chọn một người dùng" }]}
                            style={{ display: "none" }} // Ẩn Form.Item này
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item label="Tìm Kiếm Người Dùng Theo Tên">
                            <AutoComplete
                                options={searchOptions}
                                placeholder="Nhập tên người dùng..."
                                onSearch={handleUserSearchModal}
                                onSelect={(value, option) => {
                                    addUserForm.setFieldsValue({ userId: value }); // Lưu userId vào Form
                                    setSelectedUserDisplay(option.label); // Cập nhật giá trị hiển thị
                                }}
                                onChange={(value, option) => {
                                    if (option) {
                                        setSelectedUserDisplay(option.label); // Hiển thị label khi chọn
                                        addUserForm.setFieldsValue({ userId: option.value }); // Lưu userId
                                    } else {
                                        setSelectedUserDisplay(value || ""); // Hiển thị giá trị nhập tay
                                        addUserForm.setFieldsValue({ userId: undefined }); // Xóa userId nếu không chọn
                                    }
                                }}
                                value={selectedUserDisplay}
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