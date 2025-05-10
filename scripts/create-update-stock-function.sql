-- Função para atualizar a quantidade de estoque
CREATE OR REPLACE FUNCTION update_stock_quantity(
  p_stock_item_id INTEGER,
  p_quantity NUMERIC,
  p_unit TEXT
)
RETURNS VOID AS $$
DECLARE
  v_current_unit TEXT;
  v_converted_quantity NUMERIC;
BEGIN
  -- Obter a unidade atual do item
  SELECT unit INTO v_current_unit FROM stock_items WHERE id = p_stock_item_id;
  
  -- Se a unidade for diferente, converter
  IF v_current_unit <> p_unit THEN
    -- Aqui você pode implementar a lógica de conversão entre unidades
    -- Por simplicidade, vamos assumir que não há conversão necessária
    v_converted_quantity := p_quantity;
  ELSE
    v_converted_quantity := p_quantity;
  END IF;
  
  -- Atualizar a quantidade
  UPDATE stock_items
  SET 
    quantity = quantity + v_converted_quantity,
    updated_at = NOW()
  WHERE id = p_stock_item_id;
END;
$$ LANGUAGE plpgsql;
