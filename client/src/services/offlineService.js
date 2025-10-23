import {
  userOperations,
  orderOperations,
  receiptOperations,
  settingsOperations,
  menuOperations,
  tableOperations,
  reportOperations,
  syncOperations
} from './db';
import axios from 'axios';
import { openDB, deleteDB } from 'idb';

// Storage keys
const ORDERS_STORAGE_KEY = 'pos_offline_orders';
const RECEIPTS_STORAGE_KEY = 'pos_offline_receipts';
const SYNC_QUEUE_KEY = 'pos_offline_sync_queue';
const USER_DATA_KEY = 'pos_user_data';
const MENU_ITEMS_KEY = 'pos_menu_items';
const USERS_DATA_KEY = 'pos_users_data';
const WAITERS_DATA_KEY = 'pos_waiters_data';
const BILL_REQUESTS_KEY = 'pos_bill_requests';
const SETTINGS_KEY = 'pos_settings';
const TABLES_DATA_KEY = 'pos_tables_data';
const REPORTS_DATA_KEY = 'pos_reports_data';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 3; // Increment to ensure new stores are created

// Add connection management
let dbConnection = null;
let connectionPromise = null;
let isInitializing = false;

const getConnection = async () => {
  if (isInitializing) {
    return connectionPromise;
  }

  if (dbConnection && !dbConnection.closed) {
    return dbConnection;
  }

  if (connectionPromise) {
    return await connectionPromise;
  }

  isInitializing = true;

  try {
    console.log('Opening new database connection...');
    connectionPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('Upgrading database from version', oldVersion, 'to', newVersion);
        
        // Create all required stores
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('menuItems')) {
          db.createObjectStore('menuItems', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('phone_number', 'phone_number', { unique: true });
        }
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('receipts')) {
          db.createObjectStore('receipts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('billRequests')) {
          db.createObjectStore('billRequests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('waiters')) {
          db.createObjectStore('waiters', { keyPath: 'id' });
        }
      },
      blocked(currentVersion, blockedVersion, event) {
        console.log('Database blocked:', { currentVersion, blockedVersion, event });
        if (dbConnection) {
          dbConnection.close();
          dbConnection = null;
        }
      },
      blocking(currentVersion, blockedVersion, event) {
        console.log('Database blocking:', { currentVersion, blockedVersion, event });
        if (dbConnection) {
          dbConnection.close();
          dbConnection = null;
        }
      },
      terminated() {
        console.log('Database connection terminated');
        dbConnection = null;
        connectionPromise = null;
        isInitializing = false;
      }
    });

    dbConnection = await connectionPromise;
    console.log('Database connection established:', dbConnection.version);
    return dbConnection;
  } catch (error) {
    console.error('Error getting database connection:', error);
    dbConnection = null;
    connectionPromise = null;
    throw error;
  } finally {
    isInitializing = false;
    connectionPromise = null;
  }
};

// Helper function to safely execute database operations with retries
const executeDbOperation = async (operation, storeName, mode = 'readonly') => {
  let retries = MAX_RETRY_ATTEMPTS;
  while (retries > 0) {
    try {
      const db = await getConnection();
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = await operation(store);
      await tx.done;
      return result;
    } catch (error) {
      console.error(`Database operation failed (${retries} retries left):`, error);
      retries--;
      if (retries === 0) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      dbConnection = null;
    }
  }
};

// Storage quota management
const checkStorageQuota = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const percentageUsed = (estimate.usage / estimate.quota) * 100;
      console.log(`Storage quota used: ${percentageUsed.toFixed(2)}%`);

      if (percentageUsed > 90) {
        await cleanupStorage();
      }

      return percentageUsed < 95;
    }
    return true;
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return true;
  }
};

// Cleanup old data
const cleanupStorage = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('pendingSync', 'readwrite');
    const syncStore = tx.objectStore('pendingSync');
    const oldItems = await syncStore.getAll(IDBKeyRange.upperBound(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days old
    ));

    for (const item of oldItems) {
      await syncStore.delete(item.id);
    }

    await tx.done;
    console.log('Cleaned up old sync queue items');
  } catch (error) {
    console.error('Error cleaning up storage:', error);
  }
};

// Timeout handling for database operations
const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeout)
    )
  ]);
};

// Initialize offline storage
export const initializeOfflineStorage = async () => {
  try {
    console.log('Initializing offline storage...');
    const db = await getConnection();
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing offline storage:', error);
    throw error;
  }
};

// Initialize offline event listeners
export const initOfflineListeners = (onlineCallback, offlineCallback) => {
  if (!window._listenersInitialized) {
    initializeOfflineStorage();

    window.addEventListener('online', onlineCallback);
    window.addEventListener('offline', offlineCallback);

    window._listenersInitialized = true;
  }

  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
    window._listenersInitialized = false;
  };
};

// User data operations
export const saveUserData = async (userData) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    const userToSave = {
      id: userData.id,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      name: userData.name,
      phone_number: userData.phone_number,
      pin_code: userData.pin_code,
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    await store.put(userToSave);
    await tx.done;

    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));

    const currentUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const updatedUsers = currentUsers.filter(u => u.id !== userData.id);
    updatedUsers.push(userToSave);
    localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));

    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

export const getUserData = async (userId) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const user = await store.get(userId);
    await tx.done;

    if (!user) {
      const cachedUser = JSON.parse(localStorage.getItem(USER_DATA_KEY) || 'null');
      if (cachedUser && cachedUser.id === userId) {
        return cachedUser;
      }
    }

    return user;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Initialize offline functionality
export const initializeOfflineFunctionality = async () => {
  try {
    if (window._dbInitialized) {
      console.log('Offline functionality already initialized');
      return true;
    }

    console.log('Initializing offline functionality...');
    await initializeOfflineStorage();
    window._dbInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize offline functionality:', error);
    return false;
  }
};

// Get user by username
export const getUserByUsername = async (username) => {
  try {
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const userFromLocalStorage = cachedUsers.find(user => user.username === username);
    if (userFromLocalStorage) {
      console.log('User found in localStorage');
      return userFromLocalStorage;
    }

    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('username');
    const user = await index.get(username);
    await tx.done;
    console.log('User found in IndexedDB:', user);
    return user;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return cachedUsers.find(user => user.username === username);
  }
};

// Save all users data
export const saveUsersData = async (users) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    // Ensure users is an array
    const usersArray = Array.isArray(users) ? users : [];
    const uniqueUsers = usersArray.reduce((acc, user) => {
      if (!user.phone_number || user.phone_number === '') {
        acc.push(user);
        return acc;
      }
      const existingUserIndex = acc.findIndex(u => u.phone_number === user.phone_number);
      if (existingUserIndex === -1) {
        acc.push(user);
      } else if (new Date(user.last_login || 0) > new Date(acc[existingUserIndex].last_login || 0)) {
        acc[existingUserIndex] = user;
      }
      return acc;
    }, []);

    await Promise.all(uniqueUsers.map(user => store.put({
      id: user.id,
      username: user.username,
      role: user.role,
      pin_code: user.pin_code,
      phone_number: user.phone_number || '',
      name: user.name || '',
      created_at: user.created_at || new Date().toISOString(),
      last_login: user.last_login || new Date().toISOString()
    })));

    await tx.done;
    localStorage.setItem(USERS_DATA_KEY, JSON.stringify(uniqueUsers));
    return true;
  } catch (error) {
    console.error('Error saving users data:', error);
    try {
      localStorage.setItem(USERS_DATA_KEY, JSON.stringify(users));
      return true;
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      return false;
    }
  }
};

// Get all users data
export const getUsersData = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const users = await store.getAll();
    await tx.done;

    if (users.length === 0) {
      return JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    }

    return users;
  } catch (error) {
    console.error('Error getting users data:', error);
    return JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
  }
};

// Save waiters data
export const saveWaitersData = async (waiters) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('waiters', 'readwrite');
    const store = tx.objectStore('waiters');

    // Ensure waiters is an array
    const waitersArray = Array.isArray(waiters) ? waiters : [];
    await Promise.all(waitersArray.map(waiter => store.put({
      id: waiter.id,
      name: waiter.name,
      username: waiter.username,
      role: 'waiter',
      created_at: new Date().toISOString()
    })));

    await tx.done;
    localStorage.setItem(WAITERS_DATA_KEY, JSON.stringify(waiters));
    return true;
  } catch (error) {
    console.error('Error saving waiters data:', error);
    return false;
  }
};

// Get waiters data
export const getOfflineWaiters = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('waiters', 'readonly');
    const store = tx.objectStore('waiters');
    const waiters = await store.getAll();
    await tx.done;

    if (waiters.length === 0) {
      return JSON.parse(localStorage.getItem(WAITERS_DATA_KEY) || '[]');
    }

    return waiters;
  } catch (error) {
    console.error('Error getting offline waiters:', error);
    return JSON.parse(localStorage.getItem(WAITERS_DATA_KEY) || '[]');
  }
};

// Save bill requests
export const saveBillRequestOffline = async (billRequest) => {
  try {
    const db = await getConnection();
    const tx = db.transaction(['billRequests', 'pendingSync'], 'readwrite');
    const billStore = tx.objectStore('billRequests');
    const syncStore = tx.objectStore('pendingSync');

    // Handle both single bill request and array of bill requests
    const billRequests = Array.isArray(billRequest) ? billRequest : [billRequest];

    for (const request of billRequests) {
      const billToSave = {
        id: request.id || request.table_id || `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: request.order_id,
        table_number: request.table_number,
        table_id: request.table_id,
        waiter_id: request.waiter_id,
        waiter_name: request.waiter_name || 'Unknown',
        status: request.status || 'pending',
        requested_at: request.timestamp || new Date().toISOString(),
        isOffline: true
      };

      await billStore.put(billToSave);
      await syncStore.add({
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'bill_request',
        data: billToSave,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    await tx.done;
    localStorage.setItem(BILL_REQUESTS_KEY, JSON.stringify(billRequests));
    return billRequests.length === 1 ? billRequests[0].id : billRequests.map(r => r.id);
  } catch (error) {
    console.error('Error saving bill request offline:', error);
    throw error;
  }
};

// Get bill requests
export const getOfflineBillRequests = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('billRequests', 'readonly');
    const store = tx.objectStore('billRequests');
    const requests = await store.getAll();
    await tx.done;
    return requests;
  } catch (error) {
    console.error('Error getting offline bill requests:', error);
    return JSON.parse(localStorage.getItem(BILL_REQUESTS_KEY) || '[]');
  }
};

// Save settings
export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Get settings
export const getSettings = () => {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
};

// Orders operations
export const saveOrderOffline = async (orderData) => {
  try {
    if (!orderData) {
      throw new Error('Order data is required');
    }

    const db = await getConnection();
    const tx = db.transaction(['orders', 'pendingSync'], 'readwrite');
    const orderStore = tx.objectStore('orders');
    const syncStore = tx.objectStore('pendingSync');

    // Ensure items is an array and handle null/undefined items
    const validItems = Array.isArray(orderData.items) ? orderData.items.filter(item => item !== null && item !== undefined) : [];
    
    const orderToSave = {
      id: orderData.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items: validItems.map(item => ({
        item_id: item.item_id || item.id || null,
        name: item.name || 'Unknown Item',
        price: item && typeof item.price !== 'undefined' ? parseFloat(item.price) || 0 : 0,
        quantity: item && typeof item.quantity !== 'undefined' ? parseInt(item.quantity) || 1 : 1,
        item_type: item.item_type || 'food',
        category: item.category || 'uncategorized'
      })),
      total_amount: parseFloat(orderData.total || orderData.total_amount || 0),
      table_number: orderData.table_number || null,
      waiter_id: orderData.waiter_id || null,
      status: orderData.status || 'pending',
      created_at: orderData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isOffline: true
    };

    // Validate the order object
    if (!orderToSave.id) {
      throw new Error('Failed to generate order ID');
    }

    // Use put instead of add to handle both new orders and updates
    await orderStore.put(orderToSave);
    
    await syncStore.add({
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'order',
      data: orderToSave,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    await tx.done;
    return orderToSave.id;
  } catch (error) {
    console.error('Error saving order offline:', error);
    throw error;
  }
};

export const getOfflineOrders = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('orders', 'readonly');
    const store = tx.objectStore('orders');
    const orders = await store.getAll();
    await tx.done;
    return orders || [];
  } catch (error) {
    console.error('Error getting orders from IndexedDB:', error);
    throw new Error('Failed to load orders from offline storage');
  }
};

// Receipts operations
export const saveReceiptOffline = async (receiptData) => {
  try {
    const db = await getConnection();
    const tx = db.transaction(['receipts', 'pendingSync'], 'readwrite');
    const receiptStore = tx.objectStore('receipts');
    const syncStore = tx.objectStore('pendingSync');

    const receiptToSave = {
      id: receiptData.id || Date.now().toString(),
      ...receiptData,
      created_at: new Date().toISOString(),
      isOffline: true
    };

    const receiptId = await receiptStore.add(receiptToSave);
    await syncStore.add({
      type: 'receipt',
      data: receiptToSave,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    await tx.done;
    return receiptId;
  } catch (error) {
    console.error('Error saving receipt offline:', error);
    throw error;
  }
};

export const getOfflineReceipts = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('receipts', 'readonly');
    const store = tx.objectStore('receipts');
    const receipts = await store.getAll();
    await tx.done;
    return receipts;
  } catch (error) {
    console.error('Error getting offline receipts:', error);
    throw error;
  }
};

// Menu items operations
export const saveMenuItemsOffline = async (items) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('menuItems', 'readwrite');
    const store = tx.objectStore('menuItems');

    await store.clear();
    // Ensure items is an array
    const itemsArray = Array.isArray(items) ? items : [];
    await Promise.all(itemsArray.map(item => store.put(item)));
    await tx.done;

    localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Error saving menu items to IndexedDB:', error);
    throw new Error('Failed to save menu items to offline storage');
  }
};

export const getMenuItemsOffline = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('menuItems', 'readonly');
    const store = tx.objectStore('menuItems');
    const items = await store.getAll();
    await tx.done;
    return items || [];
  } catch (error) {
    console.error('Error getting menu items from IndexedDB:', error);
    throw new Error('Failed to load menu items from offline storage');
  }
};

// Tables operations
export const saveTablesOffline = async (tables) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('tables', 'readwrite');
    const store = tx.objectStore('tables');

    await store.clear();
    // Ensure tables is an array
    const tablesArray = Array.isArray(tables) ? tables : [];
    await Promise.all(tablesArray.map(table => store.put(table)));
    await tx.done;

    localStorage.setItem(TABLES_DATA_KEY, JSON.stringify(tables));
    return true;
  } catch (error) {
    console.error('Error saving tables to IndexedDB:', error);
    throw new Error('Failed to save tables to offline storage');
  }
};

export const getTablesOffline = async () => {
  try {
    const db = await getConnection();
    const tx = db.transaction('tables', 'readonly');
    const store = tx.objectStore('tables');
    const tables = await store.getAll();
    await tx.done;
    return tables || [];
  } catch (error) {
    console.error('Error getting tables from IndexedDB:', error);
    throw new Error('Failed to load tables from offline storage');
  }
};

// Dashboard data operations
export const saveDashboardDataOffline = async (data) => {
  try {
    await reportOperations.saveReport({
      id: 'dashboard',
      type: 'dashboard',
      data,
      date: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving dashboard data offline:', error);
    return false;
  }
};

export const getOfflineDashboardData = async () => {
  try {
    const report = await reportOperations.getReport('dashboard');
    return report?.data || null;
  } catch (error) {
    console.error('Error getting dashboard data offline:', error);
    return null;
  }
};

// Sync operations
export const syncWithServer = async () => {
  if (!navigator.onLine) {
    console.log('Device is offline, skipping sync');
    return { success: false, message: 'Device is offline' };
  }

  try {
    const db = await getConnection();
    const tx = db.transaction('pendingSync', 'readwrite');
    const syncStore = tx.objectStore('pendingSync');
    const pendingItems = await syncStore.getAll();
    await tx.done;

    if (pendingItems.length === 0) {
      console.log('No pending items to sync');
      return { success: true, message: 'No pending items to sync' };
    }

    console.log(`Found ${pendingItems.length} items to sync`);

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No auth token found, skipping sync');
      return { success: false, message: 'No auth token found' };
    }

    const baseURL = 'https://bsapi.diamond.et';
    try {
      const verifyResponse = await axios.get(`${baseURL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (verifyResponse.status !== 200) {
        console.log('Token verification failed, skipping sync');
        return { success: false, message: 'Invalid token' };
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      return { success: false, message: 'Error verifying token' };
    }

    for (const item of pendingItems) {
      try {
        let response;
        if (item.type === 'order') {
          response = await axios.post(`${baseURL}/api/orders`, {
            ...item.data,
            total_amount: parseFloat(item.data.total || item.data.total_amount || 0),
            items: item.data.items.map(i => ({
              ...i,
              price: parseFloat(i.price || 0),
              quantity: parseInt(i.quantity || 0)
            }))
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } else if (item.type === 'order_status_update') {
          response = await axios.patch(`${baseURL}/api/orders/${item.data.order_id}/status`, {
            status: item.data.status
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } else if (item.type === 'receipt') {
          response = await axios.post(`${baseURL}/api/receipts`, item.data, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } else if (item.type === 'bill_request') {
          response = await axios.post(`${baseURL}/api/bill-requests`, item.data, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }

        if (response && response.status === 200) {
          const responseData = response.data;
          const syncTx = db.transaction(['pendingSync', item.type === 'order' ? 'orders' : item.type === 'bill_request' ? 'billRequests' : 'receipts'], 'readwrite');
          const syncStore = syncTx.objectStore('pendingSync');
          const dataStore = syncTx.objectStore(item.type === 'order' ? 'orders' : item.type === 'bill_request' ? 'billRequests' : 'receipts');

          await syncStore.put({
            ...item,
            status: 'synced',
            synced_at: new Date().toISOString()
          });

          if (item.type === 'order') {
            await dataStore.put({
              ...item.data,
              ...responseData,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          } else if (item.type === 'order_status_update') {
            const orderTx = db.transaction('orders', 'readwrite');
            const orderStore = orderTx.objectStore('orders');
            const order = await orderStore.get(item.data.order_id);
            if (order) {
              await orderStore.put({
                ...order,
                status: item.data.status,
                isOffline: false,
                synced_at: new Date().toISOString()
              });
            }
            await orderTx.done;
          } else if (item.type === 'bill_request') {
            await dataStore.put({
              ...item.data,
              ...responseData,
              isOffline: false,
              synced_at: new Date().toISOString()
            });
          }

          await syncTx.done;
          console.log(`Successfully synced ${item.type} with ID: ${item.data.id || item.data.order_id}`);
        } else {
          throw new Error(`Server responded with status: ${response?.status}`);
        }
      } catch (error) {
        console.error(`Error syncing ${item.type}:`, error);
        const isNetworkError = error.message.includes('Network Error') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED');

        if (isNetworkError) {
          const syncTx = db.transaction('pendingSync', 'readwrite');
          const syncStore = syncTx.objectStore('pendingSync');
          await syncStore.put({
            ...item,
            retry_count: (item.retry_count || 0) + 1,
            last_error: error.message,
            last_retry: new Date().toISOString()
          });
          await syncTx.done;
        }
      }
    }

    return { success: true, message: `Synced ${pendingItems.length} items` };
  } catch (error) {
    console.error('Error in sync process:', error);
    return { success: false, message: error.message };
  }
};

// Initialize sync interval
export const initializeSyncInterval = () => {
  if (navigator.onLine) {
    console.log('Initial sync on startup');
    syncWithServer().catch(console.error);

    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        console.log('Running scheduled sync');
        syncWithServer().catch(console.error);
      } else {
        console.log('Device is offline, skipping scheduled sync');
      }
    }, 5 * 60 * 1000);

    window.addEventListener('unload', () => {
      clearInterval(syncInterval);
    });
  }
};

// Check if online
export const isOnline = () => {
  return navigator.onLine;
};

// Get pending sync count
export const getPendingSyncCount = async () => {
  try {
    const db = await syncWithServer();
    const tx = db.transaction('pendingSync', 'readonly');
    const store = tx.objectStore('pendingSync');
    const pendingItems = await store.getAll();
    await tx.done;
    return pendingItems.length;
  } catch (error) {
    console.error('Error getting pending sync count:', error);
    return 0;
  }
};

// Get cashier by phone
export const getCashierByPhone = async (phoneNumber) => {
  try {
    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const cashierFromLocalStorage = cachedUsers.find(user =>
      user.phone_number === phoneNumber && user.role === 'cashier'
    );

    if (cashierFromLocalStorage) {
      console.log('Cashier found in localStorage');
      return cashierFromLocalStorage;
    }

    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('phone_number');

    const userData = await index.get(phoneNumber);
    await tx.done;
    if (userData && userData.role === 'cashier') {
      console.log('Cashier found in IndexedDB:', userData);
      return userData;
    }

    return null;
  } catch (error) {
    console.error('Error getting cashier by phone:', error);
    return cachedUsers.find(user =>
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
  }
};

// Save user for offline access
export const saveUserForOffline = async (userData) => {
  try {
    console.log('Saving user data for offline access:', userData);

    if (userData.role === 'cashier' && !userData.phone_number) {
      throw new Error('Phone number is required for cashier');
    }

    const userToSave = {
      id: userData.id,
      username: userData.username || null,
      password: userData.password,
      role: userData.role,
      name: userData.name || '',
      phone_number: userData.phone_number || '',
      pin_code: userData.pin_code || '',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    await executeDbOperation(
      async (store) => {
        await store.put(userToSave);
      },
      'users',
      'readwrite'
    );

    try {
      const currentUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
      const updatedUsers = currentUsers.filter(u => {
        if (userData.role === 'cashier') {
          return u.id !== userData.id && u.phone_number !== userData.phone_number;
        }
        return u.id !== userData.id;
      });

      updatedUsers.push(userToSave);
      localStorage.setItem(USERS_DATA_KEY, JSON.stringify(updatedUsers));

      if (userData.role === 'cashier') {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userToSave));
      }

      console.log('Saved user data to localStorage');
      return userToSave;
    } catch (localStorageError) {
      console.error('Error saving to localStorage:', localStorageError);
      return userToSave;
    }
  } catch (error) {
    console.error('Error in saveUserForOffline:', error);
    throw error;
  }
};

// Get user by phone
export const getUserByPhone = async (phone) => {
  try {
    console.log('Getting user by phone:', phone);

    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    const userFromLocalStorage = cachedUsers.find(user => user.phone_number === phone);
    if (userFromLocalStorage) {
      console.log('User found in localStorage');
      return userFromLocalStorage;
    }

    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');

    try {
      const index = store.index('phone_number');
      const user = await index.get(phone);
      await tx.done;
      console.log('User found in IndexedDB:', user);
      return user;
    } catch (indexError) {
      console.error('Index lookup failed, falling back to full scan:', indexError);
      const allUsers = await store.getAll();
      await tx.done;
      const user = allUsers.find(u => u.phone_number === phone);
      console.log('User found in full scan:', user);
      return user;
    }
  } catch (error) {
    console.error('Error getting user by phone:', error);
    return null;
  }
};

// Check if user exists
export const checkUserExists = async (phoneNumber) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const users = await store.getAll();
    await tx.done;

    const existsInIndexedDB = users.some(user =>
      user.phone_number === phoneNumber && user.role === 'cashier'
    );

    if (existsInIndexedDB) return true;

    const cachedUsers = JSON.parse(localStorage.getItem(USERS_DATA_KEY) || '[]');
    return cachedUsers.some(user =>
      user.phone_number === phoneNumber && user.role === 'cashier'
    );
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
};

// Reset database
export const resetDatabase = async () => {
  try {
    console.log('Resetting database...');
    await deleteDBPromise(DB_NAME);
    console.log('Database deleted successfully');
    await initializeOfflineStorage();
    console.log('Database reinitialized successfully');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
};

// Update order status offline
export const updateOrderStatusOffline = async (orderId, newStatus) => {
  try {
    const db = await getConnection();
    const tx = db.transaction(['orders', 'pendingSync'], 'readwrite');
    const orderStore = tx.objectStore('orders');
    const syncStore = tx.objectStore('pendingSync');

    const order = await orderStore.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const updatedOrder = {
      ...order,
      status: newStatus,
      updated_at: new Date().toISOString(),
      isOffline: true
    };

    await orderStore.put(updatedOrder);
    await syncStore.add({
      type: 'order_status_update',
      data: {
        order_id: orderId,
        status: newStatus,
        updated_at: new Date().toISOString()
      },
      status: 'pending',
      created_at: new Date().toISOString()
    });

    await tx.done;
    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status offline:', error);
    throw error;
  }
};

// Get order by ID (works both online and offline)
export const getOrderById = async (orderId) => {
  try {
    const db = await getConnection();
    const tx = db.transaction('orders', 'readonly');
    const store = tx.objectStore('orders');
    const order = await store.get(orderId);
    await tx.done;

    if (order) {
      return order;
    }

    if (!order && navigator.onLine) {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No auth token found');
      }

      const response = await axios.get(`https://bsapi.diamond.et/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const orderData = response.data;
        const cacheTx = db.transaction('orders', 'readwrite');
        await cacheTx.objectStore('orders').put({
          ...orderData,
          isOffline: false
        });
        await cacheTx.done;
        return orderData;
      }
    }

    throw new Error('Order not found');
  } catch (error) {
    console.error('Error getting order by ID:', error);
    throw error;
  }
};