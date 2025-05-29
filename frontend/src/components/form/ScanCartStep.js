import React, { useState, useEffect, useRef } from "react";
import { Table, Button, Input, Popconfirm, message } from "antd";
import { useTranslation } from "react-i18next";
import { debounce } from "lodash";
import "../../styles/ScanCartStep.css";

const ScanCartStep = ({ qrList, setQrList, onNext }) => {
    const { t } = useTranslation();
    const [loading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const inputRef = useRef(null);
    const qrSet = useRef(new Set(qrList));
    const audioRef = useRef(null);
    const lastInputTime = useRef(0);
    const lastScanTime = useRef(0); // Thêm để theo dõi thời gian xử lý gần nhất
    const inputBuffer = useRef("");
    const qrCodeSet = useRef(new Set(qrList.map(qr => {
        const parts = qr.split("|");
        return `${parts[0]?.trim()}-${parts[parts.length - 1]?.trim()}`;
    })));

    // Focus input khi component mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Cập nhật qrSet khi qrList thay đổi
    useEffect(() => {
        qrSet.current = new Set(qrList);
        qrCodeSet.current = new Set(qrList.map(qr => {
            const parts = qr.split("|");
            return `${parts[0]?.trim()}-${parts[parts.length - 1]?.trim()}`;
        }));
    }, [qrList]);

    const playScanSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => {
                console.log("Không thể phát âm thanh quét");
            });
        }
    };

    const cleanQRData = (qrData) => {
        // Loại bỏ ký tự điều khiển, CR, LF, Tab, khoảng trắng thừa
        return qrData.replace(/[\r\n\t]+/g, "").trim();
    };

    // const isValidQRFormat = (qrData) => {
    //     const parts = qrData.split("|");
    //     if (parts.length < 2) return false;
    //     const itemCode = parts[0].trim();
    //     const qrIndex = parts[parts.length - 1].trim();
    //     return itemCode && /^\d+$/.test(qrIndex);
    // };

    const handleScan = async (qrData) => {
        setScanning(true);
        try {
            if (!qrData) {
                message.warning(t("emptyQRData"));
                return false;
            }

            const cleanedQRData = cleanQRData(qrData);
            const parts = cleanedQRData.split("|");
            if (parts.length < 2) {
                message.error(t("invalidQRFormat"));
                return false;
            }

            const itemCode = parts[0].trim();
            const qrIndex = parts[parts.length - 1].trim();
            const qrCodeID = `${itemCode}-${qrIndex}`;

            if (qrCodeSet.current.has(qrCodeID)) {
                // message.warning(t("qrAlreadyScanned", { qrCodeID }));
                return false;
            }

            // Thêm mã QR vào danh sách
            setQrList(prev => {
                const newList = [...prev, cleanedQRData];
                qrCodeSet.current.add(qrCodeID);
                return newList;
            });

            // Phát âm thanh quét và hiển thị thông báo
            playScanSound();
            message.success(t("qrAdded", { qrCodeID }));

            // Cập nhật thời gian xử lý
            lastScanTime.current = Date.now();

            // Xóa ô input và focus lại
            if (inputRef.current) {
                inputRef.current.input.value = "";
                inputRef.current.focus();
            }
            return true;
        } catch (error) {
            console.error("Lỗi khi xử lý mã QR:", error);
            message.error(t("qrScanError"));
            return false;
        } finally {
            setScanning(false);
            inputBuffer.current = "";
        }

    };

    const debouncedHandleScan = debounce(handleScan, 150);

    const handleInputChange = (e) => {
        const currentTime = Date.now();
        const value = e.target.value;
        inputBuffer.current = value;

        const timeDiff = currentTime - lastInputTime.current;
        lastInputTime.current = currentTime;

        // Chỉ xử lý cho máy quét (timeDiff < 50)
        if (timeDiff < 50 && value) {
            debouncedHandleScan(value);
        }
    };

    const handlePressEnter = async (e) => {
        const currentTime = Date.now();
        if (currentTime - lastScanTime.current < 100) {
            if (inputRef.current) {
                inputRef.current.input.value = ""; // Xóa ô input
                inputRef.current.focus();
            }
            return;
        }

        const value = e.target.value;
        if (value) {
            const success = await handleScan(value);
            if (success && inputRef.current) {
                inputRef.current.input.value = ""; // Xóa ô input ngay sau khi thêm thành công
                inputRef.current.focus(); // Focus lại ô input
            } else if (inputRef.current) {
                inputRef.current.input.value = ""; // Xóa ô input nếu dữ liệu không hợp lệ
                inputRef.current.focus();
            }
        } else {
            message.warning(t("emptyQRData"));
            if (inputRef.current) {
                inputRef.current.input.value = ""; // Xóa ô input nếu rỗng
                inputRef.current.focus();
            }
        }
    };

    const handleRemove = (qrData) => {
        setQrList(prev => {
            const newList = prev.filter(q => q !== qrData);
            qrSet.current.delete(qrData);
            return newList;
        });
        message.success(t("qrRemoved"));
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const dataSource = qrList.map((qrData, idx) => {
        const parts = qrData.split("|");
        const itemCode = parts[0];
        const qrIndex = parts[parts.length - 1];
        const qrCodeID = `${itemCode}-${qrIndex}`;
        return { key: idx, qrData, itemCode, qrIndex, qrCodeID };
    });

    const columns = [
        { title: t("itemCode"), dataIndex: "itemCode", key: "itemCode" },
        { title: t("qrIndex"), dataIndex: "qrIndex", key: "qrIndex" },
        { title: t("qrCodeID"), dataIndex: "qrCodeID", key: "qrCodeID" },
        {
            title: t("action"),
            key: "action",
            render: (_, record) => (
                <Popconfirm
                    title={t("confirmDeleteQR")}
                    onConfirm={() => handleRemove(record.qrData)}
                >
                    <Button size="small" danger>{t("delete")}</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="scan-cart-step">
            <Input
                ref={inputRef}
                placeholder={t("scanQRPlaceholder")}
                onChange={handleInputChange}
                onPressEnter={handlePressEnter}
                autoFocus
                disabled={loading || scanning}
                allowClear
            />
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                style={{ marginTop: 16 }}
            />
            <Button
                type="primary"
                disabled={qrList.length === 0 || loading || scanning}
                onClick={onNext}
                style={{ marginTop: 16 }}
            >
                {t("continue")}
            </Button>
        </div>
    );
};

export default ScanCartStep;