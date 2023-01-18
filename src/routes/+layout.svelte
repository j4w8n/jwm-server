<script lang="ts">
  import { page } from '$app/stores'
  import { supabaseAuthStateChange, getSession } from 'supakit'

  const session = getSession()

  $session = $page.data.session
  supabaseAuthStateChange(session, null)
</script>