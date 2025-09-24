import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';
import logo from '../assets/logo-removebg-preview.jpg';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { useTranslation } from 'react-i18next';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth();
    const { fetchPermissionsFromServer } = usePermissions();
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form submitted");
        try {
            const result = await login(username, password);
            const { user } = result;

            await fetchPermissionsFromServer(user.userId);
            navigate('/samples');
        } catch (err) {
            setError(t('loginFailed') || 'Login failed. Please check your account and password again.');
        }
    };

    return (
        <div className="login-container">
            <div className="language-selector">
                <select onChange={(e) => changeLanguage(e.target.value)} value={i18n.language}>
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                    <option value="cn">中文</option>
                </select>
            </div>
            <div className="login-box">
                <div className="logo">
                    <img src={logo} alt="Logo" />
                </div>
                <form onSubmit={handleSubmit}>
                    <h2>{t('login')}</h2>
                    {error && <div className="error">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="username">{t('username')}</label>
                        <div className="input-wrapper">
                            <UserOutlined className="inputIcon" />
                            <input
                                type="text"
                                id="username"
                                placeholder={t('username')}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">{t('password')}</label>
                        <div className="input-wrapper">
                            <LockOutlined className="inputIcon" />
                            <input
                                type="password"
                                id="password"
                                placeholder={t('password')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="button">
                        {t('login')}
                        <svg fill="currentColor" viewBox="0 0 24 24" className="icon">
                            <path
                                clipRule="evenodd"
                                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z"
                                fillRule="evenodd"
                            ></path>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginPage;
