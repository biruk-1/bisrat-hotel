// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//   Typography,
//   Paper,
//   Button,
//   Box,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Dialog,
//   DialogActions,
//   DialogContent,
//   DialogTitle,
//   TextField,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   IconButton,
//   Chip,
//   Alert,
//   Snackbar
// } from '@mui/material';
// import {
//   Add as AddIcon,
//   Delete as DeleteIcon,
//   Edit as EditIcon
// } from '@mui/icons-material';
// import { API_ENDPOINTS } from '../../config/api';

// export default function UserManagement() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [openDialog, setOpenDialog] = useState(false);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [formData, setFormData] = useState({
//     username: '',
//     password: '',
//     phone_number: '',
//     pin_code: '',
//     role: ''
//   });

//   const token = localStorage.getItem('token');

//   // Fetch users on component mount
//   useEffect(() => {
//     fetchUsers();
//   }, []);

//   const fetchUsers = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get(API_ENDPOINTS.USERS, {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       });
//       setUsers(response.data);
//       setError('');
//     } catch (err) {
//       setError('Failed to load users. Please try again.');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleOpenDialog = (user = null) => {
//     if (user) {
//       setSelectedUser(user);
//       setFormData({
//         username: user.username,
//         password: '', // Empty password field for editing
//         phone_number: user.phone_number || '',
//         pin_code: user.pin_code || '',
//         role: user.role
//       });
//     } else {
//       setSelectedUser(null);
//       setFormData({
//         username: '',
//         password: '',
//         phone_number: '',
//         pin_code: '',
//         role: ''
//       });
//     }
//     setOpenDialog(true);
//   };

//   const handleCloseDialog = () => {
//     setOpenDialog(false);
//     setSelectedUser(null);
//     setFormData({
//       username: '',
//       password: '',
//       phone_number: '',
//       pin_code: '',
//       role: ''
//     });
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({
//       ...formData,
//       [name]: value
//     });
//   };

//   const validateForm = () => {
//     const { username, password, phone_number, pin_code, role } = formData;
    
//     if (!username || !role) {
//       setError('Username and role are required');
//       return false;
//     }
    
//     if (role === 'waiter' && !pin_code) {
//       setError('PIN code is required for waiters');
//       return false;
//     }
    
//     if (role === 'cashier' && !phone_number) {
//       setError('Phone number is required for cashiers');
//       return false;
//     }
    
//     if (['admin', 'cashier', 'kitchen', 'bartender'].includes(role) && !password && !selectedUser) {
//       setError('Password is required for this role');
//       return false;
//     }
    
//     // PIN code must be 6 digits
//     if (pin_code && !/^\d{6}$/.test(pin_code)) {
//       setError('PIN code must be 6 digits');
//       return false;
//     }
    
//     // Phone number validation (simple check)
//     if (phone_number && !/^\d{10,15}$/.test(phone_number)) {
//       setError('Please enter a valid phone number');
//       return false;
//     }
    
//     return true;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;
    
//     try {
//       if (selectedUser) {
//         // Update user
//         const updateData = {
//           username: formData.username,
//           role: formData.role,
//           phone_number: formData.phone_number || null
//         };

//         // Only include password in update if it was provided
//         if (formData.password) {
//           updateData.password = formData.password;
//         }

//         // Only include pin_code in update if it's a waiter and pin was provided
//         if (formData.role === 'waiter' && formData.pin_code) {
//           updateData.pin_code = formData.pin_code;
//         }

//         const response = await axios.put(`${API_ENDPOINTS.USERS}/${selectedUser.id}`, updateData, {
//           headers: {
//             Authorization: `Bearer ${token}`
//           }
//         });
        
//         setSuccess('User updated successfully!');
//         fetchUsers();
//         handleCloseDialog();
//       } else {
//         // Create new user
//         const response = await axios.post(API_ENDPOINTS.USERS, formData, {
//           headers: {
//             Authorization: `Bearer ${token}`
//           }
//         });
        
//         setSuccess('User created successfully!');
//         fetchUsers();
//         handleCloseDialog();
//       }
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to save user');
//       console.error(err);
//     }
//   };

//   const handleDeleteUser = async (userId) => {
//     // This would need a backend endpoint to implement
//     alert('Delete user functionality would be implemented here');
//   };

//   const getRoleBadgeColor = (role) => {
//     switch (role) {
//       case 'admin':
//         return 'error';
//       case 'cashier':
//         return 'primary';
//       case 'waiter':
//         return 'success';
//       case 'kitchen':
//         return 'warning';
//       case 'bartender':
//         return 'secondary';
//       default:
//         return 'default';
//     }
//   };

//   return (
//     <Box>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
//         <Typography variant="h4">User Management</Typography>
//         <Button
//           variant="contained"
//           color="primary"
//           startIcon={<AddIcon />}
//           onClick={() => handleOpenDialog()}
//         >
//           Add New User
//         </Button>
//       </Box>

//       {loading ? (
//         <Typography>Loading users...</Typography>
//       ) : error ? (
//         <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
//       ) : (
//         <TableContainer component={Paper}>
//           <Table>
//             <TableHead>
//               <TableRow>
//                 <TableCell>Username</TableCell>
//                 <TableCell>Role</TableCell>
//                 <TableCell>Phone Number</TableCell>
//                 <TableCell>Created At</TableCell>
//                 <TableCell align="right">Actions</TableCell>
//               </TableRow>
//             </TableHead>
//             <TableBody>
//               {users.map((user) => (
//                 <TableRow key={user.id}>
//                   <TableCell>{user.username}</TableCell>
//                   <TableCell>
//                     <Chip 
//                       label={user.role.toUpperCase()} 
//                       color={getRoleBadgeColor(user.role)}
//                       size="small"
//                     />
//                   </TableCell>
//                   <TableCell>{user.phone_number || 'N/A'}</TableCell>
//                   <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
//                   <TableCell align="right">
//                     <IconButton 
//                       onClick={() => handleOpenDialog(user)}
//                       color="primary"
//                       size="small"
//                     >
//                       <EditIcon />
//                     </IconButton>
//                     <IconButton 
//                       onClick={() => handleDeleteUser(user.id)}
//                       color="error"
//                       size="small"
//                       sx={{ ml: 1 }}
//                     >
//                       <DeleteIcon />
//                     </IconButton>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </TableContainer>
//       )}

//       {/* Add/Edit User Dialog */}
//       <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
//         <DialogTitle>
//           {selectedUser ? `Edit User: ${selectedUser.username}` : 'Add New User'}
//         </DialogTitle>
//         <DialogContent>
//           <Box component="form" sx={{ mt: 2 }}>
//             <TextField
//               fullWidth
//               margin="normal"
//               label="Username"
//               name="username"
//               value={formData.username}
//               onChange={handleInputChange}
//               required
//             />
            
//             <FormControl fullWidth margin="normal">
//               <InputLabel id="role-select-label">Role</InputLabel>
//               <Select
//                 labelId="role-select-label"
//                 name="role"
//                 value={formData.role}
//                 label="Role"
//                 onChange={handleInputChange}
//                 required
//                 disabled={selectedUser} // Disable role change for existing users
//               >
//                 <MenuItem value="admin">Admin</MenuItem>
//                 <MenuItem value="cashier">Cashier</MenuItem>
//                 <MenuItem value="waiter">Waiter</MenuItem>
//                 <MenuItem value="kitchen">Kitchen Staff</MenuItem>
//                 <MenuItem value="bartender">Bartender</MenuItem>
//               </Select>
//             </FormControl>
            
//             {/* Password/PIN field based on role */}
//             {formData.role === 'waiter' ? (
//               <TextField
//                 fullWidth
//                 margin="normal"
//                 label={selectedUser ? "New PIN Code (leave blank to keep current)" : "PIN Code (6 digits)"}
//                 name="pin_code"
//                 value={formData.pin_code}
//                 onChange={handleInputChange}
//                 required={!selectedUser}
//                 inputProps={{ maxLength: 6 }}
//                 helperText={selectedUser ? 'Enter new PIN only if you want to change it' : 'PIN code is required for new waiters'}
//               />
//             ) : (
//               <TextField
//                 fullWidth
//                 margin="normal"
//                 label={selectedUser ? "New Password (leave blank to keep current)" : "Password"}
//                 name="password"
//                 type="password"
//                 value={formData.password}
//                 onChange={handleInputChange}
//                 required={!selectedUser}
//                 helperText={selectedUser ? 'Enter new password only if you want to change it' : 'Password is required for new users'}
//               />
//             )}
            
//             {/* Phone number for cashiers */}
//             {formData.role === 'cashier' && (
//               <TextField
//                 fullWidth
//                 margin="normal"
//                 label="Phone Number"
//                 name="phone_number"
//                 value={formData.phone_number}
//                 onChange={handleInputChange}
//                 required
//               />
//             )}
            
//             {error && (
//               <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
//             )}
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={handleCloseDialog}>Cancel</Button>
//           <Button 
//             onClick={handleSubmit} 
//             variant="contained" 
//             color="primary"
//           >
//             {selectedUser ? 'Update' : 'Create'}
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Success message */}
//       <Snackbar
//         open={!!success}
//         autoHideDuration={6000}
//         onClose={() => setSuccess('')}
//         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
//       >
//         <Alert
//           onClose={() => setSuccess('')}
//           severity="success"
//           sx={{ width: '100%' }}
//         >
//           {success}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// } 

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Typography,
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    phone_number: '',
    pin_code: '',
    role: ''
  });

  const token = localStorage.getItem('token');

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_ENDPOINTS.USERS, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        password: '', // Empty password field for editing
        phone_number: user.phone_number || '',
        pin_code: user.pin_code || '',
        role: user.role
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        password: '',
        phone_number: '',
        pin_code: '',
        role: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      phone_number: '',
      pin_code: '',
      role: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const validateForm = () => {
    const { username, password, phone_number, pin_code, role } = formData;
    
    if (!username || !role) {
      setError('Username and role are required');
      return false;
    }
    
    if (role === 'waiter' && !pin_code && !selectedUser) {
      setError('PIN code is required for new waiters');
      return false;
    }
    
    if (role === 'cashier' && !phone_number) {
      setError('Phone number is required for cashiers');
      return false;
    }
    
    if (['admin', 'cashier', 'kitchen', 'bartender'].includes(role) && !password && !selectedUser) {
      setError('Password is required for new users with this role');
      return false;
    }
    
    // PIN code must be 6 digits
    if (pin_code && !/^\d{6}$/.test(pin_code)) {
      setError('PIN code must be 6 digits');
      return false;
    }
    
    // Phone number validation (simple check)
    if (phone_number && !/^\d{10,15}$/.test(phone_number)) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    // Password validation (if provided)
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (selectedUser) {
        // Update user
        const updateData = {
          username: formData.username,
          role: formData.role,
          phone_number: formData.phone_number || null
        };

        // Include password in update if provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        // Include pin_code in update if it's a waiter and pin was provided
        if (formData.role === 'waiter' && formData.pin_code) {
          updateData.pin_code = formData.pin_code;
        }

        const response = await axios.put(`${API_ENDPOINTS.USERS}/${selectedUser.id}`, updateData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setSuccess('User updated successfully!');
        fetchUsers();
        handleCloseDialog();
      } else {
        // Create new user
        const response = await axios.post(API_ENDPOINTS.USERS, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setSuccess('User created successfully!');
        fetchUsers();
        handleCloseDialog();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user');
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    // This would need a backend endpoint to implement
    alert('Delete user functionality would be implemented here');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'cashier':
        return 'primary';
      case 'waiter':
        return 'success';
      case 'kitchen':
        return 'warning';
      case 'bartender':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New User
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading users...</Typography>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role.toUpperCase()} 
                      color={getRoleBadgeColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.phone_number || 'N/A'}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleOpenDialog(user)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteUser(user.id)}
                      color="error"
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? `Edit User: ${selectedUser.username}` : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              margin="normal"
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleInputChange}
                required
                disabled={selectedUser} // Disable role change for existing users
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="waiter">Waiter</MenuItem>
                <MenuItem value="kitchen">Kitchen Staff</MenuItem>
                <MenuItem value="bartender">Bartender</MenuItem>
              </Select>
            </FormControl>
            
            {/* Password/PIN field based on role */}
            {formData.role === 'waiter' ? (
              <TextField
                fullWidth
                margin="normal"
                label={selectedUser ? "New PIN Code (leave blank to keep current)" : "PIN Code (6 digits)"}
                name="pin_code"
                value={formData.pin_code}
                onChange={handleInputChange}
                required={!selectedUser}
                inputProps={{ maxLength: 6 }}
                helperText={selectedUser ? 'Enter new PIN only if you want to change it' : 'PIN code is required for new waiters'}
              />
            ) : (
              <TextField
                fullWidth
                margin="normal"
                label={selectedUser ? "New Password (leave blank to keep current)" : "Password"}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!selectedUser && ['admin', 'cashier', 'kitchen', 'bartender'].includes(formData.role)}
                helperText={selectedUser ? 'Enter new password only if you want to change it' : 'Password is required for new users with this role'}
              />
            )}
            
            {/* Phone number for cashiers */}
            {formData.role === 'cashier' && (
              <TextField
                fullWidth
                margin="normal"
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
              />
            )}
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
          >
            {selectedUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success message */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccess('')}
          severity="success"
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}