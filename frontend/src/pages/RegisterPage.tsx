import React from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';

const RegisterPage: React.FC = () => {
  return (
    <Container maxWidth='sm' sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box textAlign='center'>
          <Typography variant='h4' component='h1' gutterBottom>
            Create Account
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Registration form will be implemented in Phase 1
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage;