const fs = require('fs');
const path = require('path');

// Directory where Node plugins are stored. Each plugin must export
// an object containing at least id, name and description.
const pluginsDir = path.join(__dirname, 'plugins');

// Load all plugins at startup. This avoids dynamic require during requests.
function loadPlugins() {
  const plugins = [];
  if (!fs.existsSync(pluginsDir)) {
    return plugins;
  }
  const files = fs.readdirSync(pluginsDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const plugin = require(path.join(pluginsDir, file));
      if (plugin && plugin.id && plugin.name) {
        plugins.push(plugin);
      }
    }
  }
  return plugins;
}

const loadedPlugins = loadPlugins();

// Return metadata for available plugins
function listPlugins() {
  return loadedPlugins.map((p) => ({ id: p.id, name: p.name, description: p.description }));
}

module.exports = {
  listPlugins
};