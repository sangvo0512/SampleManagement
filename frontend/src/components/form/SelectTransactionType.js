import React from "react";
import { Button, Radio, Space, Typography } from "antd";
import "../../styles/SelectTransactionType.css";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

const SelectTransactionType = ({ actionType, setActionType, onNext, onBack }) => {
    const { t } = useTranslation();
    const transactionTypes = [
        { value: "Borrow", label: t("borrow") },
        { value: "Return", label: t("return") },
        { value: "Transfer", label: t("transfer") },
        { value: "Export", label: t("export") },
    ];
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
                        <Radio.Button key={type.value} value={type.value}>
                            {type.label}
                        </Radio.Button>
                    ))}
                </Space>
            </Radio.Group>

            <Space style={{ marginTop: 24 }}>
                <Button onClick={onBack}>
                    {t("back")}
                </Button>
                <Button
                    type="primary"
                    disabled={!actionType}
                    onClick={onNext}
                >
                    {t("continue")}
                </Button>
            </Space>
        </div>
    );
};

export default SelectTransactionType;