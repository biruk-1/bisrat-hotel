import { API_BASE_URL } from '../../config/api.js';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import io from 'socket.io-client';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
  Alert,
  Snackbar,
  useTheme,
  TableFooter
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  RemoveCircle as RemoveCircleIcon,
  ViewList as ViewListIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/currencyFormatter';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import { initSocket, disconnectSocket } from '../../services/socket';

// Add API URL constant
const isLocalhost = window.location.hostname === 'localhost';
const BASE_URL = API_BASE_URL;

const API_URL = `${BASE_URL}/api`;

// Add fetchOrdersData helper function
const fetchOrdersData = async (token) => {
  try {
    console.log('Fetching all orders...');
    const response = await axios.get('/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Initial orders response:', response.data);
    
    // Process orders and ensure all fields are properly formatted
    const orders = response.data.map(order => {
      // Safely process items array
      const processedItems = Array.isArray(order.items) ? order.items
        .filter(item => item && typeof item === 'object') // Filter out null/invalid items
        .map(item => ({
          id: item.id || 0,
          item_id: item.item_id || 0,
          name: item.name || 'Unknown Item',
          description: item.description || '',
          category: item.category || '',
          image: item.image || '',
          quantity: Number(item?.quantity) || 0,
          price: Number(item?.price) || 0,
          status: item.status || 'pending',
          item_type: item.item_type || 'food',
          total_price: Number(item?.total_price) || Number(item?.price * item?.quantity) || 0
        })) : [];

      // Calculate total amount from items if not provided
      const calculatedTotal = processedItems.reduce((sum, item) => sum + item.total_price, 0);
      
      return {
        id: order.id || 0,
        waiter_id: order.waiter_id || null,
        cashier_id: order.cashier_id || null,
        table_number: order.table_number || null,
        status: order.status || 'pending',
        waiter_name: order.waiter_name || 'Unknown',
        cashier_name: order.cashier_name || null,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || order.created_at || new Date().toISOString(),
        items: processedItems,
        total_amount: Number(order.total_amount) || calculatedTotal || 0
      };
    });

    // Sort by newest first
    const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    console.log(`Processed ${sortedOrders.length} orders, latest order ID:`, sortedOrders[0]?.id);
    
    return sortedOrders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

// Add fetchWaitersData helper function
const fetchWaitersData = async (token) => {
  try {
    const response = await axios.get('/api/waiters', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching waiters:', error);
    return [];
  }
};

// Helper to always fetch order with items
const fetchOrderWithItems = async (orderId, token) => {
  try {
    console.log('Fetching order details for order:', orderId);
    // First get the order details with items included
    const response = await axios.get(`/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        include_items: true // Request to include full item details
      }
    });
    let order = response.data;
    console.log('Initial order data:', order);

    // If items are not included or empty, fetch them separately
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      try {
        console.log('Fetching items separately for order:', orderId);
        // First get the order items
        const itemsRes = await axios.get(`/api/orders/${orderId}/items`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Items response:', itemsRes.data);

        // Then get the menu items to ensure we have complete item details
        const menuRes = await axios.get('/api/menu-items', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const menuItems = menuRes.data;
        console.log('Menu items:', menuItems);
        
        // Process the items and ensure all necessary fields by combining order items with menu items
        const items = Array.isArray(itemsRes.data) ? itemsRes.data.map(item => {
          // Find the corresponding menu item
          const menuItem = menuItems.find(mi => mi.id === item.item_id) || {};
          
          return {
            id: item.id || `temp_${Date.now()}_${Math.random()}`,
            item_id: item.item_id || item.id,
            order_id: orderId,
            name: item.name || menuItem.name || 'Unknown Item',
            description: item.description || menuItem.description || '',
            category: item.category || menuItem.category || 'uncategorized',
            quantity: parseInt(item.quantity) || 0,
            price: parseFloat(item.price || menuItem.price) || 0,
            total_price: parseFloat(item.total_price) || parseFloat((item.price || menuItem.price) * item.quantity) || 0,
            status: item.status || 'pending',
            item_type: item.item_type || menuItem.item_type || 'food',
            image: item.image || menuItem.image || null
          };
        }) : [];

        order.items = items;
      } catch (itemsError) {
        console.error('Error fetching order items:', itemsError);
        order.items = [];
      }
    } else {
      // If items are included, ensure they have all required fields
      order.items = order.items.map(item => ({
        id: item.id || `temp_${Date.now()}_${Math.random()}`,
        item_id: item.item_id || item.id,
        order_id: orderId,
        name: item.name || 'Unknown Item',
        description: item.description || '',
        category: item.category || 'uncategorized',
        quantity: parseInt(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        total_price: parseFloat(item.total_price) || parseFloat(item.price * item.quantity) || 0,
        status: item.status || 'pending',
        item_type: item.item_type || 'food',
        image: item.image || null
      }));
    }

    // Calculate total amount from items
    const total_amount = order.items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);

    // Update the order with items and recalculated total
    order = {
      ...order,
      items: order.items.map(item => ({
        ...item,
        quantity: parseInt(item.quantity) || 0,
        price: parseFloat(item.price) || 0,
        total_price: parseFloat(item.total_price) || parseFloat(item.price * item.quantity) || 0
      })),
      total_amount,
      item_count: order.items.length
    };
    
    console.log('Final order data with items:', order);
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
};

export default function AdminDashboard() {
  const theme = useTheme();
  const token = useSelector((state) => state.auth.token);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10); // Make rowsPerPage mutable
  const [sales, setSales] = useState({
    totalSales: 0,
    completedOrders: 0,
    waiterStats: []
  });
  const [selectedWaiter, setSelectedWaiter] = useState('all');
  const [waiters, setWaiters] = useState([]);
  const [timeRange, setTimeRange] = useState('daily');
  const [socket, setSocket] = useState(null);
  
  // For order search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Set today as default
    endDate: new Date().toISOString().split('T')[0]
  });
  
  // For order editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [editedOrder, setEditedOrder] = useState(null);
  
  // For notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [customDate, setCustomDate] = useState(null);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const [isConnected, setIsConnected] = useState(true);

  // Add fetchOrders function
  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching all orders...');
      const data = await fetchOrdersData(token);
      console.log(`Fetched ${data.length} orders, latest order ID:`, data[0]?.id);
      
      // Store all orders
      setOrders(data);
      
      // Apply date filtering
      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
        endDate.setHours(23, 59, 59, 999);
        
        const filtered = data.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= startDate && orderDate <= endDate;
        });
        
        console.log(`Filtered to ${filtered.length} orders for date range:`, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        setFilteredOrders(filtered);
      } else {
        setFilteredOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch orders',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update socket connection setup
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found for socket connection');
      return;
    }

    console.log('Setting up socket connection...');
    const socket = initSocket(token);
    if (socket) {
      socket.on('orderUpdated', () => {
        console.log('Order updated, fetching latest orders...');
        fetchOrders();
      });

      socket.on('newOrder', () => {
        console.log('New order received, fetching latest orders...');
        fetchOrders();
      });
    }

    fetchOrders();

    return () => {
      disconnectSocket();
    };
  }, []);

  // Add fetchWaiters function
  const fetchWaiters = async () => {
    const data = await fetchWaitersData(token);
    setWaiters(data);
  };

  // Function to refresh all sales data
  const refreshAllSalesData = () => {
    console.log('Refreshing all sales data...');
    if (!timeRange) {
      console.error('No timeRange set for sales refresh');
      return;
    }
    fetchAdminSales(timeRange, selectedWaiter);
  };

  useEffect(() => {
    fetchWaiters();
    fetchOrders();
    
    // Initial fetch of sales data with detailed logging
    console.log('Initial component mount - fetching all sales data');
    console.log('Current date:', new Date().toISOString());
    console.log('Default time range:', timeRange);
    
    // Force refresh all sales data on component mount
    refreshAllSalesData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Update filtered orders when either all orders, selected waiter, search term, or status filter changes
  useEffect(() => {
    if (orders.length > 0) {
      console.log('Filtering orders with current filters:', {
        dateRange,
        selectedWaiter,
        statusFilter,
        searchTerm,
        totalOrders: orders.length
      });
      
      let filtered = [...orders];
      
      // Apply date range filter
      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= startDate;
        });
      }
      
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate <= endDate;
        });
      }
      
      // Apply waiter filter
      if (selectedWaiter !== 'all') {
        filtered = filtered.filter(order => 
          order.waiter_id === parseInt(selectedWaiter)
        );
      }
      
      // Apply search term filter
      if (searchTerm.trim() !== '') {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(order => 
          String(order.id).includes(search) || 
          (order.waiter_name && order.waiter_name.toLowerCase().includes(search))
        );
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(order => order.status === statusFilter);
      }
      
      // Sort orders by creation date (newest first)
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log(`Filtered to ${filtered.length} orders`);
      setFilteredOrders(filtered);
    }
  }, [orders, selectedWaiter, searchTerm, statusFilter, dateRange]);

  // Completely rewritten fetch sales function for admin
  const fetchAdminSales = async (timeRangeParam = timeRange, waiterId = selectedWaiter) => {
    try {
      // Ensure we have a valid timeRange
      if (!timeRangeParam) {
        console.error('No timeRange provided for sales fetch');
        return;
      }

      console.log('Fetching admin sales data for:', {
        timeRange: timeRangeParam,
        waiterId,
        customDate: customDate ? customDate.toISOString().split('T')[0] : null
      });

      let url = `/api/admin/sales/${timeRangeParam}`;
      const params = new URLSearchParams();

      if (waiterId && waiterId !== 'all') {
        params.append('waiterId', waiterId);
      }

      // Handle custom date
      if (timeRangeParam === 'custom' && customDate) {
        params.append('customDate', customDate.toISOString().split('T')[0]);
      }

      // Add cache buster
      params.append('_t', Date.now());

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sales data received:', data);

      // Update sales data with proper type conversion
      setSales({
        totalSales: parseFloat(data.totalSales) || 0,
        completedOrders: parseInt(data.completedOrders) || 0,
        waiterStats: Array.isArray(data.waiterStats) ? data.waiterStats.map(stat => ({
          ...stat,
          total_sales: parseFloat(stat.total_sales) || 0,
          order_count: parseInt(stat.order_count) || 0,
          avgOrder: stat.order_count > 0 ? parseFloat(stat.total_sales) / parseInt(stat.order_count) : 0
        })) : []
      });
    } catch (error) {
      console.error('Error fetching admin sales:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status
      });
      setSnackbar({
        open: true,
        message: 'Failed to fetch sales data',
        severity: 'error'
      });
    }
  };

  // Update useEffect for sales data
  useEffect(() => {
    if (token && timeRange) {
      console.log('Sales data effect triggered:', { timeRange, selectedWaiter });
      fetchAdminSales(timeRange, selectedWaiter);
    }
  }, [token, selectedWaiter, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (event, newValue) => {
    console.log(`Switching to tab ${newValue} from ${activeTab}`);
    setActiveTab(newValue);
    
    // If switching to sales tab, force refresh all sales data
    if (newValue === 1) {
      console.log(`Tab changed to Sales, forcing refresh of all sales data`);
      console.log('Current time:', new Date().toISOString());
      console.log('Selected waiter:', selectedWaiter);
      console.log('Time range:', timeRange);
      
      if (timeRange) {
      refreshAllSalesData();
      } else {
        console.error('Cannot refresh sales data: timeRange is not set');
      }
    }
  };

  const handleWaiterFilter = (event) => {
    setSelectedWaiter(event.target.value);
  };

  const handleTimeRangeChange = (event) => {
    const newTimeRange = event.target.value;
    console.log('Time range changing to:', newTimeRange);
    setTimeRange(newTimeRange);
    
    if (newTimeRange === 'custom') {
      setShowCustomDatePicker(true);
      // Don't fetch data yet - wait for date selection
    } else {
      setShowCustomDatePicker(false);
      setCustomDate(null);
      fetchAdminSales(newTimeRange, selectedWaiter);
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };
  
  const handleDateRangeChange = (type, event) => {
    setDateRange(prev => ({
      ...prev,
      [type]: event.target.value
    }));
  };
  
  const handleExportCSV = () => {
    // Only export if there are orders to export
    if (filteredOrders.length === 0) {
      setSnackbar({
        open: true,
        message: 'No orders to export',
        severity: 'warning'
      });
      return;
    }
    
    // Convert orders to CSV format
    const headers = ['Order ID', 'Waiter', 'Date', 'Total Amount', 'Status'];
    
    const csvContent = [
      // Headers
      headers.join(','),
      // Data rows
      ...filteredOrders.map(order => [
        order.id,
        order.waiter_name || 'N/A',
        new Date(order.created_at).toLocaleString(),
        order.total_amount || 0,
        order.status || 'pending'
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Create filename with current date
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `orders-export-${date}.csv`);
    
    // Trigger download and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({
      open: true,
      message: `Exported ${filteredOrders.length} orders successfully`,
      severity: 'success'
    });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRefreshOrders = () => {
    setLoading(true);
    fetchOrders()
      .then(() => {
        setSnackbar({
          open: true,
          message: 'Orders refreshed successfully',
          severity: 'success'
        });
      })
      .catch((error) => {
        console.error('Error refreshing orders:', error);
        setSnackbar({
          open: true,
          message: 'Failed to refresh orders',
          severity: 'error'
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const handleRefreshSales = () => {
    console.log('Manually refreshing admin sales data');
    fetchAdminSales();
  };

  // Order editing functions
  const handleEditOrder = async (orderId) => {
    console.log('Editing order:', orderId);
    try {
      setLoading(true);
      
      // Fetch the detailed order data
      const detailedOrder = await fetchOrderWithItems(orderId, token);
      console.log('Fetched detailed order data:', detailedOrder);
      
      if (!detailedOrder) {
        throw new Error(`Order #${orderId} not found`);
      }
      
      // Set both current and edited order states
      setCurrentOrder(detailedOrder);
      setEditedOrder(detailedOrder);
      setEditDialogOpen(true);
      
    } catch (error) {
      console.error('Error editing order:', error);
      setSnackbar({
        open: true,
        message: `Error editing order: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (itemId, field, value) => {
    if (!editedOrder) return;
    
    console.log('Updating item:', { itemId, field, value });
    
    const updatedItems = editedOrder.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Ensure numeric values are properly handled
        if (field === 'quantity') {
          updatedItem.quantity = Number(value) || 0;
          updatedItem.total_price = updatedItem.quantity * Number(updatedItem.price);
        } else if (field === 'price') {
          updatedItem.price = Number(value) || 0;
          updatedItem.total_price = Number(updatedItem.quantity) * updatedItem.price;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    const updatedOrder = {
      ...editedOrder,
      items: updatedItems,
      total_amount: updatedItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0)
    };
    
    console.log('Updated order:', updatedOrder);
    setEditedOrder(updatedOrder);
  };

  const handleRemoveItem = (itemId) => {
    if (!editedOrder) return;
    
    // Remove the item from the edited order
    const updatedItems = editedOrder.items.filter(item => item.id !== itemId);
    
    setEditedOrder({
      ...editedOrder,
      items: updatedItems
    });
  };

  const handleSaveOrder = async () => {
    if (!editedOrder) return Promise.resolve(); // Return resolved promise if no order
    
    try {
      setLoading(true);
      
      // Calculate the new total amount
      const totalAmount = editedOrder.items && editedOrder.items.length > 0
        ? editedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        : 0;
      
      // Prepare the update payload
      const updateData = {
        ...editedOrder,
        total_amount: totalAmount
      };
      
      // Make the API request to update the order
      const response = await axios.put(
        `/api/orders/${editedOrder.id}`, 
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data) {
        // Close the dialog if it's open
        if (editDialogOpen) {
        setEditDialogOpen(false);
        }
        
        // Refresh the orders list
        fetchOrders();
        
        // Show success message
        setSnackbar({
          open: true,
          message: `Order #${editedOrder.id} updated successfully`,
          severity: 'success'
        });
      }
      
      return response; // Return the response for chaining
    } catch (error) {
      console.error('Error updating order:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to update order: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      
      throw error; // Re-throw to allow catch in calling code
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    // Confirm deletion with the user
    if (!window.confirm(`Are you sure you want to delete Order #${orderId}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Make the API request to delete the order
      await axios.delete(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refresh the orders list
      fetchOrders();
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Order #${orderId} deleted successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to delete order: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add handleCustomDateChange
  const handleCustomDateChange = async (date) => {
    if (!date) {
      // If date is cleared, reset to daily view
      setTimeRange('daily');
      setShowCustomDatePicker(false);
      setCustomDate(null);
      await fetchAdminSales('daily', selectedWaiter);
      return;
    }

    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date provided:', date);
      return;
    }

    // Format the date for the API request
    const formattedDate = dateObj.toISOString().split('T')[0];
    console.log('Selected date:', formattedDate);

    // Update state
    setCustomDate(dateObj);
    setTimeRange('custom');
    setShowCustomDatePicker(true);
    
    // Fetch data with the new date
    try {
      const url = `/api/admin/sales/custom?date=${formattedDate}&_t=${Date.now()}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Sales data received for date:', formattedDate, data);

      if (data.custom) {
        setSales(data.custom);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch sales data',
        severity: 'error'
      });
    }
  };

  // Add pagination handler
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // 1. Add summary boxes above the orders table
  const getOrderStats = (orders) => {
    const completedOrders = orders.filter(order => order.status === 'completed' || order.status === 'paid');
    const pendingOrders = orders.filter(order => order.status === 'pending');
    const totalSales = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const avgSales = completedOrders.length > 0 ? totalSales / completedOrders.length : 0;
    return {
      totalSales,
      avgSales,
      completedOrders: completedOrders.length,
      pendingOrders: pendingOrders.length
    };
  };

  const orderStats = getOrderStats(filteredOrders);

  const summaryBoxStyles = [
    { bgcolor: '#1976d2', color: '#fff', icon: <TrendingUpIcon fontSize="large" /> }, // Total Sales
    { bgcolor: '#43a047', color: '#fff', icon: <CheckCircleIcon fontSize="large" /> }, // Average Sales
    { bgcolor: '#fbc02d', color: '#fff', icon: <ViewListIcon fontSize="large" /> }, // Completed Orders
    { bgcolor: '#e53935', color: '#fff', icon: <RemoveCircleIcon fontSize="large" /> }, // Pending Orders
  ];

  const renderSummaryBoxes = (stats = orderStats, colorful = false) => {
    if (colorful) {
      return (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: summaryBoxStyles[0].bgcolor, color: summaryBoxStyles[0].color }}>
              {summaryBoxStyles[0].icon}
              <Typography variant="body2" color="inherit">Total Sales</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'inherit' }}>{formatCurrency(stats.totalSales)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: summaryBoxStyles[1].bgcolor, color: summaryBoxStyles[1].color }}>
              {summaryBoxStyles[1].icon}
              <Typography variant="body2" color="inherit">Average Sales</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'inherit' }}>{formatCurrency(stats.avgSales)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: summaryBoxStyles[2].bgcolor, color: summaryBoxStyles[2].color }}>
              {summaryBoxStyles[2].icon}
              <Typography variant="body2" color="inherit">Completed Orders</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'inherit' }}>{stats.completedOrders}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: summaryBoxStyles[3].bgcolor, color: summaryBoxStyles[3].color }}>
              {summaryBoxStyles[3].icon}
              <Typography variant="body2" color="inherit">Pending Orders</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'inherit' }}>{stats.pendingOrders}</Typography>
            </Paper>
          </Grid>
        </Grid>
      );
    } else {
      // Simple, original style for Sales tab
      return (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Sales</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{formatCurrency(stats.totalSales)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Average Sales</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{formatCurrency(stats.avgSales)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Completed Orders</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{stats.completedOrders}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Pending Orders</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{stats.pendingOrders}</Typography>
            </Paper>
          </Grid>
        </Grid>
      );
    }
  };

  // 2. Fix Sales tab default behavior and ranking
  useEffect(() => {
    if (activeTab === 1) {
      // When switching to Sales tab, always fetch sales for current filter
      fetchAdminSales(timeRange, selectedWaiter);
    }
  }, [activeTab]);

  // 3. Add ranking logic to Sales tab (top waiters by sales)
  const renderSalesRanking = () => {
    // Use sortedWaiters from renderSalesTab
    const waiterStats = Array.isArray(sales?.waiterStats) ? sales.waiterStats : [];
    const sortedWaiters = waiterStats.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Top Waiters by Sales</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Waiter</TableCell>
              <TableCell align="right">Orders</TableCell>
              <TableCell align="right">Total Sales</TableCell>
              <TableCell align="right">Average Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedWaiters.map((waiter, idx) => (
              <TableRow key={waiter.waiter_id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{waiter.waiter_name}</TableCell>
                <TableCell align="right">{waiter.order_count}</TableCell>
                <TableCell align="right">{formatCurrency(waiter.total_sales)}</TableCell>
                <TableCell align="right">{formatCurrency(waiter.avgOrder)}</TableCell>
              </TableRow>
            ))}
            {sortedWaiters.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">No ranking data available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  const renderOrdersTab = () => (
    <Box>
      {renderSummaryBoxes(orderStats, true)}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Search Orders"
              value={searchTerm}
              onChange={handleSearchChange}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={handleStatusFilterChange}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Waiter</InputLabel>
              <Select value={selectedWaiter} onChange={handleWaiterFilter}>
                <MenuItem value="all">All Waiters</MenuItem>
                {waiters.map(waiter => (
                  <MenuItem key={waiter.id} value={waiter.id}>{waiter.username}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate ? new Date(dateRange.startDate) : null}
                onChange={(date) => setDateRange(prev => ({
                  ...prev,
                  startDate: date ? date.toISOString().split('T')[0] : null
                }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                format="yyyy-MM-dd"
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={dateRange.endDate ? new Date(dateRange.endDate) : null}
                onChange={(date) => setDateRange(prev => ({
                  ...prev,
                  endDate: date ? date.toISOString().split('T')[0] : null
                }))}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                format="yyyy-MM-dd"
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshOrders}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Waiter</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(loading ? Array(5).fill({}) : filteredOrders)
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((order, index) => (
                  <React.Fragment key={order.id || index}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const expandedRows = document.querySelectorAll(`.expanded-row-${order.id}`);
                            expandedRows.forEach(row => {
                              row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
                            });
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                        {order.id}
                      </TableCell>
                      <TableCell>{order.waiter_name || 'N/A'}</TableCell>
                      <TableCell>{order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {loading ? (
                            <CircularProgress size={16} />
                          ) : (
                            `${order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0} items`
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {loading ? (
                          <CircularProgress size={16} />
                        ) : (
                          formatCurrency(order.total_amount || 0)
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status || 'pending'} 
                          color={
                            order.status === 'completed' || order.status === 'paid' ? 'success' :
                            order.status === 'in-progress' ? 'warning' :
                            order.status === 'cancelled' ? 'error' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEditOrder(order.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteOrder(order.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    {/* Expanded row for items */}
                    <TableRow className={`expanded-row-${order.id}`} sx={{ display: 'none', bgcolor: 'action.hover' }}>
                      <TableCell colSpan={8}>
                        <Box sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Order Items:</Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Item Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="center">Quantity</TableCell>
                                <TableCell align="right">Price</TableCell>
                                <TableCell align="right">Subtotal</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {loading ? (
                                <TableRow>
                                  <TableCell colSpan={5} align="center">
                                    <CircularProgress size={20} />
                                  </TableCell>
                                </TableRow>
                              ) : (
                                order.items?.map((item, itemIndex) => (
                                  <TableRow key={item.id || itemIndex}>
                                    <TableCell>{item.name || `Item ${item.item_id}`}</TableCell>
                                    <TableCell>{item.item_type}</TableCell>
                                    <TableCell align="center">{item.quantity}</TableCell>
                                    <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                                    <TableCell align="right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                        Rows per page:
                      </Typography>
                      <Select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(e.target.value);
                          setPage(0);
                        }}
                        size="small"
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={20}>20</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                      </Select>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                        {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredOrders.length)} of {filteredOrders.length}
                      </Typography>
                      <IconButton
                        onClick={() => setPage(prev => Math.max(0, prev - 1))}
                        disabled={page === 0}
                        size="small"
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => setPage(prev => Math.min(Math.ceil(filteredOrders.length / rowsPerPage) - 1, prev + 1))}
                        disabled={page >= Math.ceil(filteredOrders.length / rowsPerPage) - 1}
                        size="small"
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  // In renderSalesTab, compute stats for the current sales data
  const getSalesStats = () => {
    const completedOrders = sales.completedOrders || 0;
    const totalSales = sales.totalSales || 0;
    const avgSales = completedOrders > 0 ? totalSales / completedOrders : 0;
    // Pending orders not available in sales API, so show 0
    return {
      totalSales,
      avgSales,
      completedOrders,
      pendingOrders: 0
    };
  };

  const renderSalesTab = () => {
    // ... existing code ...
    const salesStats = getSalesStats();
    return (
      <Box>
        {/* Filter controls at the top */}
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              label="Time Range"
              disabled={loading}
            >
              <MenuItem value="daily">Today</MenuItem>
              <MenuItem value="weekly">Last 7 Days</MenuItem>
              <MenuItem value="monthly">Last 30 Days</MenuItem>
              <MenuItem value="yearly">Last 365 Days</MenuItem>
              <MenuItem value="custom">Custom Date</MenuItem>
            </Select>
          </FormControl>
          {showCustomDatePicker && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={customDate}
                onChange={handleCustomDateChange}
                slotProps={{ textField: { size: 'small' } }}
                maxDate={new Date()}
                format="yyyy-MM-dd"
              />
            </LocalizationProvider>
          )}
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel>Waiter</InputLabel>
            <Select value={selectedWaiter} onChange={handleWaiterFilter} label="Waiter">
              <MenuItem value="all">All Waiters</MenuItem>
              {waiters.map(waiter => (
                <MenuItem key={waiter.id} value={waiter.id}>{waiter.username}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshSales}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        {/* Simple summary boxes (not table) */}
        {renderSummaryBoxes(salesStats, false)}
        {renderSalesRanking()}
        {/* ... rest of the sales summary and table ... */}
      </Box>
    );
  };

  // Order editing dialog
  const renderOrderEditDialog = () => (
    <Dialog 
      open={editDialogOpen} 
      onClose={() => setEditDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Edit Order #{editedOrder?.id}
        <IconButton
          aria-label="close"
          onClick={() => setEditDialogOpen(false)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {editedOrder && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Order Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
                <Typography variant="body1">{editedOrder.id}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Waiter</Typography>
                <Typography variant="body1">{editedOrder.waiter_name || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                <Typography variant="body1">{new Date(editedOrder.created_at).toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={editedOrder.status || 'pending'}
                    onChange={(e) => setEditedOrder({...editedOrder, status: e.target.value})}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="in-progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Typography variant="h6" gutterBottom>Order Items</Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editedOrder.items && editedOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name || 'Unknown Item'}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.item_type || 'food'}
                          size="small"
                          color={item.item_type === 'drink' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        ${Number(item.price).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          InputProps={{ inputProps: { min: 0 } }}
                          size="small"
                          sx={{ width: '80px' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        ${(Number(item.quantity) * Number(item.price)).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Select
                          value={item.status || 'pending'}
                          onChange={(e) => handleUpdateItem(item.id, 'status', e.target.value)}
                          size="small"
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="in-progress">In Progress</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={() => handleRemoveItem(item.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!editedOrder.items || editedOrder.items.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No items in this order
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} align="right">
                      <strong>Total Amount:</strong>
                    </TableCell>
                    <TableCell align="right" colSpan={3}>
                      <strong>
                        ${editedOrder.items?.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0).toFixed(2)}
                      </strong>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveOrder} variant="contained" color="primary">
          Save Changes
              </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
            </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Orders" />
        <Tab label="Sales" />
      </Tabs>

      {activeTab === 0 && renderOrdersTab()}
      {activeTab === 1 && renderSalesTab()}
      
      {renderOrderEditDialog()}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Footer />
    </Box>
  );
} 