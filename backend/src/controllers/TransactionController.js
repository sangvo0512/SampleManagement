const TransactionModel = require('../models/TransactionModel');
const SampleModel = require('../models/SampleModel');
const { sql, poolPromise } = require('../config/db');

class TransactionController {
    static async createTransaction(req, res) {
        try {
            const {
                ActionType,
                UserName,
                DepartmentName,
                QRCodeDataList = [],
                OperationCodeID,
                ToUserName,
                ToDepartmentName,
                ReturnLocation, // Thêm ReturnLocation
                Note
            } = req.body;

            console.log('createTransaction req.body:', req.body);

            const actionTypeMap = {
                'Mượn': 'Borrow',
                'Trả': 'Return',
                'Chuyển giao': 'Transfer',
                'Xuất kho': 'Export',
                'Báo phế': 'Reject'
            };
            const normalizedActionType = actionTypeMap[ActionType] || ActionType;
            if (!['Borrow', 'Return', 'Transfer', 'Export', 'Reject'].includes(normalizedActionType)) {
                return res.status(400).json({ message: `Invalid transaction type: ${ActionType}` });
            }

            if (!Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return res.status(400).json({ message: "QR list are empty." });
            }
            if (!UserName || !DepartmentName) {
                console.error('Thiếu thông tin:', { UserName, DepartmentName });
                return res.status(400).json({ message: "Missing require information." });
            }
            if (normalizedActionType === 'Borrow' && (!ToUserName || !ToDepartmentName)) {
                return res.status(400).json({ message: "Missing require information." });
            }
            if (normalizedActionType === 'Export' && (!OperationCodeID || !ToUserName)) {
                return res.status(400).json({ message: "Missing require information." });
            }
            if ((normalizedActionType === 'Return' || normalizedActionType === 'Transfer') && (!ToUserName || !ToDepartmentName)) {
                return res.status(400).json({ message: "Missing require information." });
            }
            if (normalizedActionType === 'Reject' && !OperationCodeID) {
                return res.status(400).json({ message: "Missing operation code." });
            }
            if (normalizedActionType === 'Return' && !ReturnLocation) {
                return res.status(400).json({ message: "Missing return location." });
            }

            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());

                if (isNaN(QRIndex)) {
                    return res.status(400).json({ message: `Invalid QRIndex: ${QRCodeID}` });
                }

                const result = await pool.request()
                    .input('QRCodeID', sql.NVarChar(150), QRCodeID)
                    .query(`SELECT Status, Location FROM QRCodeDetails WHERE QRCodeID = @QRCodeID`);

                if (result.recordset.length === 0) {
                    return res.status(404).json({ message: `The QR ${QRCodeID} is not exist.` });
                }

                const status = result.recordset[0].Status;
                if (normalizedActionType === 'Borrow' && status !== 'Available') {
                    return res.status(400).json({ message: `The QR ${QRCodeID} is not ready to Borrow (trạng thái: ${status}).` });
                }
                if (normalizedActionType === 'Export' && status !== 'Available') {
                    return res.status(400).json({ message: `The QR ${QRCodeID} is not ready to Export (trạng thái: ${status}).` });
                }
                if (normalizedActionType === 'Transfer' && status !== 'Borrowed') {
                    return res.status(400).json({ message: `The QR ${QRCodeID} must be in "Borrowed" status to Transfer (Status: ${status}).` });
                }
                if (normalizedActionType === 'Reject' && status !== 'Available') {
                    return res.status(400).json({ message: `The QR ${QRCodeID} is not available for Reject (Status: ${status}).` });
                }
                if (normalizedActionType === 'Return' && status !== 'Borrowed') {
                    return res.status(400).json({ message: `The QR ${QRCodeID} must be in "Borrowed" status to Return (Status: ${status}).` });
                }
            }

            const items = QRCodeDataList.map(qr => {
                const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());
                if (isNaN(QRIndex)) {
                    throw new Error(`Invalid QRIndex: ${qr.QRCodeID}`);
                }
                return {
                    UniqueKey: qr.UniqueKey,
                    QRIndex,
                    QRCodeID: qr.QRCodeID,
                    Quantity: qr.Quantity || 1
                };
            });

            const transactionId = await TransactionModel.createTransaction({
                ActionType: normalizedActionType,
                UserName,
                DepartmentName: DepartmentName || null,
                TransactionDate: new Date(),
                items,
                OperationCodeID,
                ToUserName,
                ToDepartmentName,
                ReturnLocation, // Truyền ReturnLocation cho TransactionModel
                Note
            });

            // Cập nhật Location trong QRCodeDetails cho Return
            if (normalizedActionType === 'Return') {
                const request = pool.request();
                QRCodeDataList.forEach((qr, index) => {
                    request.input(`QRCodeID${index}`, sql.NVarChar(150), qr.QRCodeID);
                });
                request.input('Location', sql.NVarChar(100), ReturnLocation);
                const placeholders = QRCodeDataList.map((_, index) => `@QRCodeID${index}`).join(',');
                await request.query(`
                UPDATE QRCodeDetails
                SET Location = @Location, Status = 'Available'
                WHERE QRCodeID IN (${placeholders})
            `);
            }
            // Cập nhật Set Location = NULL cho Export
            if (normalizedActionType === 'Export') {
                const request = pool.request();
                QRCodeDataList.forEach((qr, index) => {
                    request.input(`QRCodeID${index}`, sql.NVarChar(150), qr.QRCodeID);
                });
                const placeholders = QRCodeDataList.map((_, index) => `@QRCodeID${index}`).join(',');
                await request.query(`
        UPDATE QRCodeDetails
        SET Location = NULL, Status = 'Exported'
        WHERE QRCodeID IN (${placeholders})
      `);
            }

            return res.status(201).json({
                message: `${normalizedActionType} successfully.`,
                transactionId
            });
        } catch (error) {
            console.error("Lỗi tạo giao dịch:", { error: error.message, body: req.body });
            return res.status(500).json({
                message: "Server err.",
                error: error.message
            });
        }
    }

    static async getBorrowTransactionsByQRCodes(req, res) {
        try {
            let qrCodeIds = req.query.qrCodeIds || req.body.qrCodeIds;

            if (!qrCodeIds) {
                console.error('qrCodeIds không được cung cấp');
                return res.status(400).json({ success: false, message: 'QRCodeID list not provided.' });
            }

            if (typeof qrCodeIds === 'string') {
                qrCodeIds = [qrCodeIds];
            }

            if (!Array.isArray(qrCodeIds)) {
                console.error('qrCodeIds không phải mảng:', qrCodeIds);
                return res.status(400).json({ success: false, message: 'The QRCodeID list must be an array.' });
            }

            qrCodeIds = qrCodeIds.filter(id => id && typeof id === 'string').map(id => id.trim().toUpperCase());
            console.log('getBorrowTransactionsByQRCodes: Standardized qrCodeIds:', qrCodeIds);

            if (qrCodeIds.length === 0) {
                console.error('Danh sách QRCodeID rỗng sau khi chuẩn hóa');
                return res.status(400).json({ success: false, message: 'The QRCodeID list are empty.' });
            }

            const pool = await poolPromise;
            const request = pool.request();

            qrCodeIds.forEach((id, index) => {
                request.input(`QRCodeID${index}`, sql.NVarChar(150), id);
            });

            const placeholders = qrCodeIds.map((_, index) => `@QRCodeID${index}`).join(',');
            const query = `
                            WITH RankedTransactions AS (
                                SELECT 
                                    t.TransactionID,
                                    t.ActionType,
                                    t.UserName,
                                    t.DepartmentName,
                                    t.ToUserName,
                                    t.ToDepartmentName,
                                    t.TransactionDate,
                                    td.QRCodeID,
                                    ROW_NUMBER() OVER (
                                    PARTITION BY td.QRCodeID 
                                    ORDER BY t.TransactionDate DESC, t.TransactionID DESC
                                        ) AS rn
                                    FROM Transactions t
                                    JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
                                WHERE UPPER(TRIM(td.QRCodeID)) IN (${placeholders})
                                AND t.ActionType IN ('Borrow', 'Transfer', 'Export')
                                AND td.ReturnDate IS NULL
                                    )
                                SELECT 
                                    TransactionID,
                                    ActionType,
                                    CASE 
                                WHEN ActionType IN ('Borrow', 'Transfer') THEN ToUserName 
                                    ELSE UserName 
                                    END AS UserName,
                                CASE 
                                WHEN ActionType IN ('Borrow', 'Transfer') THEN ToDepartmentName 
                                    ELSE DepartmentName 
                                    END AS DepartmentName,
                                    QRCodeID,
                                    TransactionDate
                                FROM RankedTransactions
                                WHERE rn = 1
                                    ORDER BY TransactionDate DESC
                                    `;

            const result = await request.query(query);
            console.log('getBorrowTransactionsByQRCodes result:', result.recordset);

            const transactions = result.recordset.map(record => ({
                TransactionID: record.TransactionID,
                ActionType: record.ActionType,
                UserName: record.UserName,
                DepartmentName: record.DepartmentName,
                QRCodeID: record.QRCodeID,
                TransactionDate: record.TransactionDate
            }));

            return res.status(200).json({ success: true, data: transactions });
        } catch (error) {
            console.error('Lỗi trong getBorrowTransactionsByQRCodes:', error);
            return res.status(500).json({ success: false, message: 'Server error while retrieving transaction information.', error: error.message });
        }
    }

    static async handleBorrow(req, res) {
        try {
            const {
                ActionType,
                UserName,
                DepartmentName,  // Đảm bảo lấy đúng từ req.body
                QRCodeDataList = [],
                ToUserName,
                ToDepartmentName
            } = req.body;

            console.log('handleBorrow req.body:', req.body);

            // Kiểm tra dữ liệu đầu vào
            if (!UserName || !DepartmentName) {
                return res.status(400).json({ message: "Missing information about the performer or department." });
            }
            if (!ToUserName || !ToDepartmentName) {
                return res.status(400).json({ message: "Missing borrower or borrowing department information." });
            }
            if (!Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return res.status(400).json({ message: "No QR code to borrow." });
            }

            // Kiểm tra trạng thái QR code
            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());

                if (isNaN(QRIndex)) {
                    return res.status(400).json({ message: `Invalid QRIndex: ${QRCodeID}` });
                }

                const result = await pool.request()
                    .input('QRCodeID', sql.NVarChar(150), QRCodeID)
                    .query(`SELECT Status FROM QRCodeDetails WHERE QRCodeID = @QRCodeID`);

                if (result.recordset.length === 0) {
                    return res.status(404).json({ message: `The QR ${QRCodeID} is not exist.` });
                }

                if (result.recordset[0].Status !== 'Available') {
                    return res.status(400).json({ message: `The QR ${QRCodeID} not available for Borrowing (Status: ${result.recordset[0].Status}).` });
                }
            }

            // Chuẩn bị dữ liệu cho createTransaction
            const items = QRCodeDataList.map(qr => {
                const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());
                if (isNaN(QRIndex)) {
                    throw new Error(`QRIndex không hợp lệ: ${qr.QRCodeID}`);
                }
                return {
                    UniqueKey: qr.UniqueKey,
                    QRIndex,
                    QRCodeID: qr.QRCodeID,
                    Quantity: qr.Quantity || 1
                };
            });

            // Gọi createTransaction với dữ liệu đúng
            const transactionId = await TransactionModel.createTransaction({
                ActionType: 'Borrow',
                UserName,
                DepartmentName,  // Đảm bảo truyền DepartmentName từ req.body
                TransactionDate: new Date(),
                items,
                ToUserName,
                ToDepartmentName
            });

            return res.status(201).json({
                message: "Borrow successfully.",
                transactionId
            });
        } catch (error) {
            console.error("Lỗi xử lý giao dịch mượn:", error);
            return res.status(500).json({
                message: "Server err.",
                error: error.message
            });
        }
    }

    static async handleReturn(data) {
        let transaction;
        try {
            console.time('handleReturn');
            const { QRCodeDataList, UserName, DepartmentName, ReceiverName, ReceiverDeptID, ToDepartmentName, ReturnLocation } = data;
            console.log('handleReturn input:', { QRCodeDataList, UserName, DepartmentName, ReceiverName, ReceiverDeptID, ToDepartmentName, ReturnLocation });

            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "Danh sách QRCodeID không hợp lệ.", status: 400 };
            }

            if (!ReceiverName || !ReceiverDeptID || !ToDepartmentName || !ReturnLocation) {
                return { success: false, message: "Thiếu thông tin người nhận/bộ phận nhận/Vị trí trả về.", status: 400 };
            }

            const pool = await poolPromise;
            transaction = await pool.transaction();
            await transaction.begin();

            const errors = [];
            const transactionIds = new Set();
            const uniqueKeys = {};

            // --- Lấy trạng thái QR ---
            const qrCodeIds = QRCodeDataList.map(qr => qr.QRCodeID.trim());
            let request = transaction.request();
            qrCodeIds.forEach((id, i) => request.input(`QRCodeID${i}`, sql.NVarChar(150), id));
            const qrStatusResult = await request.query(`
            SELECT QRCodeID, Status
            FROM QRCodeDetails
            WHERE QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
        `);
            const qrStatuses = qrStatusResult.recordset.reduce((acc, r) => {
                acc[r.QRCodeID] = r.Status;
                return acc;
            }, {});

            // --- Lấy giao dịch mượn gần nhất ---
            request = transaction.request();
            qrCodeIds.forEach((id, i) => request.input(`QRCodeID${i}`, sql.NVarChar(150), id));
            const borrowResult = await request.query(`
            WITH RankedTransactions AS (
                SELECT 
                    t.TransactionID,
                    td.DetailID,
                    td.QRCodeID,
                    td.Quantity,
                    td.ReturnDate,
                    td.UniqueKey,
                    ROW_NUMBER() OVER (PARTITION BY td.QRCodeID ORDER BY td.BorrowDate DESC, t.TransactionID DESC) AS rn
                FROM Transactions t
                JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
                WHERE t.ActionType IN ('Borrow', 'Transfer', 'Export')
                AND td.QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
                AND td.ReturnDate IS NULL
            )
            SELECT TransactionID, DetailID, QRCodeID, Quantity, ReturnDate, UniqueKey
            FROM RankedTransactions
            WHERE rn = 1
        `);
            const borrowDetails = borrowResult.recordset.reduce((acc, r) => {
                acc[r.QRCodeID] = r;
                return acc;
            }, {});

            // --- Kiểm tra dữ liệu ---
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID.trim();
                const QRIndex = parseInt(QRCodeID.split('|').pop());
                const UniqueKey = qr.UniqueKey;

                if (isNaN(QRIndex)) {
                    errors.push({ QRCodeID, error: `QRIndex không hợp lệ: ${QRCodeID}` });
                    continue;
                }
                if (!qrStatuses[QRCodeID] || !['Borrowed', 'Exported'].includes(qrStatuses[QRCodeID])) {
                    errors.push({ QRCodeID, error: `Mã QR ${QRCodeID} không ở trạng thái Borrowed hoặc Exported.` });
                    continue;
                }
                if (!borrowDetails[QRCodeID]) {
                    errors.push({ QRCodeID, error: `Không tìm thấy giao dịch Borrow/Transfer/Export cho mã QR ${QRCodeID}.` });
                    continue;
                }

                transactionIds.add(borrowDetails[QRCodeID].TransactionID);
                uniqueKeys[UniqueKey] = uniqueKeys[UniqueKey] || { totalQuantity: 0 };
                uniqueKeys[UniqueKey].totalQuantity += qr.Quantity || 1;
            }

            if (transactionIds.size > 1) {
                await transaction.rollback();
                return { success: false, message: "Các mã QR thuộc nhiều giao dịch khác nhau.", status: 400 };
            }
            if (errors.length > 0) {
                await transaction.rollback();
                return { success: false, message: "Có lỗi khi xử lý trả.", errors, status: 400 };
            }

            const transactionId = [...transactionIds][0];

            // --- Cập nhật TransactionDetails ---
            const detailIds = Object.values(borrowDetails).map(d => d.DetailID);
            request = transaction.request();
            await request.query(`
            UPDATE TransactionDetails
            SET ReturnDate = GETDATE()
            WHERE DetailID IN (${detailIds.join(',')})
        `);

            // --- Cập nhật trạng thái QR ---
            request = transaction.request();
            qrCodeIds.forEach((id, i) => request.input(`QRCodeID${i}`, sql.NVarChar(150), id));
            await request.query(`
            UPDATE QRCodeDetails
            SET Status = 'Available'
            WHERE QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
        `);

            // --- Cập nhật Sample + Log ---
            for (const uniqueKey in uniqueKeys) {
                const { totalQuantity } = uniqueKeys[uniqueKey];
                const sample = await SampleModel.getSampleByUniqueKey(uniqueKey, transaction);
                if (sample) {
                    const currentBorrowed = sample.BorrowdQuantity ?? 0;
                    const currentExported = sample.Exported ?? 0;
                    const updatedQuantity = (sample.Quantity || 0) + totalQuantity;

                    let updatedBorrowed = currentBorrowed;
                    let updatedExported = currentExported;

                    if (QRCodeDataList.some(qr => qrStatuses[qr.QRCodeID] === 'Borrowed')) {
                        updatedBorrowed = Math.max(0, currentBorrowed - totalQuantity);
                    }
                    if (QRCodeDataList.some(qr => qrStatuses[qr.QRCodeID] === 'Exported')) {
                        updatedExported = Math.max(0, currentExported - totalQuantity);
                    }

                    await SampleModel.updateSampleByUniqueKey(uniqueKey, {
                        Quantity: updatedQuantity,
                        BorrowdQuantity: updatedBorrowed,
                        Exported: updatedExported,
                        Rejected: sample.Rejected ?? 0,
                        State: updatedQuantity > 0 ? 'Available' : 'Unavailable'
                    }, transaction);

                    for (const qr of QRCodeDataList) {
                        if (qr.UniqueKey === uniqueKey) {
                            await TransactionModel.logProductAction({
                                UniqueKey: uniqueKey,
                                ActionType: 'Return',
                                Quantity: qr.Quantity || 1,
                                TransactionID: transactionId,
                                UserName,
                                DepartmentName,       // phòng ban gốc
                                QRCodeID: qr.QRCodeID,
                                OperationCodeID: null,
                                DetailID: borrowDetails[qr.QRCodeID].DetailID,
                                ToUserName: ReceiverName,
                                ToDepartmentName      // lấy trực tiếp từ payload
                            }, transaction);
                        }
                    }

                }
            }
            // Mới: Cập nhật Location trong QRCodeDetails cho Return
            if (ReturnLocation) {
                const request = transaction.request();
                QRCodeDataList.forEach((qr, index) => {
                    request.input(`QRCodeID${index}`, sql.NVarChar(150), qr.QRCodeID);
                });
                request.input('Location', sql.NVarChar(100), ReturnLocation);
                const placeholders = QRCodeDataList.map((_, index) => `@QRCodeID${index}`).join(',');
                await request.query(`
                        UPDATE QRCodeDetails
                        SET Location = @Location, Status = 'Available'
                        WHERE QRCodeID IN (${placeholders})
                    `);
                console.log(`Updated Location to ${ReturnLocation} for QR codes.`);
            }

            await transaction.commit();
            console.timeEnd('handleReturn');
            return {
                success: true,
                message: "Returned successfully.",
                data: QRCodeDataList.map(qr => ({ QRCodeID: qr.QRCodeID, message: "Returned." }))
            };
        } catch (error) {
            console.error('Lỗi trong handleReturn:', error);
            if (transaction) await transaction.rollback();
            console.timeEnd('handleReturn');
            return { success: false, message: "Có lỗi khi xử lý trả.", errors: [{ error: error.message }], status: 500 };
        }
    }


    static async handleExport(data) {
        try {
            const { UniqueKey, Quantity, QRCodeDataList, UserName, DepartmentName, OperationCodeID } = data;
            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "Danh sách QRCodeID không hợp lệ." };
            }
            if (!OperationCodeID) {
                return { success: false, message: "Thiếu lý do xuất kho (OperationCodeID)." };
            }

            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());
                if (isNaN(QRIndex)) {
                    return { success: false, message: `QRIndex không hợp lệ: ${QRCodeID}` };
                }

                const result = await pool.request()
                    .input('QRCodeID', sql.NVarChar(150), QRCodeID)
                    .query(`
                        SELECT Status
                        FROM QRCodeDetails
                        WHERE QRCodeID = @QRCodeID
                    `);

                if (result.recordset.length === 0) {
                    return { success: false, message: `Mã QR ${QRCodeID} không tồn tại.` };
                }

                const status = result.recordset[0].Status;
                if (status !== 'Available') {
                    return { success: false, message: `Mã QR ${QRCodeID} không khả dụng để xuất kho (trạng thái: ${status}).` };
                }
            }

            const transactionId = await TransactionModel.createTransaction({
                ActionType: 'Export',
                UserName,
                DepartmentName,
                TransactionDate: new Date(),
                items: QRCodeDataList.map(qr => ({
                    UniqueKey,
                    QRIndex: parseInt(qr.QRCodeID.split("|").pop()),
                    QRCodeID: qr.QRCodeID,
                    Quantity: qr.Quantity || 1
                })),
                OperationCodeID,
                ToUserName
            });

            return { success: true, message: "Exported successfully.", transactionId };
        } catch (error) {
            console.error("Lỗi xử lý xuất kho:", error);
            return { success: false, message: error.message || "Lỗi máy chủ khi xuất kho." };
        }
    }

    static async handleReject(data) {
        try {
            const { UniqueKey, Quantity, QRCodeDataList, UserName, DepartmentName, OperationCodeID } = data;
            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "Danh sách QRCodeID không hợp lệ." };
            }
            if (!OperationCodeID) {
                return { success: false, message: "Thiếu lý do báo hủy (OperationCodeID)." };
            }

            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());
                if (isNaN(QRIndex)) {
                    return { success: false, message: `QRIndex không hợp lệ: ${QRCodeID}` };
                }

                const result = await pool.request()
                    .input('QRCodeID', sql.NVarChar(150), QRCodeID)
                    .query(`SELECT Status FROM QRCodeDetails WHERE QRCodeID = @QRCodeID`);

                if (result.recordset.length === 0) {
                    return { success: false, message: `Mã QR ${QRCodeID} không tồn tại.` };
                }

                const status = result.recordset[0].Status;
                if (status !== 'Available') {
                    return { success: false, message: `Mã QR ${QRCodeID} không khả dụng để báo hủy (trạng thái: ${status}).` };
                }
            }

            const transactionId = await TransactionModel.createTransaction({
                ActionType: 'Reject',
                UserName,
                DepartmentName,
                TransactionDate: new Date(),
                items: QRCodeDataList.map(qr => ({
                    UniqueKey,
                    QRIndex: parseInt(qr.QRCodeID.split("|").pop()),
                    QRCodeID: qr.QRCodeID,
                    Quantity: qr.Quantity || 1
                })),
                OperationCodeID
            });

            return { success: true, message: "Rejected successfully.", transactionId };
        } catch (error) {
            console.error("Lỗi xử lý báo hủy:", error);
            return { success: false, message: error.message || "Lỗi máy chủ khi báo hủy." };
        }
    }

    static async handleTransfer(data) {
        try {
            const { UniqueKey, Quantity, QRCodeDataList, UserName, DepartmentName, ReceiverName, ToDepartment } = data;
            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "List of invalid QR codes." };
            }
            if (!ToDepartment) {
                return { success: false, message: "Missing receiving department." };
            }
            if (!ReceiverName) {
                return { success: false, message: "Missing receiver (ToDepartment)." };
            }

            const pool = await poolPromise;
            const transaction = await pool.transaction();

            try {
                await transaction.begin();

                const qrCodeIds = QRCodeDataList.map(qr => qr.QRCodeID);
                for (const qr of QRCodeDataList) {
                    const QRCodeID = qr.QRCodeID;
                    const QRIndex = parseInt(qr.QRCodeID?.split("|").pop());
                    if (isNaN(QRIndex)) {
                        await transaction.rollback();
                        return { success: false, message: `QRIndex không hợp lệ: ${QRCodeID}` };
                    }

                    const result = await pool.request()
                        .input('QRCodeID', sql.NVarChar(150), QRCodeID)
                        .query(`SELECT Status FROM QRCodeDetails WHERE QRCodeID = @QRCodeID`);

                    if (result.recordset.length === 0) {
                        await transaction.rollback();
                        return { success: false, message: `Mã QR ${QRCodeID} không tồn tại.` };
                    }

                    const status = result.recordset[0].Status;
                    if (status !== 'Borrowed') {
                        await transaction.rollback();
                        return { success: false, message: `Mã QR ${QRCodeID} phải ở trạng thái 'Borrowed' để chuyển giao (trạng thái: ${status}).` };
                    }
                }

                const request = pool.request();
                const params = qrCodeIds.map((id, i) => `@QRCodeID${i}`);
                const query = `
                    SELECT TOP 1 WITH TIES
                        t.UserName AS BorrowerID,
                        t.DepartmentName,
                        t.ToUserName,
                        t.ToDepartmentName,
                        t.TransactionDate
                    FROM Transactions t
                    JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
                    WHERE t.ActionType IN ('Borrow', 'Transfer')
                    AND td.QRCodeID IN (${params.join(',')})
                    AND td.ReturnDate IS NULL
                    ORDER BY td.BorrowDate DESC
                `;
                qrCodeIds.forEach((id, i) => {
                    request.input(`QRCodeID${i}`, sql.NVarChar(150), id);
                });

                const borrowResult = await request.query(query);
                if (borrowResult.recordset.length === 0) {
                    await transaction.rollback();
                    return { success: false, message: "Cannot find the transaction related to QR." };
                }

                const uniqueBorrowers = new Set(borrowResult.recordset.map(item => item.ToUserName || item.BorrowerID));
                if (uniqueBorrowers.size > 1) {
                    await transaction.rollback();
                    return { success: false, message: "Các mã QR thuộc về nhiều người mượn khác nhau. Vui lòng chọn lại." };
                }

                const deptResult = await transaction.request()
                    .input('DepartmentName', sql.Int, ToDepartment)
                    .query(`SELECT DepartmentName FROM Departments WHERE DepartmentName = @DepartmentName`);
                const toDepartmentName = deptResult.recordset[0]?.DepartmentName || null;

                const transactionId = await TransactionModel.createTransaction({
                    ActionType: 'Transfer',
                    UserName,
                    DepartmentName,
                    TransactionDate: new Date(),
                    items: QRCodeDataList.map(qr => ({
                        UniqueKey,
                        QRIndex: parseInt(qr.QRCodeID.split("|").pop()),
                        QRCodeID: qr.QRCodeID,
                        Quantity: qr.Quantity || 1
                    })),
                    ToUserName: ReceiverName,
                    ToDepartmentName: toDepartmentName
                }, transaction);

                await transaction.commit();
                return { success: true, message: "Successfully.", transactionId };
            } catch (error) {
                await transaction.rollback();
                console.error("Lỗi trong handleTransfer:", error);
                throw error;
            }
        } catch (error) {
            console.error("Lỗi xử lý chuyển giao:", error);
            return { success: false, message: error.message || "Fail when Transfer." };
        }
    }

    static async getAllTransactions(req, res) {
        try {
            const transactions = await TransactionModel.getAllTransactions();
            return res.status(200).json(transactions);
        } catch (error) {
            console.error("Lỗi lấy danh sách giao dịch:", error);
            return res.status(500).json({ message: "Failed.", error });
        }
    }

    static async getTransactionsByUniqueKey(req, res) {
        try {
            const { uniqueKey } = req.params;
            const transactions = await TransactionModel.getTransactionsByUniqueKey(uniqueKey);
            return res.status(200).json(transactions);
        } catch (error) {
            console.error("Fail to get Transaction according to UniqueKey:", error);
            return res.status(500).json({ message: "Failed.", error });
        }
    }

    static async deleteTransaction(req, res) {
        try {
            const { id } = req.params;
            const deleted = await TransactionModel.deleteTransaction(id);
            if (deleted) {
                return res.status(200).json({ message: "Xóa giao dịch thành công." });
            } else {
                return res.status(404).json({ message: "Không tìm thấy giao dịch." });
            }
        } catch (error) {
            console.error("Lỗi xóa giao dịch:", error);
            return res.status(500).json({ message: "Failed.", error });
        }
    }

    static async getProductLogs(req, res) {
        try {
            const { uniqueKey, qrCode, startDate, endDate, actionType } = req.query;
            const pool = await poolPromise;
            const request = pool.request();

            let query = `
                SELECT 
                    pl.UniqueKey,
                    pl.ActionType,
                    pl.Quantity,
                    pl.Date,
                    pl.UserName AS Name,
                    pl.DepartmentName AS Department,
                    pl.QRCodeID AS QRCode,
                    oc.ReasonDetail AS Reason,
                    pl.ToUserName,
                    pl.ToDepartmentName,
                    pl.Note AS Note
                FROM ProductLogs pl
                LEFT JOIN OperationCodes oc ON pl.OperationCodeID = oc.ReasonID
            `;

            let conditions = [];
            if (uniqueKey) {
                conditions.push(`pl.UniqueKey LIKE @UniqueKey`);
                request.input('UniqueKey', sql.NVarChar, `%${uniqueKey}%`);
            }
            if (qrCode) {
                conditions.push(`pl.QRCodeID = @QRCodeID`);
                request.input('QRCodeID', sql.NVarChar, qrCode);
            }
            if (startDate && endDate) {
                const parsedStartDate = new Date(startDate);
                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
                    console.warn('Invalid date parameters:', { startDate, endDate });
                    return res.status(400).json({ message: 'Ngày tháng không hợp lệ.' });
                }
                parsedEndDate.setHours(23, 59, 59, 999);
                console.log('Parsed Dates:', { parsedStartDate, parsedEndDate });
                conditions.push(`pl.Date BETWEEN @StartDate AND @EndDate`);
                request.input('StartDate', sql.DateTime, parsedStartDate);
                request.input('EndDate', sql.DateTime, parsedEndDate);
            }
            if (actionType) {
                conditions.push(`pl.ActionType = @ActionType`);
                request.input('ActionType', sql.NVarChar, actionType);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY pl.Date DESC`;

            const result = await request.query(query);
            return res.status(200).json(result.recordset);
        } catch (error) {
            console.error('Failed to get Product logs:', error);
            return res.status(500).json({ message: 'Failed.', error: error.message });
        }
    }

    static async getQRCodeStatus(req, res) {
        try {
            const { qrCodeId } = req.query;

            if (!qrCodeId) {
                return res.status(400).json({ success: false, message: 'QRCodeID does not exist.' });
            }

            const data = await TransactionModel.getQRCodeStatus(qrCodeId.trim().toUpperCase());

            if (!data) {
                return res.status(404).json({ success: false, message: `The QR ${qrCodeId} is not exist.` });
            }

            return res.status(200).json({ success: true, data });
        } catch (error) {
            console.error('Error on getQRCodeStatus:', error);
            return res.status(500).json({ success: false, message: 'Fail to get status of QRCode.', error: error.message });
        }
    }
}

module.exports = TransactionController;