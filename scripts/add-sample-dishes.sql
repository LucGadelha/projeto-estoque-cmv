-- Adicionar pratos de exemplo com as categorias corretas
-- Primeiro, vamos obter os IDs das categorias
DO $$
DECLARE
    entrada_id INTEGER;
    prato_principal_id INTEGER;
    sobremesa_id INTEGER;
    drink_id INTEGER;
    bebida_id INTEGER;
    vinho_id INTEGER;
BEGIN
    -- Obter IDs das categorias
    SELECT id INTO entrada_id FROM categories WHERE name = 'Entrada' AND type = 'dish';
    SELECT id INTO prato_principal_id FROM categories WHERE name = 'Prato Principal' AND type = 'dish';
    SELECT id INTO sobremesa_id FROM categories WHERE name = 'Sobremesa' AND type = 'dish';
    SELECT id INTO drink_id FROM categories WHERE name = 'Drink' AND type = 'dish';
    SELECT id INTO bebida_id FROM categories WHERE name = 'Bebida' AND type = 'dish';
    SELECT id INTO vinho_id FROM categories WHERE name = 'Vinho' AND type = 'dish';

    -- Inserir pratos de exemplo
    -- Entradas
    INSERT INTO dishes (name, description, category_id, price, created_at, updated_at, image_url)
    VALUES 
        ('Bruschetta', 'Fatias de pão italiano grelhado com tomate, alho e manjericão', entrada_id, 25.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?q=80&w=500'),
        ('Carpaccio', 'Finas fatias de carne crua com molho de alcaparras e parmesão', entrada_id, 39.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?q=80&w=500'),
        ('Camarão Empanado', 'Camarões empanados servidos com molho tártaro', entrada_id, 45.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1559742811-822873691df8?q=80&w=500');

    -- Pratos Principais
    INSERT INTO dishes (name, description, category_id, price, created_at, updated_at, image_url)
    VALUES 
        ('Filé Mignon ao Molho Madeira', 'Filé mignon grelhado com molho madeira, acompanha arroz e batatas', prato_principal_id, 79.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=500'),
        ('Risoto de Camarão', 'Risoto cremoso com camarões frescos e ervas', prato_principal_id, 69.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c7?q=80&w=500'),
        ('Salmão Grelhado', 'Filé de salmão grelhado com legumes e purê de batata', prato_principal_id, 75.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=500');

    -- Sobremesas
    INSERT INTO dishes (name, description, category_id, price, created_at, updated_at, image_url)
    VALUES 
        ('Pudim de Leite', 'Pudim de leite condensado com calda de caramelo', sobremesa_id, 19.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?q=80&w=500'),
        ('Petit Gateau', 'Bolo de chocolate com centro derretido, acompanha sorvete de creme', sobremesa_id, 29.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?q=80&w=500'),
        ('Cheesecake', 'Cheesecake com calda de frutas vermelhas', sobremesa_id, 24.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=500');

    -- Drinks
    INSERT INTO dishes (name, description, category_id, price, created_at, updated_at, image_url)
    VALUES 
        ('Caipirinha', 'Cachaça, limão, açúcar e gelo', drink_id, 22.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1541591425126-4e9be8d1e9eb?q=80&w=500'),
        ('Mojito', 'Rum, hortelã, limão, açúcar e água com gás', drink_id, 24.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=500'),
        ('Cosmopolitan', 'Vodka, licor de laranja, suco de cranberry e limão', drink_id, 26.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1605270012917-bf357a1fae9e?q=80&w=500');

    -- Bebidas
    INSERT INTO dishes (name, description, category_id, price, created_at, updated_at, image_url)
    VALUES 
        ('Água Mineral', 'Água mineral sem gás 500ml', bebida_id, 6.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1564419320461-6870880221ad?q=80&w=500'),
        ('Refrigerante', 'Coca-Cola, Guaraná ou Sprite 350ml', bebida_id, 8.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?q=80&w=500'),
        ('Suco Natural', 'Laranja, abacaxi, maracujá ou limão 300ml', bebida_id, 12.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=500');

    -- Vinhos
    INSERT INTO dishes (name, description, category_id, price, created_at, updated_at, image_url)
    VALUES 
        ('Vinho Tinto Cabernet Sauvignon', 'Vinho tinto seco chileno 750ml', vinho_id, 89.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=500'),
        ('Vinho Branco Chardonnay', 'Vinho branco seco argentino 750ml', vinho_id, 79.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1566754844421-6f4b7e11ecae?q=80&w=500'),
        ('Espumante Brut', 'Espumante nacional brut 750ml', vinho_id, 69.90, NOW(), NOW(), 'https://images.unsplash.com/photo-1605493725784-56d225ea46dc?q=80&w=500');
END $$;
