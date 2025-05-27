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
    const qrSet = useRef(new Set(qrList)); // Lưu QR codes để kiểm tra trùng lặp nhanh
    const audioRef = useRef(null);
    const lastInputTime = useRef(0);
    const inputBuffer = useRef("");
    const qrCodeSet = useRef(new Set(qrList.map(qr => {
        const parts = qr.split("|");
        return `${parts[0]?.trim()}-${parts[parts.length - 1]?.trim()}`;
    })));


    // Tải âm thanh quét
    useEffect(() => {
        audioRef.current = new Audio("/sounds/scan-beep.mp3"); // Đặt file âm thanh trong public/sounds
        return () => {
            audioRef.current = null;
        };
    }, []);

    // Focus input khi component mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Cập nhật qrSet khi qrList thay đổi
    useEffect(() => {
        qrSet.current = new Set(qrList);
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
    const isValidQRFormat = (qrData) => {
        const parts = qrData.split("|");
        if (parts.length < 2) return false;
        const itemCode = parts[0].trim();
        const qrIndex = parts[parts.length - 1].trim();
        return itemCode && /^\d+$/.test(qrIndex);
    };

    const debouncedHandleScan = debounce(async (qrData) => {
        setScanning(true);
        try {
            if (!qrData) {
                message.warning(t("emptyQRData"));
                return;
            }

            const cleanedQRData = cleanQRData(qrData);
            const parts = cleanedQRData.split("|");
            if (parts.length < 2) {
                message.error(t("invalidQRFormat"));
                return;
            }

            const itemCode = parts[0].trim();
            const qrIndex = parts[parts.length - 1].trim();
            const qrCodeID = `${itemCode}-${qrIndex}`;

            if (qrCodeSet.current.has(qrCodeID)) {
                message.warning(t("qrAlreadyScanned", { qrCodeID }));
                return;
            }

            setQrList(prev => {
                const newList = [...prev, cleanedQRData];
                qrCodeSet.current.add(qrCodeID);
                return newList;
            });

            playScanSound();
            message.success(t("qrAdded", { qrCodeID }));

            if (inputRef.current) {
                inputRef.current.input.value = "";
                inputRef.current.focus();
            }
        } finally {
            setScanning(false);
            inputBuffer.current = "";
        }
    }, 150); // debounce ngắn hơn


    const handleInputChange = (e) => {
        const currentTime = Date.now();
        const value = e.target.value;
        inputBuffer.current = value;

        const timeDiff = currentTime - lastInputTime.current;
        lastInputTime.current = currentTime;

        if (timeDiff < 50 && value) {
            // Máy quét
            if (inputRef.current) {
                inputRef.current.input.value = value;
            }
            debouncedHandleScan(value);
        } else if (value && isValidQRFormat(cleanQRData(value))) {
            // Nhập tay hợp lệ
            debouncedHandleScan(value);
        } else if (value) {
            // Dữ liệu sai, thông báo sau 1s
            setTimeout(() => {
                if (inputBuffer.current === value && !isValidQRFormat(cleanQRData(value))) {
                    message.error(t("invalidQRFormat"));
                    if (inputRef.current) {
                        inputRef.current.input.value = "";
                        inputRef.current.focus();
                    }
                }
            }, 1000);
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