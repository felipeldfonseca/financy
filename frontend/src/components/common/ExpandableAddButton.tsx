import React, { useState } from 'react';
import {
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';

interface ExpandableAddButtonProps {
  onAddTransaction?: () => void;
  contextType?: 'personal' | 'groups';
  selectedGroupName?: string;
}

const ExpandableAddButton: React.FC<ExpandableAddButtonProps> = ({
  onAddTransaction,
  contextType = 'personal',
  selectedGroupName,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setIsHovered(false);
      setTimeoutId(null);
    }, 100); // 100ms delay before closing
    setTimeoutId(id);
  };

  const getButtonText = () => {
    if (contextType === 'groups' && selectedGroupName) {
      return `Add to ${selectedGroupName}`;
    }
    return contextType === 'groups' ? 'Add to Group' : 'Add Transaction';
  };

  return (
    <Button
      variant="contained"
      onClick={onAddTransaction}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      startIcon={
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '3px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AddIcon sx={{ fontSize: 20, color: 'white', fontWeight: 'bold' }} />
        </Box>
      }
      sx={{
        minWidth: isHovered ? 'auto' : '56px',
        width: isHovered ? 'auto' : '56px',
        height: '56px',
        borderRadius: '28px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
        transition: `all ${isHovered ? '0.5s' : '0.3s'} cubic-bezier(0.4, 0, 0.2, 1)`,
        mr: 2,
        '& .MuiButton-startIcon': {
          marginRight: isHovered ? '8px' : '0',
          marginLeft: '0',
          transition: `margin ${isHovered ? '0.5s' : '0.3s'} cubic-bezier(0.4, 0, 0.2, 1)`,
        },
        '&:hover': {
          background: 'linear-gradient(135deg, #5b5cd6 0%, #7c3aed 100%)',
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px rgba(99, 102, 241, 0.4)',
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'white',
          fontWeight: 600,
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
          opacity: isHovered ? 1 : 0,
          width: isHovered ? 'auto' : '0',
          overflow: 'hidden',
          transition: `all ${isHovered ? '0.25s' : '0.15s'} cubic-bezier(0.4, 0, 0.2, 1)`,
          transitionDelay: isHovered ? '0.1s' : '0s',
        }}
      >
        {getButtonText()}
      </Typography>
    </Button>
  );
};

export default ExpandableAddButton;