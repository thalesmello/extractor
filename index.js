const express = require('express')
const { parseResume } = require('./extractor')
const bodyParser = require('body-parser')
const { decode } = require('base64-arraybuffer')
const axios = require('axios')
const app = express()

const { NODE_ENV = 'development', PORT } = process.env

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
  const { content, filename } = req.body.attachments[0]
  const [, filetype] = filename.split('.')
  const buffer = new Buffer(new Uint8Array(decode(content)))
  const data = await parseResume({ buffer, filetype })

  const { name, emails, skills, urls } = data

  const [email, ] = emails
  const tags = skills.join(', ')

  const github = urls.find(url => /github/.test(url))
  const linkedin = urls.find(url => /linkedin/.test(url))

  await axios.post('https://hackmundi.herokuapp.com/candidato/', {
    nome: name || `Candidato ${new Date()}`,
    tags,
    email,
    linkedin,
    github,
    filetype,
    filename,
    content
  })

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
