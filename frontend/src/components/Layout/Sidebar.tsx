import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as TransactionsIcon,
  Group as GroupsIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const SIDEBAR_WIDTH = 250;

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: null,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: '/transactions',
    icon: null,
  },
  {
    id: 'groups',
    label: 'Groups',
    path: '/contexts',
    icon: null,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: null,
  },
];

const settingsItem: NavigationItem = {
  id: 'settings',
  label: 'Settings',
  path: '/settings',
  icon: null,
};

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      {/* Brand Logo */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="brand" component="h1">
          financy
        </Typography>
        <Typography variant="tagline" component="p" sx={{ mt: 0.5 }}>
          you talk. your money listens.
        </Typography>
      </Box>

      {/* Navigation Items */}
      <Box sx={{ flex: 1, pt: 2 }}>
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  mx: 2,
                  mb: 0.5,
                  color: 'inherit',
                  position: 'relative',
                  backgroundColor: 'transparent !important',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '16px',
                    width: isActive(item.path) ? '80%' : '0%',
                    height: '2px',
                    backgroundColor: 'white',
                    transition: 'width 0.3s ease-in-out',
                    transformOrigin: 'left',
                  },
                  '&:hover::after': {
                    width: '80%',
                    transformOrigin: 'left',
                  },
                  '&:not(:hover)::after': {
                    transformOrigin: 'right',
                  },
                  '& .MuiTouchRipple-root': {
                    display: 'none',
                  },
                }}
              >
                {item.icon && (
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                )}
                <ListItemText
                  primary={
                    <Typography 
                      variant="navigation" 
                      sx={{ 
                        fontWeight: isActive(item.path) ? 700 : 400 
                      }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Settings at Bottom */}
      <Box>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(settingsItem.path)}
              sx={{
                mx: 2,
                my: 1,
                color: 'inherit',
                position: 'relative',
                backgroundColor: 'transparent !important',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '16px',
                  width: isActive(settingsItem.path) ? '80%' : '0%',
                  height: '2px',
                  backgroundColor: 'white',
                  transition: 'width 0.3s ease-in-out',
                  transformOrigin: 'left',
                },
                '&:hover::after': {
                  width: '80%',
                  transformOrigin: 'left',
                },
                '&:not(:hover)::after': {
                  transformOrigin: 'right',
                },
                '& .MuiTouchRipple-root': {
                  display: 'none',
                },
              }}
            >
              {settingsItem.icon && (
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: 40,
                  }}
                >
                  {settingsItem.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={
                  <Typography 
                    variant="navigation"
                    sx={{ 
                      fontWeight: isActive(settingsItem.path) ? 700 : 400 
                    }}
                  >
                    {settingsItem.label}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          anchor="left"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}
    </>
  );
};

export { SIDEBAR_WIDTH };
export default Sidebar;