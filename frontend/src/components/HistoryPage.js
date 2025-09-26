// src/pages/HistoryPage.js
import React, { useState, useCallback } from 'react';
import { Table, Input, Button, Typography, message, Card, DatePicker, Select } from 'antd';
import { SearchOutlined, OrderedListOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useTranslation } from "react-i18next";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import '../styles/HistoryPage.css';

const { Title } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

dayjs.extend(utc);
dayjs.extend(timezone);

const HistoryPage = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [itemCodeFilter, setItemCodeFilter] = useState('');
    const [qrCodeFilter, setQrCodeFilter] = useState('');
    const [qrScanValue, setQrScanValue] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);
    const [actionTypeFilter, setActionTypeFilter] = useState('');

    const fetchLogs = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const queryParams = {};
            if (params.itemCode) queryParams.itemCode = params.itemCode;
            if (params.qrCode) queryParams.qrCode = params.qrCode;
            if (params.actionType) queryParams.actionType = params.actionType;
            if (params.startDate && params.endDate) {
                queryParams.startDate = params.startDate;
                queryParams.endDate = params.endDate;
            }
            const query = new URLSearchParams(queryParams).toString();
            console.log('Fetch Logs Query:', `/api/transaction/logs?${query}`);
            const response = await fetch(`/api/transaction/logs?${query}`);
            const result = await response.json();
            console.log('dữ liệu gửi lại:', result);
            if (!response.ok) {
                throw new Error(result.message || t("failedToFetchLogs"));
            }
            setLogs(result);
        } catch (error) {
            console.error('Error fetching logs:', error);
            message.error(error.message || t("failedToFetchLogs"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    // useEffect(() => {
    //     fetchLogs();
    // }, [fetchLogs]);

    const handleItemCodeSearch = (value) => {
        setItemCodeFilter(value);
        fetchLogs({
            itemCode: value,
            qrCode: qrCodeFilter,
            actionType: actionTypeFilter,
            startDate: dateRange[0]?.startOf('day').toISOString(),
            endDate: dateRange[1]?.endOf('day').toISOString(),
        });
    };

    const handleQrCodeSearch = (value) => {
        setQrCodeFilter(value);
        fetchLogs({
            itemCode: itemCodeFilter,
            qrCode: value,
            actionType: actionTypeFilter,
            startDate: dateRange[0]?.startOf('day').toISOString(),
            endDate: dateRange[1]?.endOf('day').toISOString(),
        });
    };
    const handleQrScanSearch = async (value) => {
        setQrScanValue(value);
        if (!value) {
            setLogs([]);
            return;
        }
        try {
            const fields = value.split("|");
            if (fields.length < 2) {
                message.error(t("invalidQRCodeFormat"));
                return;
            }
            const uniqueKey = fields[0];
            const qrIndex = fields[1];
            const qrCodeId = `${uniqueKey}|${qrIndex}`;
            const response = await fetch(`/api/transaction/logs?qrCode=${encodeURIComponent(qrCodeId)}`);
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || t("failedToFetchLogs"));
            }
            setLogs(result);
            setQrScanValue(""); // Clear ô tìm kiếm
        } catch (error) {
            message.error(error.message || t("failedToFetchLogs"));
            setLogs([]);
        }
    };

    const handleGetAll = () => {
        fetchLogs();
    };
    const handleResetTable = () => {
        setLogs([]);
        setItemCodeFilter('');
        setQrCodeFilter('');
        setQrScanValue('');
        setDateRange([null, null]);
        setActionTypeFilter('');
    };
    const handleDateRangeChange = (dates) => {
        setDateRange(dates);
        fetchLogs({
            itemCode: itemCodeFilter,
            qrCode: qrCodeFilter,
            actionType: actionTypeFilter,
            startDate: dates?.[0]?.startOf('day').toISOString(),
            endDate: dates?.[1]?.endOf('day').toISOString(),
        });
    };

    const handleActionTypeChange = (value) => {
        setActionTypeFilter(value);
        fetchLogs({
            itemCode: itemCodeFilter,
            qrCode: qrCodeFilter,
            actionType: value,
            startDate: dateRange[0]?.startOf('day').toISOString(),
            endDate: dateRange[1]?.endOf('day').toISOString(),
        });
    };

    const handleResetFilters = () => {
        setItemCodeFilter('');
        setQrCodeFilter('');
        setDateRange([null, null]);
        setActionTypeFilter('');
        fetchLogs();
    };

    const columns = [
        {
            title: t("key"),
            dataIndex: "UniqueKey",
            key: "UniqueKey"
        },
        {
            title: t("actionType"),
            dataIndex: 'ActionType',
            key: 'ActionType',
        },
        {
            title: t("quantity"),
            dataIndex: 'Quantity',
            key: 'Quantity',
        },
        {
            title: t("executionDate"),
            dataIndex: 'Date',
            key: 'Date',
            render: (text) => {
                const localTime = text.replace('Z', '');
                console.log('Date Input:', text, 'Local Time:', localTime, 'Converted:', dayjs(localTime).format('DD/MM/YYYY HH:mm:ss'));
                return dayjs(localTime).format('DD/MM/YYYY HH:mm:ss');
            },
        },
        {
            title: t("executedBy"),
            dataIndex: 'Name',
            key: 'Name',
        },
        {
            title: t("departments"),
            dataIndex: 'Department',
            key: 'Department',
        },
        {
            title: t("receiver"),
            dataIndex: 'ToUserName',
            key: 'ToUserName',
            render: (text) => text || 'N/A',
        },
        {
            title: t("receiverDepartment"),
            dataIndex: 'ToDepartmentName',
            key: 'ToDepartmentName',
            render: (text) => text || 'N/A',
        },
        {
            title: t("qrCode"),
            dataIndex: 'QRCode',
            key: 'QRCode',
        },
        {
            title: t("reason"),
            dataIndex: 'Reason',
            key: 'Reason',
            render: (text) => text || 'N/A',
        },
        {
            title: t("note"), // Thêm cột Note
            dataIndex: 'Note',
            key: 'Note',
            render: (text) => text || 'N/A',
        },
    ];

    return (
        <div className="transaction-logs">
            <Card style={{ margin: 24 }}>
                <Title level={3}>{t("transactionHistory")}</Title>
                <div className="filter-container" style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                    <Search
                        placeholder={t("scanQRPlaceholder")}
                        allowClear
                        enterButton={<SearchOutlined />}
                        onSearch={handleQrScanSearch}
                        value={qrScanValue}
                        onChange={(e) => setQrScanValue(e.target.value)}
                        style={{ width: 300 }}
                    />
                    <Button type="primary" onClick={handleGetAll} icon={<OrderedListOutlined />}>
                        {t("getAllLogs")}
                    </Button>
                    <Button type="default" onClick={handleResetTable} icon={<ClearOutlined />}>
                        {t("resetTable")}
                    </Button>
                    <RangePicker
                        placeholder={[t("startDate"), t("endDate")]}
                        value={dateRange}
                        onChange={handleDateRangeChange}
                        style={{ width: 300 }}
                        format="DD/MM/YYYY"
                        allowClear
                    />
                    <Select
                        placeholder={t("filterByActionType")}
                        value={actionTypeFilter || undefined}
                        onChange={handleActionTypeChange}
                        style={{ width: 200 }}
                        allowClear
                    >
                        <Option value="Borrow">{t("borrow")}</Option>
                        <Option value="Return">{t("return")}</Option>
                        <Option value="Transfer">{t("transfer")}</Option>
                        <Option value="Export">{t("export")}</Option>
                        <Option value="Reject">{t("reject")}</Option>
                    </Select>
                    <Button type="default" onClick={handleResetFilters} icon={<ReloadOutlined />}>
                        {t("resetFilters")}
                    </Button>
                </div>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey={(record) => `${record.ItemCode}-${record.Date}`}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: true }}
                />
            </Card>
        </div>
    );
};

export default HistoryPage;