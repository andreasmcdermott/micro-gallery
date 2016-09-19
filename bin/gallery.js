#!/usr/bin/env node
'use strict'

import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import toPromise from 'denodeify'
import micro, {send} from 'micro'
import mime from 'mime'
import {parse} from 'url'
import {green, red} from 'chalk'
import Handlebars from 'handlebars'

const defaultPort = 3000
const validExtensions = new Set([
  '.jpeg', '.jpg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff', '.tif'
])
const ignoredFiles = new Set([
  '.git',
  '.DS_Store'
])

const argv = minimist(process.argv.slice(2), {
  alias: {
    port: ['p']
  }
})

let root = process.cwd()
if (argv._.length > 0) {
  root = path.resolve(root, argv._[0])
}
const rootObj = path.parse(root)

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

let cachedView = null
const getView = async () => {
  if (!cachedView) {
    try {
      let file = await toPromise(fs.readFile)(path.resolve(__dirname, '../../views/index.hbs'), 'utf8')
      cachedView = Handlebars.compile(file)
    } catch (err) {
      throw err
    }
  }

  return cachedView
}

let cachedAssets = {}
const getAsset = async assetPath => {
  if (!cachedAssets[assetPath]) {
    try {
      let file = await toPromise(fs.readFile)(path.resolve(__dirname, '../../dist/assets', assetPath), 'utf8')
      cachedAssets[assetPath] = file
    } catch (err) {
      throw err
    }
  }

  return cachedAssets[assetPath]
}

const renderDir = async directory => {
  const files = await toPromise(fs.readdir)(directory)
  const data = {
    directories: [],
    images: [],
    path: [],
    assetsDir: '/assets'
  }

  const dirObj = path.parse(directory)
  let dirPath = `${dirObj.dir}/${dirObj.base}`.replace(`${rootObj.dir}/`, ``)
  let dirPathParts = dirPath.split('/')
  let url = []
  for(let i = 0; i < dirPathParts.length; ++i) {
    if (dirPathParts[i] !== rootObj.base) {
      url.push(dirPathParts[i])
    }

    data.path.push({
      url: url.join('/'),
      name: dirPathParts[i]
    })
  }

  for(let i = 0; i < files.length; ++i) {
    if (ignoredFiles.has(files[i])) {
      continue
    }
    
    const filePath = path.relative(root, path.resolve(directory, files[i]))
    if (await isDirectory(filePath)) {
      data.directories.push({
        relative: filePath,
        name: files[i]
      })
    } else if (validExtensions.has(path.parse(filePath).ext)) {
      data.images.push({
        relative: filePath,
        name: files[i]
      })
    }
  }

  let view = await getView()
  return view(data)
}

const renderImage = async file => {
  try {
    const content = await toPromise(fs.readFile)(path.resolve(root, file))
    return {
      content: content,
      mime: mime.lookup(file)
    }
  } catch (err) {
    throw err
  }
}

const server = micro(async (req, res) => {
  const {pathname} = parse(req.url)
  const pathObj = path.parse(path.join(root, pathname))
  const reqPath = decodeURIComponent(path.format(pathObj))

  if (pathname.startsWith('/assets')) {
    let asset = await getAsset(pathname.replace('/assets/', ''))
    res.setHeader('Content-Type', `${mime.lookup(pathname)}; charset=utf-8`)
    return send(res, 200, asset)
  }

  if (!await exists(reqPath)) {
    return send(res, 404, 'Not found')
  }

  if (pathObj.ext === '') {
    const renderedDir = await renderDir(reqPath)
    return send(res, 200, renderedDir)
  } else if (validExtensions.has(pathObj.ext)) {
    try {
      const image = await renderImage(reqPath)
      res.setHeader('Content-Type', `${image.mime}; charset=utf-8`)
      return send(res, 200, image.content)
    } catch (err) {
      return send(res, 500, 'Error reading file content')
    }
  } else {
    return send(res, 400, 'Bad request')
  }
})

server.listen(argv.port || defaultPort, async () => {
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
