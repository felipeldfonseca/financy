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
  receipt: {
    processingPhoto: string;
    processingPdf: string;
    lowConfidence: string;
    notRecognized: string;
    unsupportedFile: string;
    failed: string;
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
    },
    receipt: {
      processingPhoto: '📷 Reading your receipt...',
      processingPdf: '📄 Reading your PDF...',
      lowConfidence: "I read the receipt but couldn't be sure of the details. Please try a clearer image or enter it manually.",
      notRecognized: "I couldn't read a transaction from that. Try a clearer photo, or type the amount and what it was for.",
      unsupportedFile: 'I can read PDF receipts. For other files, send a photo or type the transaction.',
      failed: "Sorry, I couldn't process that file. Please try again."
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
    },
    receipt: {
      processingPhoto: '📷 Lendo seu recibo...',
      processingPdf: '📄 Lendo seu PDF...',
      lowConfidence: 'Li o recibo mas não tive certeza dos detalhes. Tente uma imagem mais nítida ou lance manualmente.',
      notRecognized: 'Não consegui identificar uma transação. Tente uma foto mais nítida, ou digite o valor e do que foi.',
      unsupportedFile: 'Eu leio recibos em PDF. Para outros arquivos, mande uma foto ou digite a transação.',
      failed: 'Desculpe, não consegui processar esse arquivo. Tente novamente.'
    }
  },
  es: {
    conversation: {
      investment: [
        '¡Excelente trabajo construyendo esas inversiones! 🎯',
        '¡Buena jugada de inversión! 📈',
        '¡Inversión inteligente! 💪',
        '¡Me encanta ver esas contribuciones a la inversión! 🚀'
      ],
      savings: [
        '¡Excelente trabajo con esos ahorros! 💰',
        '¡Buen trabajo ahorrando dinero! 🎯',
        '¡Movimiento inteligente de ahorro! 📈',
        '¡Me encanta ver crecer esos ahorros! 💪'
      ],
      income: [
        '¡Genial! Parece que llegaron algunos ingresos 💰',
        '¡Qué bien! Dinero entrando 🎉',
        '¡Perfecto! Ingresos detectados 💵',
        '¡Increíble! Parece que te pagaron 🙌'
      ],
      transfer: [
        '¡Entendido! Movimiento de dinero detectado 💸',
        'Veo esa transferencia 💰',
        '¡Capturé esa transferencia! 📱',
        '¡Transferencia registrada! 🔄'
      ],
      expense: [
        '¡Oye! Capturé ese gasto 💸',
        '¡Entendido! Gasto rastreado 📝',
        'Veo esa compra 🛒',
        '¡Gasto registrado! 💳'
      ]
    },
    confirmation: [
      '¿Se ve bien así?',
      '¿Debo guardar esta transacción?',
      '¿Te parece correcto?',
      '¿Listo para confirmar?',
      '¿Todo listo para guardar?'
    ],
    logged: 'Tengo esto registrado:',
    context: 'Contexto:',
    multipleDetected: 'Múltiples Transacciones Detectadas',
    buttons: {
      confirm: '✅ Confirmar',
      edit: '✏️ Editar',
      cancel: '❌ Cancelar',
      confirmAll: '✅ Confirmar Todo',
      review: '✏️ Revisar',
      cancelAll: '❌ Cancelar Todo'
    },
    receipt: {
      processingPhoto: '📷 Leyendo tu recibo...',
      processingPdf: '📄 Leyendo tu PDF...',
      lowConfidence: 'Leí el recibo pero no pude estar seguro de los detalles. Prueba una imagen más nítida o regístralo manualmente.',
      notRecognized: 'No pude identificar una transacción. Prueba una foto más nítida, o escribe el monto y de qué fue.',
      unsupportedFile: 'Puedo leer recibos en PDF. Para otros archivos, envía una foto o escribe la transacción.',
      failed: 'Lo siento, no pude procesar ese archivo. Inténtalo de nuevo.'
    }
  }
};

export function getTelegramTranslation(language: string = 'en'): TelegramTranslations {
  return telegramTranslations[language] || telegramTranslations['en'];
}