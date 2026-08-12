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
    alreadyPaid: string;
    registerBill: string;
    settle: string;
  };
  receipt: {
    processingPhoto: string;
    processingPdf: string;
    lowConfidence: string;
    notRecognized: string;
    unsupportedFile: string;
    failed: string;
  };
  bills: {
    detected: string;
    dueLabel: string;
    overdueTag: string;
    question: string;
    registered: string;
    registeredOverdue: string;
    settleConfirm: string;
    settleQuestion: string;
    payingAmount: string;
    settleOptions: string;
    settled: string;
    alreadyPaid: string;
    noPermission: string;
    expired: string;
    cancelled: string;
    nextInstallment: string;
    nextOccurrence: string;
    reminderDueToday: string;
    reminderOverdue: string;
    reminderHint: string;
  };
}

/**
 * Fills {name} placeholders in a translated string. Kept deliberately dumb —
 * a missing variable leaves the placeholder visible, which is easier to spot
 * and report than a silently empty slot.
 */
export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  );
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
      cancelAll: '❌ Cancel All',
      alreadyPaid: '✅ Already paid',
      registerBill: '📅 Bill to pay',
      settle: '✅ Yes, mark as paid'
    },
    receipt: {
      processingPhoto: '📷 Reading your receipt...',
      processingPdf: '📄 Reading your PDF...',
      lowConfidence: "I read the receipt but couldn't be sure of the details. Please try a clearer image or enter it manually.",
      notRecognized: "I couldn't read a transaction from that. Try a clearer photo, or type the amount and what it was for.",
      unsupportedFile: 'I can read PDF receipts. For other files, send a photo or type the transaction.',
      failed: "Sorry, I couldn't process that file. Please try again."
    },
    bills: {
      detected: '📄 <b>This looks like a bill</b>',
      dueLabel: 'Due date:',
      overdueTag: '⚠️ overdue',
      question: 'Have you already paid it?',
      registered: '📅 Bill registered: <b>{description}</b> — due {date}.\nYou will find it under Planning → Upcoming Bills.',
      registeredOverdue: '📅 Bill registered: <b>{description}</b> — was due {date} and is <b>overdue</b>.\nYou will find it under Planning → Upcoming Bills.',
      settleConfirm: 'I found this open bill:',
      settleQuestion: 'Mark it as paid?',
      payingAmount: 'I will record a payment of <b>{amount}</b>.',
      settleOptions: 'I found these open bills. Which one did you pay?',
      settled: '✅ Bill paid! <b>{description}</b> — the {amount} expense was recorded in your name.',
      alreadyPaid: 'That bill is already settled.',
      noPermission: 'You cannot record payments in that context.',
      expired: 'That request expired. Please send the message again.',
      cancelled: 'Ok, cancelled. To log it as a regular expense, just describe it again.',
      nextInstallment: '📅 Next installment {number}/{total} created — due {date}.',
      nextOccurrence: '🔁 Next occurrence created — due {date}.',
      reminderDueToday: '🔔 <b>Bill due today</b>\n\n💰 <b>{amount}</b> — {description}\n📅 Due: {date}',
      reminderOverdue: '🔔 <b>Overdue bill</b>\n\n💰 <b>{amount}</b> — {description}\n📅 Was due: {date}',
      reminderHint: 'Already paid it? Tap below and I will record the expense in your name.'
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
      cancelAll: '❌ Cancelar Todas',
      alreadyPaid: '✅ Já paguei',
      registerBill: '📅 Conta a pagar',
      settle: '✅ Sim, marcar como paga'
    },
    receipt: {
      processingPhoto: '📷 Lendo seu recibo...',
      processingPdf: '📄 Lendo seu PDF...',
      lowConfidence: 'Li o recibo mas não tive certeza dos detalhes. Tente uma imagem mais nítida ou lance manualmente.',
      notRecognized: 'Não consegui identificar uma transação. Tente uma foto mais nítida, ou digite o valor e do que foi.',
      unsupportedFile: 'Eu leio recibos em PDF. Para outros arquivos, mande uma foto ou digite a transação.',
      failed: 'Desculpe, não consegui processar esse arquivo. Tente novamente.'
    },
    bills: {
      detected: '📄 <b>Isso parece uma conta</b>',
      dueLabel: 'Vencimento:',
      overdueTag: '⚠️ em atraso',
      question: 'Você já pagou essa conta?',
      registered: '📅 Conta registrada: <b>{description}</b> — vence {date}.\nEla aparece em Planejamento → Contas Pendentes.',
      registeredOverdue: '📅 Conta registrada: <b>{description}</b> — venceu {date} e está <b>em atraso</b>.\nEla aparece em Planejamento → Contas Pendentes.',
      settleConfirm: 'Encontrei esta conta em aberto:',
      settleQuestion: 'Marcar como paga?',
      payingAmount: 'Vou lançar um pagamento de <b>{amount}</b>.',
      settleOptions: 'Encontrei estas contas em aberto. Qual delas você pagou?',
      settled: '✅ Conta paga! <b>{description}</b> — a despesa de {amount} foi lançada no seu nome.',
      alreadyPaid: 'Essa conta já estava paga.',
      noPermission: 'Você não pode lançar pagamentos nesse contexto.',
      expired: 'Esse pedido expirou. Envie a mensagem de novo.',
      cancelled: 'Ok, cancelei. Para lançar como despesa normal, é só descrever de novo.',
      nextInstallment: '📅 Próxima parcela {number}/{total} criada — vence {date}.',
      nextOccurrence: '🔁 Próxima cobrança criada — vence {date}.',
      reminderDueToday: '🔔 <b>Conta vence hoje</b>\n\n💰 <b>{amount}</b> — {description}\n📅 Vencimento: {date}',
      reminderOverdue: '🔔 <b>Conta em atraso</b>\n\n💰 <b>{amount}</b> — {description}\n📅 Venceu: {date}',
      reminderHint: 'Já pagou? Toque abaixo que eu lanço a despesa no seu nome.'
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
      cancelAll: '❌ Cancelar Todo',
      alreadyPaid: '✅ Ya pagué',
      registerBill: '📅 Cuenta por pagar',
      settle: '✅ Sí, marcar como pagada'
    },
    receipt: {
      processingPhoto: '📷 Leyendo tu recibo...',
      processingPdf: '📄 Leyendo tu PDF...',
      lowConfidence: 'Leí el recibo pero no pude estar seguro de los detalles. Prueba una imagen más nítida o regístralo manualmente.',
      notRecognized: 'No pude identificar una transacción. Prueba una foto más nítida, o escribe el monto y de qué fue.',
      unsupportedFile: 'Puedo leer recibos en PDF. Para otros archivos, envía una foto o escribe la transacción.',
      failed: 'Lo siento, no pude procesar ese archivo. Inténtalo de nuevo.'
    },
    bills: {
      detected: '📄 <b>Esto parece una cuenta</b>',
      dueLabel: 'Vencimiento:',
      overdueTag: '⚠️ vencida',
      question: '¿Ya pagaste esta cuenta?',
      registered: '📅 Cuenta registrada: <b>{description}</b> — vence {date}.\nLa encuentras en Planificación → Cuentas Pendientes.',
      registeredOverdue: '📅 Cuenta registrada: <b>{description}</b> — venció {date} y está <b>vencida</b>.\nLa encuentras en Planificación → Cuentas Pendientes.',
      settleConfirm: 'Encontré esta cuenta abierta:',
      settleQuestion: '¿Marcarla como pagada?',
      payingAmount: 'Registraré un pago de <b>{amount}</b>.',
      settleOptions: 'Encontré estas cuentas abiertas. ¿Cuál pagaste?',
      settled: '✅ ¡Cuenta pagada! <b>{description}</b> — el gasto de {amount} se registró a tu nombre.',
      alreadyPaid: 'Esa cuenta ya estaba pagada.',
      noPermission: 'No puedes registrar pagos en ese contexto.',
      expired: 'Esa solicitud expiró. Envía el mensaje de nuevo.',
      cancelled: 'Ok, cancelado. Para registrarlo como gasto normal, descríbelo de nuevo.',
      nextInstallment: '📅 Próxima cuota {number}/{total} creada — vence {date}.',
      nextOccurrence: '🔁 Próximo cobro creado — vence {date}.',
      reminderDueToday: '🔔 <b>Cuenta vence hoy</b>\n\n💰 <b>{amount}</b> — {description}\n📅 Vencimiento: {date}',
      reminderOverdue: '🔔 <b>Cuenta vencida</b>\n\n💰 <b>{amount}</b> — {description}\n📅 Venció: {date}',
      reminderHint: '¿Ya la pagaste? Toca abajo y registro el gasto a tu nombre.'
    }
  }
};

export function getTelegramTranslation(language: string = 'en'): TelegramTranslations {
  return telegramTranslations[language] || telegramTranslations['en'];
}