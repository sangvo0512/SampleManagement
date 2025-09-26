import React, { useEffect, useState } from "react";
import { Form, Input, Button, Typography, Select, message, Modal, Table } from "antd";
import { useAuth } from "../../context/AuthContext";
import { ArrowRightOutlined, ArrowLeftOutlined, ContactsOutlined } from '@ant-design/icons';
import { useTranslation } from "react-i18next";
import "../../styles/TransactionFormStep.css";

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

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
    const [borrowers, setBorrowers] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [receiverModalVisible, setReceiverModalVisible] = useState(false); // Modal cho Receiver
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const operationCodeID = Form.useWatch('OperationCodeID', form); // Theo dõi giá trị OperationCodeID
    const showNote = [3, 1002, 1003].includes(operationCodeID); // Hiển thị Note nếu ID khớp

    // Fetch danh sách Borrower
    useEffect(() => {
        const fetchBorrowers = async () => {
            try {
                const response = await fetch("/api/borrowers");
                const result = await response.json();
                if (response.ok && result.success) {
                    setBorrowers(result.data || []);
                } else {
                    throw new Error(result.message || t("failedToFetchBorrowers"));
                }
            } catch (error) {
                console.error('Lỗi khi lấy danh sách Borrower:', error);
                message.error(t("failedToFetchBorrowers"));
            }
        };
        fetchBorrowers();
    }, [t]);
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const response = await fetch("/api/warehouses");
                const result = await response.json();

                // Nếu API trả về array trực tiếp
                if (response.ok && Array.isArray(result)) {
                    setWarehouses(result);
                }
                // Nếu sau này API có dạng object
                else if (response.ok && result.success) {
                    setWarehouses(result.data || []);
                } else {
                    throw new Error(result.message || t("failedToFetchWarehouses"));
                }
            } catch (error) {
                console.error('Lỗi khi lấy danh sách Warehouses:', error);
                message.error(t("failedToFetchWarehouses"));
            }
        };

        fetchWarehouses();
    }, [t]);
    useEffect(() => {
        form.resetFields();
        setBorrowerInfo(null);
        setBorrowerError(null);

        if (!user?.idNumber || !user?.departmentId) {
            console.error('Thiếu thông tin user:', { idNumber: user?.idNumber, departmentId: user?.departmentId });
            setBorrowerError(t("userInfoMissing"));
            return;
        }

        const userDepartmentName = departments.find(d => d.DepartmentID === user.departmentId)?.DepartmentName;
        if (!userDepartmentName) {
            console.error('DepartmentID của user không hợp lệ:', user.departmentId);
            setBorrowerError(t("invalidUserDepartment"));
            return;
        }

        if ((actionType === "Return" || actionType === "Transfer") && qrList.length > 0) {
            const fetchBorrowerInfo = async () => {
                try {
                    const qrCodeIds = qrList.map(qrData => {
                        const parts = qrData.split("|");
                        if (parts.length < 2) {
                            throw new Error(`Định dạng QR không hợp lệ: ${qrData}`);
                        }
                        const uniqueKey = parts[0].trim();
                        const qrIndex = parts[parts.length - 1].trim();
                        return `${uniqueKey}|${qrIndex}`;
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

                    setBorrowerInfo({
                        UserName: result.data[0].UserName,
                        DepartmentName: result.data[0].DepartmentName
                    });

                    form.setFieldsValue({
                        UserName: result.data[0].UserName,
                        DepartmentName: result.data[0].DepartmentName,
                        ...(actionType === "Return" ? {
                            ReceiverName: user.idNumber,
                            ReceiverDeptName: userDepartmentName  // Thay ReceiverDeptID bằng ReceiverDeptName
                        } : {})
                    });
                } catch (error) {
                    console.error('Lỗi khi lấy giao dịch:', error);
                    message.error(error.message || t("failedToFetchBorrowInfo"));
                    setBorrowerError(t("failedToFetchBorrowInfo"));
                }
            };

            fetchBorrowerInfo();
        } else if (actionType === "Borrow" || actionType === "Export" || actionType === "Reject") {
            form.setFieldsValue({
                // Không cần DepartmentID nữa, chỉ dùng Name ở payload
            });
        }
    }, [actionType, qrList, form, departments, user, t]);

    const handleFinish = (values) => {
        console.log('Form values:', values);

        if (qrList.length === 0) {
            message.warning(t("emptyCart"));
            return;
        }

        if (actionType === "Transfer") {
            if (!values.ReceiverName || values.ReceiverName.trim() === "") {
                message.error(t("enterReceiverName"));
                return;
            }
            if (!values.ToDepartmentName) {
                message.error(t("selectReceiverDepartment"));
                return;
            }
        }

        if ((actionType === "Export") && !values.OperationCodeID) {
            message.error(t("selectExportReason"));
            return;
        }

        if (actionType === "Export" && !values.ToUserName) {
            message.error(t("enterToUserName"));
            return;
        }

        const userDepartmentName = departments.find(d => d.DepartmentID === user.departmentId)?.DepartmentName;
        if ((actionType === "Borrow" || actionType === "Export" || actionType === "Reject") && !userDepartmentName) {
            message.error(t("invalidUserDepartment"));
            return;
        }

        const payload = {
            ActionType: actionType,
            UserName: actionType === "Borrow" || actionType === "Export" || actionType === "Reject" ? user.idNumber : (borrowerInfo?.UserName || values.UserName),
            DepartmentName: actionType === "Borrow" || actionType === "Export" || actionType === "Reject" ? userDepartmentName : (borrowerInfo?.DepartmentName || values.DepartmentName),
            QRCodeDataList: qrList.map(qrData => {
                const parts = qrData.split("|");
                const uniqueKey = parts[0].trim();
                const qrIndex = parts[parts.length - 1].trim();
                const itemCode = uniqueKey.split("-")[0];
                return {
                    QRCodeID: qrData,
                    ItemCode: itemCode,
                    UniqueKey: uniqueKey,
                    Quantity: 1
                };
            }),
            Note: values.Note || "",
            ...(actionType === "Borrow" ? {
                ToUserName: values.UserName,
                ToDepartmentName: values.DepartmentName
            } : {}),
            ...(actionType === "Return" ? {
                UserName: borrowerInfo?.UserName || values.UserName,
                DepartmentName: borrowerInfo?.DepartmentName || values.DepartmentName,
                ReceiverName: user.idNumber,
                ToDepartmentName: userDepartmentName,
                ReturnLocation: values.ReturnLocation
            } : {}),
            ...(actionType === "Transfer" ? {
                UserName: borrowerInfo?.UserName || values.UserName,
                DepartmentName: borrowerInfo?.DepartmentName || values.DepartmentName,
                ReceiverName: values.ReceiverName,
                ToUserName: values.ReceiverName,
                ToDepartmentName: values.ToDepartmentName
            } : {}),
            ...(actionType === "Export" ? {
                OperationCodeID: values.OperationCodeID,
                ToUserName: values.ToUserName
            } : {}),
            ...(actionType === "Reject" ? {
                OperationCodeID: values.OperationCodeID
            } : {})
        };

        console.log('TransactionFormStep payload:', payload);
        onSubmit(payload);
    };

    const renderBorrowerModal = (isReceiver = false) => (
        <Modal
            title={isReceiver ? t("searchReceiver") : t("searchBorrower")}
            open={isReceiver ? receiverModalVisible : modalVisible}
            onCancel={() => isReceiver ? setReceiverModalVisible(false) : setModalVisible(false)}
            footer={null}
            width={600}
        >
            <Search
                placeholder={t("searchByCardIDNameDept")}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ marginBottom: 16 }}
            />
            <Table
                dataSource={borrowers.filter((b) =>
                    b.CardID.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    b.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    b.Dept.toLowerCase().includes(searchTerm.toLowerCase())
                )}
                columns={[
                    { title: t("cardID"), dataIndex: "CardID", key: "CardID" },
                    { title: t("name"), dataIndex: "Name", key: "Name" },
                    { title: t("dept"), dataIndex: "Dept", key: "Dept" },
                ]}
                pagination={{ pageSize: 5 }}
                onRow={(record) => ({
                    onClick: () => {
                        if (isReceiver) {
                            form.setFieldsValue({
                                ReceiverName: record.CardID,
                                ToDepartmentName: record.Dept
                            });
                            setReceiverModalVisible(false);
                        } else {
                            form.setFieldsValue({
                                UserName: record.CardID,
                                DepartmentName: record.Dept
                            });
                            setModalVisible(false);
                        }
                    },
                })}
                rowKey="CardID"
            />
        </Modal>
    );

    const renderFields = () => {
        switch (actionType) {
            case "Borrow":
                return (
                    <>
                        <Form.Item
                            label={t("borrower")}
                            required
                        >
                            <Input.Group compact style={{ display: "flex" }}>
                                <Form.Item
                                    name="UserName"
                                    noStyle
                                    rules={[{ required: true, message: t("enterBorrowerName") }]}
                                >
                                    <Input
                                        style={{ flex: 1 }}
                                        placeholder={t("borrowerName")}
                                    />
                                </Form.Item>
                                <Button
                                    onClick={() => setModalVisible(true)}
                                    icon={<ContactsOutlined />}
                                >
                                    {t("search")}
                                </Button>
                            </Input.Group>
                        </Form.Item>
                        <Form.Item
                            label={t("borrowDepartment")}
                            name="DepartmentName"
                            rules={[{ required: true, message: t("selectBorrowDepartment") }]}
                        >
                            <Input
                                placeholder={t("borrowDepartment")}
                                readOnly
                            />
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
                            name="DepartmentName"
                            rules={[{ required: true, message: t("selectBorrowDepartment") }]}
                        >
                            <Input
                                placeholder={t("borrowDepartment")}
                                disabled={!!borrowerInfo}
                            />
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
                            name="ToDepartmentName"
                        // rules={[{ required: true, message: t("selectReceiverDepartment") }]}
                        >
                            <Input
                                readOnly
                                defaultValue={departments.find(d => d.DepartmentID === user.departmentId)?.DepartmentName}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("returnLocation")}
                            name="ReturnLocation"
                            rules={[{ required: true, message: t("selectReturnLocation") }]}
                        >
                            <Select
                                placeholder={t("selectReturnLocation")}
                                allowClear
                            >
                                {warehouses.map(wh => (
                                    <Option key={wh.WarehouseID} value={wh.WarehouseName}>
                                        {wh.WarehouseName}
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
                                readOnly
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("borrowDepartment")}
                            name="DepartmentName"
                            rules={[{ required: true, message: t("selectBorrowDepartment") }]}
                        >
                            <Input
                                placeholder={t("borrowDepartment")}
                                disabled={!!borrowerInfo}
                                readOnly
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("receiver")}
                            required
                        >
                            <Input.Group compact style={{ display: "flex" }}>
                                <Form.Item
                                    name="ReceiverName"
                                    noStyle
                                    rules={[{ required: true, message: t("enterReceiverName") }]}
                                >
                                    <Input
                                        style={{ flex: 1 }}
                                        placeholder={t("enterReceiverName")}
                                    />
                                </Form.Item>
                                <Button
                                    onClick={() => setReceiverModalVisible(true)}
                                    icon={<ContactsOutlined />}
                                >
                                    {t("search")}
                                </Button>
                            </Input.Group>
                        </Form.Item>
                        <Form.Item
                            label={t("receiverDepartment")}
                            name="ToDepartmentName"
                            rules={[{ required: true, message: t("selectReceiverDepartment") }]}
                        >
                            <Input
                                placeholder={t("receiverDepartment")}
                                readOnly
                            />
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
                        >
                            <Input
                                disabled
                                defaultValue={user.idNumber}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("exportDepartment")}
                            name="DepartmentID"
                        // rules={[{ required: true, message: t("selectExportDepartment") }]}
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
                            label={t("toUserName")}
                            name="ToUserName"
                            rules={[{ required: true, message: t("receiver") }]}
                        >
                            <Input placeholder={t("receiver")} />
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
                        {showNote && ( // Conditional rendering cho Note
                            <Form.Item
                                label={t("note")}
                                name="Note"
                                rules={[{ required: true, message: t("enterNote") }]}
                            >
                                <Input placeholder={t("enterNote")} />
                            </Form.Item>
                        )}
                    </>
                );
            case "Reject":
                return (
                    <>
                        <Form.Item
                            label={t("rejecter")}
                            name="UserName"
                        >
                            <Input
                                disabled
                                defaultValue={user.idNumber}
                            />
                        </Form.Item>
                        <Form.Item
                            label={t("rejectDepartment")}
                            name="DepartmentID"
                        // rules={[{ required: true, message: t("selectExportDepartment") }]}
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
                            label={t("rejectReason")}
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
                    <Button onClick={onBack} style={{ marginRight: 8 }} icon={<ArrowLeftOutlined />}>
                        {t("back")}
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading} disabled={!!borrowerError} icon={<ArrowRightOutlined />}>
                        {t("confirmTransaction")}
                    </Button>
                </Form.Item>
                {borrowerError && (
                    <Typography.Text type="danger">{borrowerError}</Typography.Text>
                )}
            </Form>
            {renderBorrowerModal(false)}
            {renderBorrowerModal(true)}
        </div>
    );
};

export default TransactionFormStep;