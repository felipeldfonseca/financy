import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Avatar,
  Typography,
  Chip,
} from '@mui/material';
import {
  Groups as GroupIcon,
  PersonOutline as PersonIcon,
} from '@mui/icons-material';

interface Group {
  id: string;
  name: string;
  memberCount: number;
  type: 'family' | 'friends' | 'business' | 'shared';
  color: string;
}

interface ContextSwitcherProps {
  contextType: 'personal' | 'groups';
  selectedGroup?: Group | null;
  groups?: Group[];
  onContextTypeChange: (type: 'personal' | 'groups') => void;
  onGroupSelect?: (group: Group) => void;
}

const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  contextType,
  selectedGroup,
  groups = [],
  onContextTypeChange,
  onGroupSelect,
}) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(contextType === 'groups');

  // Mock data for demonstration
  const defaultGroups: Group[] = [
    { id: '1', name: 'Family Budget', memberCount: 4, type: 'family', color: '#10b981' },
    { id: '2', name: 'Trip Planning', memberCount: 6, type: 'friends', color: '#6366f1' },
    { id: '3', name: 'Startup Expenses', memberCount: 3, type: 'business', color: '#f59e0b' },
  ];

  const displayGroups = groups.length > 0 ? groups : defaultGroups;

  const handleContextTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'personal' | 'groups' | null,
  ) => {
    if (newType !== null) {
      onContextTypeChange(newType);
      setShowGroupDropdown(newType === 'groups');
    }
  };

  const getTypeTagColor = (type: string) => {
    switch (type) {
      case 'family': return '#10b981';
      case 'friends': return '#6366f1';
      case 'business': return '#f59e0b';
      case 'shared': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleGroupSelect = (group: Group) => {
    if (onGroupSelect) {
      onGroupSelect(group);
    }
  };

  return (
    <Card sx={{ 
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      transition: 'all 0.3s ease',
    }}>
      <CardContent sx={{ p: 3 }}>
        <ToggleButtonGroup
          value={contextType}
          exclusive
          onChange={handleContextTypeChange}
          sx={{
            width: '100%',
            mb: showGroupDropdown ? 2 : 0,
            '& .MuiToggleButton-root': {
              flex: 1,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 500,
              py: 1.5,
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'text.secondary',
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5b5cd6 0%, #7c3aed 100%)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            },
          }}
        >
          <ToggleButton value="personal">
            <PersonIcon sx={{ mr: 1, fontSize: 18 }} />
            Personal
          </ToggleButton>
          <ToggleButton value="groups">
            <GroupIcon sx={{ mr: 1, fontSize: 18 }} />
            Groups
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Group Dropdown */}
        <Collapse in={showGroupDropdown}>
          <Box sx={{ mt: 2 }}>
            {displayGroups.map((group) => (
              <Box
                key={group.id}
                onClick={() => handleGroupSelect(group)}
                sx={{
                  p: 2,
                  mb: 1,
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: selectedGroup?.id === group.id 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                    : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.05)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: group.color, fontSize: '0.875rem' }}>
                      {group.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {group.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Typography component="span" variant="numeric">{group.memberCount}</Typography> members
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={group.type}
                    size="small"
                    sx={{
                      bgcolor: `${getTypeTagColor(group.type)}20`,
                      color: getTypeTagColor(group.type),
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ContextSwitcher;