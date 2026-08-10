import React from 'react';
import { Box, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { Group as GroupIcon, Person as PersonIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useFinancialContexts } from '../../contexts/ContextsContext';

interface Props {
  /** Called with undefined when the personal view is selected. */
  onChange?: (contextId?: string) => void;
}

/**
 * Switches between the signed-in user's own records and a shared context,
 * where every member's transactions are visible.
 */
export const ContextSwitcher: React.FC<Props> = ({ onChange }) => {
  const { t } = useTranslation('contexts');
  const { contexts, selectedContextId, selectContext } = useFinancialContexts();

  const shared = contexts.filter((context) => context.type !== 'personal');

  if (shared.length === 0) {
    return null;
  }

  const handleChange = (value: string) => {
    const contextId = value || undefined;
    selectContext(contextId);
    onChange?.(contextId);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <TextField
        select
        size="small"
        label={t('switcher.label')}
        value={selectedContextId ?? ''}
        onChange={(event) => handleChange(event.target.value)}
        sx={{ minWidth: 220 }}
      >
        <MenuItem value="">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon fontSize="small" />
            {t('switcher.personal')}
          </Box>
        </MenuItem>

        {shared.map((context) => (
          <MenuItem key={context.id} value={context.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon fontSize="small" sx={{ color: context.color || 'inherit' }} />
              {context.name}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      {selectedContextId ? (
        <Chip size="small" color="primary" variant="outlined" label={t('switcher.sharedView')} />
      ) : (
        <Typography variant="caption" color="text.secondary">
          {t('switcher.personalHint')}
        </Typography>
      )}
    </Box>
  );
};
