import React, { useState } from 'react';
import { Input, Button, Alert, Descriptions } from "antd";
import QrScanner from 'react-qr-scanner';  // Thư viện quét mã QR
import { useNavigate } from 'react-router-dom'; // Dùng useNavigate thay vì useHistory
import axios from "axios";
import '../styles/QRScanPage.css';

const QRScanPage = () => {
    const [qrData, setQrData] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const API_BASE = process.env.REACT_APP_API_BASE || "/api";

    const handleScan = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE}/qr/scan`, { qrCode: qrData });
            setResult(response.data);
        } catch (err) {
            setError(err.response?.data?.message || "Error scanning QR code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
            <h2>QR Code Scanner</h2>
            <Input.TextArea
                rows={3}
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Paste or scan the QR code data here..."
            />
            <Button type="primary" onClick={handleScan} loading={loading} style={{ marginTop: 10 }}>
                Scan
            </Button>

            {error && (
                <Alert message="Error" description={error} type="error" showIcon style={{ marginTop: 20 }} />
            )}

            {result && (
                <Descriptions title="Sample Info" bordered column={1} style={{ marginTop: 20 }}>
                    <Descriptions.Item label="Item Code">{result.ItemCode}</Descriptions.Item>
                    <Descriptions.Item label="Brand">{result.Brand}</Descriptions.Item>
                    <Descriptions.Item label="BU">{result.BU}</Descriptions.Item>
                    <Descriptions.Item label="Season">{result.Season}</Descriptions.Item>
                    <Descriptions.Item label="Quantity">{result.Quantity}</Descriptions.Item>
                    {/* Add more fields if needed */}
                </Descriptions>
            )}
        </div>
    );
};

export default QRScanPage;
