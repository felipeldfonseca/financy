export interface TelegramTranslations {
  conversation: {
    investment: string[];
    savings: string[];
    income: string[];
    transfer: string[];
    expense: string[];
  };
  confirmation: string[];
  logged: string;
  context: string;
  multipleDetected: string;
  buttons: {
    confirm: string;
    edit: string;
    cancel: string;
    confirmAll: string;
    review: string;
    cancelAll: string;
  };
}

export const telegramTranslations: Record<string, TelegramTranslations> = {
  en: {
    conversation: {
      investment: [
        'Great job building those investments! 🎯',
        'Nice investment move! 📈',
        'Smart investing there! 💪',
        'Love seeing those investment contributions! 🚀'
      ],
      savings: [
        'Excellent work on those savings! 💰',
        'Great job putting money aside! 🎯',
        'Smart saving move! 📈',
        'Love seeing those savings grow! 💪'
      ],
      income: [
        'Nice! Looks like some income came in 💰',
        'Sweet! Money coming in 🎉',
        'Great! Income detected 💵',
        'Awesome! Looks like you got paid 🙌'
      ],
      transfer: [
        'Got it! Money movement detected 💸',
        'I see that transfer 💰',
        'Caught that money transfer! 📱',
        'Transfer logged! 🔄'
      ],
      expense: [
        'Hey! I caught that expense 💸',
        'Got it! Expense tracked 📝',
        'I see that purchase 🛒',
        'Expense logged! 💳'
      ]
    },
    confirmation: [
      'Does this look right?',
      'Should I save this transaction?',
      'Look good to you?',
      'Ready to confirm?',
      'All set to save?'
    ],
    logged: "I've got this logged:",
    context: 'Context:',
    multipleDetected: 'Multiple Transactions Detected',
    buttons: {
      confirm: '✅ Confirm',
      edit: '✏️ Edit',
      cancel: '❌ Cancel',
      confirmAll: '✅ Confirm All',
      review: '✏️ Review',
      cancelAll: '❌ Cancel All'
    }
  },
  pt: {
    conversation: {
      investment: [
        'Ótimo trabalho construindo esses investimentos! 🎯',
        'Boa jogada de investimento! 📈',
        'Investimento inteligente! 💪',
        'Adoro ver essas contribuições para investimento! 🚀'
      ],
      savings: [
        'Excelente trabalho com essas economias! 💰',
        'Ótimo trabalho guardando dinheiro! 🎯',
        'Jogada inteligente de poupança! 📈',
        'Adoro ver essas economias crescerem! 💪'
      ],
      income: [
        'Legal! Parece que chegou uma renda 💰',
        'Show! Dinheiro entrando 🎉',
        'Ótimo! Renda detectada 💵',
        'Massa! Parece que você foi pago 🙌'
      ],
      transfer: [
        'Entendi! Movimento de dinheiro detectado 💸',
        'Vejo essa transferência 💰',
        'Peguei essa transferência! 📱',
        'Transferência registrada! 🔄'
      ],
      expense: [
        'Opa! Peguei essa despesa 💸',
        'Entendi! Despesa rastreada 📝',
        'Vejo essa compra 🛒',
        'Despesa registrada! 💳'
      ]
    },
    confirmation: [
      'Está correto assim?',
      'Devo salvar essa transação?',
      'Parece certo para você?',
      'Pronto para confirmar?',
      'Tudo pronto para salvar?'
    ],
    logged: 'Registrei isso aqui:',
    context: 'Contexto:',
    multipleDetected: 'Múltiplas Transações Detectadas',
    buttons: {
      confirm: '✅ Confirmar',
      edit: '✏️ Editar',
      cancel: '❌ Cancelar',
      confirmAll: '✅ Confirmar Todas',
      review: '✏️ Revisar',
      cancelAll: '❌ Cancelar Todas'
    }
  }
};

export function getTelegramTranslation(language: string = 'en'): TelegramTranslations {
  return telegramTranslations[language] || telegramTranslations['en'];
}