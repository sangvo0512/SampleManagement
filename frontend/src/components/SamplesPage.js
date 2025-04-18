import React, { useEffect, useState, useCallback } from "react";
import { Table, Button, Space, Modal, message, Image, Upload, Input, Row, Col, Select, Form, Popconfirm } from "antd";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";
import "../styles/SamplesPage.css"
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
                        <h2>Mã QR - ${currentSample?.SerialNumber}</h2>
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
        { title: "序號", dataIndex: "SerialNumber" },
        { title: "品牌", dataIndex: "Brand" },
        { title: "BU", dataIndex: "BU" },
        { title: "季节", dataIndex: "Season" },
        { title: "款号", dataIndex: "ItemCode" },
        { title: "Working NO.", dataIndex: "WorkingNO" },
        { title: "Article NO.", dataIndex: "ArticleNO" },
        { title: "輪次", dataIndex: "Round" },
        { title: "通知生產數量", dataIndex: "NotifyProductionQuantity" },
        {
            title: "通知日期",
            dataIndex: "DateInform",
            render: (text) => {
                const date = new Date(text);
                return isNaN(date)
                    ? "Không hợp lệ"
                    : dayjs(date).format("M/D/YYYY");
            }
        },
        { title: "庫存數量", dataIndex: "Quantity" },
        { title: "庫存位置", dataIndex: "InventoryLocation" },
        { title: "狀態", dataIndex: "State" },
        { title: "已借出", dataIndex: "BorrowedQuantity" },
        {
            title: "操作",
            render: (_, record) => (
                <Space>
                    <Button type="link" onClick={() => {
                        setEditingSample(record);
                        form.setFieldsValue({
                            ...record,
                            WarehouseID: warehouses.find(w => w.WarehouseName === record.InventoryLocation)?.WarehouseID
                        });

                        setFormVisible(true);
                    }}>
                        Modify
                    </Button>
                    <Popconfirm
                        title="Are you sure to delete this user?"
                        onConfirm={() => handleDelete(record.SampleID)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="danger">Delete</Button>
                    </Popconfirm>
                    <Button type="link" onClick={() => handleGenerateQR(record)}>Generate QR code</Button>
                </Space>
            )
        }
    ];

    return (
        <div className="sample-page">
            <h3>Sample List</h3>

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col>
                    <Select
                        value={searchColumn}
                        onChange={handleSearchColumnChange}
                        style={{ width: 160 }}
                        options={[
                            { label: "Serial Number", value: "SerialNumber" },
                            { label: "Brand", value: "Brand" },
                            { label: "BU", value: "BU" },
                            { label: "Season", value: "Season" },
                            { label: "Item Code", value: "ItemCode" }
                        ]}
                    />
                </Col>
                <Col>
                    <Input
                        placeholder={`Tìm theo ${searchColumn}`}
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
                        ADD Sample
                    </Button>
                </Col>

                <Col>
                    <Upload beforeUpload={handleImport} showUploadList={false}>
                        <Button icon={<UploadOutlined />}>Import Excel</Button>
                    </Upload>
                </Col>
            </Row>

            <Table
                rowKey="SampleID"
                className="sample-page-table"
                columns={columns}
                dataSource={filteredSamples}
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={`Mã QR - ${currentSample?.SerialNumber}`}
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
                                        /> Chọn in
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
                            Print selected QR codes
                        </Button>
                        <Button
                            type="primary"
                            style={{ backgroundColor: '#64cacf', borderColor: '#64cacf' }}
                            onClick={() => handlePrintAllQRCodes()}
                        >
                            Print all QR codes
                        </Button>
                    </Space>
                </div>
            </Modal>


            <Modal
                title={editingSample ? "Modify" : "ADD"}
                open={formVisible}
                onCancel={() => setFormVisible(false)}
                onOk={() => form.submit()}
                okText={editingSample ? "Save changes" : "ADD"}
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
                            dateInform: values.DateInform,
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
                    <Form.Item label="序號" name="SerialNumber" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="品牌" name="Brand" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="BU" name="BU">
                        <Input />
                    </Form.Item>
                    <Form.Item label="季节" name="Season">
                        <Input />
                    </Form.Item>
                    <Form.Item label="款号" name="ItemCode">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Working NO." name="WorkingNO">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Article NO." name="ArticleNO">
                        <Input />
                    </Form.Item>
                    <Form.Item label="輪次" name="Round">
                        <Input />
                    </Form.Item>
                    <Form.Item label="通知生產數量" name="NotifyProductionQuantity">
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item label="通知日期" name="DateInform">
                        <Input />
                    </Form.Item>
                    <Form.Item label="庫存數量" name="Quantity" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item
                        label="庫存位置"
                        name="WarehouseID"
                        rules={[{ required: true, message: "Vui lòng chọn vị trí kho" }]}
                    >
                        <Select placeholder="Chọn vị trí kho">
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
