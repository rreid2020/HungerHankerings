-- Fix duplicate permission error during Saleor migrate (post_migrate create_permissions).
-- Error: duplicate key ... "permission_permission_content_type_id_codename_aa582bb6_uniq"
--        Key (content_type_id, codename)=(66, view_menu) already exists.
--
-- Remove any references from group_permissions first (if delete fails with FK violation, run these):
-- DELETE FROM account_group_permissions WHERE permission_id IN (SELECT id FROM permission_permission WHERE content_type_id = 66 AND codename = 'view_menu');
-- DELETE FROM auth_group_permissions WHERE permission_id IN (SELECT id FROM permission_permission WHERE content_type_id = 66 AND codename = 'view_menu');
--
-- Then delete the permission so the next migrate can recreate it:
DELETE FROM permission_permission WHERE content_type_id = 66 AND codename = 'view_menu';
