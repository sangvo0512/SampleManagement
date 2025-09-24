import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { PlusCircleOutlined, DeleteOutlined, FormOutlined } from "@ant-design/icons";
import '../styles/BorrowerManagementPage.css';

const BorrowerManagementPage = () => {
    const { t } = useTranslation();
    const [borrowers, setBorrowers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedBorrower, setSelectedBorrower] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();

    // Helper gọi API
    const callApi = async (url, options = {}, successMsg, errorMsg) => {
        try {
            setLoading(true);

            let finalUrl = url;

            // Nếu là GET thì tự động thêm timestamp để tránh cache
            if ((options.method || 'GET').toUpperCase() === 'GET') {
                const ts = Date.now();
                finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'ts=' + ts;
            }

            const response = await fetch(finalUrl, {
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store', // thêm cache control
                ...options,
            });

            const result = await response.json();
            if (result.success) {
                successMsg && message.success(successMsg);
                return result.data || true;
            } else {
                message.error(result.message || errorMsg);
                return null;
            }
        } catch (error) {
            console.error(errorMsg, error);
            message.error(errorMsg);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // Lấy danh sách người mượn
    const fetchBorrowers = useCallback(async () => {
        const data = await callApi('/api/borrowers', { method: 'GET' }, null, t('fetchBorrowersError'));
        if (data) setBorrowers(data);
    }, [t]);

    useEffect(() => {
        fetchBorrowers();
    }, [fetchBorrowers]);

    // Mở modal thêm
    const showAddModal = () => {
        setSelectedBorrower(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    // Mở modal sửa
    const showEditModal = (borrower) => {
        setSelectedBorrower(borrower);
        form.setFieldsValue(borrower);
        setIsModalVisible(true);
    };

    // Submit form (thêm hoặc sửa)
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (selectedBorrower) {
                await callApi(
                    '/api/borrowers',
                    { method: 'PUT', body: JSON.stringify({ ...values, CardID: selectedBorrower.CardID }) },
                    t('updateBorrowerSuccess'),
                    t('updateBorrowerError')
                );
            } else {
                await callApi(
                    '/api/borrowers',
                    { method: 'POST', body: JSON.stringify(values) },
                    t('addBorrowerSuccess'),
                    t('addBorrowerError')
                );
            }
            fetchBorrowers();
            setIsModalVisible(false);
        } catch (error) {
            console.error('Lỗi khi lưu người mượn:', error);
            message.error(t('saveBorrowerError'));
        }
    };

    // Xóa
    const handleDelete = async (cardID) => {
        await callApi(
            `/api/borrowers/${cardID}`,
            { method: 'DELETE' },
            t('deleteBorrowerSuccess'),
            t('deleteBorrowerError')
        );
        fetchBorrowers();
    };

    // Filtered list (memoized)
    const filteredBorrowers = useMemo(() => {
        return borrowers.filter(b =>
            b.Name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [borrowers, searchTerm]);

    // Table columns
    const columns = [
        { title: t('username'), dataIndex: 'Name', key: 'Name' },
        { title: t('idNumber'), dataIndex: 'CardID', key: 'CardID' },
        { title: t('departmentName'), dataIndex: 'Dept', key: 'Dept' },
        {
            title: t('action'),
            key: 'action',
            render: (_, record) => (
                <div>
                    <Button
                        type="primary"
                        icon={<FormOutlined />}
                        onClick={() => showEditModal(record)}
                        style={{ marginRight: 8 }}
                    >
                        {t('edit')}
                    </Button>
                    <Popconfirm
                        title={t('confirmDeleteBorrower')}
                        onConfirm={() => handleDelete(record.CardID)}
                        okText={t('yes')}
                        cancelText={t('no')}
                    >
                        <Button danger icon={<DeleteOutlined />}>
                            {t('delete')}
                        </Button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="borrower-management">
            <h3>{t('borrowerManagement')}</h3>
            <Button
                icon={<PlusCircleOutlined />}
                className="add-user-button"
                type="primary"
                onClick={showAddModal}
            >
                {t('add')}
            </Button>
            <Input
                className="user-search"
                placeholder={t('searchBorrowerByName')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Table
                className="user-management-table"
                columns={columns}
                dataSource={filteredBorrowers}
                rowKey="CardID"
                loading={loading}
                pagination={{ pageSize: 10 }}
                bordered
            />
            <Modal
                title={selectedBorrower ? t('editBorrower') : t('addBorrower')}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                okText={t('save')}
                cancelText={t('cancel')}
                confirmLoading={loading}
                className="modal-custom"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="Name"
                        label={t('username')}
                        rules={[{ required: true, message: t('pleaseInputName') }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="CardID"
                        label={t('idNumber')}
                        rules={[{ required: true, message: t('pleaseInputCardID') }]}
                    >
                        <Input disabled={!!selectedBorrower} />
                    </Form.Item>
                    <Form.Item
                        name="Dept"
                        label={t('departmentName')}
                        rules={[{ required: true, message: t('pleaseInputDept') }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default BorrowerManagementPage;
