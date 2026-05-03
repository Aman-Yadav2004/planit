import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ service role only on backend
)

async function inviteUser(email) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)

  if (error) {
    console.error(error)
    return
  }

  console.log("Invite sent:", data)
}
