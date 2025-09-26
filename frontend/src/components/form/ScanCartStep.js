import React, { useState, useEffect, useRef, useMemo } from "react";
import { Table, Button, Input, Popconfirm, message, Tag } from "antd";
import { useTranslation } from "react-i18next";
import { debounce } from "lodash";
import { ArrowRightOutlined } from '@ant-design/icons';
import "../../styles/ScanCartStep.css";

const ScanCartStep = ({ qrList, setQrList, onNext }) => {
    const { t } = useTranslation();
    const [loading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);
    const qrSet = useRef(new Set(qrList));
    const audioRef = useRef(null);
    const lastInputTime = useRef(0);
    const lastScanTime = useRef(0);
    const inputBuffer = useRef("");
    const qrCodeSet = useRef(new Set(qrList.map(qr => {
        const parts = qr.split("|");
        return `${parts[0]?.trim()}-${parts[parts.length - 1]?.trim()}`;
    })));
    const [qrStatuses, setQrStatuses] = useState(() => {
        // Khôi phục qrStatuses từ localStorage khi component mount
        const saved = localStorage.getItem('qrStatuses');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        // Đồng bộ qrStatuses với qrList hiện tại
        const syncedStatuses = {};
        qrList.forEach(qrData => {
            const qrCodeID = qrData;
            if (qrStatuses[qrCodeID]) {
                syncedStatuses[qrCodeID] = qrStatuses[qrCodeID];
            }
        });
        setQrStatuses(syncedStatuses);
        // Lưu qrStatuses đã đồng bộ vào localStorage
        localStorage.setItem('qrStatuses', JSON.stringify(syncedStatuses));
    }, [qrList]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        qrSet.current = new Set(qrList);
        qrCodeSet.current = new Set(qrList);
        // qrCodeSet.current = new Set(qrList.map(qr => {
        //     const parts = qr.split("|");
        //     return `${parts[0]?.trim()}-${parts[parts.length - 1]?.trim()}`;
        // }));

        // Fetch trạng thái và vị trí cho các QR code mới trong qrList
        const fetchStatuses = async () => {
            for (const qrData of qrList) {
                const qrCodeID = qrData;
                if (!qrStatuses[qrCodeID]) {
                    try {
                        const response = await fetch(`/api/transaction/qrcode/status?qrCodeId=${encodeURIComponent(qrCodeID)}`, {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        });
                        const result = await response.json();
                        if (response.ok && result.success) {
                            setQrStatuses(prev => ({
                                ...prev,
                                [qrCodeID]: {
                                    status: result.data.Status,
                                    location: result.data.Location,
                                    uniqueKey: qrData.split("|")[0].trim()
                                }
                            }));
                        }
                    } catch (error) {
                        console.error(`Lỗi khi lấy trạng thái cho ${qrCodeID}:`, error);
                    }
                }
            }
        };

        fetchStatuses();
    }, [qrList]);

    const playScanSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => {
                console.log("Không thể phát âm thanh quét");
            });
        }
    };

    const cleanQRData = (qrData) => {
        return qrData.replace(/[\r\n\t]+/g, "").trim();
    };

    const handleScan = async (qrData) => {
        if (scanning) return false;
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

            const uniqueKey = parts[0].trim();
            const qrIndex = parts[parts.length - 1].trim();
            const qrCodeID = cleanedQRData;

            if (isNaN(parseInt(qrIndex))) {
                message.error(t("invalidQRIndex", { qrIndex }));
                return false;
            }

            if (qrCodeSet.current.has(qrCodeID)) {
                message.error("The QR code has existed");
                if (inputRef.current) {
                    setInputValue("");
                    inputRef.current.focus();
                }
                return false;
            }

            const response = await fetch(`/api/transaction/qrcode/status?qrCodeId=${encodeURIComponent(qrCodeID)}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || t("failedToFetchQRStatus"));
            }

            const { Status, Location } = result.data;
            if (!Status || !["Available", "Borrowed", "Exported", "Rejected"].includes(Status)) {
                throw new Error(t("invalidQRStatus", { qrCodeID, status: Status || "Unknown" }));
            }

            setQrList(prev => {
                const newList = [...prev, cleanedQRData];
                qrSet.current.add(cleanedQRData);
                qrCodeSet.current.add(qrCodeID);
                setQrStatuses(prevStatuses => ({
                    ...prevStatuses,
                    [qrCodeID]: { status: Status, location: Location, uniqueKey }
                }));
                console.log("list:", newList);
                return newList;
            });

            playScanSound();
            message.success(t("qrAdded", { qrCodeID }));
            lastScanTime.current = Date.now();

            if (inputRef.current) {
                setInputValue("");
                inputRef.current.focus();
            }
            return true;
        } catch (error) {
            console.error("Lỗi khi xử lý mã QR:", error);
            message.error(error.message || t("qrScanError"));
            return false;
        } finally {
            setScanning(false);
            inputBuffer.current = "";
        }
    };

    const debouncedHandleScan = useMemo(() => debounce(handleScan, 200), []);

    useEffect(() => {
        return () => {
            debouncedHandleScan.cancel();
        };
    }, [debouncedHandleScan]);

    const handleInputChange = (e) => {
        const currentTime = Date.now();
        const value = e.target.value;
        inputBuffer.current = value;
        setInputValue(value);
        const timeDiff = currentTime - lastInputTime.current;
        lastInputTime.current = currentTime;

        if (timeDiff < 100 && value && !scanning) {
            debouncedHandleScan(value);
        }
        console.log("handleInputChange:", { timeDiff, value, scanning });
    };

    const handlePressEnter = async (e) => {
        const currentTime = Date.now();
        if (currentTime - lastScanTime.current < 500) {
            if (inputRef.current) {
                setInputValue("");
                inputRef.current.focus();
            }
            return;
        }

        const value = e.target.value;
        if (value && !scanning) {
            if (inputRef.current) {
                setInputValue("");
                inputRef.current.focus();
            }
        } else {
            message.warning(t("emptyQRData"));
            if (inputRef.current) {
                setInputValue("");
                inputRef.current.focus();
            }
        }
    };

    const handleRemove = (qrData) => {
        const parts = qrData.split("|");
        const itemCode = parts[0].trim();
        const qrIndex = parts[parts.length - 1].trim();
        const qrCodeID = qrData;

        setQrList(prev => {
            const newList = prev.filter(q => q !== qrData);
            qrSet.current.delete(qrData);
            qrCodeSet.current.delete(qrCodeID);
            setQrStatuses(prevStatuses => {
                const newStatuses = { ...prevStatuses };
                delete newStatuses[qrCodeID];
                localStorage.setItem('qrStatuses', JSON.stringify(newStatuses));
                return newStatuses;
            });
            return newList;
        });
        message.success(t("qrRemoved"));
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const dataSource = qrList.map((qrData, idx) => {
        const parts = qrData.split("|");
        const uniqueKey = parts[0].trim();
        const qrIndex = parts[parts.length - 1].trim();
        const qrCodeID = qrData;
        return {
            key: idx,
            qrData,
            uniqueKey,
            qrIndex,
            qrCodeID,
            qrStatus: qrStatuses[qrCodeID]?.status || t("unknown"),
            location: qrStatuses[qrCodeID]?.location || t("unknown")
        };
    });

    const hasRejectedItem = qrList.length > 0 && Object.values(qrStatuses).some(item => item.status === "Rejected");
    const hasNullLocation = qrList.length > 0 && Object.values(qrStatuses).some(item => item.location === null);
    console.log("hasRejectedItem:", hasRejectedItem, "hasNullLocation:", hasNullLocation, "qrStatuses:", qrStatuses);

    const columns = [
        { title: t("key"), dataIndex: "uniqueKey", key: "uniqueKey" },
        { title: t("qrIndex"), dataIndex: "qrIndex", key: "qrIndex" },
        { title: t("qrCodeID"), dataIndex: "qrCodeID", key: "qrCodeID" },
        {
            title: t("qrStatus"),
            dataIndex: "qrStatus",
            key: "qrStatus",
            render: (state) => {
                return <Tag
                    color={
                        state === "Available" ? "green" :
                            state === "Borrowed" ? "volcano" :
                                state === "Exported" ? "red" :
                                    state === "Rejected" ? "#A6A6A6" : "default"
                    }
                >{state}</Tag>;
            },
        },
        {
            title: t("location"),
            dataIndex: "location",
            key: "location",
            render: (location, record) => (
                <Tag color={record.qrStatus === "Borrowed" ? "default" : (location === null || location === t("unknown") ? "red" : "blue")}>
                    {record.qrStatus === "Borrowed" ? "" : (location === null || location === t("unknown") ? t("noLocation") : location)}
                </Tag>
            ),
        },
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
                disabled={loading}
                autoFocus
                allowClear
                value={inputValue}
            />
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                style={{ marginTop: 16 }}
            />
            {hasNullLocation && (
                <div style={{ color: "red", marginTop: 8 }}>
                    {t("errorNullLocation", {
                        qrCodeIDs: qrList
                            .filter(qrData => qrStatuses[qrData]?.location === null)
                            .join(", ")
                    })}
                </div>
            )}
            <Button
                type="primary"
                disabled={qrList.length === 0 || loading || scanning || hasRejectedItem || hasNullLocation}
                onClick={() => onNext(qrStatuses)}
                style={{ marginTop: 16 }}
            >
                {t("continue")} <ArrowRightOutlined />
            </Button>
        </div>
    );
};

export default ScanCartStep;