import React, { useEffect, useState } from "react";
import { Form, Input, Button, Typography, Select, message } from "antd";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import "../../styles/TransactionFormStep.css";

const { Title } = Typography;
const { Option } = Select;

// TransactionFormStep.js
const TransactionFormStep = ({
    qrList,
    actionType,
    onBack,
    onSubmit,
    loading,
    departments,
    operationCodes,
}) => {
    const [form] = Form.useForm();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [borrowerInfo, setBorrowerInfo] = useState(null);
    const [borrowerError, setBorrowerError] = useState(null);

    useEffect(() => {
        form.resetFields();
        setBorrowerInfo(null);
        setBorrowerError(null);

        if (!user?.idNumber || !user?.departmentId) {
            console.error('Thiếu thông tin user:', { idNumber: user?.idNumber, departmentId: user?.departmentId });
            setBorrowerError(t("userInfoMissing"));
            return;
        }

        if ((actionType === "Return" || actionType === "Transfer") && qrList.length > 0) {
            const fetchBorrowerInfo = async () => {
                try {
                    const qrCodeIds = qrList.map(qrData => {
                        const parts = qrData.split("|");
                        const itemCode = parts[0];
                        const qrIndex = parts[parts.length - 1];
                        return `${itemCode}-${qrIndex}`;
                    });

                    const response = await fetch("/api/transaction/borrow", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ qrCodeIds })
                    });

                    const result = await response.json();
                    if (!response.ok || !result.success) {
                        throw new Error(result.message || t("failedToFetchBorrowInfo"));
                    }

                    if (!Array.isArray(result.data)) {
                        throw new Error('Response data is not an array');
                    }

                    if (result.data.length === 0) {
                        setBorrowerError(t("noBorrowTransactionFound", { qrCodeIds: qrCodeIds.join(", ") }));
                        return;
                    }

                    const uniqueBorrowers = new Set(result.data.map(item => item.UserName));
                    if (uniqueBorrowers.size > 1) {
                        setBorrowerError(t("multipleBorrowersError"));
                        return;
                    }

                    const department = departments.find(d => d.DepartmentName === result.data[0].DepartmentName);
                    setBorrowerInfo({
                        UserName: result.data[0].UserName,
                        DepartmentName: result.data[0].DepartmentName,
                        DepartmentID: department ? department.DepartmentID : null
                    });
                    form.setFieldsValue({
                        UserName: result.data[0].UserName,
                        DepartmentID: department ? department.DepartmentID : null,
                        ...(actionType === "Return" ? {
                            ReceiverName: user.idNumber,
                            ReceiverDeptID: user.departmentId
                        } : {})
                    });
                } catch (error) {
                    console.error('Lỗi khi lấy giao dịch:', error);
                    message.error(error.message || t("failedToFetchBorrowInfo"));
                    setBorrowerError(t("failedToFetchBorrowInfo"));
                }
            };

            fetchBorrowerInfo();
        } else if (actionType === "Borrow" || actionType === "Export") {
            form.setFieldsValue({
                DepartmentID: user.departmentId,
                UserName: user.idNumber
            });
        }
    }, [actionType, qrList, form, departments, user, t]);

    const handleFinish = (values) => {
        if (qrList.length === 0) {
            message.warning(t("emptyCart"));
            return;
        }

        if (actionType === "Transfer") {
            if (!values.ToDepartment) {
                message.error(t("selectReceiverDepartment"));
                return;
            }
            if (!values.ReceiverName || values.ReceiverName.trim() === "") {
                message.error(t("enterReceiverName"));
                return;
            }
        }

        if (actionType === "Export" && !values.OperationCodeID) {
            message.error(t("selectExportReason"));
            return;
        }

        // Tìm tên bộ phận dựa trên DepartmentID được chọn
        const selectedDepartment = departments.find(d => d.DepartmentID === values.DepartmentID);
        if (actionType === "Borrow" && !selectedDepartment) {
            message.error(t("invalidDepartment"));
            return;
        }

        const toDepartment = actionType === "Transfer" ? departments.find(d => d.DepartmentID === values.ToDepartment) : selectedDepartment;

        const payload = {
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
            Note: values.Note || "",
            ...(actionType === "Borrow" ? {
                ToUserName: values.UserName, // Người mượn
                ToDepartmentID: values.DepartmentID, // ID bộ phận mượn
                ToDepartmentName: selectedDepartment ? selectedDepartment.DepartmentName : null // Tên bộ phận mượn
            } : {}),
            ...(actionType === "Return" ? {
                ReceiverName: user.idNumber,
                ReceiverDeptID: user.departmentId
            } : {}),
            ...(actionType === "Transfer" ? {
                ReceiverName: values.ReceiverName,
                ToUserName: values.ReceiverName,
                ToDepartment: values.ToDepartment,
                ToDepartmentName: toDepartment ? toDepartment.DepartmentName : null
            } : {}),
            ...(actionType === "Export" ? {
                OperationCodeID: values.OperationCodeID
            } : {})
        };

        console.log('TransactionFormStep payload:', payload); // Log để kiểm tra
        onSubmit(payload);
    };

    const renderFields = () => {
        switch (actionType) {
            case "Borrow":
                return (
                    <>
                        <Form.Item
                            label={t("borrower")}
                            name="UserName"
                            rules={[
                                { required: true, message: t("enterExecutorName") },
                                { max: 100, message: t("maxNameLength") }
                            ]}
                        >
                            <Input placeholder={t("enterExecutorName")} />
                        </Form.Item>
                        <Form.Item
                            label={t("borrowDepartment")}
                            name="DepartmentID"
                            rules={[{ required: true, message: t("selectDepartment") }]}
                        >
                            <Select placeholder={t("selectDepartment")}>
                                {departments.map(dept => (
                                    <Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                        {dept.DepartmentName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </>
                );
            case "Return":
                return (
                    <>
                        <Form.Item
                            label={t("borrower")}
                            name="UserName"
                            rules={[{ required: true, message: t("enterBorrowerName") }]}
                        >
                            <Input
                                placeholder={t("borrowerName")}
                                disabled={!!borrowerInfo}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("borrowDepartment")}
                            name="DepartmentID"
                            rules={[{ required: true, message: t("selectBorrowDepartment") }]}
                        >
                            <Select
                                placeholder={t("selectBorrowDepartment")}
                                disabled={!!borrowerInfo}
                            >
                                {departments.map(dept => (
                                    <Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                        {dept.DepartmentName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={t("receiver")}
                            name="ReceiverName"
                            rules={[{ required: true, message: t("enterReceiverName") }]}
                            initialValue={user.idNumber}
                        >
                            <Input
                                readOnly
                                defaultValue={user.idNumber}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("receiverDepartment")}
                            name="ReceiverDeptID"
                            rules={[{ required: true, message: t("selectReceiverDepartment") }]}
                            initialValue={user.departmentId}
                        >
                            <Select
                                defaultValue={user.departmentId}
                                disabled
                            >
                                {departments.map(dept => (
                                    <Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                        {dept.DepartmentName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        {borrowerError && (
                            <Typography.Text type="danger">{borrowerError}</Typography.Text>
                        )}
                    </>
                );
            case "Transfer":
                return (
                    <>
                        <Form.Item
                            label={t("borrower")}
                            name="UserName"
                            rules={[{ required: true, message: t("enterBorrowerName") }]}
                        >
                            <Input
                                placeholder={t("borrowerName")}
                                disabled={!!borrowerInfo}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("borrowDepartment")}
                            name="DepartmentID"
                            rules={[{ required: true, message: t("selectBorrowDepartment") }]}
                        >
                            <Select
                                placeholder={t("selectBorrowDepartment")}
                                disabled={!!borrowerInfo}
                            >
                                {departments.map(dept => (
                                    <Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                        {dept.DepartmentName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={t("receiver")}
                            name="ReceiverName"
                            rules={[{ required: true, message: t("enterReceiverName") }]}
                        >
                            <Input placeholder={t("enterReceiverName")} />
                        </Form.Item>
                        <Form.Item
                            label={t("receiverDepartment")}
                            name="ToDepartment"
                            rules={[{ required: true, message: t("selectReceiverDepartment") }]}
                        >
                            <Select placeholder={t("selectReceiverDepartment")}>
                                {departments.map(dept => (
                                    <Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                        {dept.DepartmentName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        {borrowerError && (
                            <Typography.Text type="danger">{borrowerError}</Typography.Text>
                        )}
                    </>
                );
            case "Export":
                return (
                    <>
                        <Form.Item
                            label={t("exporter")}
                            name="UserName"
                            rules={[{ required: true, message: t("enterExporterName") }]}
                        >
                            <Input
                                disabled
                                defaultValue={user.idNumber}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("exportDepartment")}
                            name="DepartmentID"
                            rules={[{ required: true, message: t("selectExportDepartment") }]}
                        >
                            <Select
                                disabled
                                defaultValue={user.departmentId}
                            >
                                {departments.map(dept => (
                                    <Option key={dept.DepartmentID} value={dept.DepartmentID}>
                                        {dept.DepartmentName}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            label={t("exportReason")}
                            name="OperationCodeID"
                            rules={[{ required: true, message: t("selectExportReason") }]}
                        >
                            <Select placeholder={t("selectExportReason")}>
                                {operationCodes.map(code => (
                                    <Option key={code.ReasonID} value={code.ReasonID}>
                                        {code.ReasonDetail}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="transaction-form-step">
            <Title level={4}>{t("transactionInfo")} - {t(actionType.toLowerCase())}</Title>
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                {renderFields()}
                <Form.Item>
                    <Button onClick={onBack} style={{ marginRight: 8 }}>
                        {t("back")}
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading} disabled={!!borrowerError}>
                        {t("confirmTransaction")}
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default TransactionFormStep;