-- Remove blockers for deleting fictitious sellers and their test history.
-- Client rows are kept with no seller; sales, payments, sale items, and
-- seller reports are removed with their parent seller.

DO $$
DECLARE
  relation record;
  existing_fk record;
  child_table regclass;
  parent_table regclass;
  child_column smallint;
  parent_column smallint;
BEGIN
  FOR relation IN
    SELECT *
    FROM (VALUES
      ('clientes', 'vendedora_id', 'vendedoras', 'id', 'SET NULL'),
      ('vendas', 'vendedora_id', 'vendedoras', 'id', 'CASCADE'),
      ('acertos_vendedoras', 'vendedora_id', 'vendedoras', 'id', 'CASCADE'),
      ('itens_venda', 'venda_id', 'vendas', 'id', 'CASCADE'),
      ('pagamentos_venda', 'venda_id', 'vendas', 'id', 'CASCADE')
    ) AS relations(child_name, child_column_name, parent_name, parent_column_name, delete_action)
  LOOP
    child_table := to_regclass(format('public.%I', relation.child_name));
    parent_table := to_regclass(format('public.%I', relation.parent_name));

    IF child_table IS NULL OR parent_table IS NULL THEN
      RAISE EXCEPTION 'Required table is missing: public.%, public.%',
        relation.child_name, relation.parent_name;
    END IF;

    SELECT attnum INTO child_column
    FROM pg_attribute
    WHERE attrelid = child_table AND attname = relation.child_column_name
      AND NOT attisdropped;

    SELECT attnum INTO parent_column
    FROM pg_attribute
    WHERE attrelid = parent_table AND attname = relation.parent_column_name
      AND NOT attisdropped;

    IF child_column IS NULL OR parent_column IS NULL THEN
      RAISE EXCEPTION 'Required column is missing for public.%.%',
        relation.child_name, relation.child_column_name;
    END IF;

    FOR existing_fk IN
      SELECT conname
      FROM pg_constraint
      WHERE contype = 'f'
        AND conrelid = child_table
        AND confrelid = parent_table
        AND conkey = ARRAY[child_column]::smallint[]
        AND confkey = ARRAY[parent_column]::smallint[]
    LOOP
      EXECUTE format(
        'ALTER TABLE %s DROP CONSTRAINT %I',
        child_table,
        existing_fk.conname
      );
    END LOOP;

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s (%I) ON DELETE %s',
      child_table,
      format('fk_%s_%s_delete', relation.child_name, relation.child_column_name),
      relation.child_column_name,
      parent_table,
      relation.parent_column_name,
      relation.delete_action
    );
  END LOOP;
END $$;

-- Remove old seller reports that became orphaned before cascade deletion was
-- enabled. Reports created by the app always belong to a seller.
DELETE FROM public.acertos_vendedoras AS report
WHERE report.vendedora_id IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM public.vendedoras AS seller
     WHERE seller.id = report.vendedora_id
   );
