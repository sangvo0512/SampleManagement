/** TransactionFlowPage */
import React, { useState, useEffect } from "react";
import { Steps, message, Card } from "antd";
import ScanCartStep from "./ScanCartStep";
import SelectTransactionType from "./SelectTransactionType";
import TransactionFormStep from "./TransactionFormStep";
import ConfirmStep from "./ConfirmStep";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import "../../styles/TransactionFlowPage.css";

const { Step } = Steps;

const TransactionFlowPage = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [qrList, setQrList] = useState([]);
    const [actionType, setActionType] = useState(null);
    const [formData, setFormData] = useState({});
    const [departments, setDepartments] = useState([]);
    const [operationCodes, setOperationCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [qrStatuses, setQrStatuses] = useState({});
    const { user } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        fetch("/api/departments")
            .then((res) => res.json())
            .then(setDepartments)
            .catch(() => message.error(t("failedToFetchDepartments")));

        fetch("/api/operationCode")
            .then((res) => res.json())
            .then(setOperationCodes)
            .catch(() => message.error(t("failedToFetchOperationCodes")));
    }, [t]);

    const handleConfirm = async () => {
        setLoading(true);

        // Kiểm tra dữ liệu bắt buộc
        if (actionType === "Borrow") {
            if (!formData.ToUserName || formData.ToUserName.trim() === "") {
                setLoading(false);
                message.error(t("enterExecutorName"));
                return;
            }
            if (!formData.ToDepartmentName) {
                setLoading(false);
                message.error(t("selectDepartment"));
                return;
            }
        }
        if (actionType === "Return") {
            if (!formData.UserName || !formData.DepartmentName) {
                setLoading(false);
                message.error(t("missingBorrowerInfo"));
                return;
            }
            if (!formData.ReceiverName || !formData.ToDepartmentName) {
                setLoading(false);
                message.error(t("missingReceiverInfo"));
                return;
            }
        }
        if (actionType === "Transfer") {
            if (!formData.ReceiverName || formData.ReceiverName.trim() === "") {
                setLoading(false);
                message.error(t("enterReceiverName"));
                return;
            }
            if (!formData.ToDepartmentName) {
                setLoading(false);
                message.error(t("selectReceiverDepartment"));
                return;
            }
        }
        if (actionType === "Export") {
            if (!formData.OperationCodeID) {
                setLoading(false);
                message.error(t("selectExportReason"));
                return;
            }
            if (!formData.ToUserName || formData.ToUserName.trim() === "") {
                setLoading(false);
                message.error(t("enterToUserName"));
                return;
            }
        }
        if (actionType === "Reject") {
            if (!formData.OperationCodeID) {
                setLoading(false);
                message.error(t("selectExportReason"));
                return;
            }
        }

        console.log('TransactionFlowPage formData:', formData);

        const transactionData = {
            ActionType: actionType,
            UserName: actionType === "Borrow" || actionType === "Export" || actionType === "Reject" ? user.idNumber : formData.UserName,
            DepartmentName: actionType === "Borrow" || actionType === "Export" || actionType === "Reject" ? departments.find(d => d.DepartmentID === user.departmentId)?.DepartmentName : formData.DepartmentName,
            QRCodeDataList: formData.QRCodeDataList || qrList.map(qrData => {
                const parts = qrData.split("|");
                const uniqueKey = parts[0];
                const qrIndex = parts[parts.length - 1];
                const itemCode = uniqueKey.split("-")[0];
                return {
                    QRCodeID: qrData,
                    ItemCode: itemCode || uniqueKey,
                    UniqueKey: uniqueKey,
                    Quantity: 1
                };
            }),
            ...(actionType === "Borrow" ? {
                ToUserName: formData.ToUserName,
                ToDepartmentName: formData.ToDepartmentName
            } : {}),
            ...(actionType === "Return" ? {
                UserName: formData.UserName,
                DepartmentName: formData.DepartmentName,
                ReceiverName: formData.ReceiverName || user.idNumber,
                ReceiverDeptID: formData.ReceiverDeptID || user.departmentId,
                ToDepartmentName: formData.ToDepartmentName
            } : {}),
            ...(actionType === "Transfer" ? {
                UserName: formData.UserName,
                DepartmentName: formData.DepartmentName,
                ReceiverName: formData.ReceiverName,
                ToUserName: formData.ReceiverName,
                ToDepartmentName: formData.ToDepartmentName
            } : {}),
            ...(actionType === "Export" ? {
                OperationCodeID: formData.OperationCodeID,
                ToUserName: formData.ToUserName
            } : {}),
            ...(actionType === "Reject" ? {
                OperationCodeID: formData.OperationCodeID
            } : {})
        };

        try {
            const endpoint = "/api/transaction";
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(transactionData)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || result.error || t("failedToCompleteTransaction"));
            }

            const messageMap = {
                TransactionSuccess: t("transactionSuccess", { actionType: t(actionType.toLowerCase()) })
            };
            const displayMessage = messageMap[result.message] || result.message;
            message.success(displayMessage);

            setQrList([]);
            setActionType(null);
            setFormData({});
            setCurrentStep(0);
        } catch (error) {
            console.error("Failed transaction:", error.message);
            message.error(error.message || t("transactionError"));
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            title: t("scanQR"),
            content: (
                <ScanCartStep
                    qrList={qrList}
                    setQrList={setQrList}
                    onNext={(qrStatuses) => {
                        setQrStatuses(qrStatuses);    // Lưu trạng thái QR vào state cha
                        setCurrentStep(currentStep + 1);
                    }}
                />
            )
        },
        {
            title: t("selectTransactionType"),
            content: (
                <SelectTransactionType
                    actionType={actionType}
                    setActionType={setActionType}
                    qrStatuses={qrStatuses}          // ✅ truyền xuống
                    onNext={() => setCurrentStep(currentStep + 1)}
                    onBack={() => setCurrentStep(currentStep - 1)}
                />
            )
        },
        {
            title: t("enterInfo"),
            content: (
                <TransactionFormStep
                    qrList={qrList}
                    actionType={actionType}
                    departments={departments}
                    operationCodes={operationCodes}
                    onBack={() => setCurrentStep(currentStep - 1)}
                    onSubmit={(data) => {
                        setFormData(data);
                        setCurrentStep(currentStep + 1);
                    }}
                    loading={loading}
                />
            )
        },
        {
            title: t("confirmTransaction"),
            content: (
                <ConfirmStep
                    qrList={qrList}
                    actionType={actionType}
                    formData={formData}
                    onBack={() => setCurrentStep(currentStep - 1)}
                    onConfirm={handleConfirm}
                    loading={loading}
                    operationCodes={operationCodes}
                />
            )
        }
    ];

    return (
        <div className="transaction-flow-page">
            <Card>
                <Steps current={currentStep}>
                    {steps.map((item) => (
                        <Step key={item.title} title={item.title} />
                    ))}
                </Steps>
                <div>{steps[currentStep].content}</div>
            </Card>
        </div>
    );
};

export default TransactionFlowPage;