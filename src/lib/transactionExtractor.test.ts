import { describe, it, expect } from 'vitest';
import { extractTransactionsFromLines } from './transactionExtractor';

describe('extractTransactionsFromLines', () => {
  it('extrai lançamentos no formato Data | Histórico | Valor | Saldo', () => {
    const lines = [
      '01/03/2024 PIX TRANSF JOAO 1.000,00 5.000,00',
      '02/03/2024 PAG BOLETO ENERGIA 250,00 4.750,00',
    ];

    const result = extractTransactionsFromLines(lines);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2024-03-01',
      description: 'PIX TRANSF JOAO',
      value: 1000,
      type: 'income',
    });
    expect(result[1]).toMatchObject({
      date: '2024-03-02',
      description: 'PAG BOLETO ENERGIA',
      value: -250,
      type: 'expense',
    });
  });

  it('reaproveita a data quando o banco só a mostra na primeira linha do dia', () => {
    const lines = [
      '05/03/2024 PIX RECEBIDO MARIA 300,00 5.050,00',
      'PAG BOLETO AGUA 100,00 4.950,00',
    ];

    const result = extractTransactionsFromLines(lines);

    expect(result).toHaveLength(2);
    expect(result[1].date).toBe('2024-03-05');
    expect(result[1].value).toBe(-100);
  });

  it('trata valores negativos com "-", "D" e "()" e positivos com "C"', () => {
    const lines = [
      '10/03/2024 TARIFA 35,00- 4.915,00',
      '11/03/2024 DEBITO 20,00 D 4.895,00',
      '12/03/2024 CREDITO 50,00 C 4.945,00',
      '13/03/2024 ESTORNO (10,00) 4.935,00',
    ];

    const result = extractTransactionsFromLines(lines);

    expect(result.map((t) => t.value)).toEqual([-35, -20, 50, -10]);
  });

  it('aceita data curta DD/MM', () => {
    const lines = ['15/03 PIX RECEBIDO 100,00'];

    const [tx] = extractTransactionsFromLines(lines);

    expect(tx.date).toBe(`${new Date().getFullYear()}-03-15`);
    expect(tx.value).toBe(100);
  });

  it('lê o formato da Caixa (valores "-R$", data DD/MM e resumos ignorados)', () => {
    const lines = [
      'Julho 2026 ( 10/07/2026 - 31/07/2026 ) Entradas: R$ 1.642,80 • Saídas: R$ 2.003,51',
      'Data Data',
      'lançamento contábil Tipo Descrição Valor',
      '10/07 10/07 Saída PIX Pix enviado para Bruno Franco Regis -R$ 364,00',
      'Saldo do dia 10/07/26 R$ 0,16',
      '14/07 14/07 Entrada PIX Pix recebido de SOS FAVELAS R$ 130,00',
    ];

    const result = extractTransactionsFromLines(lines);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      date: '2026-07-10',
      description: 'Saída PIX Pix enviado para Bruno Franco Regis',
      value: -364,
      type: 'expense',
    });
    expect(result[1]).toMatchObject({
      date: '2026-07-14',
      description: 'Entrada PIX Pix recebido de SOS FAVELAS',
      value: 130,
      type: 'income',
    });
  });

  it('interpreta valores do OCR sem vírgula (ex.: "2144D" = 21,44 D)', () => {
    const lines = [
      '06/10/2026 - 13:29:25 061329 COMPRA CARTAO DEBITO Gama Supermercado 2144D 241,55 C',
      '05/10/2026 - 20:06:07 052006 DEB PIX Rappi Brasil Inter 2548 D 262,99 C',
      '07/10/2026 - 18:29:44 071829 DEB PIX CHAVE Marcia Dos Santos 1641 D 0,00 C',
    ];

    const result = extractTransactionsFromLines(lines);

    expect(result.map((t) => t.value)).toEqual([-21.44, -25.48, -16.41]);
    expect(result.every((t) => t.type === 'expense')).toBe(true);
  });

  it('ignora cabeçalhos, saldos e linhas sem data', () => {
    const lines = [
      'Extrato mensal',
      'Data Histórico Valor Saldo',
      'SALDO ANTERIOR 5.000,00',
      'SALDO DO DIA 5.000,00',
      'RESUMO',
    ];

    expect(extractTransactionsFromLines(lines)).toHaveLength(0);
  });
});
