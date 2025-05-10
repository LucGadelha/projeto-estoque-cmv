-- Adicionar categorias específicas para pratos
INSERT INTO categories (name, type, created_at, updated_at)
VALUES 
  ('entrada', 'dish', NOW(), NOW()),
  ('prato_principal', 'dish', NOW(), NOW()),
  ('sobremesa', 'dish', NOW(), NOW()),
  ('drink', 'dish', NOW(), NOW()),
  ('bebida', 'dish', NOW(), NOW()),
  ('vinho', 'dish', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
