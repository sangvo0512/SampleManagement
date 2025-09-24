import React from "react";
import { Button, Radio, Space, Typography } from "antd";
import "../../styles/SelectTransactionType.css";
import { useTranslation } from "react-i18next";
import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { usePermissions } from "../../context/PermissionContext"; //Hook Permissions

const { Title } = Typography;

const SelectTransactionType = ({ actionType, setActionType, onNext, onBack, qrStatuses }) => {
    const { permissions } = usePermissions();
    const { t } = useTranslation();

    // Tính toán rule disable
    const statuses = Object.values(qrStatuses).map(s => s.status);

    const hasBorrowed = statuses.includes("Borrowed");
    const hasAvailable = statuses.includes("Available");
    const hasExported = statuses.includes("Exported");

    const isDisabled = (type) => {
        if (hasBorrowed && ["Borrow", "Export", "Reject"].includes(type)) return true;
        if (hasAvailable && ["Return", "Transfer"].includes(type)) return true;
        if (hasExported && type !== "Return") return true;
        return false;
    };

    const transactionTypes = [
        { value: "Borrow", label: t("borrow"), permission: "borrow_transaction" },
        { value: "Return", label: t("return"), permission: "return_transaction" },
        { value: "Transfer", label: t("transfer"), permission: "transfer_transaction" },
        { value: "Export", label: t("export"), permission: "export_transaction" },
        { value: "Reject", label: t("reject"), permission: "reject_transaction" }
    ].filter(type => permissions.includes(type.permission));
    return (
        <div className="select-transaction-type">
            <Title level={4}>{t("selectTransactionType")}</Title>
            <Radio.Group
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                style={{ marginBottom: 24 }}
            >
                <Space direction="horizontal">
                    {transactionTypes.map((type) => (
                        <Radio.Button
                            key={type.value}
                            value={type.value}
                            disabled={isDisabled(type.value)}>
                            {type.label}
                        </Radio.Button>
                    ))}
                </Space>
            </Radio.Group>

            <Space style={{ marginTop: 24 }}>
                <Button onClick={onBack}>
                    {t("back")} <ArrowLeftOutlined />
                </Button>
                <Button
                    type="primary"
                    disabled={!actionType}
                    onClick={onNext}
                >
                    {t("continue")} <ArrowRightOutlined />
                </Button>
            </Space>
        </div>
    );
};

export default SelectTransactionType;