// import React, { useState, useEffect } from 'react';
// import { Form, Input, Button, DatePicker, Select, message } from 'antd';
// import dayjs from 'dayjs';
// import axios from 'axios';

// const BorrowForm = ({ cart }) => {
//     const [form] = Form.useForm();
//     const [departments, setDepartments] = useState([]);

//     // Lấy danh sách các bộ phận
//     useEffect(() => {
//         const fetchDepartments = async () => {
//             try {
//                 const response = await axios.get('/api/departments');
//                 setDepartments(response.data);
//             } catch (error) {
//                 message.error('Không thể tải danh sách bộ phận.');
//             }
//         };
//         fetchDepartments();
//     }, []);

//     // Xử lý khi gửi form
//     const handleSubmit = async (values) => {
//         try {
//             const transactionData = {
//                 actionType: 'Mượn',
//                 departmentId: values.departmentId,
//                 quantity: cart.reduce((total, item) => total + item.quantity, 0),
//                 transactionDate: dayjs().format('YYYY-MM-DD'),
//                 returnDate: values.returnDate.format('YYYY-MM-DD'),
//                 items: cart.map((item) => ({
//                     itemCode: item.ItemCode,
//                     quantity: item.quantity,
//                 })),
//             };

//             const response = await axios.post('/api/transaction', transactionData);
//             if (response.status === 200) {
//                 message.success('Giao dịch mượn thành công!');
//             }
//         } catch (error) {
//             message.error('Giao dịch thất bại.');
//         }
//     };

//     return (
//         <Form form={form} onFinish={handleSubmit}>
//             <Form.Item label="Bộ phận mượn" name="departmentId" rules={[{ required: true, message: 'Vui lòng chọn bộ phận!' }]}>
//                 <Select>
//                     {departments.map((dept) => (
//                         <Select.Option key={dept.DepartmentID} value={dept.DepartmentID}>
//                             {dept.Name}
//                         </Select.Option>
//                     ))}
//                 </Select>
//             </Form.Item>

//             <Form.Item label="Ngày mượn" name="transactionDate" initialValue={dayjs()} rules={[{ required: true, message: 'Vui lòng chọn ngày mượn!' }]}>
//                 <DatePicker disabled />
//             </Form.Item>

//             <Form.Item label="Ngày trả" name="returnDate" rules={[{ required: true, message: 'Vui lòng chọn ngày trả!' }]}>
//                 <DatePicker />
//             </Form.Item>

//             <Button type="primary" htmlType="submit">
//                 Xác Nhận Mượn
//             </Button>
//         </Form>
//     );
// };

// export default BorrowForm;
