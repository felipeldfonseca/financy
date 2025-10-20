import React from 'react';
import { Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: 8 }}>
      <Box textAlign='center' sx={{ maxWidth: 'lg', mx: 'auto' }}>
        <Typography variant='h2' component='h1' gutterBottom>
          Welcome to Financy
        </Typography>
        <Typography variant='h5' color='text.secondary' paragraph>
          Your conversational financial assistant
        </Typography>
        <Typography variant='body1' color='text.secondary' paragraph>
          Transform natural language messages into structured financial
          transactions
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button
            variant='contained'
            size='large'
            sx={{ mr: 2 }}
            onClick={() => navigate('/register')}
          >
            Get Started
          </Button>
          <Button
            variant='outlined'
            size='large'
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;