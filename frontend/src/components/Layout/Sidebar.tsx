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
    icon: <DashboardIcon />,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: '/transactions',
    icon: <TransactionsIcon />,
  },
  {
    id: 'groups',
    label: 'Groups',
    path: '/contexts',
    icon: <GroupsIcon />,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: <AnalyticsIcon />,
  },
];

const settingsItem: NavigationItem = {
  id: 'settings',
  label: 'Settings',
  path: '/settings',
  icon: <SettingsIcon />,
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
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${theme.palette.primary.dark}`,
        }}
      >
        <Typography variant="brand" component="h1">
          financy
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
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 1,
                  color: 'inherit',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&.active': {
                    bgcolor: 'primary.dark',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
                className={isActive(item.path) ? 'active' : ''}
              >
                <ListItemIcon
                  sx={{
                    color: 'inherit',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="navigation">{item.label}</Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Settings at Bottom */}
      <Box>
        <Divider sx={{ bgcolor: 'primary.dark', mx: 2 }} />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(settingsItem.path)}
              sx={{
                mx: 1,
                my: 1,
                borderRadius: 1,
                color: 'inherit',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.active': {
                  bgcolor: 'primary.dark',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                },
              }}
              className={isActive(settingsItem.path) ? 'active' : ''}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  minWidth: 40,
                }}
              >
                {settingsItem.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="navigation">{settingsItem.label}</Typography>
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