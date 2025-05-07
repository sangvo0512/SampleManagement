import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Space, Modal, message, Image, Upload, Input, Row, Col, Select, Form, Popconfirm, DatePicker, Tag } from "antd";
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

    const fetchSamples = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/samples`);
            setSamples(res.data);
            setFilteredSamples(res.data);
        } catch (err) {
            message.error("Không thể tải dữ liệu sản phẩm mẫu");
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
            message.error("Lỗi khi xóa sản phẩm");
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
            setQrCodes(res.data.qrCodes);
            setCurrentSample(sample);
            setQrModalVisible(true);
        } catch (err) {
            message.error("Lỗi khi tạo mã QR");
        }
    };

    const handlePrintAllQRCodes = () => {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            const htmlContent = `
                <html>
                    <head>
                        <title>In mã QR - ${currentSample?.SerialNumber}</title>
                        <style>
                            body { text-align: center; font-family: 'Segoe UI', sans-serif; padding: 20px; }
                            img { margin: 10px; width: 150px; height: 150px; }
                        </style>
                    </head>
                    <body>
                        ${qrCodes.map(src => `<img src="${src}" />`).join("")}
                    </body>
                </html>
            `;
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };

    const handlePrintSelectedQRCodes = () => {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            const htmlContent = `
                <html>
                    <head>
                        <title>In mã QR đã chọn - ${currentSample?.SerialNumber}</title>
                        <style>
                            body { text-align: center; font-family: 'Segoe UI', sans-serif; padding: 20px; }
                            img { margin: 10px; width: 150px; height: 150px; }
                        </style>
                    </head>
                    <body>
                        <h2>Mã QR đã chọn - ${currentSample?.SerialNumber}</h2>
                        ${selectedQRCodes.map(src => `<img src="${src}" />`).join("")}
                    </body>
                </html>
            `;
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };


    const handleImport = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            // Import mà không lấy cột SerialNumber
            await axios.post(`${API_BASE}/samples/import`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            message.success("Import thành công");
            fetchSamples();
        } catch (err) {
            message.error("Import thất bại");
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
            title: "Serial Number",
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
        { title: t("borrowed"), dataIndex: "BorrowedQuantity" },
        {
            title: t("action"),
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
                            { label: t("itemCode"), value: "ItemCode" }
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
                        href="/templates/Book2.xlsx"
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
                    onClick: () => {
                        setDetailSample(record);
                        setDetailModalVisible(true);
                    }
                })}
            />
            {/* Detail Modal */}
            <Modal
                title={`Chi tiết Sample – ${detailSample?.SerialNumber}`}
                open={detailModalVisible}
                onCancel={() => setDetailModalVisible(false)}
                footer={null}
            >
                {detailSample && (
                    <div style={{ lineHeight: 1.8 }}>
                        <p><strong>SerialNumber:</strong> {detailSample.SerialNumber}</p>
                        <p><strong>Brand:</strong> {detailSample.Brand}</p>
                        <p><strong>BU:</strong> {detailSample.BU}</p>
                        <p><strong>Season:</strong> {detailSample.Season}</p>
                        <p><strong>ItemCode:</strong> {detailSample.ItemCode}</p>
                        <p><strong>WorkingNO:</strong> {detailSample.WorkingNO}</p>
                        <p><strong>ArticleNO:</strong> {detailSample.ArticleNO}</p>
                        <p><strong>Round:</strong> {detailSample.Round}</p>
                        <p><strong>NotifyProductionQuantity:</strong> {detailSample.NotifyProductionQuantity}</p>
                        <p><strong>DateInform:</strong> {detailSample.DateInform}</p>
                        <p><strong>Quantity:</strong> {detailSample.Quantity}</p>
                        <p><strong>InventoryLocation:</strong> {detailSample.InventoryLocation}</p>
                        <p><strong>State:</strong> {detailSample.State}</p>
                        <p><strong>BorrowedQuantity:</strong> {detailSample.BorrowedQuantity}</p>
                    </div>
                )}
            </Modal>
            <Modal
                title={`${t("generate")} - ${currentSample?.SerialNumber}`}
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
                        {qrCodes.map((src, idx) => (
                            <Col key={idx}>
                                <div style={{ textAlign: "center" }}>
                                    <Image src={src} width={120} />
                                    <div style={{ marginTop: 4, fontSize: 12 }}>
                                        {currentSample?.ItemCode} | {idx + 1}
                                    </div>
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={selectedQRCodes.includes(src)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedQRCodes([...selectedQRCodes, src]);
                                                } else {
                                                    setSelectedQRCodes(selectedQRCodes.filter(qr => qr !== src));
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
