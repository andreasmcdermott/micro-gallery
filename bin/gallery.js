#!/usr/bin/env node
'use strict'

import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import toPromise from 'denodeify'
import micro, {send} from 'micro'
import {parse} from 'url'
import {green, red} from 'chalk'

const argv = minimist(process.argv.slice(2), {
  alias: {
    port: ['p'],
    cache: ['c']
  }
})

let root = process.cwd()
if (argv._.length > 0) {
  root = path.resolve(root, argv._[0])
}

const isDirectory = async directory => {
  try {
    const stats = await toPromise(fs.stat)(directory)
    return stats.isDirectory()
  } catch(err) {
    return false
  }
}

const exists = async filePath => {
  try {
    await toPromise(fs.stat)(filePath)
    return true
  } catch(err) {
    return false
  }
}

const validExtensions = new Set([
  'jpeg', 'jpg',
  'png',
  'gif',
  'bmp',
  'tiff', 'tif'
])
const ignore = new Set([
  '.git',
  '.DS_Store'
])

const renderDir = async directory => {
  const files = await toPromise(fs.readdir)(directory)
  const data = {
    directories: [],
    images: []
  }

  for(let i = 0; i < files.length; ++i) {
    if (ignore.has(files[i])) {
      continue
    }
    
    const filePath = path.relative(root, path.resolve(directory, files[i]))
    if (await isDirectory(filePath)) {
      data.directories.push({
        path: filePath,
        name: files[i]
      })
    } else {
      data.images.push({
        path: filePath,
        name: files[i],
        type: path.parse(filePath).ext.substr(1)
      })
    }
  }

  return data
}

const renderImage = async image => {
  return {}
}

const server = micro(async (req, res) => {
  const {pathname} = parse(req.url)
  const pathObj = path.parse(path.join(root, pathname))
  const reqPath = decodeURIComponent(path.format(pathObj))

  if (!await exists(reqPath)) {
    return send(res, 404, 'Not found')
  }

  if (pathObj.ext === '') {
    const renderedDir = await renderDir(reqPath)
    return send(res, 200, renderedDir)
  } else if (validExtensions.has(pathObj.ext)) {
    const renderedImage = await renderImage(reqPath)
    return send(res, 200, renderedImage)
  } else {
    return send(res, 400, 'Bad request')
  }
})

server.listen(argv.port || 3000, async () => {
  process.on('SIGINT', () => {
    server.close()
    process.exit(0)
  })

  if (!await isDirectory(root)) {
    console.error(red(`Specified directory doesn't exist!`))
    process.exit(1)
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(green(`Running on http://localhost:${server.address().port}`))
  }
})
