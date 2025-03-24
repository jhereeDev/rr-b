const { v5: uuidv5 } = require('uuid');
const { v1: uuidv1 } = require('uuid');

function generate(string) {
  const MY_NAMESPACE = uuidv1();
  return uuidv5(string, MY_NAMESPACE);
}

module.exports = { generate };
