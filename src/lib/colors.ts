export const PROFIT_LOSS_COLORS = {
  profit: '#00D084',
  loss: '#FF3366',
  profitBorder: '#008A55',
  lossBorder: '#B81F45',
  profitSurface: 'rgba(0, 208, 132, 0.1)',
  lossSurface: 'rgba(255, 51, 102, 0.1)',
} as const

export const profitLossColor = (value: number) =>
  value >= 0 ? PROFIT_LOSS_COLORS.profit : PROFIT_LOSS_COLORS.loss

export const profitLossBorderColor = (value: number) =>
  value >= 0 ? PROFIT_LOSS_COLORS.profitBorder : PROFIT_LOSS_COLORS.lossBorder
