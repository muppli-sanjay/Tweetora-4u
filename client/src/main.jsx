import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthContextProvider } from './context/authContext';
import { DarkModeContextProvider } from './context/darkModeContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Error Boundary Component
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <p>{this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create a basic MUI theme
const theme = createTheme();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthContextProvider>
        <DarkModeContextProvider>
          <ThemeProvider theme={theme}>
            <App />
          </ThemeProvider>
        </DarkModeContextProvider>
      </AuthContextProvider>
    </ErrorBoundary>
  </React.StrictMode>
);