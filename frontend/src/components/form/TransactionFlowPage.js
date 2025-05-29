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
            if (!formData.ToDepartmentID || !formData.ToDepartmentName) {
                setLoading(false);
                message.error(t("selectDepartment"));
                return;
            }
        }
        if (actionType === "Return" && (!formData.ReceiverName || !formData.ReceiverDeptID)) {
            setLoading(false);
            message.error(t("enterReceiverInfo"));
            return;
        }
        if (actionType === "Transfer") {
            if (!formData.ToDepartment) {
                setLoading(false);
                message.error(t("selectReceiverDepartment"));
                return;
            }
            if (!formData.ReceiverName || formData.ReceiverName.trim() === "") {
                setLoading(false);
                message.error(t("enterReceiverName"));
                return;
            }
        }

        // Log để kiểm tra formData
        console.log('TransactionFlowPage formData:', formData);

        const transactionData = {
            ActionType: actionType,
            UserName: user.idNumber, // UserName từ user hiện tại
            DepartmentID: user.departmentId, // DepartmentID từ user hiện tại
            QRCodeDataList: qrList.map(qrData => {
                const parts = qrData.split("|");
                const itemCode = parts[0];
                const qrIndex = parts[parts.length - 1];
                return {
                    QRCodeID: `${itemCode}-${qrIndex}`,
                    ItemCode: itemCode,
                    Quantity: 1
                };
            }),
            ...(actionType === "Borrow" ? {
                ToUserName: formData.ToUserName,
                ToDepartmentName: formData.ToDepartmentName // Lấy trực tiếp từ formData
            } : {}),
            ...(actionType === "Return" ? {
                ReceiverName: formData.ReceiverName || user.idNumber,
                ReceiverDeptID: formData.ReceiverDeptID || user.departmentId
            } : {}),
            ...(actionType === "Transfer" ? {
                ReceiverName: formData.ReceiverName,
                ToUserName: formData.ReceiverName,
                ToDepartment: formData.ToDepartment,
                ToDepartmentName: formData.ToDepartmentName
            } : {}),
            ...(actionType === "Export" ? {
                OperationCodeID: formData.OperationCodeID
            } : {})
        };

        console.log('TransactionFlowPage transactionData:', transactionData); // Log để kiểm tra payload gửi đi

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
            console.error("Lỗi khi gửi giao dịch:", error.message);
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
                    onNext={() => setCurrentStep(currentStep + 1)}
                />
            )
        },
        {
            title: t("selectTransactionType"),
            content: (
                <SelectTransactionType
                    actionType={actionType}
                    setActionType={setActionType}
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