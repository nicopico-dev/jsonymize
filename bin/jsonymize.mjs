#!/usr/bin/env babel-node

import JsonymizeLib from "../lib/jsonymize-lib.mjs";

import CJSON from "cjson";
import Check from "check-types";
import yargs from "yargs/yargs";

import fs from "fs";
import path from "path";

let argv = yargs(process.argv.slice(2))
  .usage("Anonymize JSON values.\n\nUsage: $0 [fields]")
  .options("e", {
    alias: "extension",
    description: "ChanceJS mixin providing custom generators"
  })
  .options("c", {
    alias: "config",
    description: "Advanced configuration file"
  })
  .options("h", {
    alias: "help",
    description: "Show this help message"
  })
  .help()
  .argv;

const { stdin, stdout, stderr, exit, cwd } = process;

stdin.resume();
stdin.setEncoding("utf8");

const configPath = argv.config ? path.resolve(cwd(), argv.config) : undefined;
if (configPath && !fs.existsSync(configPath)) {
  stderr.write(`Could not read configuration file "${configPath}"\n`);
  exit(2);
}

const config = argv.config ? CJSON.load(argv.config) : {};
const generators = argv.generator || config.generators || {};
const extensions = fallback(argv.extension, relative(argv.config, config.extensions), []);
const aliases = argv.alias || config.aliases || {};
const fields = (argv._.length ? argv._ : undefined) || config.fields || [];

const anonymizer = new JsonymizeLib({
  aliases: aliases,
  fields: fields,
  generators: generators,
  extensions: extensions.map(_ => require(path.resolve(cwd(), _)))
});

anonymizer.anonymize(stdin).then(anonymized => {
  stdout.write(`${JSON.stringify(anonymized)}\n`);
  exit(0);
}).catch(error => {
  stderr.write(`Error! ${JSON.stringify(error.thrown)}\n`);
  exit(3);
});

function fallback(args, config, def) {
  if (args) {
    return Check.array(args) ? args : [args];
  } else if (config) {
    return config
  } else {
    return def;
  }
}

function relative(configPath, extensions) {
  if (!configPath || !extensions) {
    return extensions;
  } else {
    return extensions.map(_ => path.join(path.dirname(configPath), _));
  }
}
