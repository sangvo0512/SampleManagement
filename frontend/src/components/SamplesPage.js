import React, { useState, useCallback } from "react";
import { Table, Button, Space, Modal, message, Image, Upload, Input, Row, Col, Select, Form, Popconfirm, DatePicker, Tag } from "antd";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { UploadOutlined, SearchOutlined, DownloadOutlined, ScanOutlined, PlusCircleOutlined, DeleteOutlined, FormOutlined, QrcodeOutlined, OrderedListOutlined, ClearOutlined, FileExcelOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import "../styles/SamplesPage.css";
import { usePermissions } from "../context/PermissionContext";

dayjs.extend(customParseFormat);

const SamplePage = () => {
    const [samples, setSamples] = useState([]);
    const [filteredSamples, setFilteredSamples] = useState([]);
    const [loading, setLoading] = useState(false);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [qrCodes, setQrCodes] = useState([]);
    const [currentSample, setCurrentSample] = useState(null);
    const [searchColumn, setSearchColumn] = useState("ItemCode");
    const [filterBrand, setFilterBrand] = useState(null);
    const [filterBU, setFilterBU] = useState(null);
    const [filterSeason, setFilterSeason] = useState(null);
    const [searchValue, setSearchValue] = useState("");
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const [formVisible, setFormVisible] = useState(false);
    const [editingSample, setEditingSample] = useState(null);
    const [form] = Form.useForm();
    const [selectedQRCodes, setSelectedQRCodes] = useState([]);
    const { t } = useTranslation();
    const [qrScanValue, setQrScanValue] = useState("");
    const { permissions } = usePermissions();

    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [batchQrData, setBatchQrData] = useState([]);
    const [batchQrModalVisible, setBatchQrModalVisible] = useState(false);

    const fetchSamples = useCallback(async (retryCount = 3) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/samples?ts=${Date.now()}`);
            setSamples(res.data);
            setFilteredSamples(res.data);
        } catch (err) {
            if (retryCount > 0) {
                setTimeout(() => fetchSamples(retryCount - 1), 1000);
            } else {
                message.error("Can't load data of Samples");
            }
        } finally {
            setLoading(false);
        }
    }, [API_BASE]);

    //New 
    const handleGenerateBatchQR = async () => {
        const selectedSamples = filteredSamples.filter(s => selectedRowKeys.includes(s.SampleID));
        if (selectedSamples.length === 0) {
            message.warning(t("noSamplesSelected"));
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE}/qr/generate-batch`, { samples: selectedSamples });
            if (res.data.errors && res.data.errors.length > 0) {
                message.warning(t("batchGeneratePartialError") + res.data.errors.map(e => e.error).join(", "));
            }
            setBatchQrData(res.data.batchResults);
            setBatchQrModalVisible(true);
        } catch (err) {
            message.error(t("failedToGenerateBatchQR"));
        } finally {
            setLoading(false);
        }
    };

    const handlePrintBatchQR = () => {
        if (batchQrData.length === 0) {
            message.warning(t("noQRCodesToPrint"));
            return;
        }

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            message.error(t("failedToOpenPrintWindow"));
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>In mã QR hàng loạt</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin: 20px; }
                    .sample-section { margin-bottom: 40px; }
                    .qr-container { display: flex; flex-wrap: wrap; justify-content: center; }
                    .qr-item { margin: 15px; text-align: center; }
                    .qr-image { width: 160px; height: 160px; display: block; border: 1px solid #d9d9d9; border-radius: 8px; }
                    .qr-label { font-size: 14px; margin-bottom: 5px; }
                    .print-button { margin: 20px; padding: 10px 20px; font-size: 16px; border-radius: 8px; background-color: #64cacf; border-color: #64cacf; color: #fff; }
                    @media print {
                        body { margin: 0; }
                        .qr-image { width: 160px !important; height: 160px !important; }
                        .qr-container { page-break-inside: avoid; }
                        .print-button { display: none; }
                    }
                </style>
            </head>
            <body>
                ${batchQrData.map(({ sample, qrCodes }) => `
                    <div class="sample-section">
                        <h2>${sample.UniqueKey || "Không xác định"}</h2>
                        <div class="qr-container">
                            ${qrCodes.map((qr, idx) => `
                                <div class="qr-item">
                                    <img class="qr-image" src="${qr.dataUrl}" alt="QR Code ${idx + 1}" />
                                    <div class="qr-label">${qr.displayText}</div>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `).join("")}
                <button class="print-button" onclick="window.print()">In ngay</button>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
        }, 1000);
    };

    // Row selection cho table
    const rowSelection = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE}/samples/${id}`);
            message.success("Delete successfully!");
            fetchSamples();
        } catch (err) {
            message.error(err.response?.data?.error || "Can't delete this item. Please check the QR code related to this item.");
        }
    };

    const handleQrScanSearch = async (value) => {
        setQrScanValue(value);
        if (!value) {
            setFilteredSamples([]);
            return;
        }
        try {
            const fields = value.split("|");
            if (fields.length < 2) {
                message.error(t("invalidQRCodeFormat"));
                return;
            }
            const res = await axios.post(`${API_BASE}/qr/scan`, { qrCode: value });
            if (res.data) {
                setFilteredSamples([res.data]);
                setQrScanValue("");
            } else {
                message.error(t("sampleNotFound"));
                setFilteredSamples([]);
            }
        } catch (err) {
            message.error(err.response?.data?.error || t("failedToScanQR"));
            setFilteredSamples([]);
        }
    };

    const handleGetAll = () => {
        fetchSamples();
    };

    const handleResetTable = () => {
        setFilteredSamples([]);
        setSearchValue("");
        setQrScanValue("");
    };

    const handleGenerateQR = async (sample) => {
        try {
            const payload = {
                brand: sample.Brand,
                BU: sample.BU,
                season: sample.Season,
                itemCode: sample.ItemCode,
                workingNO: sample.WorkingNO,
                articleNO: sample.ArticleNO,
                round: sample.Round,
                notifyProductionQuantity: sample.NotifyProductionQuantity,
                dateInform: sample.DateInform,
                uniqueKey: sample.UniqueKey,
            };

            const res = await axios.post(`${API_BASE}/qr/generate`, payload);
            setQrCodes(res.data.qrCodes);
            setCurrentSample(sample);
            setQrModalVisible(true);
        } catch (err) {
            console.error("Error generating QR:", err.response?.data || err);
            message.error(err.response?.data?.error || "Failed to generate QR");
        }
    };

    const handlePrintAllQRCodes = () => {
        if (!qrCodes.length) {
            message.warning(t("noQRCodesToPrint"));
            return;
        }
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            message.error(t("failedToOpenPrintWindow"));
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>In tất cả mã QR</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin: 20px; }
                    .qr-container { display: flex; flex-wrap: wrap; justify-content: center; }
                    .qr-item { margin: 15px; text-align: center; }
                    .qr-image { width: 160px; height: 160px; display: block; border: 1px solid #d9d9d9; border-radius: 8px; }
                    .qr-label { font-size: 14px; margin-bottom: 5px; }
                    .print-button { margin: 20px; padding: 10px 20px; font-size: 16px; border-radius: 8px; background-color: #64cacf; border-color: #64cacf; color: #fff; }
                    @media print {
                        body { margin: 0; }
                        .qr-image { width: 160px !important; height: 160px !important; }
                        .qr-container { page-break-inside: avoid; }
                        .print-button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    ${qrCodes.map((qr, idx) => `
                        <div class="qr-item">
                            <img class="qr-image" src="${qr.dataUrl}" alt="QR Code ${idx + 1}" />
                            <div class="qr-label">${qr.displayText}</div>
                        </div>
                    `).join("")}
                </div>
                <button class="print-button" onclick="window.print()">In ngay</button>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
        }, 1000);
    };

    const handlePrintSelectedQRCodes = () => {
        if (!selectedQRCodes.length) {
            message.warning(t("noSelectedQRCodes"));
            return;
        }
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            message.error(t("failedToOpenPrintWindow"));
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin: 20px; }
                    .qr-container { display: flex; flex-wrap: wrap; justify-content: center; }
                    .qr-item { margin: 15px; text-align: center; }
                    .qr-image { width: 160px; height: 160px; display: block; border: 1px solid #d9d9d9; border-radius: 8px; }
                    .qr-label { font-size: 14px; margin-bottom: 5px; }
                    .print-button { margin: 20px; padding: 10px 20px; font-size: 16px; border-radius: 8px; background-color: #64cacf; border-color: #64cacf; color: #fff; }
                    @media print {
                        body { margin: 0; }
                        .qr-image { width: 160px !important; height: 160px !important; }
                        .qr-container { page-break-inside: avoid; }
                        .print-button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h2>${currentSample?.UniqueKey || "Không xác định"}</h2>
                <div class="qr-container">
                    ${selectedQRCodes.map((qrId, idx) => {
            const qr = qrCodes.find(q => q.qrCodeId === qrId);
            return `
                            <div class="qr-item">
                                <img class="qr-image" src="${qr?.dataUrl || ""}" alt="QR Code ${idx + 1}" />
                                <div class="qr-label">${qr?.displayText || "N/A"}</div>
                            </div>
                        `;
        }).join("")}
                </div>
                <button class="print-button" onclick="window.print()">In ngay</button>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
        }, 1000);
    };

    const handleImport = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(`${API_BASE}/samples/import`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const { message: apiMessage, errors } = response.data;

            if (Array.isArray(errors) && errors.length > 0) {
                const errorDetails = errors.map((err, index) => {
                    return `${t("error")} ${index + 1}: ${err.error}`;
                }).join("\n");

                message.error({
                    content: (
                        <>
                            <p>{apiMessage || t("importFailed")}</p>
                            <p>{t("errorDetails")}:</p>
                            <pre style={{ maxHeight: "199px", overflow: "auto" }}>{errorDetails}</pre>
                        </>
                    ),
                    duration: 5,
                });
            } else {
                message.success(apiMessage || t("importSuccess"));
            }

            fetchSamples();
        } catch (err) {
            console.error("Import Error:", err.response?.data || err);
            message.error(err.response?.data?.error || t("importFailed"));
        }

        return false;
    };

    const handleSearch = (value) => {
        setSearchValue(value);
        let filtered = samples;

        if (filterBrand) {
            filtered = filtered.filter(s => s.Brand === filterBrand);
        }
        if (filterBU) {
            filtered = filtered.filter(s => s.BU === filterBU);
        }
        if (filterSeason) {
            filtered = filtered.filter(s => s.Season === filterSeason);
        }

        if (value) {
            filtered = filtered.filter(s =>
                s[searchColumn]?.toString().toLowerCase().includes(value.toLowerCase())
            );
        }

        setFilteredSamples(filtered);
    };

    const handleFilterChange = (key, value) => {
        if (key === 'Brand') setFilterBrand(value);
        if (key === 'BU') setFilterBU(value);
        if (key === 'Season') setFilterSeason(value);

        let filtered = samples;

        if (key === 'Brand' || filterBrand) {
            filtered = filtered.filter(s => s.Brand === (key === 'Brand' ? value : filterBrand));
        }
        if (key === 'BU' || filterBU) {
            filtered = filtered.filter(s => s.BU === (key === 'BU' ? value : filterBU));
        }
        if (key === 'Season' || filterSeason) {
            filtered = filtered.filter(s => s.Season === (key === 'Season' ? value : filterSeason));
        }

        if (searchValue) {
            filtered = filtered.filter(s =>
                s[searchColumn]?.toString().toLowerCase().includes(searchValue.toLowerCase())
            );
        }

        setFilteredSamples(filtered);
    };

    const handleExportAvailableAndBorrowed = async () => {
        try {
            const response = await axios.get(`${API_BASE}/samples/export-available-and-borrowed`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `available_and_borrowed_samples_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            message.success(t("exportSuccess"));
        } catch (err) {
            message.error(t("exportFailed"));
            console.error("Export Error:", err);
        }
    };

    const columns = [
        { title: t("serialNumber"), render: (_, __, index) => index + 1 },
        { title: t("brand"), dataIndex: "Brand" },
        { title: "BU", dataIndex: "BU" },
        { title: t("season"), dataIndex: "Season" },
        { title: t("itemCode"), dataIndex: "ItemCode" },
        { title: t("workingNo."), dataIndex: "WorkingNO" },
        { title: t("articleNo."), dataIndex: "ArticleNO" },
        { title: t("colorwayName"), dataIndex: "ColorwayName" },
        { title: t("round"), dataIndex: "Round" },
        { title: t("notifyProductQuantity"), dataIndex: "NotifyProductionQuantity" },
        {
            title: t("notificationDate"),
            dataIndex: "DateInform",
            render: (text) => {
                const date = new Date(text);
                return isNaN(date) ? t("invalidDate") : dayjs(date).format("MM/DD/YYYY");
            },
        },
        { title: t("stockQuantity"), dataIndex: "Quantity" },
        {
            title: t("state"),
            dataIndex: "State",
            render: (text) => (
                <Tag
                    color={
                        text === "Available" ? "green" :
                            text === "Unavailable" ? "red" :
                                text === "Exported" ? "blue" : "default"
                    }
                >
                    {text}
                </Tag>
            ),
        },
        { title: t("borrowed"), dataIndex: "BorrowdQuantity" },
        { title: t("exported"), dataIndex: "Exported" },
        { title: t("rejected"), dataIndex: "Rejected" },
        {
            title: t("createDate"),
            dataIndex: "CreateDate",
            render: (text) => {
                const date = new Date(text);
                return isNaN(date) ? t("invalidDate") : dayjs(date).format("MM/DD/YYYY HH:mm:ss");
            }
        },
        {
            title: t("modifyTime"),
            dataIndex: "ModifyTime",
            render: (text) => {
                const date = new Date(text);
                return isNaN(date) ? t("invalidDate") : dayjs(date).format("MM/DD/YYYY HH:mm:ss");
            }
        },
        {
            title: t("action"),
            render: (_, record) => (
                <Space>
                    {permissions.includes("edit_sample") && (
                        <Button
                            type="primary"
                            icon={<FormOutlined />}
                            disabled={record.BorrowdQuantity > 0 || record.Exported > 0 || record.Rejected > 0}
                            onClick={() => {
                                setEditingSample(record);
                                form.setFieldsValue({
                                    Brand: record.Brand,
                                    BU: record.BU,
                                    Season: record.Season,
                                    ItemCode: record.ItemCode,
                                    WorkingNO: record.WorkingNO,
                                    ArticleNO: record.ArticleNO,
                                    ColorwayName: record.ColorwayName,
                                    Round: record.Round,
                                    NotifyProductionQuantity: record.NotifyProductionQuantity,
                                    DateInform: record.DateInform ? dayjs(record.DateInform) : null,
                                    Quantity: record.Quantity,
                                });
                                setFormVisible(true);
                            }}
                        >
                            {t("edit")}
                        </Button>
                    )}
                    {permissions.includes("delete_sample") && (
                        <Popconfirm
                            title={t("confirmDelete")}
                            onConfirm={() => handleDelete(record.SampleID)}
                        >
                            <Button danger icon={<DeleteOutlined />}>{t("delete")}</Button>
                        </Popconfirm>
                    )}
                    {permissions.includes("generate_qr") && (
                        <Button
                            type="primary"
                            icon={<QrcodeOutlined />}
                            onClick={() => handleGenerateQR(record)}>
                            {t("generate")}
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="sample-page">
            <h3>{t("sample")}</h3>
            <Row className="filter-row" gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={8} lg={2}>
                    <Select
                        placeholder={t("selectSearchColumn")}
                        value={searchColumn}
                        onChange={setSearchColumn}
                        style={{ width: '100%' }}
                    >
                        <Select.Option value="ItemCode">{t("itemCode")}</Select.Option>
                        <Select.Option value="WorkingNO">{t("workingNo.")}</Select.Option>
                        <Select.Option value="Season">{t("season")}</Select.Option>
                        <Select.Option value="Round">{t("round")}</Select.Option>
                        <Select.Option value="ArticleNO">{t("articleNo.")}</Select.Option>
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={8} lg={4}>
                    <Input.Search
                        placeholder={t("search")}
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        onSearch={handleSearch}
                        allowClear
                        style={{ width: '100%' }}
                        enterButton={<SearchOutlined />}
                    />
                </Col>
                <Col xs={24} sm={12} md={8} lg={3}>
                    <Select
                        placeholder={t("filterBrand")}
                        value={filterBrand}
                        onChange={(value) => handleFilterChange('Brand', value)}
                        allowClear
                    >
                        {[...new Set(samples.map(s => s.Brand))].map(brand => (
                            <Select.Option key={brand} value={brand}>{brand}</Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={8} lg={3}>
                    <Select
                        placeholder={t("filterBU")}
                        value={filterBU}
                        onChange={(value) => handleFilterChange('BU', value)}
                        allowClear
                    >
                        {[...new Set(samples.map(s => s.BU))].map(bu => (
                            <Select.Option key={bu} value={bu}>{bu}</Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={8} lg={3}>
                    <Select
                        placeholder={t("filterSeason")}
                        value={filterSeason}
                        onChange={(value) => handleFilterChange('Season', value)}
                        allowClear
                    >
                        {[...new Set(samples.map(s => s.Season))].map(season => (
                            <Select.Option key={season} value={season}>{season}</Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col>
                    <Input.Search
                        placeholder={t("scanQRPlaceholder")}
                        onSearch={handleQrScanSearch}
                        value={qrScanValue}
                        onChange={(e) => setQrScanValue(e.target.value)}
                        allowClear
                        enterButton={<ScanOutlined />}
                    />
                </Col>
                <Col>
                    <Button type="default" onClick={handleResetTable} icon={<ClearOutlined />}>
                        {t("resetTable")}
                    </Button>
                </Col>
                <Col>
                    <Button type="primary" onClick={handleGetAll} icon={<OrderedListOutlined />}>
                        {t("getAllSamples")}
                    </Button>
                </Col>
            </Row>
            <Row className="action-row" gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {permissions.includes("add_sample") && (
                    <Col>
                        <Button
                            icon={<PlusCircleOutlined />}
                            type="primary"
                            onClick={() => {
                                setEditingSample(null);
                                form.resetFields();
                                setFormVisible(true);
                            }}
                        >
                            {t("add")}
                        </Button>
                    </Col>
                )}
                {permissions.includes("add_sample") && (
                    <Col>
                        <Upload beforeUpload={handleImport} showUploadList={false}>
                            <Button type="primary" icon={<UploadOutlined />}>{t("import")}</Button>
                        </Upload>
                    </Col>
                )}
                <Col>
                    <a href="/template/Import_template.xlsx" download>
                        <Button icon={<DownloadOutlined />}>
                            {t("downloadTemplate")}
                        </Button>
                    </a>
                </Col>
                <Col>
                    <Button icon={<FileExcelOutlined />} onClick={handleExportAvailableAndBorrowed} >
                        {t("exportAvailableAndBorrowed")}
                    </Button>
                </Col>
                {permissions.includes("generate_qr") && (
                    <Col>
                        <Button
                            type="primary"
                            icon={<QrcodeOutlined />}
                            onClick={handleGenerateBatchQR}
                            disabled={selectedRowKeys.length === 0}
                        >
                            {t("generateBatchQR")}
                        </Button>
                    </Col>
                )}
            </Row>
            <Table
                className="sample-page-table"
                rowSelection={rowSelection}
                columns={columns}
                dataSource={filteredSamples}
                loading={loading}
                rowKey="SampleID"
            />

            <Modal
                title={`${t("generate")} - ${currentSample?.ItemCode}`}
                open={qrModalVisible}
                onCancel={() => {
                    setQrModalVisible(false);
                    setSelectedQRCodes([]);
                }}
                footer={null}
                width={600}
            >
                <div style={{ textAlign: "center" }}>
                    <Row gutter={[16, 16]} justify="center">
                        {qrCodes.map((qr, idx) => (
                            <Col key={qr.qrCodeId}>
                                <div style={{ textAlign: "center" }}>
                                    <Image src={qr.dataUrl} width={120} />
                                    <div style={{ marginTop: 4, fontSize: 12 }}>
                                        {qr.displayText}
                                    </div>
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={selectedQRCodes.includes(qr.qrCodeId)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedQRCodes([...selectedQRCodes, qr.qrCodeId]);
                                                } else {
                                                    setSelectedQRCodes(
                                                        selectedQRCodes.filter(id => id !== qr.qrCodeId)
                                                    );
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                    <Space style={{ marginTop: 24 }}>
                        <Button
                            type="default"
                            onClick={() => handlePrintSelectedQRCodes()}
                            disabled={selectedQRCodes.length === 0}
                        >
                            {t("printSelectedQR")}
                        </Button>
                        <Button
                            type="primary"
                            onClick={() => handlePrintAllQRCodes()}
                        >
                            {t("printAllQR")}
                        </Button>
                    </Space>
                </div>
            </Modal>
            {/* Modal mới cho batch */}
            <Modal
                title={t("batchQRModalTitle")}
                open={batchQrModalVisible}
                onCancel={() => {
                    setBatchQrModalVisible(false);
                    setSelectedRowKeys([]);
                }}
                footer={null}
                width={800}
            >
                <div style={{ textAlign: "center" }}>
                    {batchQrData.map(({ sample, qrCodes }) => (
                        <div key={sample.SampleID} style={{ marginBottom: 24 }}>
                            <h3>{sample.ItemCode}</h3>
                            <Row gutter={[16, 16]} justify="center">
                                {qrCodes.map((qr) => (
                                    <Col key={qr.qrCodeId}>
                                        <Image src={qr.dataUrl} width={120} />
                                        <div style={{ marginTop: 4, fontSize: 12 }}>{qr.displayText}</div>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ))}
                    <Space style={{ marginTop: 24 }}>
                        <Button type="primary" onClick={handlePrintBatchQR}>
                            {t("printAllQR")}
                        </Button>
                    </Space>
                </div>
            </Modal>

            <Modal
                title={editingSample ? t("edit") : `${t("add")} ${t("sample")}`}
                open={formVisible}
                onCancel={() => setFormVisible(false)}
                onOk={() => form.submit()}
                okText={editingSample ? t("saveChanges") : t("add")}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={async (values) => {
                        const formattedValues = {
                            brand: values.Brand,
                            BU: values.BU,
                            season: values.Season,
                            itemCode: values.ItemCode,
                            workingNO: values.WorkingNO,
                            articleNO: values.ArticleNO,
                            colorwayName: values.ColorwayName,
                            round: values.Round,
                            notifyProductionQuantity: parseInt(values.NotifyProductionQuantity),
                            dateInform: values.DateInform ? values.DateInform.toISOString() : null,
                            quantity: parseInt(values.Quantity) || 0,
                            state: editingSample?.State || 'Available',
                            borrowdQuantity: editingSample?.BorrowdQuantity || 0,
                            exported: editingSample?.Exported || 0,
                            rejected: editingSample?.Rejected || 0,
                            modifyTime: new Date(),
                        };

                        try {
                            if (editingSample) {
                                await axios.put(`${API_BASE}/samples/${editingSample.SampleID}`, formattedValues);
                                message.success("Updated successfully!");
                            } else {
                                await axios.post(`${API_BASE}/samples`, formattedValues);
                                message.success("Added successfully!");
                            }
                            setFormVisible(false);
                            fetchSamples();
                        } catch (err) {
                            message.error("Fail!");
                            console.error(err);
                        }
                    }}
                >
                    <Form.Item label={t("brand")} name="Brand">
                        <Input />
                    </Form.Item>
                    <Form.Item label="BU" name="BU">
                        <Input />
                    </Form.Item>
                    <Form.Item name="Season" label={t("season")} rules={[{ required: true, message: t("required") }]}>
                        <Input disabled={editingSample} />
                    </Form.Item>
                    <Form.Item name="ItemCode" label={t("itemCode")} rules={[{ required: true, message: t("pleaseInputItemCode") }]}>
                        <Input disabled={editingSample} />
                    </Form.Item>
                    <Form.Item label={t("workingNo.")} name="WorkingNO">
                        <Input />
                    </Form.Item>
                    <Form.Item name="ArticleNO" label={t("articleNo.")} rules={[{ required: true, message: t("required") }]}>
                        <Input disabled={editingSample} />
                    </Form.Item>
                    <Form.Item name="ColorwayName" label={t("colorwayName")} rules={[{ required: true, message: t("required") }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="Round" label={t("round")} rules={[{ required: true, message: t("required") }]}>
                        <Input disabled={editingSample} />
                    </Form.Item>
                    <Form.Item label={t("notifyProductQuantity")} name="NotifyProductionQuantity" rules={[{ required: true, message: t("required") }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item label={t("notificationDate")} name="DateInform">
                        <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label={t("stockQuantity")} name="Quantity" >
                        <Input type="number" disabled={!editingSample || editingSample} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SamplePage;