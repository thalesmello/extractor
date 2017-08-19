const pdf2text = require('pdf2text')

hello()

async function hello (arguments) {
  try {
    pdf2text(null)
  } catch (err) {
    console.log('batman')
  }
}

async function foo () {
}
