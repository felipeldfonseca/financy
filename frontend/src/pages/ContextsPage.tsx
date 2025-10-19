import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const ContextsPage: React.FC = () => {
  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Typography variant='h4' component='h1' gutterBottom>
        Contexts
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          Context management will be implemented in Phase 2
        </Typography>
      </Paper>
    </Container>
  );
};

export default ContextsPage;