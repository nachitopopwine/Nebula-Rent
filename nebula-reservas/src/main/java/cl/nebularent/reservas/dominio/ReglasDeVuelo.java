package cl.nebularent.reservas.dominio;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/** Reglas puras de negocio: licencias y tarifas. */
public final class ReglasDeVuelo {

    public static final int DIAS_MINIMOS = 1;
    public static final int DIAS_MAXIMOS = 30;
    public static final int DIAS_PARA_DESCUENTO = 7;
    public static final double DESCUENTO_LARGA_ESTADIA = 0.10;

    private static final Map<String, Integer> RANGO_LICENCIA = Map.of(
            "CLASE_C", 1,
            "CLASE_B", 2,
            "CLASE_A", 3);

    private ReglasDeVuelo() {
    }

    /** Un piloto puede volar una nave si su licencia es igual o superior a la requerida. */
    public static boolean puedePilotear(String licenciaPiloto, String licenciaRequerida) {
        Integer piloto = RANGO_LICENCIA.get(licenciaPiloto);
        Integer requerida = RANGO_LICENCIA.get(licenciaRequerida);
        return piloto != null && requerida != null && piloto >= requerida;
    }

    /** Tarifa diaria × días, con 10% de descuento desde 7 días. Redondeado a 2 decimales. */
    public static double calcularMonto(double tarifaDiaria, int dias) {
        if (tarifaDiaria < 0) {
            throw new ReglaNegocioException("La tarifa no puede ser negativa");
        }
        validarDias(dias);
        BigDecimal total = BigDecimal.valueOf(tarifaDiaria).multiply(BigDecimal.valueOf(dias));
        if (dias >= DIAS_PARA_DESCUENTO) {
            total = total.multiply(BigDecimal.valueOf(1 - DESCUENTO_LARGA_ESTADIA));
        }
        return total.setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    public static void validarDias(int dias) {
        if (dias < DIAS_MINIMOS || dias > DIAS_MAXIMOS) {
            throw new ReglaNegocioException(
                    "Los días deben estar entre " + DIAS_MINIMOS + " y " + DIAS_MAXIMOS);
        }
    }
}
