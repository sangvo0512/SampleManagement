// import React, { useState, useEffect, useCallback } from "react";

// const InactivityHandler = () => {
//     const [inactivityTimer, setInactivityTimer] = useState(null);
//     const [countdownTimer, setCountdownTimer] = useState(null);
//     const [showWarning, setShowWarning] = useState(false);
//     const [timeLeft, setTimeLeft] = useState(60); // 60s đếm ngược

//     // ✅ Dùng useCallback để tránh hàm thay đổi không cần thiết
//     const resetTimer = useCallback(() => {
//         if (inactivityTimer) clearTimeout(inactivityTimer);
//         if (countdownTimer) clearInterval(countdownTimer);
//         setShowWarning(false);
//         setTimeLeft(60);
//         startInactivityTimer();
//     }, [inactivityTimer, countdownTimer]);

//     const startInactivityTimer = useCallback(() => {
//         const timer = setTimeout(() => {
//             setShowWarning(true);
//             startCountdown();
//         }, 15 * 60 * 1000); // 15 phút không hoạt động
//         setInactivityTimer(timer);
//     }, []);

//     const startCountdown = useCallback(() => {
//         let time = 60;
//         const interval = setInterval(() => {
//             time -= 1;
//             setTimeLeft(time);
//             if (time <= 0) {
//                 clearInterval(interval);
//                 logoutUser();
//             }
//         }, 1000);
//         setCountdownTimer(interval);
//     }, []);

//     const logoutUser = () => {
//         alert("Bạn đã bị đăng xuất do không hoạt động!");
//         window.location.href = "/login"; // Hoặc dùng navigate từ react-router
//     };

//     useEffect(() => {
//         startInactivityTimer();
//         return () => {
//             if (inactivityTimer) clearTimeout(inactivityTimer);
//             if (countdownTimer) clearInterval(countdownTimer);
//         };
//     }, [startInactivityTimer, countdownTimer, inactivityTimer]);

//     return showWarning ? (
//         <div className="warning-popup">
//             <p>Bạn sẽ phải đăng nhập lại trong {timeLeft} giây</p>
//             <button onClick={resetTimer}>Tiếp tục</button>
//         </div>
//     ) : null;
// };

// export default InactivityHandler;
