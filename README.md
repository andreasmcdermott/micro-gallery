# micro-gallery
Like [zeit's serve](https://github.com/zeit/serve), but for images.

Share you folder(s) of images with a single command.

## Demo

https://micro-gallery.now.sh

### Demo source

https://micro-gallery.now.sh/_src

There isn't much "source" to talk about though, it is mainly a folder of images and a package.json file.

## Usage 
Install it (requires Node v6.0.0 and above)

```
$ npm install -g micro-gallery
```

Run it

```
$ gallery [options] <path>
```

### Options

| Usage                  | Description | Default value |
| ---------------------- | ----------- | ------------------ |
| -h, --help             | Output all available options | - |
| -v, --version          | The version tag of the micro-gallery instance on your device | - |
| -p, --port [port]      | A custom port on which the app will be running | 3000 |
| -d, --dev              | Use development mode. When active assets and template aren't cached | - |

## Contribute

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device
2. Uninstall now-serve if it's already installed: `npm uninstall -g micro-gallery`
3. Link it to the global module directory: `npm link`
4. Transpile the source code and watch for changes: `npm start`
