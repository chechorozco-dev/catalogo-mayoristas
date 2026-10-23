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
        {recordatorio ? "Tu carrito no garantiza disponibilidad" : "Pocas unidades disponibles"}
      </strong>
      <span>
        Agregar al carrito no garantiza que el producto quede separado.
        Puede agotarse antes de confirmar tu pedido.
      </span>
    </div>
  );
}
