const { promisifyAll } = require('bluebird')
const Promise = require('bluebird')
const pdf2Text = require('pdf2text')
const getEmails = require('get-emails')
const removePunctuation = require('remove-punctuation')
const removeAccents = require('remove-accents')
const namesDict = require('./names')
const { join } = require('path')
const { isEmpty } = require('lodash')
const { readFileAsync } = promisifyAll(require('fs'))
const ligatures = ['de', 'da', 'das', 'dos', 'do', 'e']
const _ = require('lodash')
const urlRegex = require('url-regex')
const isEmail = require('is-email')
const tags = require('./tags.js')

const underisedLocations = [
  'sao',
  'rua',
  'estrada',
  'universidade',
  'ciencias'
]

main().catch(err => {
  console.log(err)
  process.exit(1)
})

async function main () {
  const files = [
    './alan_henrique.pdf',
    './ana_carolina.pdf',
    './curriculo2.pdf',
    './giovani.pdf',
    './ricardo.pdf',
    './ThalesMello.pdf',
    './Renan Jacomassi - CV (Port.) (1).pdf',
    "./iago-calmon-angeli.pdf"
  ]

  for (const file of files) {
    console.log(file)

    try {
      const filepath = join(__dirname, file)
      const buffer = await readFileAsync(filepath)
      const answer = await parseResume({ buffer, filetype: 'pdf' })
      console.log(answer)
    } catch (err) {
      console.log(err)
    }
  }
}

async function extract (buffer, filetype) {
  if (filetype === 'pdf') {
    const pages = await pdf2Text(buffer)

    const text = pages.reduce(concat).join(' ')
    const parts = _.chain(pages).reduce(concat)
      .flatMap(line => line.split(/[.,!?-]/))
      .map(part => part.trim())
      .value()


    return { parts, text }
  } else {
    throw new Error(`Unsupported filetype ${filetype}`)
  }

  function isSingleCharacterParts (pages) {
    const [firstPage, ] = pages
    const frequencies = _.chain(firstPage)
      .take(20)
      .countBy(part => part.length)
      .value()

    return frequencies[1] > 15
  }
}

async function parseResume ({ buffer, filetype }) {
  const { parts, text } = await extract(buffer, filetype)


  const emails = getEmails(text)
  let urls = text.match(urlRegex({ strict: false })) || []
  urls = _.chain(urls).reject(isEmail).reject(url => ['asp.net', 'dot.net'].includes(url.toLowerCase())).value()

  const { englishWords, portugueseWords } = await parseReferences()

  const name = _(parts)
    .filter(part => !isEmpty(part))
    .map(part => part.split(/\s+/).map(word => word.trim()))
    .flatMap(words => extractName(words))
    .reject(name => {
      const [possibleLocation, ] = removeAccents(name).toLowerCase().split(' ')
      return underisedLocations.includes(possibleLocation)
    })
    .reject(name => {
      const words = removeAccents(name).toLowerCase().split(' ')
      return words.every(word => {
        return englishWords.has(word) || portugueseWords.has(word)
      })
    })
    .first()

  if (!name && isEmpty(emails) && isEmpty(urls)) {
    throw new Error('Could not parse resume')
  }

  const skills = tags.filter(tag => {
    const regex = new RegExp(tag, 'i')
    return regex.test(text)
  })

  return { name, emails: Array.from(emails), urls, skills }
}

function concat (lhs, rhs) {
  return lhs.concat(rhs)
}

function extractName (words, acc = []) {
  if (isEmpty(words) && acc.length >= 2) {
    return [acc.join(' ')]
  }

  if(isEmpty(words)) {
    return []
  }

  const [candidate, ...rest] = words

  const noAccentCandidate = removeAccents(candidate)

  if (/^[A-Z][A-Za-z]+$/.test(noAccentCandidate)) {
    return extractName(rest, [...acc, candidate])
  }
  

  if (!isEmpty(acc) && ligatures.includes(candidate)) {
    return extractName(rest, [...acc, candidate])
  }

  if (acc.length >= 2) {
    return [acc.join(' ')]
  }

  return extractName(rest, [])
}

const parseNames = _.memoize(async function parseNames () {
  const namesList = Object.values(namesDict)
    .reduce(concat)
    .map(removeAccents)
    .map(name => name.toLowerCase())

  const names = new Set(namesList)
  
  return names
})

const parseWords = _.memoize(async function parseWords (filename) {
  const dictionary = await readFileAsync(join(__dirname, filename), 'utf8')

  const words = dictionary.split('\n')
    .map(word => word.trim())
    .map(word => word.toLowerCase())
    .map(removeAccents)

  return new Set(words)
})

const parseReferences = _.memoize(async () => {
  let englishWords = await parseWords('words.txt')
  let portugueseWords = await parseWords('palavras.txt')
  const commonNames = await parseNames()

  portugueseWords = new Set(_([...portugueseWords]).reject(word => commonNames.has(word)).value())
  englishWords = new Set(_([...englishWords]).reject(word => commonNames.has(word)).value())

  return { portugueseWords, englishWords, commonNames }
})

exports.parseResume = parseResume
