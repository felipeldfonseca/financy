import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const TransactionsPage: React.FC = () => {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        Transactions
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          Transaction management will be implemented in Phase 3
        </Typography>
      </Paper>
    </Container>
  );
};

export default TransactionsPage;