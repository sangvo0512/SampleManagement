import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Space, Modal, message, Image, Upload, Input, Row, Col, Select, Form, Popconfirm, DatePicker, Tag, Descriptions } from "antd";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { UploadOutlined, SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import "../styles/SamplesPage.css"


dayjs.extend(customParseFormat);

const SamplePage = () => {
    const [samples, setSamples] = useState([]);
    const [filteredSamples, setFilteredSamples] = useState([]);
    const [loading, setLoading] = useState(false);
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [qrCodes, setQrCodes] = useState([]);
    const [currentSample, setCurrentSample] = useState(null);
    const [searchColumn, setSearchColumn] = useState("SerialNumber");
    const [searchValue, setSearchValue] = useState("");
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";
    const [formVisible, setFormVisible] = useState(false);
    const [editingSample, setEditingSample] = useState(null);
    const [form] = Form.useForm();
    const [warehouses, setWarehouses] = useState([]);
    const [selectedQRCodes, setSelectedQRCodes] = useState([]);
    const { t } = useTranslation();
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [detailSample, setDetailSample] = useState(null);

    const fetchSamples = useCallback(async (retryCount = 3) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/samples`);
            setSamples(res.data);
            setFilteredSamples(res.data);
        } catch (err) {
            if (retryCount > 0) {
                setTimeout(() => fetchSamples(retryCount - 1), 1000);
            } else {
                message.error("Không thể tải dữ liệu sản phẩm mẫu");
            }
        } finally {
            setLoading(false);
        }
    }, [API_BASE]);

    const fetchWarehouses = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/warehouses`);
            setWarehouses(res.data);
        } catch (err) {
            message.error("Không thể tải danh sách kho");
        }
    }, [API_BASE]);

    useEffect(() => {
        fetchSamples();
        fetchWarehouses();
    }, [fetchSamples, fetchWarehouses]);

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE}/samples/${id}`);
            message.success("Đã xóa sản phẩm");
            fetchSamples();
        } catch (err) {
            message.error(err.response?.data?.error || "Không thể xóa sản phẩm. Vui lòng kiểm tra các mã QR liên quan.");
        }
    };

    const handleGenerateQR = async (sample) => {
        try {
            const payload = {
                serialNumber: sample.SerialNumber,
                brand: sample.Brand,
                BU: sample.BU,
                season: sample.Season,
                itemCode: sample.ItemCode,
                workingNO: sample.WorkingNO,
                articleNO: sample.ArticleNO,
                round: sample.Round,
                notifyProductionQuantity: sample.NotifyProductionQuantity,
                dateInform: sample.DateInform,
                quantity: sample.Quantity,
                inventoryLocation: sample.InventoryLocation
            };

            const res = await axios.post(`${API_BASE}/qr/generate`, payload);
            console.log(res.data.qrCodes)
            setQrCodes(res.data.qrCodes);

            setCurrentSample(sample);
            setQrModalVisible(true);
        } catch (err) {
            message.error("Lỗi khi tạo mã QR");
        }
    };

    const handlePrintAllQRCodes = () => {
        if (!qrCodes.length) {
            message.warning(t("noQRCodesToPrint"));
            return;
        }
        console.log("qrCodes:", qrCodes);
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            message.error(t("failedToOpenPrintWindow"));
            return;
        }
        console.log("Đã mở printWindow");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>In tất cả mã QR</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 20px; }
                    .qr-container { display: flex; flex-wrap: wrap; justify-content: center; }
                    .qr-item { margin: 15px; text-align: center; }
                    .qr-image { width: 100px; height: 100px; display: block; }
                    .qr-label { font-size: 14px; margin-bottom: 5px; }
                    .print-button { margin: 20px; padding: 10px 20px; font-size: 16px; }
                    @media print {
                        body { margin: 0; }
                        .qr-image { width: 100px !important; height: 100px !important; }
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
                            <div class="qr-label">${currentSample?.ItemCode || "N/A"} | ${idx + 1}</div>
                        </div>
                    `).join("")}
                </div>
                <button class="print-button" onclick="window.print()">In ngay</button>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        console.log("Đã viết HTML vào printWindow");

        // Đợi render rồi gọi print
        setTimeout(() => {
            console.log("Gọi printWindow.print()");
            printWindow.print();
            // Không đóng cửa sổ ngay để kiểm tra
        }, 1000);
    };

    const handlePrintSelectedQRCodes = () => {
        if (!selectedQRCodes.length) {
            message.warning(t("noSelectedQRCodes"));
            return;
        }
        console.log("selectedQRCodes:", selectedQRCodes);
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            message.error(t("failedToOpenPrintWindow"));
            return;
        }
        console.log("Đã mở printWindow");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 20px; }
                    .qr-container { display: flex; flex-wrap: wrap; justify-content: center; }
                    .qr-item { margin: 15px; text-align: center; }
                    .qr-image { width: 100px; height: 100px; display: block; }
                    .qr-label { font-size: 14px; margin-bottom: 5px; }
                    .print-button { margin: 20px; padding: 10px 20px; font-size: 16px; }
                    @media print {
                        body { margin: 0; }
                        .qr-image { width: 100px !important; height: 100px !important; }
                        .qr-container { page-break-inside: avoid; }
                        .print-button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h2>${currentSample?.ItemCode || "Không xác định"}</h2>
                <div class="qr-container">
                    ${selectedQRCodes.map((qrId, idx) => {
            const qr = qrCodes.find(q => q.qrCodeId === qrId);
            return `
                            <div class="qr-item">
                                <img class="qr-image" src="${qr?.dataUrl || ""}" alt="QR Code ${idx + 1}" />
                                <div class="qr-label">${currentSample?.ItemCode || "N/A"} | ${idx + 1}</div>
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
        console.log("Đã viết HTML vào printWindow");

        setTimeout(() => {
            console.log("Gọi printWindow.print()");
            printWindow.print();
        }, 1000);
    };


    const handleImport = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await axios.post(`${API_BASE}/samples/import`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            console.log("API Response:", response.data);

            const { message: apiMessage, errors } = response.data;

            if (Array.isArray(errors) && errors.length > 0) {
                // Hiển thị lỗi chi tiết
                const errorDetails = errors.map((err, index) => {
                    return `${t("error")} ${index + 1}: ${err.error}`;
                }).join("\n");

                message.error({
                    content: (
                        <>
                            <p>{apiMessage || t("importFailed")}</p>
                            <p>{t("errorDetails")}:</p>
                            <pre style={{ maxHeight: "200px", overflow: "auto" }}>{errorDetails}</pre>
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
        const filtered = samples.filter((s) =>
            s[searchColumn]?.toString().toLowerCase().includes(value.toLowerCase())
        );
        setFilteredSamples(filtered);
    };

    const handleSearchColumnChange = (value) => {
        setSearchColumn(value);
        if (searchValue) {
            const filtered = samples.filter((s) =>
                s[value]?.toString().toLowerCase().includes(searchValue.toLowerCase())
            );
            setFilteredSamples(filtered);
        } else {
            setFilteredSamples(samples);
        }
    };
    const columns = [
        {
            title: t("serialNumber"),
            render: (_, __, index) => index + 1,
        },
        { title: t("brand"), dataIndex: "Brand" },
        { title: "BU", dataIndex: "BU" },
        { title: t("season"), dataIndex: "Season" },
        { title: t("itemCode"), dataIndex: "ItemCode" },
        { title: t("workingNo."), dataIndex: "WorkingNO" },
        { title: t("articleNo."), dataIndex: "ArticleNO" },
        { title: t("round"), dataIndex: "Round" },
        { title: t("notifyProductQuantity"), dataIndex: "NotifyProductionQuantity" },
        {
            title: t("notificationDate"),
            dataIndex: "DateInform",
            render: (text) => {
                const date = new Date(text);
                return isNaN(date) ? t("invalidDate") : dayjs(date).format("MM/DD/YYYY");
            }
        },
        { title: t("stockQuantity"), dataIndex: "Quantity" },
        { title: t("location"), dataIndex: "InventoryLocation" },
        {
            title: t("state"),
            dataIndex: "State",
            render: (state) => {
                let color = "red";
                if (state === "Available") {
                    color = "green";
                }
                return <Tag color={color} style={{ fontWeight: "bold" }}>{state}</Tag>;
            }
        },
        { title: t("borrowed"), dataIndex: "BorrowdQuantity" },
        {
            title: t("action"),
            key: "action",
            render: (_, record) => (
                <Space>
                    <Button type="primary" onClick={(e) => {
                        e.stopPropagation();
                        setEditingSample(record);
                        form.setFieldsValue({
                            ...record,
                            DateInform: record.DateInform ? dayjs(record.DateInform) : null,
                            WarehouseID: warehouses.find(w => w.WarehouseName === record.InventoryLocation)?.WarehouseID
                        });
                        setFormVisible(true);
                    }}>
                        {t("edit")}
                    </Button>
                    <Popconfirm
                        title={t("deleteConfirm")}
                        onConfirm={() => handleDelete(record.SampleID)}
                        okText={t("yes")}
                        cancelText={t("no")}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Button danger >{t("delete")}</Button>
                    </Popconfirm>
                    <Button type="primary" onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateQR(record);
                    }}>
                        {t("generate")}
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="sample-page">
            <h3>{t("sample")}</h3>

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col>
                    <Select
                        value={searchColumn}
                        onChange={handleSearchColumnChange}
                        style={{ width: 160 }}
                        options={[
                            { label: t("brand"), value: "Brand" },
                            { label: "BU", value: "BU" },
                            { label: t("season"), value: "Season" },
                            { label: t("itemCode"), value: "ItemCode" },
                            { label: t("warehouse"), value: "InventoryLocation" },
                            { label: t("state"), value: "State" }
                        ]}
                    />
                </Col>
                <Col>
                    <Input
                        placeholder={`${t("search")} ${searchColumn}`}
                        prefix={<SearchOutlined />}
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        allowClear
                    />
                </Col>
                <Col>
                    <Button type="primary" onClick={() => {
                        setEditingSample(null);
                        form.resetFields();
                        setFormVisible(true);
                    }}>
                        {t("add")} {t("sample")}
                    </Button>
                </Col>

                <Col>
                    <Upload beforeUpload={handleImport} showUploadList={false}>
                        <Button type="primary" icon={<UploadOutlined />}>{t("import")}</Button>
                    </Upload>
                </Col>

                <Col>
                    <a
                        href="/template/Import_template.xlsx"
                        download
                    >
                        <Button icon={<DownloadOutlined />}>
                            {t("downloadTemplate")}
                        </Button>
                    </a>

                </Col>
            </Row>

            <Table
                rowKey="SampleID"
                className="sample-page-table"
                columns={columns}
                dataSource={filteredSamples}
                loading={loading}
                pagination={{ pageSize: 10 }}
                onRow={(record) => ({
                    onClick: (e) => {
                        if (e.target.closest('button') || e.target.closest('.ant-popconfirm')) {
                            return;
                        }
                        setDetailSample(record);
                        setDetailModalVisible(true);
                    }
                })}
            />
            {/* Detail Modal */}
            <Modal
                className="sample-detail"
                title={`Chi tiết Sample – ${detailSample?.ItemCode}`}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
                width={700}
            >
                {detailSample && (
                    <Descriptions
                        column={2}
                        bordered
                        size="middle"
                        labelStyle={{ fontWeight: 'bold', width: 180 }}
                    >
                        <Descriptions.Item label={t("brand")}>
                            {detailSample.Brand}
                        </Descriptions.Item>

                        <Descriptions.Item label={t("BU")}>
                            {detailSample.BU}
                        </Descriptions.Item>
                        <Descriptions.Item label={t("season")}>
                            {detailSample.Season}
                        </Descriptions.Item>

                        <Descriptions.Item label={t("itemCode")}>
                            {detailSample.ItemCode}
                        </Descriptions.Item>
                        <Descriptions.Item label={t("workingNo")}>
                            {detailSample.WorkingNO}
                        </Descriptions.Item>

                        <Descriptions.Item label={t("articleNo")}>
                            {detailSample.ArticleNO}
                        </Descriptions.Item>
                        <Descriptions.Item label={t("round")}>
                            {detailSample.Round}
                        </Descriptions.Item>

                        <Descriptions.Item label={t("notifyProductQuantity")}>
                            {detailSample.NotifyProductionQuantity}
                        </Descriptions.Item>
                        <Descriptions.Item label={t("notificationDate")}>
                            {dayjs(detailSample.DateInform).format("MM/DD/YYYY")}
                        </Descriptions.Item>

                        <Descriptions.Item label={t("stockQuantity")}>
                            {detailSample.Quantity}
                        </Descriptions.Item>
                        <Descriptions.Item label={t("borrowed")}>
                            {detailSample.BorrowdQuantity}
                        </Descriptions.Item>

                        <Descriptions.Item label={t("location")}>
                            {detailSample.InventoryLocation}
                        </Descriptions.Item>
                        <Descriptions.Item label={t("state")}>
                            <Tag color={
                                detailSample.State === "Available" ? "green" :
                                    detailSample.State === "Unavailable" ? "red" :
                                        detailSample.State === "Exported" ? "blue" : "default"
                            }>
                                {detailSample.State}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
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
                                        {currentSample?.ItemCode} | {idx + 1}
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
                            style={{ backgroundColor: '#64cacf', borderColor: '#64cacf' }}
                            onClick={() => handlePrintAllQRCodes()}
                        >
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
                        console.log("Giá trị form gốc:", values);
                        const formattedValues = {
                            serialNumber: values.SerialNumber,
                            brand: values.Brand,
                            BU: values.BU,
                            season: values.Season,
                            itemCode: values.ItemCode,
                            workingNO: values.WorkingNO,
                            articleNO: values.ArticleNO,
                            round: values.Round,
                            notifyProductionQuantity: parseInt(values.NotifyProductionQuantity),
                            dateInform: values.DateInform ? values.DateInform.toISOString() : null,
                            quantity: parseInt(values.Quantity),
                            inventoryLocation: warehouses.find(w => w.WarehouseID === values.WarehouseID)?.WarehouseName || '',
                            warehouseID: values.WarehouseID,
                            state: editingSample?.State || 'Available',
                        };


                        try {
                            if (editingSample) {
                                await axios.put(`${API_BASE}/samples/${editingSample.SampleID}`, formattedValues);
                                message.success("Đã cập nhật sản phẩm");
                            } else {
                                await axios.post(`${API_BASE}/samples`, formattedValues);
                                message.success("Đã thêm sản phẩm");
                            }
                            setFormVisible(false);
                            fetchSamples();
                        } catch (err) {
                            message.error("Lỗi khi lưu sản phẩm");
                            console.error(err);
                        }
                    }}
                >

                    <Form.Item label={t("brand")} name="Brand" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="BU" name="BU">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("season")} name="Season">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("itemCode")} name="ItemCode">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("workingNo.")} name="WorkingNO">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("articleNo.")} name="ArticleNO">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("round")} name="Round">
                        <Input />
                    </Form.Item>
                    <Form.Item label={t("notifyProductQuantity")} name="NotifyProductionQuantity">
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item label={t("notificationDate")} name="DateInform">
                        <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label={t("stockQuantity")} name="Quantity" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item
                        label={t("location")}
                        name="WarehouseID"
                        rules={[{ required: true, message: t("selectWarehouse") }]}
                    >
                        <Select placeholder={t("selectWarehouse")}>
                            {warehouses.map((wh) => (
                                <Select.Option key={wh.WarehouseID} value={wh.WarehouseID}>
                                    {wh.WarehouseName}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>



        </div>
    );
};

export default SamplePage;
