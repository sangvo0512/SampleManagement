// src/components/Navbar.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.jpg";
import "../styles/Navbar.css"; // Đảm bảo import file css

const Navbar = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Xóa token hoặc thực hiện xử lý đăng xuất
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <nav className="navbar">
            <div className="nav-logo">
                <Link to="/dashboard">
                    <img src={logo} alt="Logo" className="logo-image" />
                </Link>
            </div>

            {/* Các nút chức năng ở giữa */}
            <div className="nav-menu">
                <Link to="/samples" className="nav-item">
                    Sample List
                </Link>
                <Link to="/qr-scan" className="nav-item">
                    Scan borrow/return/export
                </Link>
                <Link to="/system-management" className="nav-item">
                    System Management
                </Link>
            </div>

            {/* Nút Đăng xuất ở bên phải */}
            <div className="nav-logout">
                <button onClick={handleLogout} className="logout-button">
                    Log out
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
