exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { name, email, message } = JSON.parse(event.body);

  if (!name || !email || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Champs manquants' }) };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { name: 'ExpLore Site', email: 'ExpLoreStudio@proton.me' },
      to: [{ email: 'ExpLoreStudio@proton.me', name: 'ExpLore Studio' }],
      replyTo: { email: email, name: name },
      subject: 'Contact depuis le site — ' + name,
      textContent: 'Nom : ' + name + '\nEmail : ' + email + '\n\nMessage :\n' + message
    })
  });

  if (response.ok || response.status === 201) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } else {
    const err = await response.text();
    return { statusCode: 500, body: JSON.stringify({ error: err }) };
  }
};
