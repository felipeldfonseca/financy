import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          Settings will be implemented throughout development phases
        </Typography>
      </Paper>
    </Container>
  );
};

export default SettingsPage;