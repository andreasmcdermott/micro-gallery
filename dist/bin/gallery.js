#!/usr/bin/env node

'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _minimist = require('minimist');

var _minimist2 = _interopRequireDefault(_minimist);

var _denodeify = require('denodeify');

var _denodeify2 = _interopRequireDefault(_denodeify);

var _micro = require('micro');

var _micro2 = _interopRequireDefault(_micro);

var _mime = require('mime');

var _mime2 = _interopRequireDefault(_mime);

var _url = require('url');

var _chalk = require('chalk');

var _handlebars = require('handlebars');

var _handlebars2 = _interopRequireDefault(_handlebars);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const defaultPort = 3000;
const validExtensions = new Set(['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff', '.tif']);
const ignoredFiles = new Set(['.git', '.DS_Store']);

const argv = (0, _minimist2.default)(process.argv.slice(2), {
  alias: {
    dev: ['d'],
    port: ['p']
  }
});

const root = argv._.length > 0 ? _path2.default.resolve(process.cwd(), argv._[0]) : process.cwd();
const rootObj = _path2.default.parse(root);

const isDirectory = (() => {
  var _ref = _asyncToGenerator(function* (directory) {
    try {
      const stats = yield (0, _denodeify2.default)(_fs2.default.stat)(directory);
      return stats.isDirectory();
    } catch (err) {
      return false;
    }
  });

  return function isDirectory(_x) {
    return _ref.apply(this, arguments);
  };
})();

const exists = (() => {
  var _ref2 = _asyncToGenerator(function* (filePath) {
    try {
      yield (0, _denodeify2.default)(_fs2.default.stat)(filePath);
      return true;
    } catch (err) {
      return false;
    }
  });

  return function exists(_x2) {
    return _ref2.apply(this, arguments);
  };
})();

let cachedView = null;
const getView = (() => {
  var _ref3 = _asyncToGenerator(function* () {
    if (!cachedView || argv.dev) {
      try {
        let file = yield (0, _denodeify2.default)(_fs2.default.readFile)(_path2.default.resolve(__dirname, '../../views/index.hbs'), 'utf8');
        cachedView = _handlebars2.default.compile(file);
      } catch (err) {
        throw err;
      }
    }

    return cachedView;
  });

  return function getView() {
    return _ref3.apply(this, arguments);
  };
})();

let cachedAssets = {};
const getAsset = (() => {
  var _ref4 = _asyncToGenerator(function* (assetPath) {
    if (!cachedAssets[assetPath] || argv.dev) {
      try {
        let file = yield (0, _denodeify2.default)(_fs2.default.readFile)(_path2.default.resolve(__dirname, '../../dist/assets', assetPath), 'utf8');
        cachedAssets[assetPath] = file;
      } catch (err) {
        throw err;
      }
    }

    return cachedAssets[assetPath];
  });

  return function getAsset(_x3) {
    return _ref4.apply(this, arguments);
  };
})();

const renderDir = (() => {
  var _ref5 = _asyncToGenerator(function* (directory) {
    const files = yield (0, _denodeify2.default)(_fs2.default.readdir)(directory);
    const dirObj = _path2.default.parse(directory);
    let dirPath = `${ dirObj.dir }/${ dirObj.base }`.replace(`${ rootObj.dir }/`, ``);
    let dirPathParts = dirPath.split('/');

    const data = {
      directories: [],
      images: [],
      path: [],
      assetsDir: '/assets',
      folder: dirObj.name
    };

    let url = [];
    for (let i = 0; i < dirPathParts.length; ++i) {
      if (dirPathParts[i] !== rootObj.base) {
        url.push(dirPathParts[i]);
      }

      data.path.push({
        url: url.join('/'),
        name: dirPathParts[i]
      });
    }

    for (let i = 0; i < files.length; ++i) {
      if (ignoredFiles.has(files[i])) {
        continue;
      }

      const filePath = _path2.default.resolve(root, _path2.default.resolve(directory, files[i]));
      const relativeFilePath = _path2.default.relative(root, _path2.default.resolve(directory, files[i]));
      if (yield isDirectory(filePath)) {
        data.directories.push({
          relative: relativeFilePath,
          name: files[i]
        });
      } else if (validExtensions.has(_path2.default.parse(filePath).ext)) {
        data.images.push({
          relative: relativeFilePath,
          name: files[i]
        });
      }
    }

    let view = yield getView();
    return view(data);
  });

  return function renderDir(_x4) {
    return _ref5.apply(this, arguments);
  };
})();

const renderImage = (() => {
  var _ref6 = _asyncToGenerator(function* (file) {
    try {
      const content = yield (0, _denodeify2.default)(_fs2.default.readFile)(_path2.default.resolve(root, file));
      return {
        content: content,
        mime: _mime2.default.lookup(file)
      };
    } catch (err) {
      throw err;
    }
  });

  return function renderImage(_x5) {
    return _ref6.apply(this, arguments);
  };
})();

const server = (0, _micro2.default)((() => {
  var _ref7 = _asyncToGenerator(function* (req, res) {
    const { pathname } = (0, _url.parse)(req.url);
    const pathObj = _path2.default.parse(_path2.default.join(root, pathname));
    const reqPath = decodeURIComponent(_path2.default.format(pathObj));

    if (pathname.startsWith('/assets')) {
      let asset = yield getAsset(pathname.replace('/assets/', ''));
      res.setHeader('Content-Type', `${ _mime2.default.lookup(pathname) }; charset=utf-8`);
      return (0, _micro.send)(res, 200, asset);
    }

    if (!(yield exists(reqPath))) {
      return (0, _micro.send)(res, 404, 'Not found');
    }

    if (pathObj.ext === '') {
      const renderedDir = yield renderDir(reqPath);
      return (0, _micro.send)(res, 200, renderedDir);
    } else if (validExtensions.has(pathObj.ext)) {
      try {
        const image = yield renderImage(reqPath);
        res.setHeader('Content-Type', `${ image.mime }; charset=utf-8`);
        return (0, _micro.send)(res, 200, image.content);
      } catch (err) {
        return (0, _micro.send)(res, 500, 'Error reading file content');
      }
    } else {
      return (0, _micro.send)(res, 400, 'Bad request');
    }
  });

  return function (_x6, _x7) {
    return _ref7.apply(this, arguments);
  };
})());

server.listen(argv.port || defaultPort, _asyncToGenerator(function* () {
  process.on('SIGINT', function () {
    server.close();
    process.exit(0);
  });

  if (!(yield isDirectory(root))) {
    console.error((0, _chalk.red)(`Specified directory doesn't exist!`));
    process.exit(1);
  }

  console.log((0, _chalk.green)(`Running on http://localhost:${ server.address().port }`));
}));