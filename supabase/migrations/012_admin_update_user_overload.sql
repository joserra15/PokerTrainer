-- Eliminar overload antiguo de pt_admin_update_user (3 params) que ambigüa con la versión de 4 params.

drop function if exists public.pt_admin_update_user(text, text, boolean);

grant execute on function public.pt_admin_update_user(text, text, boolean, timestamptz) to authenticated;
