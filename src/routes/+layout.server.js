// import { createClient } from '@supabase/supabase-js'
// import { SUPABASE_ADMIN_KEY } from '$env/static/private'
// import { PUBLIC_SUPABASE_URL } from '$env/static/public'

// const supabaseAdminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_ADMIN_KEY)
// export const load = async ({ locals, fetch }) => {
//   supabaseAdminClient.auth.admin.createUser({email: 'jcreviston@protonmail.com', password: 'password', email_confirm: true})
//   supabaseAdminClient.auth.admin.createUser({email: 'jcrev@pm.me', password: 'password', email_confirm: true})
  //supabaseAdminClient.auth.admin.deleteUser('bad40f1b-abb2-4972-ad0e-0de94e2367c3')
  //const { data, error } = await supabaseAdminClient.auth.admin.deleteUser('e928e7ee-4bd3-4848-a695-b3ea4552866d')
  //const { data, error } = await supabaseAdminClient.auth.admin.listUsers()
  //console.log(data, error)
//}