import React, { ReactNode, useState } from 'react';
import { Box, useTheme, useMediaQuery, IconButton, AppBar, Toolbar } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile AppBar with Menu Button */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            width: '100%',
            bgcolor: 'primary.main',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleDrawerToggle} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          marginLeft: {
            xs: 0,
            md: `${SIDEBAR_WIDTH}px`,
          },
          paddingTop: {
            xs: '64px', // AppBar height on mobile
            md: 0,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;