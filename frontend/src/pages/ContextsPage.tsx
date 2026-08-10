import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  MoreVert as MoreIcon,
  People as PeopleIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinancialContexts } from '../contexts/ContextsContext';
import { CreateContextData, FinancialContext } from '../services/contextApi';
import { ContextFormDialog } from '../components/contexts/ContextFormDialog';
import { ContextMembersDialog } from '../components/contexts/ContextMembersDialog';
import { useAuth } from '../contexts/AuthContext';

const ContextCard: React.FC<{
  context: FinancialContext;
  isOwner: boolean;
  onOpenMembers: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLeave: () => void;
  onViewTransactions: () => void;
}> = ({ context, isOwner, onOpenMembers, onEdit, onDelete, onLeave, onViewTransactions }) => {
  const { t } = useTranslation('contexts');
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const accent = context.color || '#1976d2';

  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        borderTop: `4px solid ${accent}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 18px 36px rgba(0,0,0,0.12)',
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: `${accent}22`,
                color: accent,
                flexShrink: 0,
              }}
            >
              <GroupIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap title={context.name}>
                {context.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t(`types.${context.type}`)} · {context.defaultCurrency}
              </Typography>
            </Box>
          </Box>

          <IconButton size="small" onClick={(event) => setAnchor(event.currentTarget)} aria-label={t('actions.more')}>
            <MoreIcon />
          </IconButton>

          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem
              onClick={() => {
                setAnchor(null);
                onViewTransactions();
              }}
            >
              {t('actions.viewTransactions')}
            </MenuItem>
            {isOwner && (
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onEdit();
                }}
              >
                {t('actions.edit')}
              </MenuItem>
            )}
            {isOwner ? (
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onDelete();
                }}
              >
                {t('actions.delete')}
              </MenuItem>
            ) : (
              <MenuItem
                onClick={() => {
                  setAnchor(null);
                  onLeave();
                }}
              >
                {t('actions.leave')}
              </MenuItem>
            )}
          </Menu>
        </Box>

        {context.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {context.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          {isOwner && <Chip size="small" label={t('roles.owner')} />}
          <Chip size="small" variant="outlined" label={t(`visibility.${context.visibility}`)} />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button size="small" startIcon={<PeopleIcon />} onClick={onOpenMembers}>
            {t('actions.members')}
          </Button>
          <Tooltip title={t('actions.viewTransactionsHint')}>
            <Button size="small" startIcon={<ViewIcon />} onClick={onViewTransactions}>
              {t('actions.transactions')}
            </Button>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

const ContextsPage: React.FC = () => {
  const { t } = useTranslation('contexts');
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const {
    contexts,
    isLoading,
    error,
    reload,
    createContext,
    updateContext,
    deleteContext,
    leaveContext,
    selectContext,
  } = useFinancialContexts();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialContext | null>(null);
  const [membersFor, setMembersFor] = useState<FinancialContext | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const shared = contexts.filter((context) => context.type !== 'personal');

  const submit = async (data: CreateContextData) => {
    if (editing) {
      await updateContext(editing.id, data);
      return;
    }
    await createContext(data);
  };

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message);
    }
  };

  const openTransactions = (context: FinancialContext) => {
    selectContext(context.id);
    navigate('/transactions');
  };

  return (
    <Box sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 1,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {t('actions.create')}
        </Button>
      </Box>

      {(error || actionError) && (
        <Alert severity="error" sx={{ my: 2 }} onClose={() => setActionError(null)}>
          {actionError || error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : shared.length === 0 ? (
        <Card
          sx={{
            mt: 3,
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
          }}
        >
          <GroupIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <Typography variant="h6" sx={{ mt: 1 }}>
            {t('empty.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('empty.description')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {t('empty.action')}
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {shared.map((context) => (
            <Grid item xs={12} sm={6} md={4} key={context.id}>
              <ContextCard
                context={context}
                isOwner={context.ownerId === authState.user?.id}
                onOpenMembers={() => setMembersFor(context)}
                onEdit={() => {
                  setEditing(context);
                  setFormOpen(true);
                }}
                onDelete={() =>
                  runAction(async () => {
                    if (window.confirm(t('confirm.delete', { name: context.name }))) {
                      await deleteContext(context.id);
                    }
                  })
                }
                onLeave={() =>
                  runAction(async () => {
                    if (window.confirm(t('confirm.leave', { name: context.name }))) {
                      await leaveContext(context.id);
                    }
                  })
                }
                onViewTransactions={() => openTransactions(context)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <ContextFormDialog
        open={formOpen}
        context={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
      />

      <ContextMembersDialog
        open={Boolean(membersFor)}
        context={membersFor}
        onClose={() => {
          setMembersFor(null);
          reload();
        }}
      />
    </Box>
  );
};

export default ContextsPage;
