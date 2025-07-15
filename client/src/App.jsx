import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UNSAFE_DataRouterContext, UNSAFE_DataRouterStateContext } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector } from 'react-redux';
import { Provider } from 'react-redux';
import store from './store';
import { initializeOfflineFunctionality } from './services/initService';

// Auth Pages
import Login from './pages/Login';
import PinLogin from './pages/PinLogin';

// Waiter Menu Pages (no auth required)
import WaiterMenu from './pages/WaiterMenu';
import WaiterOrderConfirmation from './pages/WaiterOrderConfirmation';

// Layout Components
import AdminLayout from './components/AdminLayout';
import CashierLayout from './components/CashierLayout';
import WaiterLayout from './components/WaiterLayout';
import KitchenLayout from './components/KitchenLayout';
import BartenderLayout from './components/BartenderLayout';
import KitchenFullScreenLayout from './components/KitchenFullScreenLayout';
import BartenderFullScreenLayout from './components/BartenderFullScreenLayout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import MenuItems from './pages/admin/MenuItems';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';

// Cashier Pages
import CashierDashboard from './pages/cashier/Dashboard';
import OrderEntry from './pages/cashier/OrderEntry';
import Receipt from './pages/cashier/Receipt';
import OrderTicket from './pages/cashier/OrderTicket';
import CashierSales from './pages/cashier/Sales';

// Waiter Pages
import WaiterDashboard from './pages/waiter/Dashboard';
import TableManagement from './pages/waiter/TableManagement';

// Kitchen Pages
import KitchenDashboard from './pages/kitchen/Dashboard';
import KitchenView from './pages/kitchen/KitchenView';

// Bartender Pages
import BartenderDashboard from './pages/bartender/Dashboard';
import BartenderView from './pages/bartender/BartenderView';

// Offline Page
import OfflinePage from './pages/OfflinePage';

// Enhanced theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E88E5', // Vibrant blue
      light: '#64B5F6',
      dark: '#0D47A1',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF5722', // Deep orange for actions
      light: '#FF8A65',
      dark: '#D84315',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#E53935', // Red
    },
    warning: {
      main: '#FFC107', // Amber
    },
    info: {
      main: '#00ACC1', // Cyan
    },
    success: {
      main: '#43A047', // Green
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    // Role-specific colors for easier identification
    roles: {
      admin: '#D32F2F', // Red
      cashier: '#1976D2', // Blue
      waiter: '#43A047', // Green
      kitchen: '#FF8F00', // Amber
      bartender: '#8E24AA', // Purple
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 3px 6px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 3px 6px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
        head: {
          fontWeight: 700,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const { token, user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Initialize offline functionality
    initializeOfflineFunctionality().then(success => {
      if (success) {
        console.log('Offline functionality initialized successfully');
      } else {
        console.error('Failed to initialize offline functionality');
      }
    });
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!token) {
      return <Navigate to="/login" />;
    }
    
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      // Redirect to the appropriate dashboard based on role
      switch(user?.role) {
        case 'admin':
          return <Navigate to="/admin/dashboard" />;
        case 'cashier':
          return <Navigate to="/cashier/dashboard" />;
        case 'waiter':
          return <Navigate to="/waiter/dashboard" />;
        case 'kitchen':
          return <Navigate to="/kitchen" />;
        case 'bartender':
          return <Navigate to="/bartender" />;
        default:
          return <Navigate to="/login" />;
      }
    }
    
    return children;
  };

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <BrowserRouter future={router.future}>
          <CssBaseline />
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
            <Route path="/pin-login" element={!token ? <PinLogin /> : <Navigate to="/" />} />
            
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to={token ? 
              (user?.role === 'kitchen' ? "/kitchen" : 
               user?.role === 'bartender' ? "/bartender" : 
               `/${user?.role}/dashboard`) 
              : "/login"} />} />
            
            {/* Waiter Menu Routes (No Auth Required) */}
            <Route path="/waiter-menu" element={<WaiterMenu />} />
            <Route path="/waiter-order-confirmation" element={<WaiterOrderConfirmation />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="items" element={<MenuItems />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            {/* Cashier Routes */}
            <Route path="/cashier" element={
              <ProtectedRoute allowedRoles={['cashier']}>
                <CashierLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<CashierDashboard />} />
              <Route path="order" element={<OrderEntry />} />
              <Route path="receipt/:orderId" element={<Receipt />} />
              <Route path="order-ticket" element={<OrderTicket />} />
              <Route path="sales" element={<CashierSales />} />
            </Route>
            
            {/* Waiter Routes */}
            <Route path="/waiter" element={
              <ProtectedRoute allowedRoles={['waiter']}>
                <WaiterLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<WaiterDashboard />} />
              <Route path="tables" element={<TableManagement />} />
            </Route>
            
            {/* Kitchen Routes */}
            <Route path="/kitchen" element={
              <ProtectedRoute allowedRoles={['kitchen']}>
                <KitchenFullScreenLayout />
              </ProtectedRoute>
            }>
              <Route index element={<KitchenView />} />
              <Route path="dashboard" element={<KitchenDashboard />} />
            </Route>
            
            {/* Bartender Routes */}
            <Route path="/bartender" element={
              <ProtectedRoute allowedRoles={['bartender']}>
                <BartenderFullScreenLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BartenderView />} />
              <Route path="dashboard" element={<BartenderDashboard />} />
            </Route>
            
            {/* Offline Page */}
            <Route path="/offline" element={<OfflinePage />} />
            
            {/* Catch all - redirects to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App; 