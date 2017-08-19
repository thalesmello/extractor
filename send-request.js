const { encode } = require('base64-arraybuffer')
const { promisifyAll } = require('bluebird')
const { readFileAsync } = promisifyAll(require('fs'))
const { join } = require('path')
const axios = require('axios')

main().catch(err => {
  console.log(err)
  console.log(err.message)
  process.exit(1)
})

async function main () {
  const buffer = await readFileAsync(join(__dirname, './ThalesMello.pdf'))
  const resume = encode(buffer)
  const { data } = await axios.post('http://localhost:3000/process', { resume, filetype: 'pdf' })
  console.log(data)
}


