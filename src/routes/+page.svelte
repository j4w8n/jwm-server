<script lang="ts">
  import * as jose from 'jose'
  import type { Message } from '$lib/types'
  import { supabaseBrowserClient } from 'supakit'
  import { log } from '$lib/utils'
  import { getSession } from 'supakit'
  
  const session = getSession()

  let message: string = '', payload: HTMLTextAreaElement, title: HTMLInputElement, token: string = ''
  
  const signIn = async (email: string) => {
    const { data, error} = await supabaseBrowserClient.auth.signInWithPassword({
      email,
      password: 'password'
    })
    if (error) throw error
    document.cookie = `access_token=${data.session?.access_token}; SameSite=Lax; Path=/; Max-Age=3600`
    document.cookie = `refresh_token=${data.session?.access_token}; SameSite=Lax; Path=/; Max-Age=3600`
    log('signed in!')
  }
  const signOut = async () => {
    const { error } = await supabaseBrowserClient.auth.signOut()
    if (error) throw error
    document.cookie = `access_token=''; SameSite=Lax; Path=/; Max-Age=-1`
    document.cookie = `refresh_token=''; SameSite=Lax; Path=/; Max-Age=-1`
    log('signed out!')
  }

  const messages = async () => {
    await fetch('http://localhost:5173/api/v0/client/messages', {
      method: 'GET',
      credentials: 'include'
    })
  }

  const gen = async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('ES256', { extractable: true })
    const plainprivate = await jose.exportPKCS8(privateKey)
    const plainpublic = await jose.exportSPKI(publicKey)
    console.log(plainpublic)
    console.log(plainprivate)
  }
  
  const sign_message = async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('ES256')
    let json: Message = {
      "body": {
        "title": title.value,
        "message": payload.value,
        "created_at": Date.now()
      }
    }

    const jws = await new jose.GeneralSign(new TextEncoder().encode(JSON.stringify(json)))
      .addSignature(privateKey)
      .setProtectedHeader({ typ: 'JWM', alg: 'ES256' })
      .sign()

    /* extract key as string, for JSON transport */ 
    const plainKey = await jose.exportSPKI(publicKey)
    
    const message_data = {
      message: jws,
      public_key: plainKey,
      alg: 'ES256'
    }

    /* send jws to your server */
    if (jws) {
      const message_sent = await fetch('http://localhost:5173/api/v0/client/messages', {
        method: 'POST',
        body: JSON.stringify(message_data),
        credentials: 'include'
      })

      const { data, error } = await message_sent.json()
      log({'server response': { data, error }})
      if (error) {
        /* eventually display error in ui */
        //log({'Message': error})
      } else {
        /* eventuall display success in ui */
        //log({'Message': data.status})
      }
    }
  }

  const encrypt_message = async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('ECDH-ES+A256KW')
    const json = JSON.parse(payload.value)
    json.created_at = Date.now()
    const jwe = await new jose.GeneralEncrypt(new TextEncoder().encode(JSON.stringify(json)))
      .setProtectedHeader({ typ: 'JWM', enc: 'A256GCM' })
      .setSharedUnprotectedHeader({ alg: 'ECDH-ES+A256KW'})
      .addRecipient(publicKey)
      .encrypt()

    log({jwe})

    /* someone is sending you an encrypted message, using your publicKey. so you decrypt with your privateKey */
    const { plaintext, protectedHeader, additionalAuthenticatedData } = await jose.generalDecrypt(jwe, privateKey)
    const decrypted = new TextDecoder().decode(plaintext)

    const body = JSON.parse(decrypted).body
    log({'decrypted': JSON.parse(decrypted), protectedHeader})
    message = body.message
    title = body.title
  }
</script>

<button on:click="{() => { signIn('jcreviston@protonmail.com') }}">Sign-In jcreviston</button>
<button on:click="{() => { signIn('jcrev@pm.me') }}">Sign-In jcrev</button>
<button on:click="{() => { signOut() }}">Sign-Out</button>
<button on:click="{() => { messages() }}">Get Messages</button>
<button on:click="{() => { gen() }}">Create Keys</button>
<h1>Create Message</h1>
<input type="text" bind:this="{title}"/>
<br>
<textarea cols='50' rows='25' bind:this="{payload}"></textarea>
<button on:click="{() => { sign_message() }}">Sign</button>
<button on:click="{() => { encrypt_message() }}">Encrypt</button>
<iframe style="border: solid 1px darkgrey;" title="sandbox" sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc={message}></iframe>