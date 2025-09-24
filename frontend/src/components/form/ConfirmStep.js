import React from "react";
import { Descriptions, Table, Button, Typography } from "antd";
import { useAuth } from "../../context/AuthContext";
import dayjs from "dayjs";
import { CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import "../../styles/ConfirmStep.css";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

// ConfirmStep.js
const ConfirmStep = ({ qrList, formData, actionType, onBack, onConfirm, loading, operationCodes }) => {
    console.log("formData :", formData);
    const { user } = useAuth();
    const { t } = useTranslation();
    const today = dayjs().format("MM-DD-YYYY");

    const columns = [
        { title: t("key"), dataIndex: "uniqueKey", key: "uniqueKey" },
        { title: t("qrCodeID"), dataIndex: "qrCodeID", key: "qrCodeID" },
    ];

    const dataSource = qrList.map((qrData, idx) => {
        const parts = qrData.split("|");
        const uniqueKey = parts[0];
        const qrIndex = parts[parts.length - 1];
        return { key: idx, uniqueKey, qrCodeID: qrData };
    });

    const renderDescriptions = () => {
        switch (actionType) {
            case "Borrow":
                return (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label={t("transactionType")}>{t("borrow")}</Descriptions.Item>
                        <Descriptions.Item label={t("executedBy")}>{user.idNumber}</Descriptions.Item>
                        <Descriptions.Item label={t("borrowDate")}>{today}</Descriptions.Item>
                        <Descriptions.Item label={t("borrower")}>{formData.ToUserName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("borrowDepartment")}>{formData.ToDepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("qrCount")}>{qrList.length}</Descriptions.Item>
                    </Descriptions>
                );
            case "Return":
                return (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label={t("transactionType")}>{t("return")}</Descriptions.Item>
                        <Descriptions.Item label={t("borrower")}>{formData.UserName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("borrowDepartment")}>{formData.DepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("receiver")}>{formData.ReceiverName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("receiverDepartment")}>{formData.ToDepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("returnDate")}>{today}</Descriptions.Item>
                        <Descriptions.Item label={t("returnCount")}>{qrList.length}</Descriptions.Item>
                    </Descriptions>
                );
            case "Transfer":
                return (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label={t("transactionType")}>{t("transfer")}</Descriptions.Item>
                        <Descriptions.Item label={t("borrower")}>{formData.UserName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("borrowDepartment")}>{formData.DepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("receiver")}>{formData.ReceiverName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("receiverDepartment")}>{formData.ToDepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("transferDate")}>{today}</Descriptions.Item>
                        <Descriptions.Item label={t("transferCount")}>{qrList.length}</Descriptions.Item>
                    </Descriptions>
                );
            case "Export":
                const operationCode = operationCodes.find(code => code.ReasonID === formData.OperationCodeID);
                return (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label={t("transactionType")}>{t("export")}</Descriptions.Item>
                        <Descriptions.Item label={t("exporter")}>{user.idNumber}</Descriptions.Item>
                        <Descriptions.Item label={t("exportDate")}>{today}</Descriptions.Item>
                        <Descriptions.Item label={t("exportDepartment")}>{formData.DepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("exportReason")}>{operationCode?.ReasonDetail || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("exportCount")}>{qrList.length}</Descriptions.Item>
                    </Descriptions>
                );
            case "Reject":
                const rejectOperationCode = operationCodes.find(code => code.ReasonID === formData.OperationCodeID);
                return (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label={t("transactionType")}>{t("reject")}</Descriptions.Item>
                        <Descriptions.Item label={t("rejecter")}>{user.idNumber}</Descriptions.Item>
                        <Descriptions.Item label={t("rejectDate")}>{today}</Descriptions.Item>
                        <Descriptions.Item label={t("rejectDepartment")}>{formData.DepartmentName || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("rejectReason")}>{rejectOperationCode?.ReasonDetail || t("notSpecified")}</Descriptions.Item>
                        <Descriptions.Item label={t("rejectCount")}>{qrList.length}</Descriptions.Item>
                    </Descriptions>
                );
            default:
                return null;
        }
    };

    return (
        <div className="confirm-step">
            <Title level={4}>{t("confirmTransaction")}</Title>
            {renderDescriptions()}
            <Title level={5} style={{ marginTop: 24 }}>{t("qrList")}</Title>
            <Table dataSource={dataSource} columns={columns} pagination={false} />
            <div style={{ marginTop: 24 }}>
                <Button onClick={onBack} style={{ marginRight: 8 }} icon={<ArrowLeftOutlined />}>{t("back")}</Button>
                <Button type="primary" onClick={onConfirm} loading={loading} icon={<CheckOutlined />}>{t("confirmAndSubmit")}</Button>
            </div>
        </div>
    );
};

export default ConfirmStep;