import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const AnalyticsPage: React.FC = () => {
  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Detailed financial analytics and reports coming soon.
        </Typography>
      </Box>
      
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Advanced Analytics Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This page will include detailed financial reports, trends analysis, budget tracking, and custom date range analytics.
        </Typography>
      </Paper>
    </Box>
  );
};

export default AnalyticsPage;