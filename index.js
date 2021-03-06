(function() {
  var CoffeeScript, compileCoffeeScriptAndCache, crypto, debug, definedKeysWithoutKeys, fs, getCachePath, getCachedJavaScript, getRootModule, ignoredOptions, log, path, requireCoffeeScript, stringifyOptions,
    indexOf = [].indexOf;

  crypto = require("crypto");

  path = require("path");

  CoffeeScript = require("coffeescript");

  fs = require("fs-plus");

  debug = Boolean(Number(process.env.COFFEE_REGISTER_CACHE_DUBEG));

  log = function() {
    if (debug) {
      return console.log.apply(console, arguments);
    }
  };

  ignoredOptions = ["filename", "jsPath", "sourceRoot", "sourceFiles", "generatedFile"];

  getRootModule = function(module) {
    if (module.parent) {
      return getRootModule(module.parent);
    } else {
      return module;
    }
  };

  definedKeysWithoutKeys = function(obj, ignoredKeys) {
    var key, results, val;
    results = [];
    for (key in obj) {
      val = obj[key];
      if ((val != null) && indexOf.call(ignoredKeys, key) < 0) {
        results.push(key);
      }
    }
    return results;
  };

  stringifyOptions = function(options) {
    var definedAndSortedOptions, definedSortedKeys, i, key, len;
    definedSortedKeys = (definedKeysWithoutKeys(options, ignoredOptions)).sort();
    definedAndSortedOptions = {};
    for (i = 0, len = definedSortedKeys.length; i < len; i++) {
      key = definedSortedKeys[i];
      definedAndSortedOptions[key] = options[key];
    }
    return JSON.stringify(definedAndSortedOptions);
  };

  getCachePath = function(cacheDir, coffee, options) {
    var digest, stringifiedOptions;
    stringifiedOptions = stringifyOptions(options);
    log("stringifiedOptions:", stringifiedOptions);
    digest = crypto.createHash("md5").update(coffee + stringifiedOptions, "utf8").digest("hex");
    return path.join(cacheDir, `${digest}.js`);
  };

  getCachedJavaScript = function(cachePath) {
    try {
      if (fs.isFileSync(cachePath)) {
        // TODO log error
        return fs.readFileSync(cachePath, "utf8");
      }
    } catch (error) {}
  };

  compileCoffeeScriptAndCache = function(module, filePath, options, cachePath) {
    var js;
    js = CoffeeScript._compileFile(filePath, options);
    try {
      // TODO log error
      fs.writeFileSync(cachePath, js);
    } catch (error) {}
    return js;
  };

  requireCoffeeScript = function(cacheDir) {
    return function(module, filePath) {
      var cachePath, coffee, js, options, ref;
      coffee = fs.readFileSync(filePath, "utf8");
      options = (ref = module.options) != null ? ref : (getRootModule(module)).options;
      log("coffee source:", coffee);
      log("options:", options);
      cachePath = getCachePath(cacheDir, coffee, options);
      log("cachePath:", cachePath);
      js = getCachedJavaScript(cachePath);
      if (js != null) {
        log("loaded from cache:", js);
        CoffeeScript._addSource(filePath, coffee);
      } else {
        js = compileCoffeeScriptAndCache(module, filePath, options, cachePath);
        log("compiled from source:", js);
      }
      return module._compile(js, filePath);
    };
  };

  module.exports = function(cacheDir) {
    var ext, i, len, ref, ref1, requireCoffee, results;
    if (cacheDir == null) {
      cacheDir = (ref = process.env.COFFEE_REGISTER_CACHE_CACHE_DIR) != null ? ref : `${require("app-root-path")}/.coffee-cache`;
    }
    requireCoffee = requireCoffeeScript(cacheDir);
    ref1 = CoffeeScript.FILE_EXTENSIONS;
    results = [];
    for (i = 0, len = ref1.length; i < len; i++) {
      ext = ref1[i];
      results.push(Object.defineProperty(require.extensions, ext, {
        writable: false,
        value: requireCoffee
      }));
    }
    return results;
  };

}).call(this);
