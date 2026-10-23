export default function AvisoDisponibilidad({ cantidad, recordatorio = false }) {
  const unidades = Number(cantidad);
  if (!recordatorio && unidades !== 1 && unidades !== 2) return null;

  return (
    <div style={{
      marginTop: 8, padding: "8px 10px", borderRadius: 8,
      background: "#fff8e8", color: "#754b0b", textAlign: "left",
      border: "1px solid #f2dfb6", fontSize: 11, lineHeight: 1.4,
    }}>
      <strong style={{ display: "block", fontSize: 12, marginBottom: 3 }}>
        {recordatorio ? "Confirma tu pedido a tiempo" : "Pocas unidades disponibles"}
      </strong>
      <span>
        Confirma tu pedido antes de que se agote.
        Agregarlo al carrito no garantiza que el producto quede separado.
      </span>
    </div>
  );
}
