import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          Settings will be implemented throughout development phases
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;