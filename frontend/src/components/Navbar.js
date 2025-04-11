// src/components/Navbar.js
import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-removebg-preview.jpg";
import "../styles/Navbar.css";
import { PermissionContext } from "../context/PermissionContext";

const Navbar = () => {
    const navigate = useNavigate();
    const { permissions } = useContext(PermissionContext);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("permissions");
        navigate("/login");
    };

    const hasPermission = (key) => permissions.includes(key);

    return (
        <nav className="navbar">
            <div className="nav-logo">
                <Link to="/dashboard">
                    <img src={logo} alt="Logo" className="logo-image" />
                </Link>
            </div>

            <div className="nav-menu">
                {hasPermission("sample") && (
                    <Link to="/samples" className="nav-item">
                        Sample List
                    </Link>
                )}
                {hasPermission("scan") && (
                    <Link to="/qr-scan" className="nav-item">
                        Scan borrow/return/export
                    </Link>
                )}
                {hasPermission("history") && (
                    <Link to="/history-management" className="nav-item">
                        History
                    </Link>
                )}
                {hasPermission("system_management") && (
                    <Link to="/system-management" className="nav-item">
                        System Management
                    </Link>
                )}
            </div>

            {/* Nút Đăng xuất */}
            <div className="nav-logout">
                <button onClick={handleLogout} className="logout-button">
                    Log out
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
