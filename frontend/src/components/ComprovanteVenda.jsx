export function ComprovanteVenda({ venda, itens, pagamentos, cliente, onNova }) {
  function imprimir() {
    window.print();
  }

  return (
    <div className="modal-overlay" onClick={onNova}>
      <div
        className="modal modal-comprovante"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="comprovante-header">
          <h2>💳 SnapPay</h2>
          <p>Seu PDV na Nuvem</p>
        </div>

        <div className="comprovante-venda">
          <div className="cv-linha">
            <span>Venda:</span>
            <strong>#{venda.id}</strong>
          </div>
          <div className="cv-linha">
            <span>Data/Hora:</span>
            <span>{new Date(venda.finalizada_em || venda.aberta_em).toLocaleString("pt-BR")}</span>
          </div>
          {cliente && (
            <div className="cv-linha">
              <span>Cliente:</span>
              <span>{cliente}</span>
            </div>
          )}
        </div>

        <table className="comprovante-itens">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Qtd</th>
              <th>Unitário</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{Number(item.quantidade)}</td>
                <td>R$ {Number(item.preco_unitario).toFixed(2)}</td>
                <td>R$ {Number(item.valor_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="comprovante-totais">
          <div className="ct-linha">
            <span>Subtotal:</span>
            <span>
              R${" "}
              {itens
                .reduce((a, i) => a + Number(i.valor_total), 0)
                .toFixed(2)}
            </span>
          </div>
          {venda.valor_desconto > 0 && (
            <div className="ct-linha desconto">
              <span>Desconto:</span>
              <span>-R$ {Number(venda.valor_desconto).toFixed(2)}</span>
            </div>
          )}
          <div className="ct-linha total">
            <strong>TOTAL:</strong>
            <strong>R$ {Number(venda.valor_total).toFixed(2)}</strong>
          </div>
        </div>

        {pagamentos && pagamentos.length > 0 && (
          <div className="comprovante-pagamentos">
            <h4>Pagamentos:</h4>
            {pagamentos.map((p, i) => (
              <div key={i} className="cp-linha">
                <span>{p.forma}</span>
                <span>R$ {Number(p.valor).toFixed(2)}</span>
              </div>
            ))}
            {pagamentos.reduce((a, p) => a + Number(p.valor), 0) > Number(venda.valor_total) && (
              <div className="cp-linha troco">
                <strong>Troco:</strong>
                <strong>
                  R${" "}
                  {(
                    pagamentos.reduce((a, p) => a + Number(p.valor), 0) -
                    Number(venda.valor_total)
                  ).toFixed(2)}
                </strong>
              </div>
            )}
          </div>
        )}

        <div className="comprovante-footer">
          <p>Obrigado pela compra!</p>
          <p style={{ fontSize: 11, opacity: 0.7 }}>
            {new Date().toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn-mini" onClick={imprimir}>
            🖨️ Imprimir
          </button>
          <button className="btn-checkout" onClick={onNova}>
            ✓ Nova venda
          </button>
        </div>
      </div>
    </div>
  );
}
