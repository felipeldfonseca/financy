import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
} from '@mui/material';
import { Notifications, AccountCircle } from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <AppBar
      position='fixed'
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'primary.main',
      }}
    >
      <Toolbar>
        <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
          Financy
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color='inherit'>
            <Notifications />
          </IconButton>
          <IconButton color='inherit' onClick={logout}>
            {user ? (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user.firstName.charAt(0)}
              </Avatar>
            ) : (
              <AccountCircle />
            )}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;