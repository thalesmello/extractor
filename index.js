const express = require('express')
const { parseResume } = require('./extractor')
const bodyParser = require('body-parser')
const { decode } = require('base64-arraybuffer')
const axios = require('axios')
const mailer = require('./mailer')
const app = express()

const { NODE_ENV = 'development', PORT, SMTP_SECRET_TOKEN } = process.env

const config = {
  development: { port: 3000 },
  production: { port: PORT }
}

const { port } = config[NODE_ENV]

app.use(bodyParser.json({ limit: '1mb' }))


app.post('/process', handle(async (req, res) => {
  const { resume, filetype } = req.body
  const buffer = new Buffer(new Uint8Array(decode(resume)))
  const data = await parseResume({ buffer, filetype })
  res.send(data)
}))

app.post('/forward-email', handle(async (req, res) => {
  const { content, file_name: filename } = req.body.attachments[0]
  const { from } = req.body.envelope
  const [, filetype] = filename.split('.')
  const buffer = new Buffer(new Uint8Array(decode(content)))
  const data = await parseResume({ buffer, filetype })

  const { name, emails, skills, urls } = data

  const [email, ] = emails
  const tags = skills.join(', ')

  const github = urls.find(url => /github/.test(url))
  const linkedin = urls.find(url => /linkedin/.test(url))

  await axios.post('https://hackmundi.herokuapp.com/candidatos', {
    nome: name || `Candidato ${new Date()}`,
    tags,
    email,
    linkedin,
    github,
    filetype,
    filename,
    content,
    from
  })

  res.send({ status: 'ok' })
}))

app.post('/mail', handle(async (req, res) => {
  const { token, from, to, subject, html } = req.body

  if(token !== SMTP_SECRET_TOKEN) {
    throw new Error('Invalid token')
  }

  await mailer.sendMailAsync({ from, to, subject, html })

  res.send({ status: 'ok' })
}))

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})

app.use((err, req, res, next) => {
  console.log(err)
  res.status(500).send({ error: err.message })
})

function handle (operation) {
  return (req, res, next) => {
    return operation(req, res, next).catch(err => {
      next(err)
    })
  }
}
