import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('Loading...');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch data from the backend API
    const fetchData = async () => {
      try {
        // Use the full URL in development, relative URL in production
        const apiUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:5000/api/hello' 
          : '/api/hello';
          
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();
        setMessage(data.message);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch data: ${err.message}`);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>MERN Docker App</h1>
        <div className="content">
          {error ? (
            <p className="error">{error}</p>
          ) : (
            <p className="message">{message}</p>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
