import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Savings as BudgetIcon,
  Edit as EditIcon,
  WarningAmberRounded as OverIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useFinancialContexts } from '../../contexts/ContextsContext';
import { useAuth } from '../../contexts/AuthContext';
import { canManageContext } from '../../utils/contextPermissions';
import { computeBudget } from '../../utils/budget';
import { monthLabel, EXPENSE_POLE } from '../../utils/calendar';

const ACCENT = '#6366f1';
const OVER_INK = '#b45309';

// The committed segment: same hue as spent, but hatched — promised money, not
// yet gone. The texture separates them for print, CVD and forced-colors alike.
const HATCH = `repeating-linear-gradient(45deg, ${EXPENSE_POLE}99 0 4px, transparent 4px 8px)`;

interface Props {
  viewMonth: Date;
  spent: number;
  committed: number;
  currency: string;
}

export const BudgetStatusCard: React.FC<Props> = ({ viewMonth, spent, committed, currency }) => {
  const { t, i18n } = useTranslation('planning');
  const { selectedContext, contexts, updateContext } = useFinancialContexts();
  const { state: authState } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Personal view: the budget lives on the user's own personal context.
  const targetContext =
    selectedContext ??
    contexts.find(
      (context) => context.type === 'personal' && context.ownerId === authState.user?.id,
    );

  const limit = Number(targetContext?.settings?.monthlyBudget) || 0;
  const canEdit = selectedContext
    ? canManageContext(selectedContext.memberRole)
    : Boolean(targetContext);

  const budget = computeBudget({ spent, committed, limit });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(amount);

  const openDialog = () => {
    setLimitInput(limit ? String(limit) : '');
    setError(null);
    setDialogOpen(true);
  };

  const saveLimit = async () => {
    if (!targetContext) return;
    const value = limitInput.trim() === '' ? 0 : parseFloat(limitInput);
    if (Number.isNaN(value) || value < 0) {
      setError(t('budget.invalidLimit'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const settings = { ...(targetContext.settings ?? {}) };
      if (value > 0) {
        settings.monthlyBudget = value;
      } else {
        delete settings.monthlyBudget;
      }
      await updateContext(targetContext.id, { settings });
      setDialogOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const legendSwatch = (background: string, bordered = false) => (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '3px',
        background,
        border: bordered ? '1px solid rgba(0,0,0,0.25)' : undefined,
      }}
    />
  );

  return (
    <Card
      sx={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <BudgetIcon sx={{ fontSize: 32, color: ACCENT }} />
          <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
            {t('budget.title')}
          </Typography>
          {canEdit && budget.hasLimit && (
            <Tooltip title={t('budget.editLimit') as string}>
              <IconButton size="small" onClick={openDialog} aria-label={t('budget.editLimit') as string}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {monthLabel(viewMonth, i18n.language)}
          {budget.hasLimit ? ` · ${t('budget.limitOf', { amount: formatCurrency(limit) })}` : ''}
        </Typography>

        {!budget.hasLimit ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
              {t('budget.noLimit')}
            </Typography>
            {canEdit && (
              <Button variant="outlined" onClick={openDialog} sx={{ textTransform: 'none' }}>
                {t('budget.setLimit')}
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* One bar, three quantities: solid = spent, hatched = committed to
                open bills, track = still free. 2px gaps keep segments apart. */}
            <Box
              sx={{
                display: 'flex',
                gap: '2px',
                height: 16,
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.06)',
                mb: 2,
              }}
              role="img"
              aria-label={t('budget.barLabel', {
                spent: formatCurrency(spent),
                committed: formatCurrency(committed),
                remaining: formatCurrency(budget.remaining),
              }) as string}
            >
              {budget.spentPct > 0 && (
                <Box sx={{ width: `${budget.spentPct}%`, background: EXPENSE_POLE }} />
              )}
              {budget.committedPct > 0 && (
                <Box sx={{ width: `${budget.committedPct}%`, background: HATCH }} />
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {legendSwatch(EXPENSE_POLE)}
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {t('budget.spent')}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(spent)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {legendSwatch(HATCH, true)}
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {t('budget.committed')}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(committed)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {legendSwatch('rgba(0,0,0,0.06)', true)}
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {t('budget.remaining')}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formatCurrency(budget.remaining)}
                </Typography>
              </Box>
            </Box>

            {budget.overBy > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <OverIcon sx={{ fontSize: 18, color: OVER_INK }} />
                <Typography variant="body2" sx={{ color: OVER_INK, fontWeight: 700 }}>
                  {t('budget.overBy', { amount: formatCurrency(budget.overBy) })}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{t('budget.dialogTitle')}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              label={t('budget.dialogLabel')}
              value={limitInput}
              onChange={(event) => setLimitInput(event.target.value)}
              fullWidth
              autoFocus
              type="number"
              inputProps={{ min: 0, step: 50 }}
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {t('budget.dialogHint')}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
              {t('budget.cancel')}
            </Button>
            <Button onClick={saveLimit} variant="contained" disabled={isSaving}>
              {t('budget.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};
