const TransactionModel = require('../models/TransactionModel');
const SampleModel = require('../models/SampleModel');
const { sql, poolPromise } = require('../config/db');

class TransactionController {
    static async createTransaction(req, res) {
        try {
            const {
                ActionType,
                UserName,
                DepartmentID,
                QRCodeDataList = [],
                OperationCodeID,
                ToUserName,
                ToDepartmentName
            } = req.body;

            console.log('createTransaction req.body:', req.body); // Log để kiểm tra dữ liệu nhận được

            const actionTypeMap = {
                'Mượn': 'Borrow',
                'Trả': 'Return',
                'Chuyển giao': 'Transfer',
                'Xuất kho': 'Export'
            };
            const normalizedActionType = actionTypeMap[ActionType] || ActionType;
            if (!['Borrow', 'Return', 'Transfer', 'Export'].includes(normalizedActionType)) {
                return res.status(400).json({ message: `Loại giao dịch không hợp lệ: ${ActionType}` });
            }

            if (!Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return res.status(400).json({ message: "Không có QR code để giao dịch." });
            }
            if (!UserName || !DepartmentID) {
                return res.status(400).json({ message: "Thiếu thông tin người thực hiện hoặc bộ phận." });
            }
            if (normalizedActionType === 'Borrow' && (!ToUserName || !ToDepartmentName)) {
                return res.status(400).json({ message: "Thiếu thông tin người mượn hoặc bộ phận mượn." });
            }
            if (normalizedActionType === 'Export' && !OperationCodeID) {
                return res.status(400).json({ message: "Thiếu lý do xuất kho (OperationCodeID)." });
            }
            if ((normalizedActionType === 'Return' || normalizedActionType === 'Transfer') && (!ToUserName || !ToDepartmentName)) {
                return res.status(400).json({ message: "Thiếu thông tin người nhận hoặc bộ phận nhận." });
            }

            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("-").pop());

                if (isNaN(QRIndex)) {
                    return res.status(400).json({ message: `QRIndex không hợp lệ: ${QRCodeID}` });
                }

                const result = await pool.request()
                    .input('QRCodeID', sql.NVarChar(150), QRCodeID)
                    .query(`SELECT Status FROM QRCodeDetails WHERE QRCodeID = @QRCodeID`);

                if (result.recordset.length === 0) {
                    return res.status(404).json({ message: `Mã QR ${QRCodeID} không tồn tại.` });
                }

                const status = result.recordset[0].Status;
                if (normalizedActionType === 'Borrow' && status !== 'Available') {
                    return res.status(400).json({ message: `Mã QR ${QRCodeID} không khả dụng để mượn (trạng thái: ${status}).` });
                }
                if (normalizedActionType === 'Export' && status !== 'Available') {
                    return res.status(400).json({ message: `Mã QR ${QRCodeID} không khả dụng để xuất kho (trạng thái: ${status}).` });
                }
                if (normalizedActionType === 'Transfer' && status !== 'Borrowed') {
                    return res.status(400).json({ message: `Mã QR ${QRCodeID} phải ở trạng thái 'Borrowed' để chuyển giao (trạng thái: ${status}).` });
                }
            }

            const items = QRCodeDataList.map(qr => {
                const QRIndex = parseInt(qr.QRCodeID?.split("-").pop());
                if (isNaN(QRIndex)) {
                    throw new Error(`QRIndex không hợp lệ: ${qr.QRCodeID}`);
                }
                return {
                    ItemCode: qr.ItemCode,
                    QRIndex,
                    QRCodeID: qr.QRCodeID,
                    QRCodeData: qr.QRCodeData || null,
                    Quantity: qr.Quantity || 1
                };
            });

            const transactionId = await TransactionModel.createTransaction({
                ActionType: normalizedActionType,
                UserName, // UserName từ user hiện tại
                DepartmentID, // DepartmentID từ user hiện tại
                TransactionDate: new Date(),
                items,
                OperationCodeID,
                ToUserName, // ToUserName từ người mượn
                ToDepartmentName // ToDepartmentName từ người mượn
            });

            return res.status(201).json({
                message: `${normalizedActionType} thành công.`,
                transactionId
            });
        } catch (error) {
            console.error("Lỗi tạo giao dịch:", error);
            return res.status(500).json({
                message: "Lỗi máy chủ.",
                error: error.message
            });
        }
    }

    static async getBorrowTransactionsByQRCodes(req, res) {
        try {
            let qrCodeIds = req.query.qrCodeIds || req.body.qrCodeIds;

            if (!qrCodeIds) {
                console.error('qrCodeIds không được cung cấp');
                return res.status(400).json({ success: false, message: 'Danh sách QRCodeID không được cung cấp.' });
            }

            if (typeof qrCodeIds === 'string') {
                qrCodeIds = [qrCodeIds];
            }

            if (!Array.isArray(qrCodeIds)) {
                console.error('qrCodeIds không phải mảng:', qrCodeIds);
                return res.status(400).json({ success: false, message: 'Danh sách QRCodeID phải là mảng.' });
            }

            qrCodeIds = qrCodeIds.filter(id => id && typeof id === 'string').map(id => id.trim().toUpperCase());
            console.log('getBorrowTransactionsByQRCodes: Standardized qrCodeIds:', qrCodeIds);

            if (qrCodeIds.length === 0) {
                console.error('Danh sách QRCodeID rỗng sau khi chuẩn hóa');
                return res.status(400).json({ success: false, message: 'Danh sách QRCodeID rỗng.' });
            }

            const pool = await poolPromise;
            const request = pool.request();

            qrCodeIds.forEach((id, index) => {
                request.input(`QRCodeID${index}`, sql.NVarChar(150), id);
            });

            const placeholders = qrCodeIds.map((_, index) => `@QRCodeID${index}`).join(',');
            const query = `
                SELECT DISTINCT
                    t.TransactionID,
                    t.ActionType,
                    t.UserName,
                    t.DepartmentID,
                    d.DepartmentName,
                    t.ToUserName,
                    t.ToDepartmentName,
                    t.TransactionDate,
                    td.QRCodeID
                FROM Transactions t
                JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
                LEFT JOIN Departments d ON t.DepartmentID = d.DepartmentID
                WHERE UPPER(TRIM(td.QRCodeID)) IN (${placeholders})
                AND t.ActionType IN ('Borrow', 'Transfer')
                AND td.ReturnDate IS NULL
                AND td.BorrowDate = (
                    SELECT MAX(td2.BorrowDate)
                    FROM TransactionDetails td2
                    JOIN Transactions t2 ON t2.TransactionID = td2.TransactionID
                    WHERE UPPER(TRIM(td2.QRCodeID)) = UPPER(TRIM(td.QRCodeID))
                    AND t2.ActionType IN ('Borrow', 'Transfer')
                    AND td2.ReturnDate IS NULL
                )
                ORDER BY t.TransactionDate DESC
            `;

            const result = await request.query(query);
            console.log('getBorrowTransactionsByQRCodes result:', result.recordset);

            const transactions = result.recordset.map(record => ({
                TransactionID: record.TransactionID,
                ActionType: record.ActionType,
                UserName: record.ActionType === 'Borrow' ? record.ToUserName : record.ToUserName || record.UserName, // Lấy ToUserName cho Borrow
                DepartmentName: record.ActionType === 'Borrow' ? record.ToDepartmentName : record.ToDepartmentName || record.DepartmentName, // Lấy ToDepartmentName cho Borrow
                QRCodeID: record.QRCodeID,
                TransactionDate: record.TransactionDate
            }));

            return res.status(200).json({ success: true, data: transactions });
        } catch (error) {
            console.error('Lỗi trong getBorrowTransactionsByQRCodes:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thông tin giao dịch.', error: error.message });
        }
    }

    // static async handleBorrow(data) {
    //     try {
    //         const { ItemCode, Quantity, QRCodeDataList, UserName, DepartmentID } = data;
    //         if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
    //             return { success: false, message: "Danh sách QRCodeID không hợp lệ." };
    //         }

    //         const pool = await poolPromise;
    //         for (const qr of QRCodeDataList) {
    //             const QRCodeID = qr.QRCodeID;
    //             const QRIndex = parseInt(qr.QRCodeID?.split("-").pop());
    //             if (isNaN(QRIndex)) {
    //                 return { success: false, message: `QRIndex không hợp lệ: ${QRCodeID}` };
    //             }

    //             const result = await pool.request()
    //                 .input('QRCodeID', sql.NVarChar(150), QRCodeID)
    //                 .query(`
    //                     SELECT Status
    //                     FROM QRCodeDetails
    //                     WHERE QRCodeID = @QRCodeID
    //                 `);

    //             if (result.recordset.length === 0) {
    //                 return { success: false, message: `Mã QR ${QRCodeID} không tồn tại.` };
    //             }

    //             const status = result.recordset[0].Status;
    //             if (status !== 'Available') {
    //                 return { success: false, message: `Mã QR ${QRCodeID} không khả dụng để mượn (trạng thái: ${status}).` };
    //             }
    //         }

    //         const transactionId = await TransactionModel.createTransaction({
    //             ActionType: 'Borrow',
    //             UserName,
    //             DepartmentID,
    //             TransactionDate: new Date(),
    //             items: QRCodeDataList.map(qr => ({
    //                 ItemCode,
    //                 QRIndex: parseInt(qr.QRCodeID.split("-").pop()),
    //                 QRCodeID: qr.QRCodeID,
    //                 QRCodeData: qr.QRCodeData || null,
    //                 Quantity: qr.Quantity || 1
    //             }))
    //         });

    //         return { success: true, message: "Mượn sản phẩm thành công.", transactionId };
    //     } catch (error) {
    //         console.error("Lỗi xử lý mượn:", error);
    //         return { success: false, message: error.message || "Lỗi máy chủ khi mượn sản phẩm." };
    //     }
    // }
    static async handleBorrow(data) {
        try {
            const { ItemCode, Quantity, QRCodeDataList, UserName, DepartmentID, ToUserName, ToDepartmentName } = data;
            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "Danh sách QRCodeID không hợp lệ." };
            }
            if (!ToUserName || !ToDepartmentName) {
                return { success: false, message: "Thiếu thông tin người mượn hoặc bộ phận mượn." };
            }

            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("-").pop());
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
                    return { success: false, message: `Mã QR ${QRCodeID} không khả dụng để mượn (trạng thái: ${status}).` };
                }
            }

            const transactionId = await TransactionModel.createTransaction({
                ActionType: 'Borrow',
                UserName, // UserName từ user hiện tại
                DepartmentID, // DepartmentID từ user hiện tại
                TransactionDate: new Date(),
                items: QRCodeDataList.map(qr => ({
                    ItemCode,
                    QRIndex: parseInt(qr.QRCodeID.split("-").pop()),
                    QRCodeID: qr.QRCodeID,
                    QRCodeData: qr.QRCodeData || null,
                    Quantity: qr.Quantity || 1
                })),
                ToUserName, // Lưu thông tin người mượn
                ToDepartmentName // Lưu thông tin bộ phận người mượn
            });

            return { success: true, message: "Mượn sản phẩm thành công.", transactionId };
        } catch (error) {
            console.error("Lỗi xử lý mượn:", error);
            return { success: false, message: error.message || "Lỗi máy chủ khi mượn sản phẩm." };
        }
    }
    static async handleReturn(data) {
        let transaction;
        try {
            console.time('handleReturn');
            const { QRCodeDataList, UserName, DepartmentID, ReceiverName, ReceiverDeptID } = data;
            console.log('handleReturn input:', { QRCodeDataList, UserName, DepartmentID, ReceiverName, ReceiverDeptID });

            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                console.error('Danh sách QRCodeID không hợp lệ:', QRCodeDataList);
                return { success: false, message: "Danh sách QRCodeID không hợp lệ.", status: 400 };
            }

            if (!ReceiverName || !ReceiverDeptID) {
                console.error('Thiếu thông tin người nhận hoặc bộ phận nhận:', { ReceiverName, ReceiverDeptID });
                return { success: false, message: "Thiếu thông tin người nhận hoặc bộ phận nhận.", status: 400 };
            }

            console.log('Bắt đầu transaction trong handleReturn');
            const pool = await poolPromise;
            transaction = await pool.transaction();
            await transaction.begin();

            const success = [];
            const errors = [];
            const transactionIds = new Set();

            // Batch kiểm tra trạng thái QRCodeDetails
            const qrCodeIds = QRCodeDataList.map(qr => qr.QRCodeID.trim().toUpperCase());
            console.log('qrCodeIds for query:', qrCodeIds);
            let request = transaction.request();
            qrCodeIds.forEach((id, i) => request.input(`QRCodeID${i}`, sql.NVarChar(150), id));
            console.time('qrStatusQuery');
            const qrStatusResult = await request.query(`
                SELECT QRCodeID, Status
                FROM QRCodeDetails
                WHERE QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
            `);
            console.timeEnd('qrStatusQuery');
            const qrStatuses = qrStatusResult.recordset.reduce((acc, record) => {
                acc[record.QRCodeID] = record.Status;
                return acc;
            }, {});
            console.log('qrStatuses:', qrStatuses);

            // Batch kiểm tra giao dịch mượn
            request = transaction.request();
            qrCodeIds.forEach((id, i) => request.input(`QRCodeID${i}`, sql.NVarChar(150), id));
            console.time('borrowQuery');
            const borrowResult = await request.query(`
                WITH RankedTransactions AS (
                    SELECT 
                        t.TransactionID,
                        td.DetailID,
                        td.QRCodeID,
                        td.Quantity,
                        td.ReturnDate,
                        td.ItemCode,
                        ROW_NUMBER() OVER (PARTITION BY td.QRCodeID ORDER BY td.BorrowDate DESC, t.TransactionID DESC) AS rn
                    FROM Transactions t
                    JOIN TransactionDetails td ON t.TransactionID = td.TransactionID
                    WHERE t.ActionType IN ('Borrow', 'Transfer')
                    AND td.QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
                    AND td.ReturnDate IS NULL
                )
                SELECT TransactionID, DetailID, QRCodeID, Quantity, ReturnDate, ItemCode
                FROM RankedTransactions
                WHERE rn = 1
            `);
            console.timeEnd('borrowQuery');
            const borrowDetails = borrowResult.recordset.reduce((acc, record) => {
                acc[record.QRCodeID] = record;
                return acc;
            }, {});
            console.log('borrowDetails:', borrowDetails);

            // Kiểm tra tính hợp lệ
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID.trim().toUpperCase();
                const QRIndex = parseInt(QRCodeID.split('-').pop());
                if (isNaN(QRIndex)) {
                    errors.push({ QRCodeID, error: `QRIndex không hợp lệ: ${QRCodeID}` });
                    continue;
                }
                if (!qrStatuses[QRCodeID] || qrStatuses[QRCodeID] !== 'Borrowed') {
                    errors.push({ QRCodeID, error: `Mã QR ${QRCodeID} không ở trạng thái Borrowed.` });
                    continue;
                }
                if (!borrowDetails[QRCodeID]) {
                    errors.push({ QRCodeID, error: `Không tìm thấy giao dịch Borrow hoặc Transfer cho mã QR ${QRCodeID}.` });
                    continue;
                }
                transactionIds.add(borrowDetails[QRCodeID].TransactionID);
            }

            if (transactionIds.size > 1) {
                await transaction.rollback();
                console.timeEnd('handleReturn');
                return { success: false, message: "Các mã QR thuộc nhiều giao dịch khác nhau. Vui lòng chọn lại.", status: 400 };
            }
            if (errors.length > 0) {
                await transaction.rollback();
                console.timeEnd('handleReturn');
                return { success: false, message: "Có lỗi khi xử lý trả.", errors, status: 400 };
            }

            const transactionId = [...transactionIds][0];

            // Batch cập nhật ReturnDate và QRCodeDetails
            const detailIds = Object.values(borrowDetails).map(d => d.DetailID);
            request = transaction.request();
            console.time('updateTransactionDetails');
            await request.query(`
                UPDATE TransactionDetails
                SET ReturnDate = GETDATE()
                WHERE DetailID IN (${detailIds.join(',')})
            `);
            console.timeEnd('updateTransactionDetails');
            request = transaction.request();
            qrCodeIds.forEach((id, i) => request.input(`QRCodeID${i}`, sql.NVarChar(150), id));
            console.time('updateQRCodeDetails');
            await request.query(`
                UPDATE QRCodeDetails
                SET Status = 'Available'
                WHERE QRCodeID IN (${qrCodeIds.map((_, i) => `@QRCodeID${i}`).join(',')})
            `);
            console.timeEnd('updateQRCodeDetails');

            // Lấy DepartmentName và ToDepartmentName
            request = transaction.request();
            request.input('DepartmentID', sql.Int, DepartmentID);
            request.input('ReceiverDeptID', sql.Int, ReceiverDeptID);
            console.time('deptQuery');
            const deptResult = await request.query(`
                SELECT DepartmentID, DepartmentName
                FROM Departments
                WHERE DepartmentID IN (@DepartmentID, @ReceiverDeptID)
            `);
            console.timeEnd('deptQuery');
            const deptMap = deptResult.recordset.reduce((acc, d) => {
                acc[d.DepartmentID] = d.DepartmentName;
                return acc;
            }, {});
            console.log('deptMap:', deptMap);

            // Batch ghi log và cập nhật Samples
            console.time('logAndSampleUpdate');
            const itemCodes = {};
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID.trim().toUpperCase();
                const detail = borrowDetails[QRCodeID];
                await TransactionModel.logProductAction({
                    ItemCode: detail.ItemCode,
                    ActionType: 'Return',
                    Quantity: detail.Quantity,
                    TransactionID: transactionId,
                    UserName,
                    DepartmentID,
                    QRCodeID,
                    DetailID: detail.DetailID,
                    ToUserName: ReceiverName,
                    ToDepartmentName: deptMap[ReceiverDeptID]
                }, transaction);

                if (!itemCodes[detail.ItemCode]) {
                    itemCodes[detail.ItemCode] = { totalQuantity: 0, detailIds: [] };
                }
                itemCodes[detail.ItemCode].totalQuantity += detail.Quantity;
                itemCodes[detail.ItemCode].detailIds.push(detail.DetailID);
            }

            for (const itemCode in itemCodes) {
                const { totalQuantity } = itemCodes[itemCode];
                const sample = await SampleModel.getSampleByItemCode(itemCode, transaction);
                if (sample) {
                    // Kiểm tra BorrowdQuantity
                    const currentBorrowedQuantity = sample.BorrowdQuantity ?? 0;
                    const updatedQuantity = (sample.Quantity || 0) + totalQuantity;
                    const updatedBorrowedQuantity = Math.max(0, currentBorrowedQuantity - totalQuantity);
                    const updatedState = updatedQuantity > 0 ? 'Available' : 'Unavailable';
                    await SampleModel.updateSampleByItemCode(itemCode, {
                        Quantity: updatedQuantity,
                        BorrowdQuantity: updatedBorrowedQuantity,
                        State: updatedState
                    }, transaction);
                }
            }
            console.timeEnd('logAndSampleUpdate');

            console.log('Chuẩn bị commit transaction, success:', success, 'errors:', errors);
            await transaction.commit();
            console.log('Transaction committed trong handleReturn');
            console.timeEnd('handleReturn');

            return { success: true, message: "Trả thành công.", data: QRCodeDataList.map(qr => ({ QRCodeID: qr.QRCodeID, message: "Trả thành công." })) };
        } catch (error) {
            console.error('Lỗi trong handleReturn:', error);
            if (transaction) await transaction.rollback();
            console.timeEnd('handleReturn');
            return { success: false, message: "Có lỗi khi xử lý trả.", errors: [{ error: error.message }], status: 500 };
        }
    }

    static async handleExport(data) {
        try {
            const { ItemCode, Quantity, QRCodeDataList, UserName, DepartmentID, OperationCodeID } = data;
            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "Danh sách QRCodeID không hợp lệ." };
            }
            if (!OperationCodeID) {
                return { success: false, message: "Thiếu lý do xuất kho (OperationCodeID)." };
            }

            const pool = await poolPromise;
            for (const qr of QRCodeDataList) {
                const QRCodeID = qr.QRCodeID;
                const QRIndex = parseInt(qr.QRCodeID?.split("-").pop());
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
                DepartmentID,
                TransactionDate: new Date(),
                items: QRCodeDataList.map(qr => ({
                    ItemCode,
                    QRIndex: parseInt(qr.QRCodeID.split("-").pop()),
                    QRCodeID: qr.QRCodeID,
                    QRCodeData: qr.QRCodeData || null,
                    Quantity: qr.Quantity || 1
                })),
                OperationCodeID
            });

            return { success: true, message: "Xuất kho thành công.", transactionId };
        } catch (error) {
            console.error("Lỗi xử lý xuất kho:", error);
            return { success: false, message: error.message || "Lỗi máy chủ khi xuất kho." };
        }
    }

    static async handleTransfer(data) {
        try {
            const { ItemCode, Quantity, QRCodeDataList, UserName, DepartmentID, ReceiverName, ToDepartment } = data;
            if (!QRCodeDataList || !Array.isArray(QRCodeDataList) || QRCodeDataList.length === 0) {
                return { success: false, message: "Danh sách mã QR code không hợp lệ." };
            }
            if (!ToDepartment) {
                return { success: false, message: "Thiếu bộ phận nhận (ToDepartment)." };
            }
            if (!ReceiverName) {
                return { success: false, message: "Thiếu tên người nhận (ReceiverName)." };
            }

            const pool = await poolPromise;
            const transaction = await pool.transaction();

            try {
                await transaction.begin();

                const qrCodeIds = QRCodeDataList.map(qr => qr.QRCodeID);
                for (const qr of QRCodeDataList) {
                    const QRCodeID = qr.QRCodeID;
                    const QRIndex = parseInt(qr.QRCodeID?.split("-").pop());
                    if (isNaN(QRIndex)) {
                        await transaction.rollback();
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
                        t.DepartmentID,
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
                    return { success: false, message: "Không tìm thấy giao dịch mượn hoặc chuyển giao cho các mã QR." };
                }

                const uniqueBorrowers = new Set(borrowResult.recordset.map(item => item.ToUserName || item.BorrowerID));
                if (uniqueBorrowers.size > 1) {
                    await transaction.rollback();
                    return { success: false, message: "Các mã QR thuộc về nhiều người mượn khác nhau. Vui lòng chọn lại." };
                }

                const effectiveUserName = borrowResult.recordset[0].ToUserName || borrowResult.recordset[0].BorrowerID;
                const effectiveDepartmentID = borrowResult.recordset[0].DepartmentID;

                const deptResult = await transaction.request()
                    .input('DepartmentID', sql.Int, ToDepartment)
                    .query(`SELECT DepartmentName FROM Departments WHERE DepartmentID = @DepartmentID`);
                const toDepartmentName = deptResult.recordset[0]?.DepartmentName || null;

                const transactionId = await TransactionModel.createTransaction({
                    ActionType: 'Transfer',
                    UserName: effectiveUserName,
                    DepartmentID: effectiveDepartmentID,
                    TransactionDate: new Date(),
                    items: QRCodeDataList.map(qr => ({
                        ItemCode,
                        QRIndex: parseInt(qr.QRCodeID.split("-").pop()),
                        QRCodeID: qr.QRCodeID,
                        Quantity: qr.Quantity || 1
                    })),
                    ToUserName: ReceiverName,
                    ToDepartmentName: toDepartmentName
                }, transaction);

                await transaction.commit();
                return { success: true, message: "Chuyển giao thành công.", transactionId };
            } catch (error) {
                await transaction.rollback();
                console.error("Lỗi trong handleTransfer:", error);
                throw error;
            }
        } catch (error) {
            console.error("Lỗi xử lý chuyển giao:", error);
            return { success: false, message: error.message || "Lỗi máy chủ khi chuyển giao." };
        }
    }

    static async getAllTransactions(req, res) {
        try {
            const transactions = await TransactionModel.getAllTransactions();
            return res.status(200).json(transactions);
        } catch (error) {
            console.error("Lỗi lấy danh sách giao dịch:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    static async getTransactionsByItemCode(req, res) {
        try {
            const { itemCode } = req.params;
            const transactions = await TransactionModel.getTransactionsByItemCode(itemCode);
            return res.status(200).json(transactions);
        } catch (error) {
            console.error("Lỗi lấy giao dịch theo ItemCode:", error);
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
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
            return res.status(500).json({ message: "Lỗi máy chủ.", error });
        }
    }

    // TransactionController.js
    static async getProductLogs(req, res) {
        try {
            const { itemCode, qrCode, startDate, endDate, actionType } = req.query;
            const pool = await poolPromise;
            const request = pool.request();

            let query = `
                SELECT 
                    pl.ItemCode,
                    pl.ActionType,
                    pl.Quantity,
                    pl.Date,
                    pl.UserName AS Name,
                    pl.DepartmentName AS Department,
                    pl.QRCodeID AS QRCode,
                    oc.ReasonDetail AS Reason,
                    pl.ToUserName,
                    pl.ToDepartmentName
                FROM ProductLogs pl
                LEFT JOIN OperationCodes oc ON pl.OperationCodeID = oc.ReasonID
            `;

            let conditions = [];
            if (itemCode) {
                conditions.push(`pl.ItemCode LIKE @ItemCode`);
                request.input('ItemCode', sql.NVarChar, `%${itemCode}%`);
            }
            if (qrCode) {
                conditions.push(`pl.QRCodeID LIKE @QRCodeID`);
                request.input('QRCodeID', sql.NVarChar, `%${qrCode}%`);
            }
            if (startDate && endDate) {
                // Kiểm tra tính hợp lệ của startDate và endDate
                const parsedStartDate = new Date(startDate);
                const parsedEndDate = new Date(endDate);
                if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
                    console.warn('Invalid date parameters:', { startDate, endDate });
                    return res.status(400).json({ message: 'Ngày tháng không hợp lệ.' });
                }
                // Đặt endDate đến cuối ngày
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
            console.error('Lỗi lấy lịch sử giao dịch:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ.', error: error.message });
        }
    }
}

module.exports = TransactionController;