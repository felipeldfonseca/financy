import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  EventNote as CalendarIcon,
  MoreVert as MoreVertIcon,
  TaskAlt as PaidIcon,
  WarningAmberRounded as OverdueIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { billApi, Bill, CreateBillData, PayBillData } from '../../services/billApi';
import { useFinancialContexts } from '../../contexts/ContextsContext';
import { useAuth } from '../../contexts/AuthContext';
import { canModifyTransaction } from '../../utils/contextPermissions';
import { canPayBills, isBillOverdue, parseLocalDate, sumByCurrency } from '../../utils/bills';
import { BillFormDialog } from './BillFormDialog';
import { PayBillDialog } from './PayBillDialog';

const ACCENT = '#f59e0b';

/**
 * The "Contas Pendentes" section: every open bill of the current view,
 * soonest due first, with overdue ones flagged and settleable in place.
 */
export const UpcomingBillsCard: React.FC = () => {
  const { t, i18n } = useTranslation(['planning', 'transactions']);
  const { selectedContextId, selectedContext } = useFinancialContexts();
  const { state: authState } = useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; bill: Bill } | null>(null);
  const [paidMessage, setPaidMessage] = useState<string | null>(null);

  const contextRole = selectedContext?.memberRole;
  const currentUserId = authState.user?.id;
  const defaultCurrency =
    selectedContext?.defaultCurrency || authState.user?.defaultCurrency || 'BRL';

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setBills(await billApi.list({ contextId: selectedContextId, status: 'open' }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedContextId]);

  useEffect(() => {
    load();
  }, [load]);

  const formatCurrency = useCallback(
    (amount: number, currency: string) =>
      new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(amount),
    [i18n.language],
  );

  const formatDueDate = useCallback(
    (isoDate: string) => {
      const date = parseLocalDate(isoDate);
      const sameYear = date.getFullYear() === new Date().getFullYear();
      return date.toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        ...(sameYear ? {} : { year: 'numeric' }),
      });
    },
    [i18n.language],
  );

  const pendingTotals = useMemo(() => sumByCurrency(bills), [bills]);

  const createBill = async (data: CreateBillData) => {
    await billApi.create({ ...data, contextId: selectedContextId });
    await load();
  };

  const updateBill = async (data: CreateBillData) => {
    if (!editingBill) return;
    const { contextId: _ignored, ...changes } = data;
    await billApi.update(editingBill.id, changes);
    await load();
  };

  const payBill = async (data: PayBillData) => {
    if (!payingBill) return;
    const result = await billApi.pay(payingBill.id, data);
    // An installment or recurring bill leaves a successor behind; say so.
    setPaidMessage(
      result.nextBill
        ? t('planning:bills.paidWithNext', { date: formatDueDate(result.nextBill.dueDate) })
        : (t('planning:bills.paid') as string),
    );
    await load();
  };

  const deleteBill = async (bill: Bill) => {
    setMenuAnchor(null);
    if (!window.confirm(t('planning:bills.deleteConfirm', { description: bill.description }))) {
      return;
    }

    try {
      await billApi.remove(bill.id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  return (
    <Card
      sx={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        height: '100%',
        minHeight: 400,
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <CalendarIcon sx={{ fontSize: 32, color: ACCENT }} />
          <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
            {t('planning:bills.title')}
          </Typography>
          {canPayBills(contextRole) && (
            <Tooltip title={t('planning:bills.add') as string}>
              <IconButton
                onClick={() => {
                  setEditingBill(null);
                  setFormOpen(true);
                }}
                aria-label={t('planning:bills.add') as string}
                sx={{
                  color: ACCENT,
                  border: `1px solid ${ACCENT}55`,
                  borderRadius: '12px',
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : bills.length === 0 ? (
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
            <PaidIcon sx={{ fontSize: 56, color: ACCENT, opacity: 0.6 }} />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
              {t('planning:bills.empty')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {bills.map((bill) => {
              const overdue = isBillOverdue(bill);
              const canModify = canModifyTransaction({
                transactionUserId: bill.userId,
                currentUserId,
                contextRole,
              });

              return (
                <Box
                  key={bill.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 2,
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: overdue
                      ? `1px solid ${ACCENT}88`
                      : '1px solid rgba(255,255,255,0.08)',
                    borderLeft: overdue ? `4px solid ${ACCENT}` : undefined,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography fontWeight={600} noWrap sx={{ maxWidth: '100%' }}>
                        {bill.description}
                      </Typography>
                      {bill.installmentNumber && bill.installmentTotal && (
                        <Chip
                          size="small"
                          label={t('planning:bills.installment', {
                            number: bill.installmentNumber,
                            total: bill.installmentTotal,
                          })}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {bill.recurrenceRule && (
                        <Chip
                          size="small"
                          label={`🔁 ${t(`planning:bills.form.recurrenceOptions.${bill.recurrenceRule}`)}`}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}
                    >
                      {overdue && (
                        // Icon + text, never colour alone, so the state
                        // survives any kind of colour vision.
                        <Chip
                          size="small"
                          icon={<OverdueIcon sx={{ fontSize: 14 }} />}
                          label={t('planning:bills.overdue')}
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: ACCENT,
                            background: `${ACCENT}1a`,
                            border: `1px solid ${ACCENT}66`,
                          }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {overdue
                          ? t('planning:bills.overdueSince', { date: formatDueDate(bill.dueDate) })
                          : t('planning:bills.dueOn', { date: formatDueDate(bill.dueDate) })}
                        {bill.merchantName ? ` · ${bill.merchantName}` : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="numeric" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                    {formatCurrency(Number(bill.amount), bill.currency)}
                  </Typography>

                  {canPayBills(contextRole) && (
                    <Chip
                      label={t('planning:bills.pay')}
                      onClick={() => setPayingBill(bill)}
                      sx={{
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        '&:hover': { background: 'rgba(16, 185, 129, 0.24)' },
                      }}
                    />
                  )}

                  {canModify && (
                    <IconButton
                      size="small"
                      aria-label={t('planning:bills.rowMenu') as string}
                      onClick={(event) => setMenuAnchor({ element: event.currentTarget, bill })}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })}

            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('planning:bills.totalPending')}
              </Typography>
              <Typography variant="numeric" fontWeight={700}>
                {pendingTotals
                  .map(({ currency, total }) => formatCurrency(total, currency))
                  .join(' · ')}
              </Typography>
            </Box>
          </Box>
        )}

        <Menu
          anchorEl={menuAnchor?.element}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              if (menuAnchor) {
                setEditingBill(menuAnchor.bill);
                setFormOpen(true);
              }
              setMenuAnchor(null);
            }}
          >
            {t('planning:bills.menu.edit')}
          </MenuItem>
          <MenuItem onClick={() => menuAnchor && deleteBill(menuAnchor.bill)}>
            {t('planning:bills.menu.delete')}
          </MenuItem>
        </Menu>

        <BillFormDialog
          open={formOpen}
          bill={editingBill}
          defaultCurrency={defaultCurrency}
          onClose={() => {
            setFormOpen(false);
            setEditingBill(null);
          }}
          onSubmit={editingBill ? updateBill : createBill}
        />

        <PayBillDialog
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onConfirm={payBill}
        />

        <Snackbar
          open={Boolean(paidMessage)}
          autoHideDuration={5000}
          onClose={() => setPaidMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setPaidMessage(null)}>
            {paidMessage}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};
