<script lang="ts">
  import * as jose from 'jose'
  import { InvalidJson, BodyNull } from '$lib/responses'

  let message: string = '', raw_payload: HTMLTextAreaElement, title: string = 'message', token: string = ''
  const sign_message = async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('ES256')
    let json = null
    try {
      json = JSON.parse(raw_payload.value)
    } catch (err: any) {
      if (err.name === 'SyntaxError') {
        console.error({error: err.message})
        /* display error in ui */
        return false
      } else 
        console.error(
          { error: err.message }
        )
        /* display error in ui */
        return false
    }
    
    json.created_at = Date.now()
    const jws = await new jose.GeneralSign(new TextEncoder().encode(JSON.stringify(json)))
      .addSignature(privateKey)
      .setProtectedHeader({ typ: 'JWM', alg: 'ES256' })
      .sign()

    console.log(jws)

    /* send jws to your server */
    if (jws) {
      const message_sent = await fetch('http://localhost:5173/api/v0/client/messages', {
        method: 'POST',
        headers: {
          Authorization: `bearer ${token}`
        },
        body: JSON.stringify(jws),
        credentials: 'omit'
      })

      if (!message_sent.ok) {
        /* display error */
        const res = await message_sent.json()
        console.error('Message:', res.error)
      } else {
        /* display success */
        const res = await message_sent.json()
        console.log('Message:', res.data.status)
      }
    }

    /* temp, decrypt message */
    // const { payload, protectedHeader } = await jose.generalVerify(jws, publicKey)
    // const decrypted = new TextDecoder().decode(payload)

    // const body = JSON.parse(decrypted).body
    // console.log('decrypted', JSON.parse(decrypted), protectedHeader)
    // message = body.message
    // title = body.title

    /* from will eventually come from a user lookup with the authorization header, to see what they're username is */
    //server_message(jws, "me@me.com", "you@you.com")
  }

  const server_message = async(client_jws: any, from: string, to: string) => {
    const { publicKey, privateKey } = await jose.generateKeyPair('ES256')
    const message = {
      client_jws,
      from,
      to
    }
    const jws = await new jose.GeneralSign(new TextEncoder().encode(JSON.stringify(message)))
      .addSignature(privateKey)
      .setProtectedHeader({ typ: 'JWM', alg: 'ES256' })
      .sign()

    console.log({jws})

    const { payload, protectedHeader } = await jose.generalVerify(jws, publicKey)
    const decrypted = new TextDecoder().decode(payload)

    console.log('server decrypted', JSON.parse(decrypted), protectedHeader)
  }

  const encrypt_message = async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('ECDH-ES+A256KW')
    const json = JSON.parse(raw_payload.value)
    json.created_at = Date.now()
    const jwe = await new jose.GeneralEncrypt(new TextEncoder().encode(JSON.stringify(json)))
      .setProtectedHeader({ typ: 'JWM', enc: 'A256GCM' })
      .setSharedUnprotectedHeader({ alg: 'ECDH-ES+A256KW'})
      .addRecipient(publicKey)
      .encrypt()

    console.log({jwe})

    /* someone is sending you an encrypted message, using your publicKey. so you decrypt with your privateKey */
    const { plaintext, protectedHeader, additionalAuthenticatedData } = await jose.generalDecrypt(jwe, privateKey)
    const decrypted = new TextDecoder().decode(plaintext)

    const body = JSON.parse(decrypted).body
    console.log('decrypted', JSON.parse(decrypted), protectedHeader)
    message = body.message
    title = body.title
  }
</script>

<h1>Create Message</h1>
<textarea cols='50' rows='25' bind:this="{raw_payload}" type="text"></textarea>
<button on:click="{() => { sign_message() }}">Sign</button>
<button on:click="{() => { encrypt_message() }}">Encrypt</button>
<iframe style="border: solid 1px darkgrey;" title={title} sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc={message}></iframe>