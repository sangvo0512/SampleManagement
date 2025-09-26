import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Table, Button, Select, Modal, Input, message, Row, Col, Typography, Tag, Tooltip } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import '../styles/InventoryPage.css';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../context/PermissionContext';
import { FormOutlined, PlusCircleOutlined, OrderedListOutlined, ScanOutlined, FileExcelOutlined, SearchOutlined, RetweetOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

dayjs.extend(utc);
dayjs.extend(timezone);

const InventoryPage = () => {
    const [warehouses, setWarehouses] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [data, setData] = useState([]);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [addLocation, setAddLocation] = useState(null);
    const [qrCodes, setQrCodes] = useState([]);
    const [qrInput, setQrInput] = useState('');
    const [searchedQr, setSearchedQr] = useState(null);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newLocation, setNewLocation] = useState(null);
    //State chuyển kho
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [transferLocation, setTransferLocation] = useState(null);
    const [transferQrCodes, setTransferQrCodes] = useState([]);
    const [transferQrInput, setTransferQrInput] = useState('');

    const [searchQrInput, setSearchQrInput] = useState('');
    const { permissions } = usePermissions(); //Phân quyền
    const { t } = useTranslation();//Đa ngôn ngữ
    const API_BASE = process.env.REACT_APP_API_BASE || '/api';
    const searchQrRef = useRef(null);
    const [searchColumn, setSearchColumn] = useState("ItemCode"); // Mặc định
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await axios.get(`${API_BASE}/warehouses?ts=${Date.now()}`);
            setWarehouses(res.data);
        } catch (err) {
            message.error(t('error_fetch_warehouses'));
        }
    };

    const fetchData = async (location = null, qrCodeId = null) => {
        try {
            const params = { location: location || '', qrCodeId: qrCodeId || '' };
            const res = await axios.get(`${API_BASE}/warehouses/qrcodes?ts=${Date.now()}`, { params });
            setData(res.data);
        } catch (err) {
            message.error(t('error_fetch_data'));
        }
    };

    const handleSelectLocation = (value) => {
        setSelectedLocation(value);
        setSearchedQr(null);
        setSearchQrInput('');
        setSearchValue('');
        fetchData(value);
    };

    const handleShowAll = () => {
        setSelectedLocation(null);
        setSearchedQr(null);
        setSearchQrInput('');
        setSearchValue('');
        fetchData();
    };

    const handleSearchQr = () => {
        if (!searchQrInput) {
            message.warning(t('please_scan_or_enter_qr'));
            return;
        }
        // Normalize QRCodeID
        let normalizedQr = searchQrInput;
        if (searchQrInput.includes('-') && !searchQrInput.includes('|')) {
            normalizedQr = searchQrInput.replace(/\d+$/, match => '|' + match.slice(1));
            message.warning(t('qr_old_format_detected'));
        }
        setSearchedQr(normalizedQr);
        fetchData(selectedLocation, normalizedQr);
        setSearchQrInput(''); // Reset input sau tìm kiếm
        message.success(`${t('search_by_qr')}: ${normalizedQr}`);
    };
    // Hàm filter client-side theo searchColumn và searchValue
    const handleSearch = (value) => {
        setSearchValue(value);
    };

    // Compute filtered data dùng useMemo để hiệu quả
    const filteredData = useMemo(() => {
        if (!searchValue) return data;
        const lowerValue = searchValue.toLowerCase();
        return data.filter(item => {
            const fieldValue = item[searchColumn]?.toString().toLowerCase() || '';
            return fieldValue.includes(lowerValue);
        });
    }, [data, searchColumn, searchValue]);
    const handleEdit = (item) => {
        setEditingItem(item);
        setNewLocation(item.Location);
        setIsEditModalVisible(true);
    };

    const handleUpdateLocation = async () => {
        if (!newLocation) {
            message.warning(t('please_select_new_location'));
            return;
        }
        try {
            await axios.post(`${API_BASE}/warehouses/update-location?ts=${Date.now()}`, {
                qrCodeId: editingItem.QRCodeID,
                newLocation,
            });
            message.success(t('update_location_success'));
            setIsEditModalVisible(false);
            fetchData(selectedLocation, searchedQr);
        } catch (err) {
            message.error(err.response?.data?.error || t('error_update_location'));
        }
    };

    const showAddModal = () => {
        setIsAddModalVisible(true);
        setQrCodes([]);
        setAddLocation(null);
        setQrInput('');
    };

    const handleAddQr = () => {
        if (!qrInput) return;
        if (qrCodes.includes(qrInput)) {
            message.error("The QR code has existed");
            setQrInput('');
            return;
        }
        setQrCodes([...qrCodes, qrInput]);
        setQrInput('');
    };
    const handleAddTransferQr = () => {
        if (!transferQrInput) return;
        if (transferQrCodes.includes(transferQrInput)) {
            message.error("The QR code has existed");
            setTransferQrInput('');
            return;
        }
        setTransferQrCodes([...transferQrCodes, transferQrInput]);
        setTransferQrInput('');
    };

    const handleRemoveQr = (qr) => {
        setQrCodes(qrCodes.filter((item) => item !== qr));
    };

    const handleAddToWarehouse = async () => {
        if (!addLocation || qrCodes.length === 0) {
            message.warning(t('please_select_location_and_qr'));
            return;
        }
        try {
            await axios.post(`${API_BASE}/warehouses/add-to-warehouse?ts=${Date.now()}`, {
                location: addLocation,
                qrCodes,
            });
            message.success(t('success'));
            setIsAddModalVisible(false);
            fetchData(selectedLocation);
        } catch (err) {
            message.error(err.response?.data?.error || t('error_add_to_warehouse'));
        }
    };
    const handleTransferWarehouse = async () => {
        if (!transferLocation || transferQrCodes.length === 0) {
            message.warning(t('please_select_location_and_qr'));
            return;
        }
        try {
            await axios.post(`${API_BASE}/warehouses/transfer-warehouse?ts=${Date.now()}`, {
                location: transferLocation,
                qrCodes: transferQrCodes,
            });
            message.success(t('success'));
            setIsTransferModalVisible(false);
            fetchData(selectedLocation);
        } catch (err) {
            message.error(err.response?.data?.error || t('error_transfer_warehouse'));
        }
    };


    const handleExport = async (exportAll = false) => {
        try {
            const hide = message.loading(t('exporting_data'), 0);
            const location = exportAll ? '' : selectedLocation;
            const res = await axios.get(`${API_BASE}/warehouses/export-warehouse?ts=${Date.now()}&location=${location || ''}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', exportAll ? 'all_qrcodes.xlsx' : `warehouse_${selectedLocation || 'no_location'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            hide();
            message.success(t('export_success'));
        } catch (err) {
            console.error('Export error:', err);
            message.error(t('error_export_excel'));
        }
    };

    const columns = [
        { title: t('qrcode_id'), dataIndex: 'QRCodeID', key: 'QRCodeID' },
        { title: t('qr_index'), dataIndex: 'QRIndex', key: 'QRIndex' },
        {
            title: t('qrStatus'),
            dataIndex: 'Status',
            key: 'Status',
            render: (text) => (
                <Tag
                    color={
                        text === "Available" ? "green" :
                            text === "Borrowed" ? "volcano" :
                                text === "Exported" ? "red" :
                                    text === "Rejected" ? "#A6A6A6" : "default"
                    }
                >
                    {text}
                </Tag>
            ),
        },
        { title: t('location'), dataIndex: 'Location', key: 'Location' },
        { title: t('season'), dataIndex: 'Season', key: 'Season' },
        { title: t('itemCode'), dataIndex: 'ItemCode', key: 'ItemCode' },
        { title: t('articleNo.'), dataIndex: 'ArticleNO', key: 'ArticleNO' },
        { title: t('round'), dataIndex: 'Round', key: 'Round' },
        {
            title: t('action'),
            key: 'action',
            render: (_, record) => (
                <Button type="primary"
                    onClick={() => handleEdit(record)}
                    icon={<FormOutlined />}
                    disabled={!record.Location}>
                    {t('edit')}
                </Button>
            ),
        },
    ];

    return (
        <div className="warehouse-page">
            <Title level={3}>{t('inventory')}</Title>

            <Row gutter={16} className="filter-row">
                <Col span={2}>
                    <Select
                        placeholder={t('select')}
                        allowClear
                        onChange={handleSelectLocation}
                        value={selectedLocation}
                        style={{ width: '100%' }}
                    >
                        {warehouses.map((wh) => (
                            <Option key={wh.WarehouseID} value={wh.WarehouseName}>
                                {wh.WarehouseName}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col>
                    <Button type="primary" onClick={handleShowAll} block icon={<OrderedListOutlined />}>
                        {t('getAllSamples')}
                    </Button>
                </Col>
                <Col xs={24} sm={12} md={8} lg={3}>
                    <Input
                        ref={searchQrRef}
                        placeholder={t('scan_or_enter_qrcode_to_search')}
                        value={searchQrInput}
                        onChange={(e) => setSearchQrInput(e.target.value)}
                        onPressEnter={handleSearchQr}
                        prefix={<ScanOutlined onClick={() => searchQrRef.current.focus()} />}
                    />
                </Col>
                <Col>
                    <Button type="primary" onClick={showAddModal} block icon={<PlusCircleOutlined />}>
                        {t('warehousing')}
                    </Button>
                </Col>
                <Col>
                    <Button
                        type="primary"
                        onClick={() => {
                            setIsTransferModalVisible(true);
                            setTransferQrCodes([]);
                            setTransferLocation(null);
                            setTransferQrInput('');
                        }}
                        block
                        icon={<RetweetOutlined />}
                    >
                        {t('transferWarehouse')}
                    </Button>
                </Col>
                <Col>
                    <Button type="primary" onClick={() => handleExport(false)} block icon={<FileExcelOutlined />}>
                        {t('exportAvailableAndBorrowed')}
                    </Button>
                </Col>
                <Col span={2}>
                    <Select
                        placeholder={t('select_search_column')}
                        value={searchColumn}
                        onChange={setSearchColumn}
                        style={{ width: '100%' }}
                    >
                        <Select.Option value="ItemCode">{t('itemCode')}</Select.Option>
                        <Select.Option value="ArticleNO">{t('articleNo.')}</Select.Option>
                        <Select.Option value="Season">{t('season')}</Select.Option>
                        <Select.Option value="Round">{t('round')}</Select.Option>
                        <Select.Option value="Brand">{t('brand')}</Select.Option>
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Input.Search
                        placeholder={t('search')}
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        onSearch={handleSearch}
                        allowClear
                        enterButton={<SearchOutlined />}
                    />
                </Col>
                {/* Mới: Hiển thị tổng số lượng */}
                <Col style={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title={t('note_inventory')}>
                        <div className="total-items">{t('total_items')}: {filteredData.filter(item => item.Location).length}/{filteredData.length}</div>
                    </Tooltip>

                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="QRCodeID"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
            />

            {/* Modal thêm mẫu */}
            <Modal
                title={t('warehousing')}
                open={isAddModalVisible}
                onOk={handleAddToWarehouse}
                onCancel={() => setIsAddModalVisible(false)}
                okText={t('add')}
                cancelText={t('cancel')}
            >
                <Row gutter={16}>
                    <Col span={24}>
                        <Select
                            placeholder={t('select_warehouse')}
                            onChange={(value) => setAddLocation(value)}
                            value={addLocation}
                            style={{ width: '100%', marginBottom: 16 }}
                        >
                            {warehouses.map((wh) => (
                                <Option key={wh.WarehouseID} value={wh.WarehouseName}>
                                    {wh.WarehouseName}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={20}>
                        <Input
                            placeholder={t('scan_or_enter_qrcode')}
                            value={qrInput}
                            onChange={(e) => setQrInput(e.target.value)}
                            onPressEnter={handleAddQr}
                            autoFocus
                        />
                    </Col>
                    <Col span={4}>
                        <Button onClick={handleAddQr}>{t('add')}</Button>
                    </Col>
                </Row>
                <ul style={{ marginTop: 16 }}>
                    {qrCodes.map((qr) => (
                        <li key={qr}>
                            {qr} <Button type="link" onClick={() => handleRemoveQr(qr)}>{t('remove')}</Button>
                        </li>
                    ))}
                </ul>
            </Modal>

            {/* Modal sửa kho */}
            <Modal
                title={t('edit_location_for_item')}
                open={isEditModalVisible}
                onOk={handleUpdateLocation}
                onCancel={() => setIsEditModalVisible(false)}
                okText={t('update')}
                cancelText={t('cancel')}
            >
                <Select
                    placeholder={t('select_new_warehouse')}
                    value={newLocation}
                    onChange={setNewLocation}
                    style={{ width: '100%' }}
                >
                    {warehouses.map((wh) => (
                        <Option key={wh.WarehouseID} value={wh.WarehouseName}>
                            {wh.WarehouseName}
                        </Option>
                    ))}
                </Select>
            </Modal>
            {/* Modal chuyển kho */}
            <Modal
                title={t('transferWarehouse')}
                open={isTransferModalVisible}
                onOk={handleTransferWarehouse}
                onCancel={() => setIsTransferModalVisible(false)}
                okText={t('transfer')}
                cancelText={t('cancel')}
            >
                <Row gutter={16}>
                    <Col span={24}>
                        <Select
                            placeholder={t('select_warehouse')}
                            onChange={(value) => setTransferLocation(value)}
                            value={transferLocation}
                            style={{ width: '100%', marginBottom: 16 }}
                        >
                            {warehouses.map((wh) => (
                                <Option key={wh.WarehouseID} value={wh.WarehouseName}>
                                    {wh.WarehouseName}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col span={20}>
                        <Input
                            placeholder={t('scan_or_enter_qrcode')}
                            value={transferQrInput}
                            onChange={(e) => setTransferQrInput(e.target.value)}
                            onPressEnter={handleAddTransferQr}
                            autoFocus
                        />
                    </Col>
                    <Col span={4}>
                        <Button onClick={handleAddTransferQr}>{t('add')}</Button>
                    </Col>
                </Row>
                <ul style={{ marginTop: 16 }}>
                    {transferQrCodes.map((qr) => (
                        <li key={qr}>
                            {qr} <Button type="link" onClick={() => setTransferQrCodes(transferQrCodes.filter((item) => item !== qr))}>{t('remove')}</Button>
                        </li>
                    ))}
                </ul>
            </Modal>

        </div>
    );
};

export default InventoryPage;