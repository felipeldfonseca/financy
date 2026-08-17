import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  Collapse,
  Avatar,
  Typography,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SvgIcon } from '@mui/material';
import { FinancialContext } from '../../services/contextApi';

// Clean minimal SVG icons
const PersonIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <SvgIcon sx={sx} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="3" fill="currentColor" />
    <path
      d="M12 14c-4 0-7 2-7 4.5V20h14v-1.5c0-2.5-3-4.5-7-4.5z"
      fill="currentColor"
    />
  </SvgIcon>
);

const GroupIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <SvgIcon sx={sx} viewBox="0 0 24 24">
    <circle cx="9" cy="7" r="2.5" fill="currentColor" />
    <circle cx="15" cy="7" r="2.5" fill="currentColor" />
    <path
      d="M9 12c-2.5 0-4.5 1.5-4.5 3.5V17h9v-1.5c0-2-2-3.5-4.5-3.5z"
      fill="currentColor"
    />
    <path
      d="M15 12c-2.5 0-4.5 1.5-4.5 3.5V17h9v-1.5c0-2-2-3.5-4.5-3.5z"
      fill="currentColor"
    />
  </SvgIcon>
);

const TYPE_FALLBACK_COLORS: Record<string, string> = {
  family: '#10b981',
  friends: '#6366f1',
  business: '#f59e0b',
  shared_living: '#0ea5e9',
  trip: '#8b5cf6',
  project: '#14b8a6',
  shared: '#ef4444',
};

interface ContextSwitcherProps {
  contextType: 'personal' | 'groups';
  /** The user's shared (non-personal) contexts — the real ones. */
  groups: FinancialContext[];
  selectedGroupId?: string;
  onContextTypeChange: (type: 'personal' | 'groups') => void;
  onGroupSelect: (group: FinancialContext) => void;
}

/**
 * The home screen's "where am I" switch: the personal view, or one of the
 * user's shared contexts. Selection is the app-wide one, so Transactions and
 * Planning follow along.
 */
const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  contextType,
  groups,
  selectedGroupId,
  onContextTypeChange,
  onGroupSelect,
}) => {
  const { t } = useTranslation('dashboard');
  const { t: tContexts } = useTranslation('contexts');
  const navigate = useNavigate();
  const showGroupDropdown = contextType === 'groups';

  const handleContextTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'personal' | 'groups' | null,
  ) => {
    if (newType !== null) {
      onContextTypeChange(newType);
    }
  };

  const groupColor = (group: FinancialContext) =>
    group.color || TYPE_FALLBACK_COLORS[group.type] || '#6b7280';

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
              fontSize: '1rem',
              py: 1.5,
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'text.secondary',
              '&.Mui-selected': {
                background: 'linear-gradient(135deg, #4657D8 0%, #3b47c4 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #3b47c4 0%, #3238b0 100%)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
              },
            },
          }}
        >
          <ToggleButton value="personal">
            <PersonIcon sx={{ mr: 1, fontSize: 22 }} />
            {t('contextSwitcher.personal')}
          </ToggleButton>
          <ToggleButton value="groups">
            <GroupIcon sx={{ mr: 1, fontSize: 22 }} />
            {t('contextSwitcher.groups')}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Group picker */}
        <Collapse in={showGroupDropdown}>
          <Box sx={{ mt: 2 }}>
            {groups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('contextSwitcher.noGroups')}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/contexts')}
                  sx={{ textTransform: 'none', borderRadius: '10px' }}
                >
                  {t('contextSwitcher.createGroup')}
                </Button>
              </Box>
            ) : (
              groups.map((group) => (
                <Box
                  key={group.id}
                  onClick={() => onGroupSelect(group)}
                  sx={{
                    p: 2,
                    mb: 1,
                    borderRadius: '12px',
                    border: selectedGroupId === group.id
                      ? '1px solid rgba(70, 87, 216, 0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: selectedGroupId === group.id
                      ? 'linear-gradient(135deg, rgba(70, 87, 216, 0.15) 0%, rgba(59, 71, 196, 0.1) 100%)'
                      : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedGroupId === group.id ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: selectedGroupId === group.id
                      ? '0 8px 25px rgba(70, 87, 216, 0.2)'
                      : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                      background: selectedGroupId === group.id
                        ? 'linear-gradient(135deg, rgba(70, 87, 216, 0.2) 0%, rgba(59, 71, 196, 0.15) 100%)'
                        : 'rgba(255,255,255,0.08)',
                      transform: 'translateY(-4px)',
                      boxShadow: selectedGroupId === group.id
                        ? '0 12px 35px rgba(70, 87, 216, 0.25)'
                        : '0 8px 25px rgba(0, 0, 0, 0.15)',
                    },
                    '&:active': {
                      transform: 'translateY(-1px)',
                      transition: 'all 0.1s ease',
                    },
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: groupColor(group),
                          fontSize: '0.875rem',
                        }}
                      >
                        {group.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {group.name}
                        </Typography>
                        {group.memberRole && (
                          <Typography variant="caption" color="text.secondary">
                            {tContexts(`roles.${group.memberRole}`)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Chip
                      label={tContexts(`types.${group.type}`)}
                      size="small"
                      sx={{
                        bgcolor: `${groupColor(group)}20`,
                        color: groupColor(group),
                        fontWeight: 500,
                      }}
                    />
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ContextSwitcher;
