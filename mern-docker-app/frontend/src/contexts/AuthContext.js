import React, { useEffect, useState } from 'react';

const AuthContext = React.createContext({ user: null, loading: true, login: () => {}, logout: () => {} });

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		try {
			const token = localStorage.getItem('token');
			const raw = localStorage.getItem('user');
			if (token && raw) setUser(JSON.parse(raw));
		} catch (e) {
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, []);

	function login(userData, token) {
		if (token) localStorage.setItem('token', token);
		if (userData) localStorage.setItem('user', JSON.stringify(userData));
		setUser(userData);
	}

	function logout() {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		setUser(null);
		try { window.location.href = '/login'; } catch (e) {}
	}

	return (
		<AuthContext.Provider value={{ user, loading, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthContext;
