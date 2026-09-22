import { IconBolt, IconCheck, IconGrid, IconUsers } from "./icons";

export function AuthBrandPanel() {
  return (
    <div className="auth-brand-panel">
      <div className="mark">
        <span className="dot">
          <IconBolt width={17} height={17} />
        </span>
        Control Operativo
      </div>

      <div className="pitch">
        <h2>Que nadie se entere del lote listo por un pasillo.</h2>
        <p>
          Notificaciones automaticas para tu planta: definis el evento, quien debe enterarse, y el
          sistema se encarga del resto — sin reportes manuales, sin avisos duplicados.
        </p>

        <div className="feature-list">
          <div className="item">
            <span className="check">
              <IconCheck width={12} height={12} />
            </span>
            Multi-empresa, con datos aislados por tenant
          </div>
          <div className="item">
            <span className="check">
              <IconUsers width={12} height={12} />
            </span>
            Empleados por area, turno y rol
          </div>
          <div className="item">
            <span className="check">
              <IconGrid width={12} height={12} />
            </span>
            Panel con historial, tasa de entrega y fallos
          </div>
        </div>
      </div>

      <div className="footnote">© {new Date().getFullYear()} Control Operativo — MVP</div>
    </div>
  );
}
