const express = require('express')
const { parseResume } = require('./extractor')
const bodyParser = require('body-parser')
const { decode } = require('base64-arraybuffer')
const app = express()

const { NODE_ENV = 'development' } = process.env

const config = {
  development: { port: 3000 },
  production: { port: 80 }
}

const { port } = config[NODE_ENV]

app.use(bodyParser.json({ limit: '1mb' }))


app.post('/process', handle(async (req, res) => {
  try {
    const { resume, filetype } = req.body
    const buffer = new Buffer(new Uint8Array(decode(resume)))
    const data = await parseResume({ buffer, filetype })
    res.send(Object.assign({}, data))
  } catch (err) {
    throw new err
  }
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
