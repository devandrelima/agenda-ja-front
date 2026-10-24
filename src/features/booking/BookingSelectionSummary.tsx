type EscolhaResumida = {
  rotulo: string
  valor: string
}

export function BookingSelectionSummary({ escolhas }: { escolhas: EscolhaResumida[] }) {
  if (!escolhas.length) return null

  return (
    <section className="booking-selection-summary" aria-label="Resumo das escolhas">
      {escolhas.map(({ rotulo, valor }) => (
        <div className="booking-selection-item" key={rotulo}>
          <span>
            <small>{rotulo}</small>
            <strong>{valor}</strong>
          </span>
        </div>
      ))}
    </section>
  )
}
