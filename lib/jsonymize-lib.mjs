import Oboe from "oboe";
import Check from "check-types";
import Chance from "chance";

const __options__ = Symbol("options");
const __chance__ = Symbol("chance");

export default class JsonymizeLib {
  constructor(options = {}) {
    const { aliases = {}, extensions = [], fields = [], generators = {} } = options;
    this[__options__] = { aliases: aliases, extensions: extensions, fields: fields, generators: generators };
    this[__chance__] = extensions.reduce((chance, extension) => chance.mixin(extension), new Chance());
  }

  anonymize(stream) {
    const chance = this[__chance__];
    const { aliases, fields, generators } = this[__options__];

    const actions = fields.reduce((result, alias) => {
      const field = aliases[alias] || alias;
      const isComplexOverride = Check.object(generators[alias]);
      const generatorOverride = isComplexOverride ? generators[alias].generator : generators[alias];
      const parameterOverride = isComplexOverride ? generators[alias].params : {};

      return Object.assign({}, result, {
        [field]: (value, path) => {
          const generators = findGenerators(chance, generatorOverride, alias, field, ...types(value));
          return generators.map(_ => _.generator(Object.assign({}, parameterOverride, { value: value })))[0];
        }
      });
    }, {});

    return new Promise((resolve, reject) => {
      Oboe(stream).node(actions).done(resolve).fail(reject);
    });
  }
}

function findGenerators(chance, ...generators) {
  return generators
    .filter(value => value != null)
    .map(name => ({ name: name, generator: chance[name] }))
    .filter(({ generator }) => Check.function(generator))
    .map(({ name, generator }) => ({ name: name, generator: generator.bind(chance) }));
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ipAddressRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
const timestampRegex = /^\d{10}$/;
const guidRegex = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
const hashRegex = /^[a-fA-F0-9]+$/;

function types(value) {
  return [
    ["natural", Check.number],
    ["bool", Check.boolean],
    ["date", Check.date],
    ["email", (value) => Check.string(value) && emailRegex.test(value)],
    ["ip", (value) => Check.string(value) && ipAddressRegex.test(value)],
    ["timestamp", (value) => Check.string(value) && timestampRegex.test(value)],
    ["guid", (value) => Check.string(value) && guidRegex.test(value)],
    ["hash", (value) => Check.string(value) && hashRegex.test(value)],
    ["sentence", (value) => Check.string(value) && value.includes(" ")],
    ["string", Check.string],
  ].map(([type, predicate]) => (predicate(value) ? type : undefined));
}
