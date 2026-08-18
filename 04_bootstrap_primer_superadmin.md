# Bootstrap del primer superadmin

La app no tiene una pantalla para crear el primer superadmin (todo alta de
admin pasa por `/dashboard/admins`, que ya requiere estar logueado como
superadmin). Para el primer usuario hay que hacerlo a mano, una única vez:

1. En el dashboard de Supabase: **Authentication > Users > Add user**.
   Cargá el email y una contraseña. Marcá "Auto Confirm User" (o el
   equivalente a `email_confirm: true`) para que pueda loguearse
   directamente.
2. Copiá el **UUID** del usuario recién creado (columna `id` en esa misma
   tabla, o en **Authentication > Users**, click en el usuario).
3. En el **SQL Editor**, correr (reemplazando el UUID y el nombre):

   ```sql
   insert into admin_profiles (id, full_name, role, region_id, force_password_change)
   values ('<uuid del usuario creado en Supabase Auth>', 'Mi nombre', 'superadmin', null, false);
   ```

   - `role` tiene que ser `'superadmin'` y `region_id` tiene que ser `null`
     (un superadmin ve todas las regiones).
   - `force_password_change` en `false` porque este alta no pasa por el
     flujo de "contraseña temporal" de la app — vos elegiste la contraseña
     a mano en el paso 1.

Después de esto, ese usuario ya puede loguearse en `/login` y va a entrar
directo a `/dashboard` (sin pasar por `/change-password`), con acceso a
`/dashboard/admins` para dar de alta al resto de los administrativos desde
la propia app.
