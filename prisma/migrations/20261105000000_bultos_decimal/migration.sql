-- Los kardex anotan medios bultos ("5 1/2"): la columna pasa de entero a decimal.
ALTER TABLE "Entrega" ALTER COLUMN "bultos" SET DATA TYPE DECIMAL(8,2);
