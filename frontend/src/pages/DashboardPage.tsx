import React from 'react';
import { Container, Typography, Grid, Paper, Box } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant='h6' gutterBottom>
              Recent Transactions
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Transaction list will be implemented in Phase 3
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant='h6' gutterBottom>
              Spending Overview
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Charts will be implemented in Phase 5
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;