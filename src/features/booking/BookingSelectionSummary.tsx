type EscolhaResumida = {
  etapa: number
  rotulo: string
  valor: string
}

export function BookingSelectionSummary({
  escolhas,
  editar,
  etapaAtual,
}: {
  escolhas: EscolhaResumida[]
  editar: (etapa: number) => void
  etapaAtual: number
}) {
  if (!escolhas.length) return null

  return (
    <section className="booking-selection-summary" aria-label="Resumo das escolhas">
      {escolhas.map(({ etapa, rotulo, valor }) => (
        <div className="booking-selection-item" key={etapa}>
          <span>
            <small>{rotulo}</small>
            <strong>{valor}</strong>
          </span>
          {etapa !== etapaAtual && (
            <button type="button" onClick={() => editar(etapa)} aria-label={`Alterar ${rotulo}`}>
              Alterar
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
