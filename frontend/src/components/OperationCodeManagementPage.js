import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button, Modal, Input, Form, message } from "antd";
import { useAuth } from "../context/AuthContext";
import "../styles/OperationCodeManagementPage.css"

const OperationCodeManagementPage = () => {
    const { user } = useAuth();
    const [operationCodes, setOperationCodes] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCode, setEditingCode] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchOperationCodes();
    }, []);

    const fetchOperationCodes = async () => {
        try {
            const response = await axios.get("http://sample.pihlgp.com:5000/api/operationCode");
            setOperationCodes(response.data);
        } catch (error) {
            console.error("Error fetching operation codes:", error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://sample.pihlgp.com:5000/api/operationCode/${id}`);
            fetchOperationCodes();
            message.success("Deleted successfully!");
        } catch (error) {
            console.error("Error deleting operation code:", error);
        }
    };

    const handleEdit = (code) => {
        setEditingCode(code);
        form.setFieldsValue({ reasonDetail: code.ReasonDetail });
        setIsModalVisible(true);
    };

    const handleAdd = () => {
        setEditingCode(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleSave = async (values) => {
        try {
            if (editingCode) {
                await axios.put(`http://sample.pihlgp.com:5000/api/operationCode/${editingCode.ReasonID}`, values);
            } else {
                await axios.post("http://sample.pihlgp.com:5000/api/operationCode", values);
            }
            fetchOperationCodes();
            setIsModalVisible(false);
            message.success("Saved successfully!");
        } catch (error) {
            console.error("Error saving operation code:", error);
        }
    };

    // Chỉ IT có quyền chỉnh sửa
    const isIT = user?.departmentId === 5;


    const columns = [
        { title: "Reason", dataIndex: "ReasonDetail", key: "ReasonDetail" },
        ...(isIT ? [{
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <>
                    <Button onClick={() => handleEdit(record)} type="primary" style={{ marginRight: 8 }}>Edit</Button>
                    <Button onClick={() => handleDelete(record.ReasonID)} type="danger">Delete</Button>
                </>
            ),
        }] : [])
    ];

    console.log("User Info:", user);
    console.log("Is IT:", isIT);

    return (
        <div className="operationCode-management">
            <h2>Operation Code Management</h2>
            {isIT && <Button type="primary" onClick={handleAdd} className="add-operationCode-management-button" style={{ marginBottom: 16 }}>Add</Button>}
            <Table columns={columns} className="operationCode-management-table" dataSource={operationCodes} rowKey="ReasonID" />

            <Modal
                title={editingCode ? "Edit Reason" : "Add Reason"}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item
                        name="reasonDetail"
                        label="Reason"
                        rules={[{ required: true, message: "Please enter reason detail" }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default OperationCodeManagementPage;
